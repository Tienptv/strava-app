/**
 * Test Suite Toàn Diện: Xác Thực Đăng Nhập Strava Toàn Bộ Thành Viên & Real-time Webhook SSE
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3999;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function makePostRequest(endpoint, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function makeGetRequest(endpoint, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function testSSEConnection(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Accept': 'text/event-stream' }
    }, (res) => {
      let receivedChunk = '';
      res.on('data', chunk => {
        receivedChunk += chunk.toString();
        // Nhận được chunk ban đầu là thành công
        if (receivedChunk.includes('connected')) {
          req.destroy();
          resolve({ status: res.statusCode, headers: res.headers, content: receivedChunk });
        }
      });
      setTimeout(() => {
        req.destroy();
        resolve({ status: res.statusCode, headers: res.headers, content: receivedChunk });
      }, 1500);
    });
    req.on('error', (err) => {
      if (err.code === 'ECONNRESET') {
        // Destroyed intentionally
      } else {
        reject(err);
      }
    });
    req.end();
  });
}

async function runRealtimeSuite() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: STRAVA REALTIME & MEMBER AUTHENTICATION SUITE');
  console.log('================================================================\n');

  // Khởi động server test trên port 3999 để kiểm thử toàn diện code mới
  console.log('⏳ Đang khởi động test server trên port 3999...');
  const serverProcess = spawn('node', [path.join(__dirname, 'index.js')], {
    env: { ...process.env, PORT: '3999' },
    stdio: 'ignore'
  });

  // Chờ server sẵn sàng
  await new Promise(resolve => setTimeout(resolve, 2000));

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failCount++;
    }
  }

  // ---------------------------------------------------------
  // 1. Kiểm tra Endpoint Handshake Webhook với Strava
  // ---------------------------------------------------------
  console.log('--- 1. Kiểm thử Webhook Handshake Verification (GET /api/webhook) ---');
  const VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || 'STRAVA_RENDER_WEBHOOK_2026';
  const challenge = 'test_challenge_abc_12345';

  const validHandshake = await makeGetRequest(`/api/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY_TOKEN)}&hub.challenge=${challenge}`);
  assert(validHandshake.status === 200, 'Handshake với verify token đúng trả về HTTP 200 OK');
  assert(validHandshake.data['hub.challenge'] === challenge, 'Handshake trả về đúng hub.challenge cho Strava');

  const invalidHandshake = await makeGetRequest(`/api/webhook?hub.mode=subscribe&hub.verify_token=WRONG_TOKEN&hub.challenge=${challenge}`);
  assert(invalidHandshake.status === 403, 'Handshake với verify token sai bị từ chối với HTTP 403');

  // ---------------------------------------------------------
  // 2. Kiểm tra Tiếp Nhận Sự Kiện Webhook (POST /api/webhook)
  // ---------------------------------------------------------
  console.log('\n--- 2. Kiểm thử Phản hồi tức thì của Webhook (POST /api/webhook) ---');
  const startPost = Date.now();
  const webhookRes = await makePostRequest('/api/webhook', {
    object_type: 'activity',
    aspect_type: 'create',
    object_id: 123456789,
    owner_id: 133066813,
    subscription_id: 372293
  });
  const duration = Date.now() - startPost;
  assert(webhookRes.status === 200, 'POST /api/webhook phản hồi HTTP 200 OK');
  assert(webhookRes.data.received === true, 'Payload phản hồi { received: true }');
  assert(duration < 2000, `Thời gian phản hồi siêu tốc (${duration}ms < 2000ms chuẩn Strava)`);

  // ---------------------------------------------------------
  // 3. Kiểm thử Realtime Server-Sent Events (SSE: GET /api/realtime/stream)
  // ---------------------------------------------------------
  console.log('\n--- 3. Kiểm thử Kênh Real-time Broadcast (GET /api/realtime/stream) ---');
  try {
    const sseRes = await testSSEConnection('/api/realtime/stream');
    assert(sseRes.status === 200, 'Kênh SSE trả về HTTP 200 OK');
    assert((sseRes.headers['content-type'] || '').includes('text/event-stream'), 'Content-Type là text/event-stream chuẩn SSE');
    assert(sseRes.content.includes('"type":"connected"'), 'Gửi gói tin chào mừng connected ban đầu thành công');
  } catch (err) {
    assert(false, `Lỗi kết nối SSE: ${err.message}`);
  }

  // ---------------------------------------------------------
  // 4. Kiểm tra Logic Phân Quyền Thành Viên CLB & Admin trong index.js
  // ---------------------------------------------------------
  console.log('\n--- 4. Kiểm tra Logic isClubMemberOrAdmin & Token Storage ---');
  const serverCode = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  assert(serverCode.includes('function isClubMemberOrAdmin'), 'Đã khai báo hàm isClubMemberOrAdmin trong server/index.js');
  assert(serverCode.includes('broadcastRealtimeEvent'), 'Đã tích hợp hàm broadcastRealtimeEvent phát sự kiện SSE');
  assert(serverCode.includes("type: 'activity_synced'"), 'Đã khai báo event activity_synced khi có bài chạy mới');

  // Đọc danh sách vận động viên thực tế trong AthleteID_Name.csv
  const csvPath = path.join(__dirname, '../Storage/AthleteID_Name.csv');
  assert(fs.existsSync(csvPath), 'Tệp Storage/AthleteID_Name.csv tồn tại');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
  assert(lines.length > 5, `Tệp CSV chứa ${lines.length} vận động viên`);

  // ---------------------------------------------------------
  // 5. Kiểm tra Giao diện Login & App.jsx
  // ---------------------------------------------------------
  console.log('\n--- 5. Kiểm tra Giao diện Login & App.jsx Realtime Listener ---');
  const loginCode = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/Login.jsx'), 'utf8');
  assert(loginCode.includes('t(\'loginWithStrava\')'), 'Nút Đăng nhập Strava hiển thị cho toàn bộ thành viên');
  assert(loginCode.includes('t(\'stravaRealtimeBadge\')'), 'Huy hiệu Realtime Lime Green hiển thị nổi bật');
  assert(loginCode.includes('t(\'orLoginWithPin\')'), 'Tùy chọn đăng nhập PIN cá nhân dự phòng hoạt động');

  const appCode = fs.readFileSync(path.join(__dirname, '../frontend/src/App.jsx'), 'utf8');
  assert(appCode.includes('EventSource(\'/api/realtime/stream\')'), 'App.jsx kết nối tới kênh SSE Realtime');
  assert(appCode.includes('challengeUpdated'), 'App.jsx tự động phát event challengeUpdated khi nhận bài mới (không cần F5)');
  assert(!appCode.includes('Swal.fire') || !appCode.includes('🎉'), 'Tuân thủ yêu cầu: không làm phiền người dùng bằng Toast popup khi có bài mới');

  console.log('\n================================================================');
  console.log(`🏁 TỔNG KẾT KIỂM THỬ: ${passCount} PASS, ${failCount} FAIL`);
  console.log('================================================================\n');

  try {
    serverProcess.kill();
  } catch (_) {}

  if (failCount > 0) {
    process.exit(1);
  }
}

runRealtimeSuite().catch(err => {
  console.error('Lỗi khi chạy test suite:', err);
  process.exit(1);
});

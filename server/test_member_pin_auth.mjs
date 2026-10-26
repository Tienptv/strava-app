import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const MEMBER_PINS_FILE = path.join(__dirname, '../Storage/member_pins.json');

// Helper to make HTTP requests
function request(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const reqHeaders = { ...headers };
    let postData = null;

    if (body !== null && typeof body === 'object') {
      postData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: reqHeaders,
      timeout: 5000
    }, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (_) {
          json = rawData;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${pathUrl} timed out`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Sleep helper
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG: HỆ THỐNG MÃ PIN THÀNH VIÊN VÀ BẢO MẬT');
  console.log('===============================================================\n');

  // Backup existing member_pins.json if present
  let originalPinsContent = null;
  if (fs.existsSync(MEMBER_PINS_FILE)) {
    try {
      originalPinsContent = fs.readFileSync(MEMBER_PINS_FILE, 'utf8');
    } catch (_) {}
  }

  // Spawn test server on TEST_PORT
  console.log(`[1/8] Khởi động test server trên cổng ${TEST_PORT}...`);
  const serverProcess = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, TEST_PORT: String(TEST_PORT), PORT: String(TEST_PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (d) => {
    // console.log('[Server Out]:', d.toString());
  });

  serverProcess.stderr.on('data', (d) => {
    console.error('[Server Err]:', d.toString());
  });

  // Wait for server to be responsive
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await request('GET', '/api/auth/roles');
      if (res && res.status) {
        ready = true;
        break;
      }
    } catch (_) {}
    await sleep(400);
  }

  if (!ready) {
    serverProcess.kill('SIGKILL');
    throw new Error('Test server không thể khởi động trên cổng ' + TEST_PORT);
  }
  console.log('       -> Test server đã sẵn sàng!\n');

  const testResults = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Đăng nhập bằng mã PIN mặc định (4 số cuối của Strava ID)
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Đăng nhập thành viên bằng 4 số cuối ID (Lieu Vo: 72851794 -> PIN 1794)');
    const t1Res = await request('POST', '/api/auth/verify-member', {
      athleteId: '72851794',
      pin: '1794'
    });

    const t1Pass = t1Res.status === 200 && 
                   t1Res.data.success === true && 
                   t1Res.data.isDefaultPin === true &&
                   t1Res.data.athlete && 
                   t1Res.data.athlete.id == '72851794';

    testResults.push({
      test: 'Test 1: Default PIN Login (Last 4 digits of ID)',
      status: t1Pass ? 'PASS' : 'FAIL',
      detail: `Status ${t1Res.status}, success=${t1Res.data?.success}, isDefaultPin=${t1Res.data?.isDefaultPin}, athlete=${t1Res.data?.athlete?.name || t1Res.data?.athlete?.firstname}`
    });
    console.log(`       -> Kết quả: ${t1Pass ? '✅ PASS' : '❌ FAIL'} (${testResults[0].detail})\n`);

    // -------------------------------------------------------------------------
    // TEST 2: Đăng nhập sai PIN -> Báo lỗi & trả remainingAttempts
    // -------------------------------------------------------------------------
    console.log('[TEST 2] Đăng nhập sai PIN (Lieu Vo: PIN 9999)');
    const t2Res = await request('POST', '/api/auth/verify-member', {
      athleteId: '72851794',
      pin: '9999'
    });

    const t2Pass = t2Res.status === 401 && 
                   t2Res.data.success === false && 
                   typeof t2Res.data.remainingAttempts === 'number';

    testResults.push({
      test: 'Test 2: Incorrect PIN Rejection & Attempt Counter',
      status: t2Pass ? 'PASS' : 'FAIL',
      detail: `Status ${t2Res.status}, remainingAttempts=${t2Res.data?.remainingAttempts}, error="${t2Res.data?.error}"`
    });
    console.log(`       -> Kết quả: ${t2Pass ? '✅ PASS' : '❌ FAIL'} (${testResults[1].detail})\n`);

    // -------------------------------------------------------------------------
    // TEST 3: Chặn leo thang quyền Admin (Zero Escalation)
    // Giả định: Người dùng chọn tên "Tien PhamTV" (Super Admin) và nhập mã PIN 6813
    // -------------------------------------------------------------------------
    console.log('[TEST 3] Kiểm tra chống leo thang đặc quyền Admin khi chọn tên Admin');
    const t3Login = await request('POST', '/api/auth/verify-member', {
      athleteId: '133066813',
      pin: '6813'
    });

    // Client gửi request /api/auth/roles kèm header x-auth-method: 'member_pin'
    const t3Roles = await request('GET', '/api/auth/roles', null, {
      'x-athlete-id': '133066813',
      'x-auth-method': 'member_pin',
      'x-member-verified': 'true'
    });

    const t3Pass = t3Login.status === 200 &&
                   t3Roles.status === 200 &&
                   t3Roles.data.isAdmin === false &&
                   t3Roles.data.isSuperAdmin === false &&
                   t3Roles.data.permissions === null;

    testResults.push({
      test: 'Test 3: Zero Privilege Escalation for PIN Login',
      status: t3Pass ? 'PASS' : 'FAIL',
      detail: `Login status=${t3Login.status}, Roles response: isAdmin=${t3Roles.data?.isAdmin}, isSuperAdmin=${t3Roles.data?.isSuperAdmin}`
    });
    console.log(`       -> Kết quả: ${t3Pass ? '✅ PASS' : '❌ FAIL'} (${testResults[2].detail})\n`);

    // -------------------------------------------------------------------------
    // TEST 4: Thành viên tự đổi mã PIN cá nhân (Self-Service Change PIN)
    // -------------------------------------------------------------------------
    console.log('[TEST 4] Thành viên tự đổi mã PIN cá nhân sang 8888');
    const t4Change = await request('POST', '/api/member/change-pin', {
      athleteId: '72851794',
      oldPin: '1794',
      newPin: '8888'
    });

    // Thử đăng nhập lại bằng PIN cũ 1794 -> Phải bị từ chối
    const t4OldLogin = await request('POST', '/api/auth/verify-member', {
      athleteId: '72851794',
      pin: '1794'
    });

    // Đăng nhập bằng PIN mới 8888 -> Phải thành công và isDefaultPin=false
    const t4NewLogin = await request('POST', '/api/auth/verify-member', {
      athleteId: '72851794',
      pin: '8888'
    });

    const t4Pass = t4Change.status === 200 &&
                   t4Change.data.success === true &&
                   t4OldLogin.status === 401 &&
                   t4NewLogin.status === 200 &&
                   t4NewLogin.data.success === true &&
                   t4NewLogin.data.isDefaultPin === false;

    testResults.push({
      test: 'Test 4: Member Self-Service Change PIN & Verification',
      status: t4Pass ? 'PASS' : 'FAIL',
      detail: `Change status=${t4Change.status}, Old PIN Login status=${t4OldLogin.status}, New PIN Login status=${t4NewLogin.status}, isDefaultPin=${t4NewLogin.data?.isDefaultPin}`
    });
    console.log(`       -> Kết quả: ${t4Pass ? '✅ PASS' : '❌ FAIL'} (${testResults[3].detail})\n`);

    // -------------------------------------------------------------------------
    // TEST 5: Admin 1-Click Khôi phục mã PIN (Reset PIN to Default)
    // -------------------------------------------------------------------------
    console.log('[TEST 5] Admin khôi phục mã PIN về mặc định (Reset PIN)');
    const t5Reset = await request('POST', '/api/admin/reset-member-pin', {
      targetAthleteId: '72851794'
    }, {
      'x-athlete-id': '133066813' // Admin OAuth identity
    });

    // Sau khi reset, PIN tự đặt 8888 phải bị hủy
    const t5CustomLogin = await request('POST', '/api/auth/verify-member', {
      athleteId: '72851794',
      pin: '8888'
    });

    // PIN mặc định 1794 phải hoạt động trở lại
    const t5DefaultLogin = await request('POST', '/api/auth/verify-member', {
      athleteId: '72851794',
      pin: '1794'
    });

    const t5Pass = t5Reset.status === 200 &&
                   t5Reset.data.success === true &&
                   t5CustomLogin.status === 401 &&
                   t5DefaultLogin.status === 200 &&
                   t5DefaultLogin.data.isDefaultPin === true;

    testResults.push({
      test: 'Test 5: Admin 1-Click Reset Member PIN',
      status: t5Pass ? 'PASS' : 'FAIL',
      detail: `Reset status=${t5Reset.status}, Custom PIN Login=${t5CustomLogin.status}, Default PIN Login=${t5DefaultLogin.status}`
    });
    console.log(`       -> Kết quả: ${t5Pass ? '✅ PASS' : '❌ FAIL'} (${testResults[4].detail})\n`);

    // -------------------------------------------------------------------------
    // TEST 6: Ngăn chặn session member_pin gọi endpoint Admin
    // -------------------------------------------------------------------------
    console.log('[TEST 6] Thành viên cố tình gọi API Admin (/api/admin/reset-member-pin)');
    const t6Blocked = await request('POST', '/api/admin/reset-member-pin', {
      targetAthleteId: '72851794'
    }, {
      'x-auth-method': 'member_pin',
      'x-member-verified': 'true'
    });

    const t6Pass = t6Blocked.status === 403;

    testResults.push({
      test: 'Test 6: Block Member Session from Admin Endpoints (403)',
      status: t6Pass ? 'PASS' : 'FAIL',
      detail: `Status=${t6Blocked.status}, error="${t6Blocked.data?.error || t6Blocked.data}"`
    });
    console.log(`       -> Kết quả: ${t6Pass ? '✅ PASS' : '❌ FAIL'} (${testResults[5].detail})\n`);

  } finally {
    // Teardown
    console.log('[Clean up] Đóng test server và hoàn nguyên dữ liệu kiểm thử...');
    try {
      serverProcess.kill('SIGTERM');
      await sleep(500);
      try { serverProcess.kill('SIGKILL'); } catch (_) {}
    } catch (_) {}

    // Restore member_pins.json
    if (originalPinsContent !== null) {
      fs.writeFileSync(MEMBER_PINS_FILE, originalPinsContent, 'utf8');
    } else if (fs.existsSync(MEMBER_PINS_FILE)) {
      try { fs.unlinkSync(MEMBER_PINS_FILE); } catch (_) {}
    }
  }

  // Print Summary Table
  console.log('\n===============================================================');
  console.log('📊 TỔNG HỢP KẾT QUẢ KIỂM THỬ THỰC TẾ (100% TRUNG THỰC)');
  console.log('===============================================================');
  let allPass = true;
  testResults.forEach((r, idx) => {
    if (r.status !== 'PASS') allPass = false;
    console.log(`[Case ${idx + 1}] ${r.test.padEnd(52)}: [${r.status}]`);
    console.log(`         Chi tiết: ${r.detail}`);
  });
  console.log('---------------------------------------------------------------');
  console.log(`KẾT LUẬN: ${allPass ? '🎉 TẤT CẢ TEST CASES ĐÃ ĐẠT (100% PASS)' : '⚠️ CÓ LỖI XẢY RA TRONG KIỂM THỬ'}`);
  console.log('===============================================================\n');

  if (!allPass) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi ngoại lệ trong quá trình chạy test:', err);
  process.exit(1);
});

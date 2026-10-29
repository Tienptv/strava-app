import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 3098;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TARGETS_FILE = path.join(__dirname, '../Storage/targets.json');

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

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: BẢO VỆ MỤC TIÊU & PENALTY THÀNH VIÊN VÀ HẠN CHÓT');
  console.log('===============================================================\n');

  // Backup existing targets.json
  let originalTargetsContent = null;
  if (fs.existsSync(TARGETS_FILE)) {
    try {
      originalTargetsContent = fs.readFileSync(TARGETS_FILE, 'utf8');
    } catch (_) {}
  }

  // Spawn test server on TEST_PORT
  console.log(`[1/7] Khởi động test server trên cổng ${TEST_PORT}...`);
  const serverProcess = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, TEST_PORT: String(TEST_PORT), PORT: String(TEST_PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stderr.on('data', (d) => {
    // console.error('[Server Err]:', d.toString());
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
    serverProcess.kill();
    throw new Error('Test server không thể khởi động trên cổng ' + TEST_PORT);
  }
  console.log('       -> Test server đã sẵn sàng!\n');

  const testResults = [];

  try {
    const MEMBER_ID = '72851794'; // Lieu Vo
    const OTHER_MEMBER_ID = '133066813'; // Tien Phan
    const ADMIN_ID = '133066813'; // Super Admin

    // -------------------------------------------------------------------------
    // TEST 1: Thành viên tự sửa mục tiêu/penalty của chính mình TRƯỚC ngày 12
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Thành viên tự sửa mục tiêu/penalty của chính mình TRƯỚC ngày 12 (giả lập ngày 5)');
    const t1Res = await request('POST', '/api/challenge/targets', {
      matchKey: 'Lieu_V._2026_10',
      target: 80,
      penalty: true
    }, {
      'x-athlete-id': MEMBER_ID,
      'x-auth-method': 'member_pin',
      'x-member-verified': 'true',
      'x-test-simulated-date': '2026-10-05'
    });

    const t1Passed = (t1Res.status === 200 && t1Res.data && t1Res.data['Lieu_V._2026_10']?.target === 80);
    console.log(`       -> Kết quả: ${t1Passed ? '✅ PASS' : '❌ FAIL'} (Status ${t1Res.status}, target=${t1Res.data?.['Lieu_V._2026_10']?.target}, penalty=${t1Res.data?.['Lieu_V._2026_10']?.penalty})`);
    testResults.push({ name: 'Member self-edit target/penalty before day 12', pass: t1Passed, detail: `Status ${t1Res.status}` });
    assert(t1Passed, 'Test 1 thất bại: Thành viên phải được phép tự sửa mục tiêu trước ngày 12');

    // -------------------------------------------------------------------------
    // TEST 2: Thành viên cố tình gửi request sửa mục tiêu của người khác (Bị chặn 403)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Thành viên cố tình gửi request sửa mục tiêu của người khác (Lieu Vo sửa của Tien Phan)');
    const t2Res = await request('POST', '/api/challenge/targets', {
      matchKey: 'Tien_P._2026_10',
      target: 20,
      penalty: false
    }, {
      'x-athlete-id': MEMBER_ID,
      'x-auth-method': 'member_pin',
      'x-member-verified': 'true',
      'x-test-simulated-date': '2026-10-05'
    });

    const t2Passed = (t2Res.status === 403 && t2Res.data?.code === 'FORBIDDEN_EDIT_OTHERS');
    console.log(`       -> Kết quả: ${t2Passed ? '✅ PASS' : '❌ FAIL'} (Status ${t2Res.status}, error="${t2Res.data?.error}", code=${t2Res.data?.code})`);
    testResults.push({ name: 'Block member from editing another member target (403)', pass: t2Passed, detail: `Status ${t2Res.status}, code=${t2Res.data?.code}` });
    assert(t2Passed, 'Test 2 thất bại: Phải chặn 403 khi thành viên sửa mục tiêu người khác');

    // -------------------------------------------------------------------------
    // TEST 3: Thành viên cố tình gửi request sửa mục tiêu SAU ngày 12 (Bị chặn 403)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Thành viên cố tình gửi request sửa mục tiêu SAU ngày 12 (giả lập ngày 15)');
    const t3Res = await request('POST', '/api/challenge/targets', {
      matchKey: 'Lieu_V._2026_10',
      target: 120,
      penalty: false
    }, {
      'x-athlete-id': MEMBER_ID,
      'x-auth-method': 'member_pin',
      'x-member-verified': 'true',
      'x-test-simulated-date': '2026-10-15'
    });

    const t3Passed = (t3Res.status === 403 && t3Res.data?.code === 'TARGET_LOCKED_BY_DATE');
    console.log(`       -> Kết quả: ${t3Passed ? '✅ PASS' : '❌ FAIL'} (Status ${t3Res.status}, error="${t3Res.data?.error}", code=${t3Res.data?.code})`);
    testResults.push({ name: 'Block member target edit after deadline day 12 (403)', pass: t3Passed, detail: `Status ${t3Res.status}, code=${t3Res.data?.code}` });
    assert(t3Passed, 'Test 3 thất bại: Phải chặn 403 khi thành viên sửa sau ngày 12');

    // -------------------------------------------------------------------------
    // TEST 4: Thành viên cố tình sửa mục tiêu tháng trong quá khứ (Bị chặn 403)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Thành viên cố tình sửa mục tiêu tháng quá khứ (Tháng 6/2026)');
    const t4Res = await request('POST', '/api/challenge/targets', {
      matchKey: 'Lieu_V._2026_6',
      target: 50,
      penalty: false
    }, {
      'x-athlete-id': MEMBER_ID,
      'x-auth-method': 'member_pin',
      'x-member-verified': 'true',
      'x-test-simulated-date': '2026-10-05'
    });

    const t4Passed = (t4Res.status === 403 && t4Res.data?.code === 'TARGET_LOCKED_PAST_MONTH');
    console.log(`       -> Kết quả: ${t4Passed ? '✅ PASS' : '❌ FAIL'} (Status ${t4Res.status}, error="${t4Res.data?.error}", code=${t4Res.data?.code})`);
    testResults.push({ name: 'Block member edit for past months (403)', pass: t4Passed, detail: `Status ${t4Res.status}, code=${t4Res.data?.code}` });
    assert(t4Passed, 'Test 4 thất bại: Phải chặn 403 khi thành viên sửa tháng quá khứ');

    // -------------------------------------------------------------------------
    // TEST 5: Khách vãng lai (không đăng nhập) cố tình gửi request lưu target (Bị chặn 401)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Khách vãng lai không đăng nhập cố tình gửi request lưu target');
    const t5Res = await request('POST', '/api/challenge/targets', {
      matchKey: 'Lieu_V._2026_10',
      target: 99
    });

    const t5Passed = (t5Res.status === 401 && t5Res.data?.code === 'UNAUTHORIZED');
    console.log(`       -> Kết quả: ${t5Passed ? '✅ PASS' : '❌ FAIL'} (Status ${t5Res.status}, error="${t5Res.data?.error}")`);
    testResults.push({ name: 'Block unauthenticated/guest users from setting targets (401)', pass: t5Passed, detail: `Status ${t5Res.status}` });
    assert(t5Passed, 'Test 5 thất bại: Khách vãng lai phải bị từ chối 401');

    // -------------------------------------------------------------------------
    // TEST 6: Admin override - Admin có quyền sửa mục tiêu/penalty của bất kỳ ai vào bất kỳ thời điểm nào
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Admin override - Sửa mục tiêu của thành viên bất kỳ sau ngày 12');
    const t6Res = await request('POST', '/api/challenge/targets', {
      matchKey: 'Lieu_V._2026_10',
      target: 150,
      penalty: true
    }, {
      'x-athlete-id': ADMIN_ID,
      'x-test-simulated-date': '2026-10-25' // Ngày 25 (> 12)
    });

    const t6Passed = (t6Res.status === 200 && t6Res.data?.['Lieu_V._2026_10']?.target === 150);
    console.log(`       -> Kết quả: ${t6Passed ? '✅ PASS' : '❌ FAIL'} (Status ${t6Res.status}, updated target=${t6Res.data?.['Lieu_V._2026_10']?.target})`);
    testResults.push({ name: 'Admin override target anytime for any runner', pass: t6Passed, detail: `Status ${t6Res.status}` });
    assert(t6Passed, 'Test 6 thất bại: Admin phải luôn có quyền override');

  } finally {
    console.log('\n[Clean up] Đóng test server và hoàn nguyên dữ liệu kiểm thử...');
    serverProcess.kill();
    if (originalTargetsContent) {
      try {
        fs.writeFileSync(TARGETS_FILE, originalTargetsContent, 'utf8');
      } catch (_) {}
    }
    await sleep(500);
  }

  console.log('\n===============================================================');
  console.log('📊 TỔNG HỢP KẾT QUẢ KIỂM THỬ THỰC TẾ (100% TRUNG THỰC)');
  console.log('===============================================================');
  testResults.forEach((t, i) => {
    console.log(`[Case ${i + 1}] ${t.name.padEnd(55)}: [${t.pass ? 'PASS' : 'FAIL'}]`);
    console.log(`         Chi tiết: ${t.detail}`);
  });
  console.log('---------------------------------------------------------------');
  const allPass = testResults.every(t => t.pass);
  console.log(`KẾT LUẬN: ${allPass ? '🎉 TẤT CẢ TEST CASES ĐÃ ĐẠT (100% PASS)' : '❌ CÓ TEST CASE THẤT BẠI'}`);
  console.log('===============================================================\n');
  if (!allPass) process.exit(1);
}

main().catch(err => {
  console.error('Lỗi ngoại lệ trong quá trình chạy test:', err);
  process.exit(1);
});


// Test suite: Xác thực nhận diện vai trò Admin, Sub-Admin, Thành viên và Cơ chế Chống leo thang quyền
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

console.log('--- TEST BẮT ĐẦU: KIỂM TRA NHẬN DIỆN VAI TRÒ ADMIN KHI ĐĂNG NHẬP STRAVA ---');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         Lỗi: ${err.message}`);
  }
}

async function itAsync(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         Lỗi: ${err.stack || err.message || err}`);
  }
}

// 1. Kiểm tra file cấu hình admins.json
it('File Storage/admins.json chứa đúng Super Admin và Sub Admin', () => {
  const adminsPath = path.join(__dirname, '../Storage/admins.json');
  assert.ok(fs.existsSync(adminsPath), 'Storage/admins.json phải tồn tại');
  const data = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
  assert.ok(data.superAdminIds.includes('133066813'), 'Phải chứa Super Admin ID 133066813');
  assert.ok(data.adminIds.includes('125487039'), 'Phải chứa Sub Admin ID 125487039');
});

// 2. Kiểm tra logic mô phỏng App.jsx
it('Mô phỏng App.jsx: Super Admin đăng nhập qua Strava OAuth -> isSuperAdmin=true, isAdmin=true', () => {
  const currentAuthMethod = 'strava_oauth';
  const isMemberPinSession = currentAuthMethod === 'member_pin';
  const envSuperAdminIds = ['133066813'];
  const userRoles = { isSuperAdmin: true, isSubAdmin: false, isAdmin: true };
  const athlete = { id: 133066813, authMethod: 'strava_oauth' };

  const isSuperAdmin = !isMemberPinSession && Boolean(userRoles.isSuperAdmin || (athlete && envSuperAdminIds.includes(athlete.id.toString())));
  const isAdmin = !isMemberPinSession && Boolean(userRoles.isAdmin || isSuperAdmin);

  assert.strictEqual(isSuperAdmin, true, 'Super Admin phải được nhận diện');
  assert.strictEqual(isAdmin, true, 'Admin phải được nhận diện');
});

it('Mô phỏng App.jsx: Sub Admin đăng nhập qua Strava OAuth -> isSuperAdmin=false, isAdmin=true', () => {
  const currentAuthMethod = 'strava_oauth';
  const isMemberPinSession = currentAuthMethod === 'member_pin';
  const envSuperAdminIds = ['133066813'];
  const userRoles = { isSuperAdmin: false, isSubAdmin: true, isAdmin: true };
  const athlete = { id: 125487039, authMethod: 'strava_oauth' };

  const isSuperAdmin = !isMemberPinSession && Boolean(userRoles.isSuperAdmin || (athlete && envSuperAdminIds.includes(athlete.id.toString())));
  const isAdmin = !isMemberPinSession && Boolean(userRoles.isAdmin || isSuperAdmin);

  assert.strictEqual(isSuperAdmin, false, 'Sub Admin không phải Super Admin');
  assert.strictEqual(isAdmin, true, 'Sub Admin phải có isAdmin = true');
});

it('Mô phỏng App.jsx: Thành viên đăng nhập qua Strava OAuth -> isSuperAdmin=false, isAdmin=false', () => {
  const currentAuthMethod = 'strava_oauth';
  const isMemberPinSession = currentAuthMethod === 'member_pin';
  const envSuperAdminIds = ['133066813'];
  const userRoles = { isSuperAdmin: false, isSubAdmin: false, isAdmin: false };
  const athlete = { id: 28424263, authMethod: 'strava_oauth' };

  const isSuperAdmin = !isMemberPinSession && Boolean(userRoles.isSuperAdmin || (athlete && envSuperAdminIds.includes(athlete.id.toString())));
  const isAdmin = !isMemberPinSession && Boolean(userRoles.isAdmin || isSuperAdmin);

  assert.strictEqual(isSuperAdmin, false);
  assert.strictEqual(isAdmin, false);
});

it('Mô phỏng App.jsx: BẢO MẬT CHỐNG LEO THANG - Đăng nhập PIN bằng ID Admin -> BỊ TƯỚC QUYỀN HOÀN TOÀN', () => {
  const currentAuthMethod = 'member_pin';
  const isMemberPinSession = currentAuthMethod === 'member_pin';
  const envSuperAdminIds = ['133066813'];
  const userRoles = { isSuperAdmin: false, isSubAdmin: false, isAdmin: false };
  const athlete = { id: 133066813, authMethod: 'member_pin', isMemberVerified: true };

  const isSuperAdmin = !isMemberPinSession && Boolean(userRoles.isSuperAdmin || (athlete && envSuperAdminIds.includes(athlete.id.toString())));
  const isAdmin = !isMemberPinSession && Boolean(userRoles.isAdmin || isSuperAdmin);

  assert.strictEqual(isSuperAdmin, false, 'Phiên PIN không thể là Super Admin');
  assert.strictEqual(isAdmin, false, 'Phiên PIN không thể là Admin');
});

// 3. Test HTTP trực tiếp với Server
const TEST_PORT = 3998;
const { spawn } = require('child_process');

function makeRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: TEST_PORT,
      path: path,
      method: 'GET',
      headers: headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runHttpTests() {
  console.log(`\n  Đang khởi động instance test server trên cổng ${TEST_PORT}...`);
  const serverProcess = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, TEST_PORT: String(TEST_PORT), PORT: String(TEST_PORT) },
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', (d) => {
    // console.log('[Server stdout]', d.toString());
  });
  serverProcess.stderr.on('data', (d) => {
    console.error('[Server stderr]', d.toString());
  });

  // Chờ server sẵn sàng bằng cách poll GET /api/health
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      await makeRequest('/api/health');
      serverReady = true;
      break;
    } catch (_) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (!serverReady) {
    console.error('Không thể kết nối đến test server sau 6s');
  }

  try {
    await itAsync('Server API: Super Admin (133066813) qua Strava OAuth -> trả về isAdmin: true, isSuperAdmin: true', async () => {
      const res = await makeRequest('/api/auth/roles', {
        'x-athlete-id': '133066813',
        'x-auth-method': 'strava_oauth'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.isSuperAdmin, true);
      assert.strictEqual(res.data.isAdmin, true);
      assert.ok(res.data.permissions && res.data.permissions.generalSettings === true);
    });

    await itAsync('Server API: Sub Admin (125487039) qua Strava OAuth -> trả về isAdmin: true, isSuperAdmin: false', async () => {
      const res = await makeRequest('/api/auth/roles', {
        'x-athlete-id': '125487039',
        'x-auth-method': 'strava_oauth'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.isSuperAdmin, false);
      assert.strictEqual(res.data.isAdmin, true);
      assert.strictEqual(res.data.isSubAdmin, true);
    });

    await itAsync('Server API: Thành viên thông thường (28424263) qua Strava OAuth -> trả về isAdmin: false', async () => {
      const res = await makeRequest('/api/auth/roles', {
        'x-athlete-id': '28424263',
        'x-auth-method': 'strava_oauth'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.isAdmin, false);
      assert.strictEqual(res.data.isSuperAdmin, false);
    });

    await itAsync('Server API: BẢO MẬT CHỐNG LEO THANG - Gọi bằng header member_pin -> BỊ ÉP isAdmin: false', async () => {
      const res = await makeRequest('/api/auth/roles', {
        'x-athlete-id': '133066813',
        'x-auth-method': 'member_pin',
        'x-member-verified': 'true'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.isAdmin, false, 'Không được phép cấp admin cho member_pin');
      assert.strictEqual(res.data.isSuperAdmin, false);
    });

  } finally {
    serverProcess.kill('SIGTERM');
  }

  console.log(`\n========================================`);
  console.log(`KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} PASS (${totalTests - passedTests} FAIL)`);
  console.log(`========================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runHttpTests();

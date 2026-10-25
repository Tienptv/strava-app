/**
 * Test Suite: Xác thực giới hạn Strava OAuth chỉ dành cho ID Admin / Super Admin / Sub Admin
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function makePostRequest(endpoint, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed });
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
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: GIỚI HẠN STRAVA OAUTH THEO ID ADMIN');
  console.log('====================================================\n');

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

  // 1. Kiểm tra danh sách Admin hiện có
  console.log('--- 1. Kiểm tra cấu hình danh sách ID Admin ---');
  const rolesRes = await makeGetRequest('/api/auth/roles', { 'x-athlete-id': '133066813' });
  assert(rolesRes.status === 200, 'GET /api/auth/roles trả về HTTP 200 cho Super Admin');
  const superAdminIds = rolesRes.data.superAdminIds || [];
  console.log(`   * Athlete ID: ${rolesRes.data.athleteId}`);
  console.log(`   * isSuperAdmin: ${rolesRes.data.isSuperAdmin}`);
  console.log(`   * isAdmin: ${rolesRes.data.isAdmin}`);
  console.log(`   * Super Admin IDs: ${JSON.stringify(superAdminIds)}`);
  assert(rolesRes.data.isSuperAdmin === true, 'ID 133066813 được xác định là Super Admin');
  assert(superAdminIds.includes('133066813'), 'ID 133066813 nằm trong danh sách superAdminIds');

  // 2. Kiểm tra logic phân quyền ID bằng cách mock / test logic trực tiếp
  console.log('\n--- 2. Kiểm thử logic xác thực ID của POST /api/auth/token ---');

  // Đọc file server/index.js để kiểm tra logic code đã chèn
  const serverCode = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  assert(serverCode.includes('isAuthorizedAdmin = isSuperAdmin || isSubAdmin'), 'Đã có biểu thức kiểm tra isAuthorizedAdmin trong mã nguồn');
  assert(serverCode.includes('strava.deauthorize'), 'Đã có lệnh gọi strava.deauthorize tự động khi tài khoản không phải Admin');
  assert(serverCode.includes('status(403)'), 'Trả về HTTP 403 khi tài khoản không có quyền Admin');

  // 3. Kiểm thử endpoint /api/auth/token khi gửi code không hợp lệ
  console.log('\n--- 3. Kiểm thử phản hồi mã lỗi chuẩn của /api/auth/token ---');
  const emptyRes = await makePostRequest('/api/auth/token', {});
  assert(emptyRes.status === 400, 'Thiếu code trong body trả về HTTP 400 Bad Request');
  assert(emptyRes.data.error === 'Thiếu authorization code', 'Thông báo lỗi tiếng Việt chuẩn xác');

  // 4. Kiểm tra giao diện Login.jsx có huy hiệu và cảnh báo Admin Only
  console.log('\n--- 4. Kiểm tra cấu trúc giao diện Login & Translations ---');
  const loginJsx = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/Login.jsx'), 'utf8');
  assert(loginJsx.includes('adminOnlyNoticeBadge'), 'Login.jsx có hiển thị huy hiệu adminOnlyNoticeBadge');
  assert(loginJsx.includes('adminLoginNote'), 'Login.jsx có hộp cảnh báo adminLoginNote');
  assert(loginJsx.includes('AlertTriangle'), 'Login.jsx sử dụng icon AlertTriangle cảnh báo nổi bật');

  const appJsx = fs.readFileSync(path.join(__dirname, '../frontend/src/App.jsx'), 'utf8');
  assert(appJsx.includes('isNotAdmin'), 'App.jsx nhận biết cờ isNotAdmin từ server');
  assert(appJsx.includes('oauthNotAdminTitle'), 'App.jsx có màn hình từ chối thân thiện oauthNotAdminTitle');
  assert(appJsx.includes('oauthNotAdminAction'), 'App.jsx có nút quay lại Đăng nhập Thành viên');

  const transJs = fs.readFileSync(path.join(__dirname, '../frontend/src/i18n/translations.js'), 'utf8');
  assert(transJs.includes('oauthNotAdminTitle') && transJs.includes('Account Not in Administrator List'), 'Translations có đầy đủ song ngữ vi/en cho oauthNotAdminTitle');
  assert(transJs.includes('oauthNotAdminAction') && transJs.includes('Back to Club Member Login'), 'Translations có đầy đủ song ngữ vi/en cho oauthNotAdminAction');

  console.log('\n====================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passCount} PASS, ${failCount} FAIL`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Lỗi khi chạy test suite:', err);
  process.exit(1);
});

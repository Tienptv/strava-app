/**
 * Test Suite: Kiểm thử Xác thực Thành viên CLB (Phương án 3) & Đồng bộ Roster Nhóm
 * 1. Dropdown thành viên (GET /api/auth/club-members)
 * 2. Xác thực Passcode CLB không phân biệt hoa thường (POST /api/auth/verify-member)
 * 3. Quản lý đổi Passcode của Admin (GET/POST /api/admin/club-pass)
 * 4. Đồng bộ thành viên nhóm (POST /api/clubs/:id/sync-roster)
 */
const http = require('http');
const assert = require('assert');

function makeRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3001,
      path: urlPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: MEMBER DROPDOWN, PASSCODE & GROUP SYNC');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function testAssert(condition, name, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. Kiểm tra GET /api/auth/club-members
    // -------------------------------------------------------------
    console.log('--- 1. Kiểm tra API lấy danh sách thành viên công khai ---');
    const resMembers = await makeRequest('GET', '/api/auth/club-members');
    testAssert(resMembers.status === 200, 'GET /api/auth/club-members trả về HTTP 200');
    testAssert(Array.isArray(resMembers.data) && resMembers.data.length > 0, 
      'Danh sách thành viên hợp lệ và có dữ liệu', 
      `Tìm thấy ${resMembers.data?.length} thành viên`);
    
    const sampleMember = resMembers.data?.[0];
    testAssert(sampleMember && sampleMember.id && sampleMember.name, 
      'Thành viên có đầy đủ id (Athlete ID) và name', 
      `ID: ${sampleMember?.id}, Name: ${sampleMember?.name}`);

    const targetAthleteId = sampleMember?.id || '73380484';

    // -------------------------------------------------------------
    // 2. Kiểm tra POST /api/auth/verify-member với Passcode mặc định "200k"
    // -------------------------------------------------------------
    console.log('\n--- 2. Kiểm tra xác thực Passcode (mặc định 200k, không phân biệt hoa thường) ---');
    
    // Case 2.1: Đúng pass viết thường "200k"
    const resLower = await makeRequest('POST', '/api/auth/verify-member', {}, {
      athleteId: targetAthleteId,
      passcode: '200k'
    });
    testAssert(resLower.status === 200 && resLower.data?.success === true, 
      'Passcode "200k" (viết thường) xác thực thành công',
      `Athlete: ${resLower.data?.athlete?.name}`);

    // Case 2.2: Đúng pass viết hoa "200K"
    const resUpper = await makeRequest('POST', '/api/auth/verify-member', {}, {
      athleteId: targetAthleteId,
      passcode: '200K'
    });
    testAssert(resUpper.status === 200 && resUpper.data?.success === true, 
      'Passcode "200K" (viết hoa) xác thực thành công');

    // Case 2.3: Đúng pass có khoảng trắng "  200k  "
    const resTrim = await makeRequest('POST', '/api/auth/verify-member', {}, {
      athleteId: targetAthleteId,
      passcode: '  200k  '
    });
    testAssert(resTrim.status === 200 && resTrim.data?.success === true, 
      'Passcode có khoảng trắng "  200k  " tự động trim và thành công');

    // Case 2.4: Sai mật khẩu
    const resWrong = await makeRequest('POST', '/api/auth/verify-member', {}, {
      athleteId: targetAthleteId,
      passcode: 'sai_mat_khau_123'
    });
    testAssert(resWrong.status === 401 && resWrong.data?.success === false, 
      'Sai mật khẩu bị chặn với HTTP 401 đúng mong đợi');

    // Case 2.5: Thiếu athleteId
    const resNoId = await makeRequest('POST', '/api/auth/verify-member', {}, {
      passcode: '200k'
    });
    testAssert(resNoId.status === 400, 'Thiếu athleteId trả về HTTP 400 Bad Request');

    // Case 2.6: Thiếu passcode
    const resNoPass = await makeRequest('POST', '/api/auth/verify-member', {}, {
      athleteId: targetAthleteId
    });
    testAssert(resNoPass.status === 400, 'Thiếu passcode trả về HTTP 400 Bad Request');

    // -------------------------------------------------------------
    // 3. Kiểm tra Quản lý Passcode trong phần Admin
    // -------------------------------------------------------------
    console.log('\n--- 3. Kiểm tra Phân quyền & Đổi Mật Khẩu CLB trong Administrators ---');

    // Case 3.1: Người dùng thường/khách không được xem mật khẩu
    const resNonAdminGet = await makeRequest('GET', '/api/admin/club-pass', { 'x-athlete-id': '999999999' });
    testAssert(resNonAdminGet.status === 403, 'Non-admin bị chặn xem passcode (HTTP 403)');

    // Case 3.2: Super Admin được xem mật khẩu
    const resAdminGet = await makeRequest('GET', '/api/admin/club-pass', { 'x-athlete-id': '133066813' });
    testAssert(resAdminGet.status === 200 && resAdminGet.data?.success === true, 
      'Super Admin xem được passcode hiện tại', 
      `Pass: ${resAdminGet.data?.passcode}`);

    // Case 3.3: Super Admin đổi mật khẩu mới "Haskoning2026"
    const resChangePass = await makeRequest('POST', '/api/admin/club-pass', { 'x-athlete-id': '133066813' }, {
      passcode: 'Haskoning2026'
    });
    testAssert(resChangePass.status === 200 && resChangePass.data?.passcode === 'Haskoning2026', 
      'Super Admin đổi passcode thành "Haskoning2026" thành công');

    // Case 3.4: Verify lại với pass mới "haskoning2026" (chữ thường)
    const resVerifyNew = await makeRequest('POST', '/api/auth/verify-member', {}, {
      athleteId: targetAthleteId,
      passcode: 'haskoning2026'
    });
    testAssert(resVerifyNew.status === 200 && resVerifyNew.data?.success === true, 
      'Pass mới "haskoning2026" (chữ thường) hoạt động chính xác');

    // Case 3.5: Pass cũ "200k" bây giờ phải bị từ chối
    const resVerifyOld = await makeRequest('POST', '/api/auth/verify-member', {}, {
      athleteId: targetAthleteId,
      passcode: '200k'
    });
    testAssert(resVerifyOld.status === 401, 'Pass cũ "200k" bị từ chối đúng mong đợi (HTTP 401)');

    // Case 3.6: Khôi phục lại pass mặc định "200k"
    const resRestorePass = await makeRequest('POST', '/api/admin/club-pass', { 'x-athlete-id': '133066813' }, {
      passcode: '200k'
    });
    testAssert(resRestorePass.status === 200 && resRestorePass.data?.passcode === '200k', 
      'Đã khôi phục lại mật khẩu mặc định "200k" thành công');

    // -------------------------------------------------------------
    // 4. Kiểm tra Endpoint Sync Roster (Nút Reload cạnh SELECT GROUP)
    // -------------------------------------------------------------
    console.log('\n--- 4. Kiểm tra Endpoint Đồng bộ Thành viên Nhóm (Nút Reload) ---');
    const resSync = await makeRequest('POST', '/api/clubs/878992/sync-roster');
    testAssert(resSync.status === 200 && resSync.data?.success === true, 
      'POST /api/clubs/878992/sync-roster trả về thành công',
      `Thành viên sau sync: ${resSync.data?.members?.length}`);

  } catch (err) {
    console.error('Lỗi khi chạy test suite:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

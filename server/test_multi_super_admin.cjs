// Test script for Multi Super Admin functionality
const fs = require('fs');
const path = require('path');
const http = require('http');

const ADMINS_FILE = path.join(__dirname, '../Storage/admins.json');
const BACKUP_ADMINS_FILE = path.join(__dirname, '../Storage/admins.json.backup_test');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ HỆ THỐNG ĐỒNG SUPER ADMIN (MULTI SUPER ADMIN)');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // Backup admins.json
  if (fs.existsSync(ADMINS_FILE)) {
    fs.copyFileSync(ADMINS_FILE, BACKUP_ADMINS_FILE);
  }

  function makeRequest(method, urlPath, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const req = http.request({
        hostname: 'localhost',
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
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  try {
    // 1. Kiểm tra Root Super Admin mặc định
    console.log('\n--- 1. Kiểm tra Root Super Admin (133066813) ---');
    const resRootRoles = await makeRequest('GET', '/api/auth/roles', { 'x-athlete-id': '133066813' });
    assert(resRootRoles.status === 200, 'GET /api/auth/roles cho Root Super Admin trả về 200');
    assert(resRootRoles.data.isSuperAdmin === true, 'Root Super Admin 133066813 có isSuperAdmin === true');
    assert(resRootRoles.data.isAdmin === true, 'Root Super Admin 133066813 có isAdmin === true');
    assert(resRootRoles.data.permissions.manageRoles === true, 'Root Super Admin có toàn quyền manageRoles');
    assert(Array.isArray(resRootRoles.data.superAdminIds) && resRootRoles.data.superAdminIds.includes('133066813'), 'Danh sách superAdminIds chứa 133066813');

    // Test GET /api/super-admins
    console.log('\n--- 2. Kiểm tra danh sách Super Admins ban đầu ---');
    const resSuperList = await makeRequest('GET', '/api/super-admins');
    assert(resSuperList.status === 200, 'GET /api/super-admins trả về 200');
    assert(Array.isArray(resSuperList.data), 'Kết quả super-admins là một mảng');
    const primaryAdmin = resSuperList.data.find(a => a.athleteId === '133066813');
    assert(primaryAdmin && primaryAdmin.isPrimary === true, 'Tìm thấy Root Super Admin 133066813 với isPrimary === true');

    // Test Bổ nhiệm Co-Super Admin (Thành viên 999000111)
    console.log('\n--- 3. Bổ nhiệm Co-Super Admin mới (ID 999000111) ---');
    const resPromote = await makeRequest('POST', '/api/super-admins', { 'x-athlete-id': '133066813' }, {
      adminId: '999000111',
      name: 'Nguyen Van Test'
    });
    assert(resPromote.status === 200, 'POST /api/super-admins bổ nhiệm Co-Super Admin trả về 200');
    assert(resPromote.data.success === true, 'Phản hồi thành công');
    assert(resPromote.data.superAdmins.some(a => a.athleteId === '999000111'), 'Co-Super Admin 999000111 có trong danh sách');

    // Test vai trò của Co-Super Admin mới
    const resCoAdminRoles = await makeRequest('GET', '/api/auth/roles', { 'x-athlete-id': '999000111' });
    assert(resCoAdminRoles.data.isSuperAdmin === true, 'Co-Super Admin 999000111 có isSuperAdmin === true');
    assert(resCoAdminRoles.data.isAdmin === true, 'Co-Super Admin 999000111 có isAdmin === true');
    assert(resCoAdminRoles.data.permissions.manageRoles === true, 'Co-Super Admin 999000111 có toàn quyền manageRoles');

    // Test Co-Super Admin có thể cấp quyền Sub-Admin cho người khác
    console.log('\n--- 4. Kiểm tra Co-Super Admin thực hiện quyền quản trị ---');
    const resGrantByCo = await makeRequest('POST', '/api/admins', { 'x-athlete-id': '999000111' }, {
      adminId: '888777666',
      name: 'Sub Admin Do Co-Super Cap'
    });
    assert(resGrantByCo.status === 200, 'Co-Super Admin 999000111 cấp quyền Sub-Admin thành công (200)');

    // Test CHỐT AN TOÀN BẢO MẬT: Không thể hạ quyền Root Super Admin 133066813
    console.log('\n--- 5. Chốt an toàn bảo mật: Chặn xóa Root Super Admin ---');
    const resTryDeleteRoot = await makeRequest('DELETE', '/api/super-admins/133066813', { 'x-athlete-id': '999000111' });
    assert(resTryDeleteRoot.status === 403, 'Cố tình xóa Root Super Admin bị từ chối với mã 403 Forbidden');
    assert(resTryDeleteRoot.data.error.includes('Root Super Admin'), 'Thông báo lỗi bảo mật chính xác');

    // Test Người dùng thường không được bổ nhiệm Super Admin
    const resUnauthorizedPromote = await makeRequest('POST', '/api/super-admins', { 'x-athlete-id': '111222333' }, {
      adminId: '444555666',
      name: 'Hacker'
    });
    assert(resUnauthorizedPromote.status === 403, 'Người dùng thường cố bổ nhiệm Super Admin bị chặn với mã 403');

    // Test Hạ cấp Co-Super Admin 999000111 xuống Sub-Admin
    console.log('\n--- 6. Hạ cấp Co-Super Admin về Sub-Admin ---');
    const resDemote = await makeRequest('DELETE', '/api/super-admins/999000111?downgrade=true', { 'x-athlete-id': '133066813' });
    assert(resDemote.status === 200, 'Hạ cấp Co-Super Admin trả về 200');
    assert(!resDemote.data.superAdmins.some(a => a.athleteId === '999000111'), '999000111 không còn trong superAdmins');
    assert(resDemote.data.admins.some(a => a.athleteId === '999000111' || a.id === '999000111'), '999000111 đã được chuyển sang danh sách Sub-Admins');

    // Kiểm tra lại vai trò của 999000111 sau khi bị hạ cấp
    const resDemotedRoles = await makeRequest('GET', '/api/auth/roles', { 'x-athlete-id': '999000111' });
    assert(resDemotedRoles.data.isSuperAdmin === false, 'Sau khi hạ cấp, isSuperAdmin === false');
    assert(resDemotedRoles.data.isSubAdmin === true, 'Sau khi hạ cấp, isSubAdmin === true');
    assert(resDemotedRoles.data.isAdmin === true, 'Vẫn là admin nghiệp vụ');
    assert(resDemotedRoles.data.permissions.manageRoles === false, 'Sub-admin không có quyền manageRoles');

    // Test Thu hồi hoàn toàn Sub-Admin 999000111
    console.log('\n--- 7. Thu hồi hoàn toàn quyền Admin ---');
    const resRevokeSub = await makeRequest('DELETE', '/api/admins/999000111', { 'x-athlete-id': '133066813' });
    assert(resRevokeSub.status === 200, 'Thu hồi Sub-Admin trả về 200');

    // Thu hồi Sub-Admin tạm 888777666
    await makeRequest('DELETE', '/api/admins/888777666', { 'x-athlete-id': '133066813' });

    // Test endpoint /api/admins/storage-raw
    console.log('\n--- 8. Kiểm tra endpoint đồng bộ không mất mát /api/admins/storage-raw ---');
    const resStorageRaw = await makeRequest('GET', '/api/admins/storage-raw');
    assert(resStorageRaw.status === 200, 'GET /api/admins/storage-raw trả về 200');
    assert(Array.isArray(resStorageRaw.data.superAdminIds), 'storage-raw chứa superAdminIds array');
    assert(Array.isArray(resStorageRaw.data.adminIds), 'storage-raw chứa adminIds array');

  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình test:', err);
    failed++;
  } finally {
    // Restore backup admins.json
    if (fs.existsSync(BACKUP_ADMINS_FILE)) {
      fs.copyFileSync(BACKUP_ADMINS_FILE, ADMINS_FILE);
      fs.unlinkSync(BACKUP_ADMINS_FILE);
      console.log('\n🧹 Đã khôi phục nguyên trạng tệp Storage/admins.json.');
    }
  }

  console.log('\n====================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL (Tổng cộng: ${passed + failed})`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

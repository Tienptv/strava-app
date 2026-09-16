/**
 * Test Suite: Tab 9 - Quản Lý Quyền Truy Cập Tính Năng Của User (User Feature Access Control)
 * Kiểm thử thực tế theo Rule #2 (100% trung thực).
 */

import { getUserAccessConfig, saveUserAccessConfig, isFeatureAccessible } from './user_access_service.js';

async function runTests() {
  console.log('========================================================');
  console.log('🛡️  BẮT ĐẦU KIỂM THỬ TAB 9: USER ACCESS CONTROL');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // Test 1: Khởi tạo cấu hình mặc định đầy đủ 10 modules
    const initialConfig = getUserAccessConfig();
    assert(
      initialConfig && typeof initialConfig === 'object' && initialConfig.modules,
      'Cấu hình trả về object hợp lệ với trường modules'
    );
    const moduleKeys = Object.keys(initialConfig.modules);
    assert(
      moduleKeys.length === 10,
      `Đầy đủ 10 modules cốt lõi trong ma trận phân quyền (thực tế: ${moduleKeys.length})`
    );

    // Test 2: Kiểm tra các module quan trọng có mặt trong config
    const expectedModules = [
      'aiCoach', 'runnaRoadmap', 'garminSync',
      'leaderboardPodium', 'recentActivities', 'shareCard',
      'clubTreasury', 'editPersonalGoal', 'exportData',
      'guestAccess'
    ];
    const allPresent = expectedModules.every(k => initialConfig.modules[k] !== undefined);
    assert(allPresent, 'Toàn bộ 10 key modules dự kiến đều có mặt chính xác');

    // Test 3: Kiểm tra quyền Admin luôn luôn bypass (toàn quyền)
    const adminAi = isFeatureAccessible('aiCoach', 'superadmin');
    const adminTreasury = isFeatureAccessible('clubTreasury', 'admin');
    assert(adminAi && adminTreasury, 'Super Admin và Admin luôn luôn có toàn quyền truy cập 100%');

    // Test 4: Kiểm tra quyền mặc định của Thành viên (Member) và Khách (Guest)
    const memberAi = isFeatureAccessible('aiCoach', 'member');
    const guestAi = isFeatureAccessible('aiCoach', 'guest');
    assert(
      memberAi === true && guestAi === false,
      'Mặc định: AI Coach mở cho Thành viên (Member) và khóa với Khách (Guest)'
    );

    const guestPodium = isFeatureAccessible('leaderboardPodium', 'guest');
    assert(
      guestPodium === true,
      'Mặc định: Bảng xếp hạng Podium mở cho cả Khách vãng lai xem công khai'
    );

    // Test 5: Cập nhật quyền (Save) và kiểm tra tính bền vững
    const customUpdate = {
      modules: {
        ...initialConfig.modules,
        aiCoach: {
          ...initialConfig.modules.aiCoach,
          enabledForMembers: false, // Tạm khóa AI Coach với Member
          enabledForGuests: false
        }
      }
    };
    const saveRes = saveUserAccessConfig(customUpdate, 'Test_Runner');
    assert(saveRes.success === true, 'Lưu cấu hình quyền mới thành công vào file Storage');

    const updatedMemberAi = isFeatureAccessible('aiCoach', 'member');
    assert(
      updatedMemberAi === false,
      'Hệ thống phản ánh tức thì việc khóa AI Coach đối với Thành viên'
    );

    // Test 6: Khôi phục lại quyền an toàn ban đầu
    const restoreRes = saveUserAccessConfig(initialConfig, 'Test_Restore');
    assert(restoreRes.success === true, 'Khôi phục lại cấu hình gốc thành công');
    assert(
      isFeatureAccessible('aiCoach', 'member') === true,
      'Xác nhận AI Coach đã mở lại bình thường cho thành viên'
    );

    // Test 7: Kiểm tra gọi HTTP API qua Express server (port 3001)
    const apiRes = await fetch('http://localhost:3001/api/user-access-control');
    const apiJson = await apiRes.json();
    assert(
      apiRes.status === 200 && apiJson.success === true && apiJson.config,
      'REST API GET /api/user-access-control phản hồi HTTP 200 với dữ liệu chuẩn'
    );

    // Test 8: Kiểm tra POST cập nhật qua REST API
    const postRes = await fetch('http://localhost:3001/api/user-access-control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-athlete-id': '133066813' // Super Admin ID
      },
      body: JSON.stringify({ modules: apiJson.config.modules })
    });
    const postJson = await postRes.json();
    assert(
      postRes.status === 200 && postJson.success === true,
      'REST API POST /api/user-access-control cập nhật thành công (HTTP 200)'
    );

  } catch (err) {
    console.error('❌ Lỗi runtime trong quá trình test:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ TAB 9: ${passed}/${passed + failed} TEST CASES PASSED (${failed === 0 ? '100%' : 'CÓ LỖI'})`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();

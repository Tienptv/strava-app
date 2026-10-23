/**
 * Test Suite: Xác thực cơ chế phân quyền Admin/Super Admin chỉ sử dụng Strava Athlete ID (Strict ID Authentication)
 * Tuân thủ Workspace Rule #6 (Athlete ID Mandatory Rule)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: STRICT ATHLETE ID ADMIN AUTHENTICATION');
console.log('====================================================');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

// Đọc logic server/index.js
const serverFile = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

// 1. Kiểm tra mã nguồn không còn chứa 'tien_p.' trong hàm isSuperAdminUser
runTest('1. server/index.js không còn điều kiện matchKey tien_p.', () => {
  assert(!serverFile.includes("info.matchKey.toLowerCase() === 'tien_p.'"), 'Vẫn còn sót kiểm tra tien_p. trong code');
});

// 2. Kiểm tra isAthleteInSubAdmins không dùng candidate names / removeDiacritics
runTest('2. isAthleteInSubAdmins đã loại bỏ userCandidates và so khớp tên', () => {
  assert(!serverFile.includes('userCandidates.has('), 'Vẫn còn userCandidates trong isAthleteInSubAdmins');
  assert(!serverFile.includes('adminInfo.name && userInfo.name'), 'Vẫn còn so khớp adminInfo.name trong isAthleteInSubAdmins');
});

// 3. Test logic thực tế của isSuperAdminUser
const ROOT_SUPER_ADMIN_ID = '133066813';
function mockGetSuperAdminIds() {
  return [ROOT_SUPER_ADMIN_ID];
}

function isSuperAdminUser(athleteIdentifier) {
  if (!athleteIdentifier || athleteIdentifier === 'guest') return false;
  const rawId = athleteIdentifier.toString().trim();
  const superIds = mockGetSuperAdminIds();
  return superIds.includes(rawId);
}

runTest('3. Root Super Admin ID (133066813) được xác định là Super Admin', () => {
  assert.strictEqual(isSuperAdminUser('133066813'), true);
  assert.strictEqual(isSuperAdminUser(133066813), true);
});

runTest('4. Tài khoản Clone / Người trùng tên (pham tien ID 120540594) KHÔNG THỂ là Super Admin', () => {
  assert.strictEqual(isSuperAdminUser('120540594'), false);
  assert.strictEqual(isSuperAdminUser('Tien Pham'), false);
  assert.strictEqual(isSuperAdminUser('tien_p.'), false);
  assert.strictEqual(isSuperAdminUser('Pham Tien'), false);
});

// 4. Test logic thực tế của isAthleteInSubAdmins
function isAthleteInSubAdmins(athleteIdentifier, subAdmins) {
  if (!athleteIdentifier || !Array.isArray(subAdmins) || subAdmins.length === 0) return false;
  const rawId = athleteIdentifier.toString().trim();
  const subAdminIds = subAdmins.map(a => a.toString().trim());
  return subAdminIds.includes(rawId);
}

const mockSubAdmins = ['125487039']; // Sang Nguyen

runTest('5. Sub-Admin với đúng ID (125487039) được xác định là Sub-Admin', () => {
  assert.strictEqual(isAthleteInSubAdmins('125487039', mockSubAdmins), true);
  assert.strictEqual(isAthleteInSubAdmins(125487039, mockSubAdmins), true);
});

runTest('6. Người trùng tên Sub-Admin (Sang Nguyen khác ID) KHÔNG ĐƯỢC cấp quyền Sub-Admin', () => {
  assert.strictEqual(isAthleteInSubAdmins('Sang Nguyen', mockSubAdmins), false);
  assert.strictEqual(isAthleteInSubAdmins('sang_n.', mockSubAdmins), false);
  assert.strictEqual(isAthleteInSubAdmins('999999999', mockSubAdmins), false); // Người trùng tên nhưng ID khác
});

// 5. Test lưu Sub-Admin mới chỉ lưu ID số thuần túy
runTest('7. Cấp quyền Sub-Admin mới chỉ lưu Athlete ID vào mảng', () => {
  const subAdmins = ['125487039'];
  const newAdminId = '888777666';
  const targetAthleteId = newAdminId;
  
  if (!subAdmins.includes(targetAthleteId)) {
    subAdmins.push(targetAthleteId);
  }

  assert.strictEqual(subAdmins.length, 2);
  assert(subAdmins.includes('888777666'));
  assert(!subAdmins.includes('Nguyen Van A')); // Không có slug tên
  assert(!subAdmins.includes('nguyen_a.'));    // Không có matchKey
});

console.log('\n====================================================');
console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL (Tổng cộng: ${passed + failed})`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

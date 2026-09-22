const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('   BẮT ĐẦU KIỂM THỬ TOÀN DIỆN: MERGE DUONG VU VÀO ABBA VŨ');
console.log('   (Quy tắc Rule #2, Rule #6: Kiểm thử thực tế & ID là duy nhất)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         Error: ${err.message}`);
    failCount++;
  }
}

// --------------------------------------------------------------------------
// TEST 1: Phân định tài khoản trong member_penalties_mapping.json
// --------------------------------------------------------------------------
console.log('1. KIỂM TRA PHÂN ĐỊNH TÀI KHOẢN TRONG MEMBER_PENALTIES_MAPPING.JSON:');
const penaltiesData = JSON.parse(fs.readFileSync('./Storage/member_penalties_mapping.json', 'utf8'));

it('STT 5 phải là canonical Abba Vũ với athleteId = 73380484', () => {
  const stt5 = penaltiesData.members.find(m => m.stt === 5);
  assert(stt5, 'Không tìm thấy STT 5');
  assert.strictEqual(String(stt5.athleteId), '73380484', `athleteId phải là 73380484, thực tế: ${stt5.athleteId}`);
  assert.strictEqual(stt5.fullName, 'Abba Vũ', `fullName phải là Abba Vũ, thực tế: ${stt5.fullName}`);
});

it('STT 24 phải giữ nguyên là Vũ Dương (Vu Duong) với athleteId = 101067787 (KHÔNG BỊ GỘP)', () => {
  const stt24 = penaltiesData.members.find(m => m.stt === 24);
  assert(stt24, 'Không tìm thấy STT 24');
  assert.strictEqual(String(stt24.athleteId), '101067787', `athleteId phải là 101067787, thực tế: ${stt24.athleteId}`);
  assert.strictEqual(stt24.rawName, 'Vu Duong', `rawName phải là Vu Duong, thực tế: ${stt24.rawName}`);
  assert.notStrictEqual(stt24.athleteId, penaltiesData.members.find(m => m.stt === 5).athleteId, 'STT 24 và STT 5 không được trùng ID!');
});

// --------------------------------------------------------------------------
// TEST 2: Không bị nhân đôi (duplicate) dữ liệu chạy trong historical_activities.json
// --------------------------------------------------------------------------
console.log('\n2. KIỂM TRA CHỐNG NHÂN ĐÔI DỮ LIỆU CHẠY (HISTORICAL_ACTIVITIES.JSON):');
const rawHistorical = JSON.parse(fs.readFileSync('./Storage/historical_activities.json', 'utf8'));
const activitiesList = Array.isArray(rawHistorical) ? rawHistorical : (rawHistorical.activities || []);

it('Abba Vũ (73380484) trong Tháng 2/2026 có đúng 10 bài tập (9 bài có cự ly + 1 bài 0km), tổng 61.71 km (không bị double)', () => {
  const febRuns = activitiesList.filter(a => {
    const aid = a.athlete?.id || a.athleteId;
    return String(aid) === '73380484' && a.start_date_local && a.start_date_local.startsWith('2026-02');
  });
  const totalFebKm = febRuns.reduce((sum, a) => sum + (a.distance / 1000), 0);
  assert.strictEqual(febRuns.length, 10, `Số bài chạy tháng 2 phải là 10, thực tế: ${febRuns.length}`);
  assert.strictEqual(Math.round(totalFebKm * 100) / 100, 61.71, `Tổng km tháng 2 phải là 61.71 km, thực tế: ${totalFebKm}`);
});

it('Abba Vũ (73380484) trong Tháng 1/2026 có đúng 4 bài chạy, tổng 22.78 km', () => {
  const janRuns = activitiesList.filter(a => {
    const aid = a.athlete?.id || a.athleteId;
    return String(aid) === '73380484' && a.start_date_local && a.start_date_local.startsWith('2026-01');
  });
  const totalJanKm = janRuns.reduce((sum, a) => sum + (a.distance / 1000), 0);
  assert.strictEqual(janRuns.length, 4, `Số bài chạy tháng 1 phải là 4, thực tế: ${janRuns.length}`);
  assert.strictEqual(Math.round(totalJanKm * 100) / 100, 22.78, `Tổng km tháng 1 phải là 22.78 km, thực tế: ${totalJanKm}`);
});

it('Tài khoản Vũ Dương (101067787) không có bài chạy rác/trùng nào trong năm 2026', () => {
  const runs2026 = activitiesList.filter(a => {
    const aid = a.athlete?.id || a.athleteId;
    return String(aid) === '101067787' && a.start_date_local && a.start_date_local.startsWith('2026');
  });
  assert.strictEqual(runs2026.length, 0, `Số bài chạy 2026 của 101067787 phải là 0, thực tế: ${runs2026.length}`);
});

// --------------------------------------------------------------------------
// TEST 3: Cấu hình bảng Challenge (challenge_config.json)
// --------------------------------------------------------------------------
console.log('\n3. KIỂM TRA DANH SÁCH THÀNH VIÊN CHALLENGE (CHALLENGE_CONFIG.JSON):');
const challengeConfig = JSON.parse(fs.readFileSync('./Storage/challenge_config.json', 'utf8'));

it('Không có monthlyParticipants nào trong năm 2026 chứa đồng thời cả Abba_V. và vu_D.', () => {
  const mp = challengeConfig.monthlyParticipants || {};
  for (const [mKey, pMap] of Object.entries(mp)) {
    if (mKey.startsWith('2026_')) {
      const hasAbba = Boolean(pMap && pMap['Abba_V.']);
      const hasVu = Boolean(pMap && pMap['vu_D.']);
      assert(!(hasAbba && hasVu), `Tháng ${mKey} đang chứa cả Abba_V. và vu_D.!`);
    }
  }
});

// --------------------------------------------------------------------------
// TEST 4: Ánh xạ tên (name_mapping.json)
// --------------------------------------------------------------------------
console.log('\n4. KIỂM TRA ÁNH XẠ TÊN (NAME_MAPPING.JSON):');
const nameMapping = JSON.parse(fs.readFileSync('./Storage/name_mapping.json', 'utf8'));

it('Duong Vu và Abba Vũ đều ánh xạ về 73380484', () => {
  assert.strictEqual(String(nameMapping['Duong Vu']?.athleteId), '73380484', 'Duong Vu phải ánh xạ về 73380484');
  assert.strictEqual(String(nameMapping['Abba Vũ']?.athleteId), '73380484', 'Abba Vũ phải ánh xạ về 73380484');
  assert.strictEqual(String(nameMapping['Abba_V.']?.athleteId), '73380484', 'Abba_V. phải ánh xạ về 73380484');
});

it('vu D. và Vu Duong đều ánh xạ về 101067787', () => {
  assert.strictEqual(String(nameMapping['vu D.']?.athleteId), '101067787', 'vu D. phải ánh xạ về 101067787');
  assert.strictEqual(String(nameMapping['vu_D.']?.athleteId), '101067787', 'vu_D. phải ánh xạ về 101067787');
  assert.strictEqual(String(nameMapping['Vu Duong']?.athleteId), '101067787', 'Vu Duong phải ánh xạ về 101067787');
  assert.strictEqual(String(nameMapping['Vũ Dương']?.athleteId), '101067787', 'Vũ Dương phải ánh xạ về 101067787');
});

// --------------------------------------------------------------------------
// TEST 5: Logic khớp trong Administer.jsx
// --------------------------------------------------------------------------
console.log('\n5. KIỂM TRA LOGIC KHỚP ATHLETE ID TRONG ADMINISTER.JSX:');
const adminJsx = fs.readFileSync('./frontend/src/pages/Administer.jsx', 'utf8');

it('Administer.jsx tính rowAthleteId từ row.athleteId || row.member?.id', () => {
  assert(adminJsx.includes('const rowAthleteId = row.athleteId || row.member?.id || row.member?.athleteId || row.id'), 'Chưa có logic khai báo rowAthleteId');
});

it('Administer.jsx trả về athleteId: rowAthleteId trong reportRows', () => {
  assert(adminJsx.includes('athleteId: rowAthleteId,'), 'reportRows chưa trả về athleteId: rowAthleteId');
});

// --------------------------------------------------------------------------
// TEST 6: API POST /api/penalties/payment
// --------------------------------------------------------------------------
console.log('\n6. KIỂM TRA HÀM LOGIC XỬ LÝ THANH TOÁN (POST /api/penalties/payment):');
it('Resolve thành viên Abba Vũ bằng athleteId 73380484', () => {
  const targetIdStr = '73380484';
  const mem = penaltiesData.members.find(m => String(m.athleteId) === targetIdStr);
  assert(mem, 'Không tìm thấy Abba Vũ bằng athleteId');
  assert.strictEqual(mem.stt, 5, `Phải là STT 5, thực tế: ${mem.stt}`);
});

it('Resolve thành viên Abba Vũ bằng alias Duong Vu từ name_mapping', () => {
  const aliasAthleteId = nameMapping['Duong Vu']?.athleteId ? String(nameMapping['Duong Vu'].athleteId) : null;
  const mem = penaltiesData.members.find(m => String(m.athleteId) === aliasAthleteId);
  assert(mem, 'Không tìm thấy Abba Vũ qua alias Duong Vu');
  assert.strictEqual(mem.stt, 5, `Phải là STT 5, thực tế: ${mem.stt}`);
});

it('Resolve thành viên Vũ Dương bằng athleteId 101067787', () => {
  const targetIdStr = '101067787';
  const mem = penaltiesData.members.find(m => String(m.athleteId) === targetIdStr);
  assert(mem, 'Không tìm thấy Vũ Dương bằng athleteId');
  assert.strictEqual(mem.stt, 24, `Phải là STT 24, thực tế: ${mem.stt}`);
});

console.log('\n================================================================');
console.log(`KẾT QUẢ KIỂM THỬ: PASS: ${passCount} | FAIL: ${failCount}`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

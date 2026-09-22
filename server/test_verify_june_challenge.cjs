const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('KIỂM THỬ THỰC TẾ: BẢNG THỬ THÁCH THÁNG 6/2026 (CHALLENGE MONTH 6)');
console.log('Tuân thủ nghiêm ngặt Quy Tắc #2, #3, #6');
console.log('================================================================\n');

const storageDir = path.join(__dirname, '../Storage');
const hist = JSON.parse(fs.readFileSync(path.join(storageDir, 'historical_activities.json'), 'utf8'));
const cfg = JSON.parse(fs.readFileSync(path.join(storageDir, 'challenge_config.json'), 'utf8'));
const targets = JSON.parse(fs.readFileSync(path.join(storageDir, 'targets.json'), 'utf8'));
const csvContent = fs.readFileSync(path.join(storageDir, 'Month-6-2026.csv'), 'utf8');

// Helper normalize
function normalize(str) {
  if (!str) return '';
  return str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
}

// Penalty rounding rule =ROUNDUP(..., -4)
function roundUpPenaltyK(rawK, maxK = 200) {
  if (rawK <= 0) return 0;
  const rounded = Math.ceil(rawK / 10) * 10;
  return Math.min(rounded, maxK);
}

// 1. Kiểm tra danh sách 16 VĐV trong cấu hình tháng 6/2026
console.log('TEST 1: Kiểm tra danh sách 16 VĐV chính thức trong challenge_config.json (Rule #6)...');
const m6Parts = cfg.monthlyParticipants?.['2026_6'];
assert(m6Parts, 'monthlyParticipants[\'2026_6\'] phải tồn tại');
const partKeys = Object.keys(m6Parts);
console.log(`  -> Số lượng VĐV cấu hình: ${partKeys.length}/16`);
assert.strictEqual(partKeys.length, 16, 'Phải có đúng 16 VĐV trong danh sách tháng 6');

// Kiểm tra toàn bộ 16 VĐV có Athlete ID hợp lệ
let allHaveId = true;
partKeys.forEach(k => {
  const p = m6Parts[k];
  if (!p.id || !p.athleteId) {
    allHaveId = false;
    console.error(`  FAIL: VĐV ${k} bị thiếu id hoặc athleteId!`);
  }
});
assert(allHaveId, 'Tất cả 16 VĐV bắt buộc phải có id và athleteId (Rule #6)');
console.log('  [PASS] 16/16 VĐV đều có Athlete ID đầy đủ!\n');

// 2. Kiểm tra phân định ID độc lập cho các VĐV trùng tên (Rule #6: Huy H. vs Huy V.)
console.log('TEST 2: Kiểm thử phân định Runner trùng tên bằng Athlete ID (Rule #6)...');
const huyH = m6Parts['Huy_H.'];
const huyV = m6Parts['Huy_V.'];
assert(huyH && huyV, 'Cả Huy Hoang và Huy Vu phải cùng có trong danh sách');
assert.notStrictEqual(huyH.id, huyV.id, 'Huy H. và Huy V. phải có 2 Athlete ID khác nhau hoàn toàn');
console.log(`  Huy Hoang: ID ${huyH.id} | Huy Vu: ID ${huyV.id}`);
console.log('  [PASS] Phân định độc lập tuyệt đối 2 VĐV cùng tên "Huy" bằng ID!\n');

// 3. Chạy hàm tính toán ma trận ma trận giống processChallengeData của frontend
console.log('TEST 3: Tính toán ma trận tháng 6/2026 bằng logic processChallengeData...');

const daysInMonth = 30; // Tháng 6 có 30 ngày
const runnerStats = {};

Object.keys(m6Parts).forEach(k => {
  const mem = { ...m6Parts[k] };
  runnerStats[k] = {
    key: k,
    id: mem.id,
    name: mem.name || `${mem.firstname} ${mem.lastname}`,
    dailyDist: new Array(daysInMonth + 1).fill(0),
    totalDist: 0
  };
});

// Lọc hoạt động tháng 6/2026
const junActs = hist.filter(act => {
  if (act.private === true || act.private === 'true') return false;
  if (!act.start_date_local) return false;
  return act.start_date_local.startsWith('2026-06');
});

console.log(`  -> Tìm thấy ${junActs.length} hoạt động trong tháng 6/2026`);

// Khớp bằng ID (Rule #6)
junActs.forEach(act => {
  const aid = act.athlete?.id ? String(act.athlete.id) : null;
  if (!aid) return;

  const foundKey = Object.keys(runnerStats).find(k => String(runnerStats[k].id) === aid);
  if (foundKey) {
    const distKm = (act.distance || 0) / 1000;
    const day = parseInt(act.start_date_local.substring(8, 10), 10);
    if (day >= 1 && day <= daysInMonth) {
      runnerStats[foundKey].dailyDist[day] += distKm;
      runnerStats[foundKey].totalDist += distKm;
    }
  }
});

// 4. Đối chiếu từng ngày và tổng tháng với Month-6-2026.csv
console.log('TEST 4: Đối soát chi tiết 16 VĐV qua từng ngày (1-30) và tổng km so với Month-6-2026.csv...');

const csvLines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
const csvRunnerMap = {
  'Huy Hoang': 'Huy_H.',
  'Tien Pham': 'Tien_P.',
  'Xuan Nguyen': 'Thanh_X.',
  'Thoa Nguyen': 'Katy_N.',
  'Quy Truong': 'Quy_T.',
  'Duong Vu': 'Abba_V.',
  'Sang Nguyen': 'Sang_N.',
  'Thinh Vu': 'Thinh_V.',
  'Khuong Pham': 'Khương_P.',
  'Huy Vu': 'Huy_V.',
  'Tam Nguyen': 'Tam_N.',
  'An Ha': 'An_H.',
  'Lieu Vo': 'Lieu_V.',
  'Hieu Dang': 'Benjamin_D.',
  'Cuong Nguyen': 'Cuong_N.',
  'Thanh Dao': 'Thanh_D.'
};

let allRunnerPass = true;

for (let i = 1; i < csvLines.length; i++) {
  const parts = csvLines[i].split(',');
  const csvName = parts[0].trim();
  if (!csvName || !csvRunnerMap[csvName]) continue;

  const matchKey = csvRunnerMap[csvName];
  const stat = runnerStats[matchKey];
  assert(stat, `Không tìm thấy stat cho runner ${csvName} (${matchKey})`);

  // CSV daily values
  const csvDaily = [];
  for (let d = 1; d <= 30; d++) {
    csvDaily.push(parseFloat(parts[d]) || 0);
  }
  const csvTotal = csvDaily.reduce((a, b) => a + b, 0);

  // So sánh tổng km (cho phép sai số làm tròn cực nhỏ < 0.1km do float cộng dồn)
  const totalDiff = Math.abs(stat.totalDist - csvTotal);
  const totalOk = totalDiff < 0.1;

  // So sánh từng ngày
  let dayDiffs = 0;
  for (let d = 1; d <= 30; d++) {
    const diff = Math.abs(stat.dailyDist[d] - csvDaily[d - 1]);
    if (diff > 0.05) dayDiffs++;
  }

  const pass = totalOk && dayDiffs === 0;
  if (!pass) allRunnerPass = false;

  const statusStr = pass ? '[PASS]' : '[FAIL]';
  console.log(`  ${statusStr} #${i.toString().padStart(2)} ${csvName.padEnd(14)} (${matchKey.padEnd(11)}, ID: ${stat.id.padEnd(9)}) | Tổng: ${stat.totalDist.toFixed(2)} km (CSV: ${csvTotal.toFixed(2)} km) | Lệch ngày: ${dayDiffs}`);
}

assert(allRunnerPass, 'Toàn bộ 16 VĐV phải khớp 100% cả từng ngày và tổng tháng với Month-6-2026.csv');
console.log('  [PASS] Toàn bộ 16 VĐV khớp 100% với Month-6-2026.csv!\n');

// 5. Kiểm tra bảng xếp hạng và tính toán tiền phạt theo quy tắc làm tròn mới
console.log('TEST 5: Kiểm tra Bảng xếp hạng & Tiền phạt theo quy tắc ROUNDUP(..., -4)...');

const sortedRunners = Object.values(runnerStats).sort((a, b) => b.totalDist - a.totalDist);

console.log('  BXH Tháng 6/2026:');
sortedRunners.forEach((r, idx) => {
  const targetKey = `${r.key}_2026_6`;
  const tObj = targets[targetKey] || {};
  const targetKm = tObj.target || 0;
  const hasPenalty = !!tObj.penalty;

  let penaltyK = 0;
  let remainingKm = 0;
  if (hasPenalty && targetKm > 0) {
    remainingKm = Math.max(0, targetKm - r.totalDist);
    if (remainingKm > 0) {
      const rawK = 200 * (remainingKm / targetKm);
      penaltyK = roundUpPenaltyK(rawK, 200);
    }
  }

  const targetStr = targetKm > 0 ? `Target: ${targetKm}km (${hasPenalty ? 'Có phạt' : 'Không phạt'})` : 'Target: --';
  const penStr = penaltyK > 0 ? `Phạt: ${penaltyK}k (${(penaltyK * 1000).toLocaleString('vi-VN')} đ)` : (targetKm > 0 && r.totalDist >= targetKm ? 'Đạt mục tiêu 🎉' : '--');

  console.log(`    #${(idx + 1).toString().padStart(2)} ${r.name.padEnd(16)} | Chạy: ${r.totalDist.toFixed(2).padStart(6)} km | ${targetStr.padEnd(25)} | ${penStr}`);
});

// Verify specific penalty cases
// Huy Hoang: Target 150, ran 135.48, remaining 14.52 -> raw: 19.36k -> roundUp: 20k
const huyHStat = runnerStats['Huy_H.'];
const huyHRem = 150 - huyHStat.totalDist;
const huyHPen = roundUpPenaltyK(200 * (huyHRem / 150), 200);
assert.strictEqual(huyHPen, 20, 'Huy Hoang phải có tiền phạt là 20k');

// Tien Pham: Target 150, ran 122.28, remaining 27.72 -> raw: 36.96k -> roundUp: 40k
const tienPStat = runnerStats['Tien_P.'];
const tienPRem = 150 - tienPStat.totalDist;
const tienPPen = roundUpPenaltyK(200 * (tienPRem / 150), 200);
assert.strictEqual(tienPPen, 40, 'Tien Pham phải có tiền phạt là 40k');

// Thoa Nguyen: Target 60, ran 60.10 -> Reached target -> 0k
const katyStat = runnerStats['Katy_N.'];
assert(katyStat.totalDist >= 60, 'Thoa Nguyen phải đạt target 60 km (60.10 km)');

// Xuan Nguyen: Target 68, ran 84.61 -> Reached target -> 0k
const xuanStat = runnerStats['Thanh_X.'];
assert(xuanStat.totalDist >= 68, 'Xuan Nguyen phải đạt target 68 km (84.61 km)');

// Thinh Vu: Target 26, ran 26.28 -> Reached target -> 0k
const thinhStat = runnerStats['Thinh_V.'];
assert(thinhStat.totalDist >= 26, 'Thinh Vu phải đạt target 26 km (26.28 km)');

console.log('\n================================================================');
console.log('TẤT CẢ 5 BỘ TEST CASE ĐỀU PASS 100%! BẢNG THÁNG 6 ĐÃ HOÀN HẢO!');
console.log('================================================================');

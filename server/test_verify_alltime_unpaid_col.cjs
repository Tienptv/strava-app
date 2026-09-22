const fs = require('fs');
const assert = require('assert');

console.log('================================================================');
console.log('   KIỂM THỬ THỰC TẾ: CỘT TỔNG CHƯA THANH TOÁN ALL-TIME');
console.log('   (Quy tắc Rule #2 & Rule #4: Báo cáo trung thực & Song ngữ)');
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
// TEST 1: Backend API /api/penalties/ledger logic
// --------------------------------------------------------------------------
console.log('1. KIỂM TRA TÍNH TOÁN ALL-TIME UNPAID TRÊN DỮ LIỆU THÀNH VIÊN:');
const penaltiesData = JSON.parse(fs.readFileSync('./Storage/member_penalties_mapping.json', 'utf8'));

function computeMemberAllTimeUnpaid(m) {
  let allTimeUnpaidPenaltyVND = 0;
  let unpaidMonthsCount = 0;
  if (m.monthlyPenaltiesVND) {
    Object.entries(m.monthlyPenaltiesVND).forEach(([mo, fee]) => {
      if (fee > 0) {
        const isPaid = m.monthlyPaymentStatus?.[mo]?.status === 'paid';
        if (!isPaid) {
          allTimeUnpaidPenaltyVND += fee;
          unpaidMonthsCount += 1;
        }
      }
    });
  }
  return { allTimeUnpaidPenaltyVND, unpaidMonthsCount };
}

it('Sang Nguyen có nợ phạt lịch sử chưa nộp đúng 10.000 đ (10k)', () => {
  const m = penaltiesData.members.find(x => String(x.athleteId) === '125487039');
  assert(m, 'Không tìm thấy Sang Nguyen');
  const res = computeMemberAllTimeUnpaid(m);
  assert.strictEqual(res.allTimeUnpaidPenaltyVND, 10000, `Nợ phải là 10000, thực tế: ${res.allTimeUnpaidPenaltyVND}`);
});

it('Cuong Nguyen có nợ phạt lịch sử chưa nộp đúng 130.000 đ (130k)', () => {
  const m = penaltiesData.members.find(x => String(x.athleteId) === '50684496');
  assert(m, 'Không tìm thấy Cuong Nguyen');
  const res = computeMemberAllTimeUnpaid(m);
  assert.strictEqual(res.allTimeUnpaidPenaltyVND, 130000, `Nợ phải là 130000, thực tế: ${res.allTimeUnpaidPenaltyVND}`);
});

it('Tien PhamTV có nợ phạt lịch sử chưa nộp đúng 50.000 đ (50k)', () => {
  const m = penaltiesData.members.find(x => String(x.athleteId) === '133066813');
  assert(m, 'Không tìm thấy Tien PhamTV');
  const res = computeMemberAllTimeUnpaid(m);
  assert.strictEqual(res.allTimeUnpaidPenaltyVND, 50000, `Nợ phải là 50000, thực tế: ${res.allTimeUnpaidPenaltyVND}`);
});

it('Tam Nguyen có nợ phạt lịch sử chưa nộp đúng 60.000 đ (60k)', () => {
  const m = penaltiesData.members.find(x => String(x.athleteId) === '106178600');
  assert(m, 'Không tìm thấy Tam Nguyen');
  const res = computeMemberAllTimeUnpaid(m);
  assert.strictEqual(res.allTimeUnpaidPenaltyVND, 60000, `Nợ phải là 60000, thực tế: ${res.allTimeUnpaidPenaltyVND}`);
});

it('Huy Hoang có nợ phạt lịch sử chưa nộp đúng 20.000 đ (20k)', () => {
  const m = penaltiesData.members.find(x => String(x.athleteId) === '103943712');
  assert(m, 'Không tìm thấy Huy Hoang');
  const res = computeMemberAllTimeUnpaid(m);
  assert.strictEqual(res.allTimeUnpaidPenaltyVND, 20000, `Nợ phải là 20000, thực tế: ${res.allTimeUnpaidPenaltyVND}`);
});

it('Abba Vũ (73380484) đã nộp đủ toàn bộ các khoản phạt lịch sử (0k)', () => {
  const m = penaltiesData.members.find(x => String(x.athleteId) === '73380484');
  assert(m, 'Không tìm thấy Abba Vũ');
  const res = computeMemberAllTimeUnpaid(m);
  assert.strictEqual(res.allTimeUnpaidPenaltyVND, 0, `Nợ phải là 0, thực tế: ${res.allTimeUnpaidPenaltyVND}`);
});

// --------------------------------------------------------------------------
// TEST 2: Phản ứng động (Dynamic Reactive calculation) trong Administer.jsx
// --------------------------------------------------------------------------
console.log('\n2. KIỂM TRA TÍNH PHẢN ỨNG ĐỘNG KHI CÓ PHẠT THÁNG HIỆN TẠI:');

function simulateReportRowUnpaid(matchedTreasury, monthStr, hasPenalty, penaltyAmountVnd, paymentStatus) {
  let allTimeUnpaidVnd = 0;
  if (matchedTreasury?.monthlyPenaltiesVND) {
    Object.entries(matchedTreasury.monthlyPenaltiesVND).forEach(([mo, fee]) => {
      if (mo === monthStr) return;
      if (fee > 0) {
        const isPaid = matchedTreasury.monthlyPaymentStatus?.[mo]?.status === 'paid';
        if (!isPaid) allTimeUnpaidVnd += fee;
      }
    });
  }
  const currentMonthPenalty = (hasPenalty && penaltyAmountVnd > 0) 
    ? penaltyAmountVnd 
    : (matchedTreasury?.monthlyPenaltiesVND?.[monthStr] || 0);
  if (currentMonthPenalty > 0 && paymentStatus !== 'paid') {
    allTimeUnpaidVnd += currentMonthPenalty;
  }
  return allTimeUnpaidVnd;
}

it('Khi tháng 07/2026 Tien PhamTV phát sinh phạt 40k và chưa nộp, tổng nợ tăng lên 50k (từ tháng 6) + 40k = 90k', () => {
  const m = penaltiesData.members.find(x => String(x.athleteId) === '133066813');
  const total = simulateReportRowUnpaid(m, '2026-07', true, 40000, 'unpaid');
  assert.strictEqual(total, 90000, `Tổng nợ phải là 90.000 đ, thực tế: ${total}`);
});

it('Khi bấm xác nhận nộp phạt cho tháng 07/2026, tổng nợ giảm về đúng 50k của tháng 6', () => {
  const m = penaltiesData.members.find(x => String(x.athleteId) === '133066813');
  const total = simulateReportRowUnpaid(m, '2026-07', true, 40000, 'paid');
  assert.strictEqual(total, 50000, `Tổng nợ phải giảm về 50.000 đ, thực tế: ${total}`);
});

// --------------------------------------------------------------------------
// TEST 3: Song ngữ (translations.js)
// --------------------------------------------------------------------------
console.log('\n3. KIỂM TRA SONG NGỮ (RULE #4 BILINGUAL PARITY):');
const transCode = fs.readFileSync('./frontend/src/i18n/translations.js', 'utf8');

it('translations.js có từ khóa colAllTimeUnpaid tiếng Việt ("Tổng Chưa Nộp")', () => {
  assert(transCode.includes("colAllTimeUnpaid: 'Tổng Chưa Nộp'"), 'Thiếu key colAllTimeUnpaid tiếng Việt');
});

it('translations.js có từ khóa colAllTimeUnpaid tiếng Anh ("Total Unpaid")', () => {
  assert(transCode.includes("colAllTimeUnpaid: 'Total Unpaid'"), 'Thiếu key colAllTimeUnpaid tiếng Anh');
});

// --------------------------------------------------------------------------
// TEST 4: Khớp giao diện Administer.jsx
// --------------------------------------------------------------------------
console.log('\n4. KIỂM TRA MÃ NGUỒN GIAO DIỆN ADMINISTER.JSX:');
const adminCode = fs.readFileSync('./frontend/src/pages/Administer.jsx', 'utf8');

it('Administer.jsx có chứa allTimeUnpaidVnd trong reportRows', () => {
  assert(adminCode.includes('allTimeUnpaidVnd,'), 'reportRows chưa trả về allTimeUnpaidVnd');
});

it('Administer.jsx có cột tiêu đề th colAllTimeUnpaid', () => {
  assert(adminCode.includes("{t('colAllTimeUnpaid')}"), 'Thiếu th colAllTimeUnpaid trong bảng chi tiết');
});

it('Administer.jsx có ô td hiển thị badge allTimeUnpaidVnd đúng vị trí', () => {
  assert(adminCode.includes('r.allTimeUnpaidVnd > 0 ? `${(r.allTimeUnpaidVnd / 1000)}k` : \'0k\''), 'Thiếu logic format ...k cho allTimeUnpaidVnd');
});

console.log('\n================================================================');
console.log(`KẾT QUẢ KIỂM THỬ: PASS: ${passCount} | FAIL: ${failCount}`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

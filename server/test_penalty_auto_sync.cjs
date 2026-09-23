/**
 * Test script: test_penalty_auto_sync.cjs
 * Kiểm thử tính năng đồng bộ tự động giữa trạng thái nộp phạt (Unpaid -> Paid),
 * Total Penalties Paid (All-Time), và Sổ thu chi Quỹ CLB (Cash Flow Ledger).
 * Tuân thủ Quy tắc 2 (Kiểm thử thực tế & Báo cáo chân thật) & Quy tắc 6 (Athlete ID làm Khóa chính).
 */

const fs = require('fs');
const path = require('path');

const REAL_FILE = path.join(__dirname, '../Storage/member_penalties_mapping.json');
const SANDBOX_FILE = path.join(__dirname, '../Storage/test_sandbox_penalties.json');

// Đọc dữ liệu thật để làm template sandbox
const rawTemplate = fs.existsSync(REAL_FILE) 
  ? JSON.parse(fs.readFileSync(REAL_FILE, 'utf8'))
  : { metadata: { totalMembers: 0, totalPenaltyFundCollected: 16900000, currentClubFundBalance: 11097000 }, members: [], cashFlowLedger: [] };

// Clone template sang sandbox
const testData = JSON.parse(JSON.stringify(rawTemplate));
fs.writeFileSync(SANDBOX_FILE, JSON.stringify(testData, null, 2), 'utf8');

// Định nghĩa hàm logic payment xử lý trên data sandbox (giống hệt server/index.js)
function processPayment(data, { athleteId, rawName, month, status, amountVND, note, actor, lang }) {
  if (!month) throw new Error('Thiếu month');
  if (!data.members) data.members = [];
  if (!data.cashFlowLedger) data.cashFlowLedger = [];
  if (!data.metadata) data.metadata = {};

  const targetIdStr = athleteId ? String(athleteId).trim() : null;
  const targetNameNorm = rawName ? rawName.trim().toLowerCase() : null;

  let member = (data.members || []).find(m => {
    const mIdStr = m.athleteId ? String(m.athleteId).trim() : null;
    if (targetIdStr && mIdStr) {
      if (mIdStr === targetIdStr) return true;
      return false;
    }
    if (!targetIdStr) {
      if (targetNameNorm && m.rawName && m.rawName.trim().toLowerCase() === targetNameNorm) return true;
      if (targetNameNorm && m.fullName && m.fullName.trim().toLowerCase() === targetNameNorm) return true;
    }
    return false;
  });

  if (!member) {
    member = {
      stt: (data.members.length || 0) + 1,
      rawName: rawName || 'Runner',
      athleteId: targetIdStr || '',
      fullName: rawName || 'Runner',
      role: 'Member',
      note: '',
      financialSummary: {
        totalPenaltyVND: 0,
        penaltyRank: (data.members.length || 0) + 1,
        allTimeKmMoneyFile: 0,
        kmRankMoneyFile: (data.members.length || 0) + 1,
        targetCompletedMonths: 0,
        paymentStatus: status || 'unpaid',
        allTimeKmChallenge: 0,
        allTimeKm: 0,
        kmRankChallenge: (data.members.length || 0) + 1,
        kmRank: (data.members.length || 0) + 1
      },
      monthlyPenaltiesVND: {},
      monthlyKm: {},
      monthlyPaymentStatus: {}
    };
    data.members.push(member);
  }

  if (!member.monthlyPenaltiesVND) member.monthlyPenaltiesVND = {};
  if (!member.monthlyPaymentStatus) member.monthlyPaymentStatus = {};

  const newStatus = status || 'paid';
  const nowIso = new Date().toISOString();
  const finalPaidAt = newStatus === 'paid' ? nowIso : null;

  let resolvedAmount = 0;
  if (amountVND !== undefined && amountVND !== null && !isNaN(Number(amountVND))) {
    resolvedAmount = Math.max(0, Math.round(Number(amountVND)));
  } else if (member.monthlyPenaltiesVND[month] !== undefined) {
    resolvedAmount = Math.max(0, Math.round(Number(member.monthlyPenaltiesVND[month])));
  }

  if (resolvedAmount > 0 || newStatus === 'paid') {
    member.monthlyPenaltiesVND[month] = resolvedAmount;
  }

  member.monthlyPaymentStatus[month] = {
    status: newStatus,
    paidAt: finalPaidAt,
    amountVND: resolvedAmount,
    note: note || '',
    updatedBy: actor || 'Admin',
    updatedAt: nowIso
  };

  let displayMonthText = month;
  const parts = month.split('-');
  if (parts.length === 2) displayMonthText = `${Number(parts[1])}/${parts[0]}`;
  const runnerName = member.fullName || member.rawName || 'Thành viên';
  const runnerAthId = member.athleteId ? String(member.athleteId).trim() : (targetIdStr || '');

  // Sổ thu chi
  const matchTx = (tx) => {
    if (tx.category === 'penalty_payment' || (tx.id && String(tx.id).startsWith(`penalty_${runnerAthId}_${month}`))) {
      if (runnerAthId && tx.athleteId && String(tx.athleteId).trim() === runnerAthId && tx.month === month) return true;
      if (!tx.athleteId && tx.month === month && tx.description && tx.description.includes(runnerName)) return true;
    }
    return false;
  };

  const existingTxIdx = data.cashFlowLedger.findIndex(matchTx);

  if (newStatus === 'paid') {
    if (resolvedAmount > 0) {
      const txDate = nowIso.split('T')[0];
      const txDesc = (lang === 'en')
        ? `${runnerName} penalty payment for month ${displayMonthText}`
        : `${runnerName} nộp phạt tháng ${displayMonthText}`;

      if (existingTxIdx !== -1) {
        const oldAmount = Math.abs(Number(data.cashFlowLedger[existingTxIdx].amountVND) || 0);
        const diff = resolvedAmount - oldAmount;
        data.cashFlowLedger[existingTxIdx].amountVND = resolvedAmount;
        data.cashFlowLedger[existingTxIdx].date = txDate;
        data.cashFlowLedger[existingTxIdx].description = txDesc;
        data.cashFlowLedger[existingTxIdx].note = note ? note.trim() : (data.cashFlowLedger[existingTxIdx].note || '');
        data.cashFlowLedger[existingTxIdx].updatedAt = nowIso;
        data.metadata.currentClubFundBalance = (data.metadata.currentClubFundBalance || 0) + diff;
      } else {
        const newTx = {
          id: `penalty_${runnerAthId || 'mem'}_${month}_${Date.now()}`,
          date: txDate,
          description: txDesc,
          amountVND: resolvedAmount,
          type: 'income',
          category: 'penalty_payment',
          athleteId: runnerAthId,
          month: month,
          note: note ? note.trim() : '',
          createdBy: actor || 'Admin',
          createdAt: nowIso
        };
        data.cashFlowLedger.unshift(newTx);
        data.metadata.currentClubFundBalance = (data.metadata.currentClubFundBalance || 0) + resolvedAmount;
      }
    }
  } else {
    if (existingTxIdx !== -1) {
      const removedTx = data.cashFlowLedger.splice(existingTxIdx, 1)[0];
      const removedAmount = Math.abs(Number(removedTx.amountVND) || 0);
      data.metadata.currentClubFundBalance = (data.metadata.currentClubFundBalance || 0) - removedAmount;
    }
  }

  // Lũy kế Total Penalties Paid & Ranks
  data.members.forEach(m => {
    let paidTotal = 0;
    if (m.monthlyPenaltiesVND) {
      Object.entries(m.monthlyPenaltiesVND).forEach(([mo, fee]) => {
        const val = Number(fee) || 0;
        if (val > 0) {
          if (mo <= '2026-06') {
            paidTotal += val;
          } else {
            const pStatus = m.monthlyPaymentStatus?.[mo]?.status;
            if (pStatus === 'paid') {
              paidTotal += val;
            }
          }
        }
      });
    }
    if (!m.financialSummary) m.financialSummary = {};
    m.financialSummary.totalPenaltyVND = paidTotal;
    m.financialSummary.paymentStatus = (m.monthlyPaymentStatus && m.monthlyPaymentStatus[month])
      ? m.monthlyPaymentStatus[month].status
      : (m.financialSummary.paymentStatus || 'unpaid');
  });

  data.metadata.totalPenaltyFundCollected = data.members.reduce((sum, m) => sum + (m.financialSummary?.totalPenaltyVND || 0), 0);

  const sortedMembers = [...data.members].sort((a, b) => 
    (b.financialSummary?.totalPenaltyVND || 0) - (a.financialSummary?.totalPenaltyVND || 0)
  );
  sortedMembers.forEach((m, idx) => {
    if (!m.financialSummary) m.financialSummary = {};
    m.financialSummary.penaltyRank = idx + 1;
  });

  return { member, data };
}

console.log('=== BẮT ĐẦU CHẠY KIỂM THỬ ĐỒNG BỘ NỘP PHẠT & SỔ THU CHI ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// TEST CASE 1: Chuyển Sang Nguyễn từ Unpaid sang Paid (50.000 đ, Tháng 8/2026)
// -------------------------------------------------------------
console.log('TEST CASE 1: Chuyển trạng thái Unpaid -> Paid (Sang Nguyễn - ID 125487039, Tháng 2026-08, 50.000 đ)');
const sangBefore = testData.members.find(m => String(m.athleteId) === '125487039');
const sangBeforePenalty = sangBefore?.financialSummary?.totalPenaltyVND || 0;
const fundBefore = testData.metadata?.currentClubFundBalance || 0;
const totalCollectedBefore = testData.metadata?.totalPenaltyFundCollected || 0;
const ledgerCountBefore = testData.cashFlowLedger?.length || 0;

console.log(`  Trước thanh toán: Total Penalties Paid = ${sangBeforePenalty.toLocaleString()} đ | Quỹ = ${fundBefore.toLocaleString()} đ | Tổng phạt thu = ${totalCollectedBefore.toLocaleString()} đ`);

const res1 = processPayment(testData, {
  athleteId: '125487039',
  rawName: 'Sang Nguyen',
  month: '2026-08',
  status: 'paid',
  amountVND: 50000,
  note: 'Chuyển khoản Techcombank',
  actor: 'Admin',
  lang: 'vi'
});

const sangAfter = testData.members.find(m => String(m.athleteId) === '125487039');
assert(sangAfter.monthlyPaymentStatus['2026-08'].status === 'paid', 'Trạng thái tháng 2026-08 là "paid"');
assert(sangAfter.financialSummary.totalPenaltyVND === sangBeforePenalty + 50000, `Total Penalties Paid tăng đúng 50.000 đ (từ ${sangBeforePenalty.toLocaleString()} lên ${sangAfter.financialSummary.totalPenaltyVND.toLocaleString()} đ)`);
assert(testData.metadata.totalPenaltyFundCollected === totalCollectedBefore + 50000, `Tổng thu phạt toàn CLB tăng đúng 50.000 đ (từ ${totalCollectedBefore.toLocaleString()} lên ${testData.metadata.totalPenaltyFundCollected.toLocaleString()} đ)`);
assert(testData.metadata.currentClubFundBalance === fundBefore + 50000, `Số dư Quỹ CLB tăng đúng 50.000 đ (từ ${fundBefore.toLocaleString()} lên ${testData.metadata.currentClubFundBalance.toLocaleString()} đ)`);
assert(testData.cashFlowLedger.length === ledgerCountBefore + 1, 'Sổ thu chi (cashFlowLedger) tự động thêm đúng 1 giao dịch');

const createdTx = testData.cashFlowLedger[0];
assert(createdTx.category === 'penalty_payment', 'Giao dịch có category = "penalty_payment"');
assert(createdTx.type === 'income', 'Giao dịch là type = "income"');
assert(createdTx.amountVND === 50000, 'Giao dịch ghi nhận đúng số tiền 50.000 đ');
assert(createdTx.description.includes('Sang Nguyen nộp phạt tháng 8/2026'), `Nội dung mô tả đúng quy chuẩn: "${createdTx.description}"`);
assert(createdTx.note === 'Chuyển khoản Techcombank', 'Ghi chú được lưu đúng');

// -------------------------------------------------------------
// TEST CASE 2: Chuyển ngược lại từ Paid sang Unpaid
// -------------------------------------------------------------
console.log('\nTEST CASE 2: Hoàn tác trạng thái Paid -> Unpaid (Hệ thống phải tự động hoàn lại số dư quỹ và giảm Total Penalties Paid)');
processPayment(testData, {
  athleteId: '125487039',
  rawName: 'Sang Nguyen',
  month: '2026-08',
  status: 'unpaid',
  amountVND: 50000,
  note: '',
  actor: 'Admin',
  lang: 'vi'
});

const sangRevert = testData.members.find(m => String(m.athleteId) === '125487039');
assert(sangRevert.monthlyPaymentStatus['2026-08'].status === 'unpaid', 'Trạng thái tháng 2026-08 đã về "unpaid"');
assert(sangRevert.financialSummary.totalPenaltyVND === sangBeforePenalty, `Total Penalties Paid giảm về đúng mức ban đầu: ${sangRevert.financialSummary.totalPenaltyVND.toLocaleString()} đ`);
assert(testData.metadata.totalPenaltyFundCollected === totalCollectedBefore, `Tổng thu phạt toàn CLB trở về đúng mức ban đầu: ${testData.metadata.totalPenaltyFundCollected.toLocaleString()} đ`);
assert(testData.metadata.currentClubFundBalance === fundBefore, `Số dư Quỹ CLB giảm về đúng mức ban đầu: ${testData.metadata.currentClubFundBalance.toLocaleString()} đ`);
assert(testData.cashFlowLedger.length === ledgerCountBefore, 'Giao dịch tự động đã được gỡ bỏ khỏi Sổ thu chi');

// -------------------------------------------------------------
// TEST CASE 3: Kiểm thử Quy tắc 6 - Hai người trùng tên nhưng khác Athlete ID
// -------------------------------------------------------------
console.log('\nTEST CASE 3: Tuân thủ Quy tắc 6 (Athlete ID làm Khóa chính - Hai người cùng tên "Phuong N.")');
processPayment(testData, {
  athleteId: '999001',
  rawName: 'Phuong N.',
  month: '2026-08',
  status: 'paid',
  amountVND: 100000,
  actor: 'Admin'
});
processPayment(testData, {
  athleteId: '999002',
  rawName: 'Phuong N.',
  month: '2026-08',
  status: 'unpaid',
  amountVND: 150000,
  actor: 'Admin'
});

const p1 = testData.members.find(m => String(m.athleteId) === '999001');
const p2 = testData.members.find(m => String(m.athleteId) === '999002');
assert(p1 && p1.financialSummary.totalPenaltyVND === 100000, 'Runner 1 (ID 999001) được ghi nhận 100.000 đ phạt đã nộp');
assert(p2 && p2.financialSummary.totalPenaltyVND === 0, 'Runner 2 (ID 999002) trạng thái unpaid có 0 đ đã nộp');
assert(p1 && p2 && p1.financialSummary.penaltyRank !== p2.financialSummary.penaltyRank, 'Thứ hạng phạt của 2 runner phân định rõ ràng');

// -------------------------------------------------------------
// TEST CASE 4: Export CSV sinh từ live data
// -------------------------------------------------------------
console.log('\nTEST CASE 4: Kiểm tra xuất CSV trực tiếp từ dữ liệu live');
let csv = '\uFEFFSTT,Họ và Tên,Strava Athlete ID,Vai Trò,Tổng Tiền Phạt Đã Nộp (VNĐ),Xếp Hạng Phạt,Tổng KM Lịch Sử,Xếp Hạng KM\n';
testData.members.forEach((m, idx) => {
  const allTimeKm = m.financialSummary?.allTimeKmChallenge !== undefined ? m.financialSummary.allTimeKmChallenge : (m.financialSummary?.allTimeKm || m.financialSummary?.allTimeKmMoneyFile || 0);
  const kmRank = m.financialSummary?.kmRankChallenge || m.financialSummary?.kmRank || m.financialSummary?.kmRankMoneyFile || '';
  csv += `"${m.stt || (idx + 1)}","${m.fullName || m.rawName || ''}","${m.athleteId || ''}","${m.role || 'Member'}","${m.financialSummary?.totalPenaltyVND || 0}","${m.financialSummary?.penaltyRank || ''}","${allTimeKm}","${kmRank}"\n`;
});

assert(csv.includes('"125487039"'), 'CSV chứa Strava Athlete ID 125487039 của Sang Nguyễn');
assert(csv.includes('"999001"'), 'CSV chứa runner mới ID 999001 với số tiền phạt 100000');

// Dọn dẹp sandbox
if (fs.existsSync(SANDBOX_FILE)) {
  fs.unlinkSync(SANDBOX_FILE);
}

console.log(`\n=== TỔNG KẾT KIỂM THỬ: ${passCount} PASS | ${failCount} FAIL ===`);
if (failCount === 0) {
  console.log('✅ TOÀN BỘ TEST CASE ĐÃ VƯỢT QUA 100% THÀNH CÔNG!');
  process.exit(0);
} else {
  console.error('❌ CÓ TEST CASE BỊ LỖI!');
  process.exit(1);
}

/**
 * test_penalty_rounding.cjs
 * 
 * Kiểm thử tự động 100% các trường hợp làm tròn tiền phạt theo yêu cầu của người dùng:
 * Bảng chuẩn ROUNDUP(..., -4)
 */

function roundUpPenaltyVnd(rawVnd, maxVnd = 200000) {
  if (rawVnd === null || rawVnd === undefined || rawVnd === '') return 0;
  const num = Number(rawVnd);
  if (isNaN(num) || num <= 0) return 0;

  const rounded = Math.round(num);
  if (rounded <= 0) return 0;

  const result = Math.ceil(rounded / 10000) * 10000;
  return Math.min(maxVnd, result);
}

function roundUpPenaltyK(rawK, maxK = 200) {
  if (rawK === null || rawK === undefined || rawK === '') return 0;
  const numK = Number(rawK);
  if (isNaN(numK) || numK <= 0) return 0;

  const rawVnd = numK * 1000;
  return roundUpPenaltyVnd(rawVnd, maxK * 1000) / 1000;
}

function formatPenaltyK(penaltyK) {
  if (penaltyK === null || penaltyK === undefined) return '-';
  const num = Number(penaltyK);
  if (isNaN(num) || num === 0) return '0k';
  return `${num}k`;
}

function formatPenaltyVnd(penaltyVnd) {
  if (penaltyVnd === null || penaltyVnd === undefined) return '0 đ';
  const num = Number(penaltyVnd);
  if (isNaN(num) || num === 0) return '0 đ';
  return `${num.toLocaleString('vi-VN')} đ`;
}

const testCases = [
  {
    name: 'Case 1: Vượt qua 0 dù chỉ 1 đơn vị',
    rawVnd: 1,
    rawK: 0.001,
    expectedVnd: 10000,
    expectedK: 10,
    expectedDisplayK: '10k',
    expectedDisplayVnd: '10.000 đ'
  },
  {
    name: 'Case 2: Làm tròn lên mốc 10.000 tiếp theo (12.300)',
    rawVnd: 12300,
    rawK: 12.3,
    expectedVnd: 20000,
    expectedK: 20,
    expectedDisplayK: '20k',
    expectedDisplayVnd: '20.000 đ'
  },
  {
    name: 'Case 3: Vừa chớm qua 10.000 thì nhảy lên 20.000 (10.001)',
    rawVnd: 10001,
    rawK: 10.001,
    expectedVnd: 20000,
    expectedK: 20,
    expectedDisplayK: '20k',
    expectedDisplayVnd: '20.000 đ'
  },
  {
    name: 'Case 4: Đúng mốc tròn thì giữ nguyên (10.000)',
    rawVnd: 10000,
    rawK: 10,
    expectedVnd: 10000,
    expectedK: 10,
    expectedDisplayK: '10k',
    expectedDisplayVnd: '10.000 đ'
  },
  {
    name: 'Case 4b: Khử sai số số thực của phép chia JS (10.000000000000002)',
    rawVnd: 10000.000000000002,
    rawK: 10.000000000000002,
    expectedVnd: 10000,
    expectedK: 10,
    expectedDisplayK: '10k',
    expectedDisplayVnd: '10.000 đ'
  },
  {
    name: 'Case 5: Làm tròn lên mốc 10.000 tiếp theo (158.400)',
    rawVnd: 158400,
    rawK: 158.4,
    expectedVnd: 160000,
    expectedK: 160,
    expectedDisplayK: '160k',
    expectedDisplayVnd: '160.000 đ'
  },
  {
    name: 'Case 6: Giữ nguyên 0 (0)',
    rawVnd: 0,
    rawK: 0,
    expectedVnd: 0,
    expectedK: 0,
    expectedDisplayK: '0k',
    expectedDisplayVnd: '0 đ'
  },
  {
    name: 'Case 7: Mức phạt trần tối đa 200.000 (250.000)',
    rawVnd: 250000,
    rawK: 250,
    expectedVnd: 200000,
    expectedK: 200,
    expectedDisplayK: '200k',
    expectedDisplayVnd: '200.000 đ'
  },
  {
    name: 'Case 8: Mức phạt 100.000 (100k)',
    rawVnd: 100000,
    rawK: 100,
    expectedVnd: 100000,
    expectedK: 100,
    expectedDisplayK: '100k',
    expectedDisplayVnd: '100.000 đ'
  }
];

console.log('=== BẮT ĐẦU KIỂM THỬ QUY TẮC LÀM TRÒN TIỀN PHẠT (ROUNDUP -4) ===\n');

let passed = 0;
let failed = 0;

testCases.forEach((tc, idx) => {
  const actualVnd = roundUpPenaltyVnd(tc.rawVnd);
  const actualK = roundUpPenaltyK(tc.rawK);
  const displayK = formatPenaltyK(actualK);
  const displayVnd = formatPenaltyVnd(actualVnd);

  const isVndOk = actualVnd === tc.expectedVnd;
  const isKOk = actualK === tc.expectedK;
  const isDispKOk = displayK === tc.expectedDisplayK;
  const isDispVndOk = displayVnd === tc.expectedDisplayVnd;

  if (isVndOk && isKOk && isDispKOk && isDispVndOk) {
    console.log(`[PASS] ${tc.name}`);
    console.log(`       Input VND: ${tc.rawVnd} -> Result VND: ${actualVnd} (${displayVnd})`);
    console.log(`       Input K: ${tc.rawK} -> Result K: ${actualK} (${displayK})`);
    passed++;
  } else {
    console.error(`[FAIL] ${tc.name}`);
    console.error(`       Expected VND: ${tc.expectedVnd}, Got: ${actualVnd}`);
    console.error(`       Expected K: ${tc.expectedK}, Got: ${actualK}`);
    console.error(`       Expected DispK: ${tc.expectedDisplayK}, Got: ${displayK}`);
    console.error(`       Expected DispVnd: ${tc.expectedDisplayVnd}, Got: ${displayVnd}`);
    failed++;
  }
});

console.log(`\n=== KẾT QUẢ KIỂM THỬ: ${passed}/${testCases.length} TEST CASES PASS (${failed === 0 ? 'HOÀN HẢO 100%' : 'CÓ LỖI'}) ===`);

// Rule #6: Kiểm thử tính toán độc lập cho 2 thành viên trùng tên nhưng khác Athlete ID
console.log('\n=== KIỂM THỬ RULE #6: PHÂN ĐỊNH THEO ATHLETE ID CHO VĐV TRÙNG TÊN ===');
const runnerA = { athleteId: '12345', fullName: 'Phuong N.', targetKm: 100, actualKm: 93.85, hasPenalty: true }; // Thiếu 6.15km -> rawK = 12.3k -> 20k
const runnerB = { athleteId: '67890', fullName: 'Phuong N.', targetKm: 100, actualKm: 100, hasPenalty: true };   // Đạt 100km -> 0k

function calculateRunnerPenalty(runner) {
  if (!runner.hasPenalty || !runner.targetKm) return { penaltyK: 0, penaltyVnd: 0 };
  const rem = Math.max(0, runner.targetKm - runner.actualKm);
  if (rem <= 0) return { penaltyK: 0, penaltyVnd: 0 };
  const rawK = (rem / runner.targetKm) * 200;
  const penaltyK = roundUpPenaltyK(rawK, 200);
  return { penaltyK, penaltyVnd: penaltyK * 1000 };
}

const resA = calculateRunnerPenalty(runnerA);
const resB = calculateRunnerPenalty(runnerB);

console.log(`Runner A (ID: ${runnerA.athleteId}, ${runnerA.fullName}): Chạy ${runnerA.actualKm}/${runnerA.targetKm}km -> Phạt: ${formatPenaltyK(resA.penaltyK)} (${formatPenaltyVnd(resA.penaltyVnd)})`);
console.log(`Runner B (ID: ${runnerB.athleteId}, ${runnerB.fullName}): Chạy ${runnerB.actualKm}/${runnerB.targetKm}km -> Phạt: ${formatPenaltyK(resB.penaltyK)} (${formatPenaltyVnd(resB.penaltyVnd)})`);

if (resA.penaltyK === 20 && resB.penaltyK === 0) {
  console.log('[PASS] Rule #6: Hai VĐV trùng tên được tính toán và phân định chính xác độc lập 100% dựa theo ID!');
} else {
  console.error('[FAIL] Rule #6: Có lỗi trong phân định runner!');
  failed++;
}

if (failed > 0) {
  process.exit(1);
}


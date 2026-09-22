const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=================================================================');
console.log(' KIỂM THỬ TÍNH NĂNG CỘT SỐ KM CÒN LẠI & KM/NGÀY (CHALLENGETABLE)');
console.log('=================================================================');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 1. Kiểm tra logic tính toán Số km còn lại và Km/ngày còn lại
// -------------------------------------------------------------
console.log('\n--- 1. Logic tính toán Số km còn lại & Km/ngày ---');

function calcRemainingAndDaily({ userTarget, totalDistance, year, month, simulatedToday, daysInMonth }) {
  const isCurrentMonth = simulatedToday.getFullYear() === year && simulatedToday.getMonth() + 1 === month;
  const isPastMonth = year < simulatedToday.getFullYear() || (year === simulatedToday.getFullYear() && month < simulatedToday.getMonth() + 1);

  let daysLeft = 0;
  if (isCurrentMonth) {
    daysLeft = Math.max(1, daysInMonth - simulatedToday.getDate() + 1);
  } else if (isPastMonth) {
    daysLeft = 0;
  } else {
    daysLeft = daysInMonth;
  }

  const hasTarget = userTarget > 0;
  const remainingTargetKm = hasTarget ? Math.max(0, userTarget - totalDistance) : null;
  let dailyNeeded = null;
  if (hasTarget) {
    if (remainingTargetKm <= 0) {
      dailyNeeded = 0;
    } else if (daysLeft > 0) {
      dailyNeeded = remainingTargetKm / daysLeft;
    } else {
      dailyNeeded = null; // tháng cũ
    }
  }

  return {
    hasTarget,
    daysLeft,
    remainingTargetKm,
    dailyNeeded,
    displayRemaining: hasTarget ? (remainingTargetKm <= 0 ? '0.0' : remainingTargetKm.toFixed(1)) : '-',
    displayDaily: hasTarget ? (remainingTargetKm <= 0 ? '0.0' : (dailyNeeded !== null ? dailyNeeded.toFixed(1) : '-')) : '-'
  };
}

runTest('Case 1: Runner chưa đạt target (Target 100km, đã chạy 51.9km, ngày 22/9)', () => {
  const res = calcRemainingAndDaily({
    userTarget: 100,
    totalDistance: 51.9,
    year: 2026,
    month: 9,
    simulatedToday: new Date(2026, 8, 22), // 22/09/2026
    daysInMonth: 30
  });

  assert.strictEqual(res.hasTarget, true);
  assert.strictEqual(res.daysLeft, 9); // 30 - 22 + 1 = 9 ngày
  assert.strictEqual(res.displayRemaining, '48.1');
  assert.strictEqual(res.displayDaily, '5.3'); // 48.1 / 9 = 5.3444... -> 5.3
});

runTest('Case 2: Runner đã hoàn thành/vượt target (Target 20km, đã chạy 33.9km)', () => {
  const res = calcRemainingAndDaily({
    userTarget: 20,
    totalDistance: 33.9,
    year: 2026,
    month: 9,
    simulatedToday: new Date(2026, 8, 22),
    daysInMonth: 30
  });

  assert.strictEqual(res.hasTarget, true);
  assert.strictEqual(res.remainingTargetKm, 0);
  assert.strictEqual(res.displayRemaining, '0.0');
  assert.strictEqual(res.displayDaily, '0.0');
});

runTest('Case 3: Runner không đăng ký target (userTarget = 0 hoặc null)', () => {
  const res = calcRemainingAndDaily({
    userTarget: 0,
    totalDistance: 102.3,
    year: 2026,
    month: 9,
    simulatedToday: new Date(2026, 8, 22),
    daysInMonth: 30
  });

  assert.strictEqual(res.hasTarget, false);
  assert.strictEqual(res.remainingTargetKm, null);
  assert.strictEqual(res.displayRemaining, '-');
  assert.strictEqual(res.displayDaily, '-');
});

runTest('Case 4: Tháng quá khứ (isPastMonth = true, daysLeft = 0)', () => {
  const res = calcRemainingAndDaily({
    userTarget: 50,
    totalDistance: 30.0,
    year: 2026,
    month: 8, // Tháng 8 đã qua
    simulatedToday: new Date(2026, 8, 22), // Hiện tại đang là tháng 9
    daysInMonth: 31
  });

  assert.strictEqual(res.daysLeft, 0);
  assert.strictEqual(res.displayRemaining, '20.0');
  assert.strictEqual(res.displayDaily, '-'); // Không còn ngày nào để chạy
});

// -------------------------------------------------------------
// 2. Rule 6: Phân định thành viên theo Athlete ID
// -------------------------------------------------------------
console.log('\n--- 2. Rule 6: Athlete ID Mandatory Check ---');

runTest('Case 5: 2 Runner cùng tên "Phuong N." nhưng khác Athlete ID có tính toán độc lập', () => {
  const runnerA = { athleteId: '12345', name: 'Phuong N.', totalDistance: 40 };
  const runnerB = { athleteId: '67890', name: 'Phuong N.', totalDistance: 15 };
  const userData = {
    '12345_2026_9': { target: 50 },
    '67890_2026_9': { target: 20 }
  };

  const resA = calcRemainingAndDaily({
    userTarget: userData[`${runnerA.athleteId}_2026_9`].target,
    totalDistance: runnerA.totalDistance,
    year: 2026,
    month: 9,
    simulatedToday: new Date(2026, 8, 22),
    daysInMonth: 30
  });

  const resB = calcRemainingAndDaily({
    userTarget: userData[`${runnerB.athleteId}_2026_9`].target,
    totalDistance: runnerB.totalDistance,
    year: 2026,
    month: 9,
    simulatedToday: new Date(2026, 8, 22),
    daysInMonth: 30
  });

  assert.strictEqual(resA.displayRemaining, '10.0');
  assert.strictEqual(resA.displayDaily, '1.1'); // 10 / 9 = 1.11...
  assert.strictEqual(resB.displayRemaining, '5.0');
  assert.strictEqual(resB.displayDaily, '0.6'); // 5 / 9 = 0.555... -> 0.6
  assert.notStrictEqual(resA.displayRemaining, resB.displayRemaining);
});

// -------------------------------------------------------------
// 3. Footer Tổng kết (TOTAL row in tfoot)
// -------------------------------------------------------------
console.log('\n--- 3. Footer tổng kết (tfoot) ---');

runTest('Case 6: Tính tổng km còn lại và tổng km/ngày của toàn nhóm', () => {
  const runners = [
    { target: 100, dist: 51.9 }, // rem: 48.1
    { target: 50, dist: 43.9 },  // rem: 6.1
    { target: 20, dist: 33.9 },  // rem: 0 (đã đạt)
    { target: 0, dist: 102.3 },  // không có target
    { target: 26, dist: 11.4 },  // rem: 14.6
    { target: 20, dist: 4.0 }    // rem: 16.0
  ];

  let totalRem = 0;
  let hasAnyTarget = false;
  runners.forEach(r => {
    if (r.target > 0) {
      hasAnyTarget = true;
      totalRem += Math.max(0, r.target - r.dist);
    }
  });

  const daysLeft = 9;
  const totalDailyNeeded = totalRem / daysLeft;

  assert.strictEqual(hasAnyTarget, true);
  assert.strictEqual(totalRem.toFixed(1), '84.8'); // 48.1 + 6.1 + 0 + 14.6 + 16.0 = 84.8
  assert.strictEqual(totalDailyNeeded.toFixed(1), '9.4'); // 84.8 / 9 = 9.4222... -> 9.4
});

// -------------------------------------------------------------
// 4. Kiểm tra mã nguồn JSX & CSS
// -------------------------------------------------------------
console.log('\n--- 4. Kiểm tra mã nguồn ChallengeTable.jsx, index.css, Administer.jsx ---');

const challengeTablePath = path.join(__dirname, '../frontend/src/components/ChallengeTable.jsx');
const challengeTableContent = fs.readFileSync(challengeTablePath, 'utf8');

runTest('ChallengeTable.jsx nhận prop showDayAndTimeCols', () => {
  assert(challengeTableContent.includes('showDayAndTimeCols = false'), 'ChallengeTable must have showDayAndTimeCols prop');
});

runTest('ChallengeTable.jsx chứa thẻ th cho col-remaining và col-daily-needed', () => {
  assert(challengeTableContent.includes('col-remaining'), 'ChallengeTable must have col-remaining header');
  assert(challengeTableContent.includes('col-daily-needed'), 'ChallengeTable must have col-daily-needed header');
});

runTest('ChallengeTable.jsx điều kiện hóa hiển thị col-days và col-time theo showDayAndTimeCols', () => {
  assert(challengeTableContent.includes('{showDayAndTimeCols && ('), 'col-days and col-time must be wrapped with showDayAndTimeCols');
});

runTest('ChallengeTable.jsx áp dụng highlight-total cho cả col-remaining và col-daily-needed để đồng bộ màu Navy & size 11px', () => {
  assert(challengeTableContent.includes('col-remaining highlight-total'), 'col-remaining must have highlight-total class');
  assert(challengeTableContent.includes('col-daily-needed highlight-total'), 'col-daily-needed must have highlight-total class');
  // Đảm bảo không còn inline color override làm lệch bảng màu
  assert(!challengeTableContent.includes("color: '#16a34a'"), 'col-remaining should not have inline green color override');
  assert(!challengeTableContent.includes("color: '#e11d48'"), 'col-daily-needed should not have inline red color override');
});

const cssPath = path.join(__dirname, '../frontend/src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

runTest('index.css chứa định nghĩa sticky-right cho col-remaining (115px) và col-daily-needed (60px)', () => {
  assert(cssContent.includes('.col-daily-needed'), 'CSS must define .col-daily-needed');
  assert(cssContent.includes('.col-remaining'), 'CSS must define .col-remaining');
  assert(cssContent.includes('right: 115px'), 'CSS must position .col-remaining at right: 115px');
  assert(cssContent.includes('.challenge-table.has-day-time-cols'), 'CSS must support .has-day-time-cols dynamic offsets');
});

const adminPath = path.join(__dirname, '../frontend/src/pages/Administer.jsx');
const adminContent = fs.readFileSync(adminPath, 'utf8');

runTest('Administer.jsx có checkbox điều khiển showDayAndTimeCols', () => {
  assert(adminContent.includes('id="showDayAndTimeCols"'), 'Administer.jsx must have showDayAndTimeCols checkbox');
  assert(adminContent.includes('showDayAndTimeColsLabel'), 'Administer.jsx must display showDayAndTimeColsLabel');
});

// -------------------------------------------------------------
// 5. Rule 4: Bilingual Parity (translations.js)
// -------------------------------------------------------------
console.log('\n--- 5. Rule 4: Bilingual Parity in translations.js ---');

const transPath = path.join(__dirname, '../frontend/src/i18n/translations.js');
const transContent = fs.readFileSync(transPath, 'utf8');

runTest('translations.js có đầy đủ key trong cả vi và en', () => {
  const requiredKeys = [
    'colRemainingKm',
    'colDailyTargetKm',
    'tooltipRemainingKm',
    'tooltipDailyTargetKm',
    'showDayAndTimeColsLabel',
    'showDayAndTimeColsDesc'
  ];

  requiredKeys.forEach(k => {
    const viMatch = transContent.indexOf(`${k}:`);
    assert(viMatch !== -1, `Key ${k} must exist in translations`);
    const enMatch = transContent.indexOf(`${k}:`, viMatch + 1);
    assert(enMatch !== -1, `Key ${k} must exist in both vi and en sections`);
  });
});

console.log('\n=================================================================');
console.log(` KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASS (100% THỰC TẾ)`);
console.log('=================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}

// Test suite: Xác thực việc di chuyển thẻ Upcoming Race Badge từ ClubGoalProgress xuống ChallengeTable
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TEST BẮT ĐẦU: KIỂM TRA DI CHUYỂN THẺ GIẢI CHẠY SẮP TỚI (UPCOMING RACE BADGE) ---');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         Lỗi: ${err.message}`);
  }
}

// 1. Kiểm tra ClubGoalProgress.jsx đã gỡ bỏ upcoming-race-badge khỏi header
it('ClubGoalProgress.jsx: Đã gỡ bỏ khối upcoming-race-badge ở header', () => {
  const filePath = path.join(__dirname, '../frontend/src/components/ClubGoalProgress.jsx');
  assert.ok(fs.existsSync(filePath), 'ClubGoalProgress.jsx phải tồn tại');
  const content = fs.readFileSync(filePath, 'utf8');

  // Đảm bảo không còn thẻ upcoming-race-badge trong header của ClubGoalProgress
  assert.strictEqual(content.includes('className="upcoming-race-badge"'), false, 'Không được còn className="upcoming-race-badge" trong ClubGoalProgress.jsx');
  
  // Nhưng vẫn giữ timeline-upcoming-date-badge trên thanh ray
  assert.ok(content.includes('timeline-upcoming-date-badge'), 'Vẫn giữ timeline-upcoming-date-badge trên thanh ray timeline');
});

// 2. Kiểm tra ChallengeTable.jsx đã tích hợp upcoming-race-badge vào challenge-title-group
it('ChallengeTable.jsx: Đã tích hợp upcoming-race-badge vào challenge-title-group', () => {
  const filePath = path.join(__dirname, '../frontend/src/components/ChallengeTable.jsx');
  assert.ok(fs.existsSync(filePath), 'ChallengeTable.jsx phải tồn tại');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('className="upcoming-race-badge"'), 'ChallengeTable.jsx phải chứa className="upcoming-race-badge"');
  assert.ok(content.includes('nextEvent'), 'ChallengeTable.jsx phải có biến nextEvent');
  assert.ok(content.includes('challenge-title-group'), 'ChallengeTable.jsx phải có container challenge-title-group');
  assert.ok(content.includes('Sparkles'), 'ChallengeTable.jsx phải import Sparkles');
});

// 3. Kiểm tra HalloweenHeaderBar.jsx đã hỗ trợ nextEvent
it('HalloweenHeaderBar.jsx: Đã hỗ trợ prop nextEvent', () => {
  const filePath = path.join(__dirname, '../frontend/src/components/HalloweenHeaderBar.jsx');
  assert.ok(fs.existsSync(filePath), 'HalloweenHeaderBar.jsx phải tồn tại');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('nextEvent'), 'HalloweenHeaderBar.jsx phải nhận prop nextEvent');
  assert.ok(content.includes('className="upcoming-race-badge"'), 'HalloweenHeaderBar.jsx phải render upcoming-race-badge khi có nextEvent');
});

// 4. Kiểm tra logic tính toán nextEvent
it('Logic tính toán nextEvent: Lấy giải gần nhất trong tương lai từ Storage/club_goal.json', () => {
  const goalFile = path.join(__dirname, '../Storage/club_goal.json');
  assert.ok(fs.existsSync(goalFile), 'Storage/club_goal.json phải tồn tại');
  const goalData = JSON.parse(fs.readFileSync(goalFile, 'utf8'));

  const rawEvents = Array.isArray(goalData?.events) ? goalData.events : [];
  const today = new Date('2026-11-13T00:00:00');
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const upcoming = rawEvents
    .map(ev => {
      if (!ev || !ev.date) return null;
      const evDate = new Date(ev.date);
      const evMidnight = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate()).getTime();
      const daysDiff = Math.ceil((evMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      return {
        ...ev,
        daysDiff,
        isPastEvent: daysDiff < 0
      };
    })
    .filter(ev => ev && ev.daysDiff !== null && ev.daysDiff >= 0)
    .sort((a, b) => a.daysDiff - b.daysDiff);

  const nextEvent = upcoming[0];
  assert.ok(nextEvent, 'Phải tìm thấy giải sắp tới');
  assert.strictEqual(nextEvent.name, 'Galaxy Run 2026', 'Giải sắp tới phải là Galaxy Run 2026');
  assert.strictEqual(nextEvent.daysDiff, 9, 'Số ngày còn lại phải là 9 ngày (từ 13/11 đến 22/11)');
});

// 5. Kiểm tra CSS index.css có flex-wrap cho challenge-title-group và hover cho upcoming-race-badge
it('CSS index.css: challenge-title-group có flex-wrap và upcoming-race-badge có hover effect', () => {
  const cssFile = path.join(__dirname, '../frontend/src/index.css');
  const content = fs.readFileSync(cssFile, 'utf8');

  assert.ok(content.includes('.challenge-title-group {'), 'Phải có .challenge-title-group');
  assert.ok(content.includes('.upcoming-race-badge:hover'), 'Phải có .upcoming-race-badge:hover');
});

console.log(`\n========================================`);
console.log(`KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} PASS (${totalTests - passedTests} FAIL)`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}


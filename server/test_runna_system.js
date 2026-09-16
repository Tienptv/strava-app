/**
 * Test Suite: Runna Deterministic Expert System & Garmin Health Integration
 * Rule #2: Real execution & 100% honest reporting.
 * Rule #6: Athlete ID is primary key.
 */

import assert from 'assert';
import { calculatePaceModel, generateRaceRoadmap, getAthleteTrainingPlan, formatSecondsToTime, formatPace } from './race_training_service.js';
import { saveGarminHealth, getGarminHealth, evaluateReadiness } from './garmin_health_service.js';

console.log('========================================================');
console.log('🏃 BẮT ĐẦU KIỂM THỬ HỆ THỐNG RUNNA & SỨC KHỎE GARMIN');
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Lỗi: ${err.message}\n`);
  }
}

// TEST 1: PACE MODELING (JACK DANIELS VDOT & RIEGEL)
runTest('Pace Modeling: Tính dải Pace chuẩn xác cho Half Marathon SUB 2h (7200s)', () => {
  const model = calculatePaceModel({
    targetDistanceKm: 21.0975,
    targetTimeSeconds: 7200 // 2:00:00
  });

  assert.strictEqual(model.targetDistanceKm, 21.0975);
  assert.strictEqual(model.targetTimeFormatted, '2:00:00');
  // Race pace: 7200 / 21.0975 = 341.27s = 5:41/km
  assert.strictEqual(model.racePaceFormatted, '5:41/km');
  assert(model.vdot >= 36 && model.vdot <= 42, `VDOT phải nằm trong khoảng 36-42, thực tế: ${model.vdot}`);

  // Kiểm tra 4 dải pace sinh lý
  assert(model.physiologicalPaces.easyZone2, 'Phải có dải Easy Zone 2');
  assert(model.physiologicalPaces.tempoThreshold, 'Phải có dải Tempo Threshold');
  assert(model.physiologicalPaces.intervalVO2, 'Phải có dải Interval VO2');
  assert(model.physiologicalPaces.racePace, 'Phải có dải Race Pace');

  // Easy pace phải chậm hơn Race pace
  assert(model.physiologicalPaces.easyZone2.minSec > model.racePaceSec, 'Easy pace minSec phải chậm hơn race pace');
  // Interval pace phải nhanh hơn Race pace
  assert(model.physiologicalPaces.intervalVO2.maxSec < model.racePaceSec, 'Interval pace maxSec phải nhanh hơn race pace');

  // Negative split
  assert.strictEqual(model.splitStrategy.strategyType, 'negative_split');
  assert(model.splitStrategy.firstHalf.distanceKm > 0);
  assert(model.splitStrategy.secondHalf.distanceKm > 0);
});

// TEST 2: CHIA ĐỂ TRỊ (DIVIDE AND CONQUER) CHU KỲ HÓA 4 GIAI ĐOẠN
runTest('Divide & Conquer: Phân rã Macrocycle thành 4 Mesocycles chuẩn Olympic', () => {
  const plan = generateRaceRoadmap({
    athleteId: '99901',
    raceName: 'Garmin Run 2026',
    targetDistanceKm: 21.0975,
    targetTimeSeconds: 7200,
    raceDate: '2026-10-18',
    startDate: '2026-07-26', // 12 tuần
    daysPerWeek: 4,
    longRunDay: 'sunday',
    currentWeeklyKm: 25
  });

  assert(plan.totalWeeks >= 10 && plan.totalWeeks <= 14, `Tổng số tuần phải khoảng 12, thực tế: ${plan.totalWeeks}`);
  assert.strictEqual(plan.phases.length, 4, 'Phải có đủ 4 giai đoạn chuẩn Olympic');
  assert.deepStrictEqual(
    plan.phases.map(p => p.id),
    ['base', 'build', 'peak', 'taper']
  );
  assert.strictEqual(plan.weeks.length, plan.totalWeeks, 'Số tuần sinh ra phải khớp với totalWeeks');
});

// TEST 3: DOUBLE CONSTRAINT RULE (QUY TẮC RÀNG BUỘC KÉP <= 10%/TUẦN & DELOAD)
runTest('Double Constraint Rule: Kiểm tra trần tăng tải <=10%/tuần và tuần xả tải Deload', () => {
  const plan = generateRaceRoadmap({
    athleteId: '99902',
    raceName: 'Techcombank Marathon 2026',
    targetDistanceKm: 42.195,
    targetTimeSeconds: 14400, // Sub 4h
    raceDate: '2026-12-06',
    startDate: '2026-09-01',
    daysPerWeek: 4,
    longRunDay: 'sunday',
    currentWeeklyKm: 30
  });

  for (let i = 1; i < plan.weeks.length; i++) {
    const prevWeek = plan.weeks[i - 1];
    const currWeek = plan.weeks[i];

    if (!currWeek.isDeload && !currWeek.isRaceWeek && currWeek.phase !== 'taper') {
      // Nếu tuần trước là tuần xả tải Deload, so sánh với tuần tải trước đó (i - 2)
      const benchmarkWeek = prevWeek.isDeload && i >= 2 ? plan.weeks[i - 2] : prevWeek;
      const growthRatio = currWeek.weeklyMileage / benchmarkWeek.weeklyMileage;
      // Tuần bình thường tăng tối đa 10% (cho phép dung sai làm tròn 1.12)
      assert(
        growthRatio <= 1.12,
        `Tuần ${currWeek.weekNumber} tăng quá 10% (${growthRatio.toFixed(2)}x so với Tuần ${benchmarkWeek.weekNumber})`
      );
    }

    if (currWeek.isDeload) {
      assert(
        currWeek.weeklyMileage < prevWeek.weeklyMileage,
        `Tuần xả tải Deload (Tuần ${currWeek.weekNumber}) phải giảm volume so với tuần trước`
      );
    }
  }
});

// TEST 4: HARD DAYS SPACING (KHÔNG XẾP 2 BÀI NẶNG LIỀN NHAU)
runTest('Hard Days Spacing: Tránh 2 bài tập nặng (Interval & Long Run) diễn ra liên tiếp', () => {
  const plan = generateRaceRoadmap({
    athleteId: '99903',
    raceName: 'VnExpress Marathon',
    targetDistanceKm: 21.0975,
    targetTimeSeconds: 6900,
    daysPerWeek: 4,
    longRunDay: 'sunday',
    currentWeeklyKm: 28
  });

  plan.weeks.forEach(w => {
    const qualitySessions = w.sessions.filter(s => ['interval', 'long_run'].includes(s.workoutType));
    if (qualitySessions.length >= 2) {
      for (let i = 1; i < qualitySessions.length; i++) {
        const dayDiff = Math.abs(qualitySessions[i].dayIndex - qualitySessions[i - 1].dayIndex);
        assert(dayDiff > 1, `Tuần ${w.weekNumber}: Bài nặng ngày ${qualitySessions[i-1].dayIndex} và ${qualitySessions[i].dayIndex} diễn ra liền kề!`);
      }
    }
  });
});

// TEST 5: GARMIN HEALTH INTEGRATION & BIOMETRIC READINESS
runTest('Garmin Health: Đánh giá điểm sẵn sàng (Readiness) và hạ tải khi mệt mỏi', () => {
  // Case A: Người khỏe mạnh
  const healthGood = {
    sleepHours: 8.0,
    sleepScore: 88,
    restingHeartRate: 50,
    baselineRhr: 50,
    hrvStatus: 'balanced',
    bodyBattery: 90
  };
  const readinessGood = evaluateReadiness(healthGood);
  assert.strictEqual(readinessGood.shouldDowngrade, false);
  assert(readinessGood.readinessScore >= 80, `Điểm phải cao: ${readinessGood.readinessScore}`);

  // Case B: Người thiếu ngủ, nhịp tim tăng cao
  const healthTired = {
    sleepHours: 5.0,
    sleepScore: 54,
    restingHeartRate: 58,
    baselineRhr: 51,
    hrvStatus: 'low',
    bodyBattery: 35
  };
  const readinessTired = evaluateReadiness(healthTired);
  assert.strictEqual(readinessTired.shouldDowngrade, true, 'Phải kích hoạt luật hạ tải bài tập');
  assert(readinessTired.downgradeReasonVi.length > 0, 'Phải có lý do hạ tải');
});

// TEST 6: ADAPTIVE DOWNGRADE THỰC TẾ TRÊN GIÁO ÁN
runTest('Adaptive Downgrade: Tự động hạ bài Interval thành Active Recovery khi Garmin báo mệt', () => {
  // Lưu sức khỏe mệt mỏi cho athlete 99905
  saveGarminHealth('99905', {
    sleepHours: 4.8,
    sleepScore: 50,
    restingHeartRate: 60,
    baselineRhr: 52,
    hrvStatus: 'low',
    bodyBattery: 30
  });

  const plan = generateRaceRoadmap({
    athleteId: '99905',
    targetDistanceKm: 10,
    targetTimeSeconds: 3000,
    daysPerWeek: 4,
    currentWeeklyKm: 25
  });

  const week1 = plan.weeks[0];
  const adaptedSession = week1.sessions.find(s => s.isAdapted);
  assert(adaptedSession, 'Tuần 1 phải có buổi tập được tự động hạ tải thích ứng');
  assert.strictEqual(adaptedSession.workoutType, 'recovery_adapted');
  assert(adaptedSession.adaptationNoteVi.includes('Runna'), 'Phải ghi chú lý do thích ứng của Runna');
});

// TEST 7: RULE #6 ATHLETE ID PRIMARY KEY (TRÙNG TÊN)
runTest('Rule #6: Đảm bảo phân định dữ liệu độc lập 100% bằng Athlete ID cho 2 người trùng tên', () => {
  const athlete1Id = 'ath_phuong_01';
  const athlete2Id = 'ath_phuong_02';

  // Lưu mục tiêu & sức khỏe khác nhau cho 2 người cùng tên "Phuong N."
  saveGarminHealth(athlete1Id, { sleepScore: 90, restingHeartRate: 48, bodyBattery: 95 });
  saveGarminHealth(athlete2Id, { sleepScore: 55, restingHeartRate: 62, bodyBattery: 40 });

  generateRaceRoadmap({
    athleteId: athlete1Id,
    targetDistanceKm: 21.0975,
    targetTimeSeconds: 6600 // Sub 1:50
  });

  generateRaceRoadmap({
    athleteId: athlete2Id,
    targetDistanceKm: 10,
    targetTimeSeconds: 3600 // Sub 1:00
  });

  const plan1 = getAthleteTrainingPlan(athlete1Id);
  const plan2 = getAthleteTrainingPlan(athlete2Id);
  const health1 = getGarminHealth(athlete1Id);
  const health2 = getGarminHealth(athlete2Id);

  assert.strictEqual(plan1.targetDistanceKm, 21.0975);
  assert.strictEqual(plan2.targetDistanceKm, 10);
  assert.strictEqual(health1.latest.sleepScore, 90);
  assert.strictEqual(health2.latest.sleepScore, 55);
  assert.notStrictEqual(plan1.athleteId, plan2.athleteId);
});

console.log('\n========================================================');
console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TEST CASES PASSED (${Math.round(passedTests/totalTests*100)}%)`);
console.log('========================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}

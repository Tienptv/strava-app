/**
 * Race Training Service (Runna App & Olympic Sports Science Model)
 * 
 * Cốt lõi: Hệ chuyên gia dựa trên tập luật xác định (Deterministic Rule-Based System)
 * kết hợp thuật toán Chia để trị (Divide and Conquer) và Thích ứng động (Adaptive Rescheduling).
 * 
 * 1. Pace Modeling (Jack Daniels VDOT + Pete Riegel Formula)
 * 2. Periodization & Progressive Overload (Double Constraint Rule <= 10%/tuần + Deload Week)
 * 3. Adaptive Rescheduling (Hard Days Spacing + Garmin Health Readiness Downgrade)
 * 4. Science for Sport Nutrition & Recovery
 * 
 * Tuân thủ nghiêm ngặt Quy tắc 6: Athlete ID là khóa chính duy nhất.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGarminHealth, evaluateReadiness } from './garmin_health_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.join(__dirname, '..', 'Storage');
const RACE_PLANS_FILE = path.join(STORAGE_DIR, 'race_training_plans.json');
const CLUB_GOAL_FILE = path.join(STORAGE_DIR, 'club_goal.json');

// Đảm bảo thư mục Storage tồn tại
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function readPlans() {
  try {
    if (fs.existsSync(RACE_PLANS_FILE)) {
      return JSON.parse(fs.readFileSync(RACE_PLANS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[RaceTraining] Error reading plans file:', err);
  }
  return {};
}

function writePlans(data) {
  try {
    fs.writeFileSync(RACE_PLANS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[RaceTraining] Error writing plans file:', err);
    return false;
  }
}

/**
 * Format số giây thành chuỗi "m:ss" hoặc "h:mm:ss"
 */
export function formatSecondsToTime(seconds) {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '--:--';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format pace giây/km thành "m:ss"
 */
export function formatPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0 || isNaN(secPerKm)) return '--:--';
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Chuyển chuỗi pace "m:ss" hoặc thời gian "h:mm:ss" sang số giây
 */
export function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return Number(timeStr) || 0;
}

/**
 * 1. Thuật toán Pace Modeling (VDOT & Pete Riegel Formula)
 * T2 = T1 * (D2 / D1)^1.06
 */
export function calculatePaceModel({ targetDistanceKm, targetTimeSeconds, benchmarkDistKm, benchmarkTimeSeconds }) {
  const dist = Number(targetDistanceKm) || 21.0975;
  let targetSec = Number(targetTimeSeconds);

  // Nếu không có targetTimeSeconds nhưng có benchmark -> tính theo Riegel
  if ((!targetSec || targetSec <= 0) && benchmarkDistKm && benchmarkTimeSeconds) {
    targetSec = benchmarkTimeSeconds * Math.pow(dist / benchmarkDistKm, 1.06);
  }

  // Fallback mặc định theo cự ly nếu chưa có thông tin
  if (!targetSec || targetSec <= 0) {
    if (dist <= 5) targetSec = 1500; // 25:00
    else if (dist <= 10) targetSec = 3300; // 55:00
    else if (dist <= 21.1) targetSec = 7200; // 2:00:00
    else targetSec = 15300; // 4:15:00
  }

  const racePaceSec = targetSec / dist;

  // Tính thời gian tương đương cho 5K và 10K theo Riegel để ước lượng VDOT
  const equiv5kSec = targetSec * Math.pow(5 / dist, 1.06);
  const equiv10kSec = targetSec * Math.pow(10 / dist, 1.06);

  // Jack Daniels VDOT ước tính
  const time5kMin = equiv5kSec / 60;
  const vdot = Math.max(20, Math.min(85, Math.round(960 / time5kMin)));

  // Bóc tách 4 dải Pace sinh lý (Energy Systems) theo VDOT & Olympic Coaching:
  // 1. Easy Pace (Zone 2 - Aerobic Base): Chạy nhẹ tích lũy mao mạch
  const easyMin = racePaceSec + 40;
  const easyMax = racePaceSec + 80;

  // 2. Tempo / Threshold (Zone 4 - Lactate Threshold): Ngưỡng lactic
  const tempoMin = racePaceSec - 8;
  const tempoMax = racePaceSec + 10;

  // 3. Interval / Repetition (Zone 5 - VO2Max): Nâng trần hấp thụ oxy
  const intervalMin = racePaceSec - 30;
  const intervalMax = racePaceSec - 15;

  // Chiến thuật phân phối sức (Split Strategy - Science for Sport):
  // Negative Split: 50% đầu pace chậm hơn 3-5s, 50% sau tăng tốc
  const halfDist = Math.round((dist / 2) * 10) / 10;
  const firstHalfPace = racePaceSec + 3;
  const secondHalfPace = racePaceSec - 3;

  return {
    targetDistanceKm: dist,
    targetTimeSeconds: Math.round(targetSec),
    targetTimeFormatted: formatSecondsToTime(targetSec),
    racePaceSec: Math.round(racePaceSec),
    racePaceFormatted: `${formatPace(racePaceSec)}/km`,
    vdot,
    physiologicalPaces: {
      easyZone2: {
        minSec: Math.round(easyMin),
        maxSec: Math.round(easyMax),
        formatted: `${formatPace(easyMin)} - ${formatPace(easyMax)}/km`,
        descriptionVi: 'Vùng hiếu khí Zone 2, phát triển mao mạch và đốt mỡ bền vững',
        descriptionEn: 'Aerobic Zone 2, enhances capillary density and lipid metabolism'
      },
      tempoThreshold: {
        minSec: Math.round(tempoMin),
        maxSec: Math.round(tempoMax),
        formatted: `${formatPace(tempoMin)} - ${formatPace(tempoMax)}/km`,
        descriptionVi: 'Ngưỡng đào thải Lactate Zone 4, nâng cao sức bền tốc độ',
        descriptionEn: 'Lactate Threshold Zone 4, delays muscular fatigue onset'
      },
      intervalVO2: {
        minSec: Math.round(intervalMin),
        maxSec: Math.round(intervalMax),
        formatted: `${formatPace(intervalMin)} - ${formatPace(intervalMax)}/km`,
        descriptionVi: 'Vùng VO2Max Zone 5, biến tốc nâng trần dung tích oxy tối đa',
        descriptionEn: 'VO2Max Zone 5, boosts maximum oxygen consumption ceiling'
      },
      racePace: {
        sec: Math.round(racePaceSec),
        formatted: `${formatPace(racePaceSec)}/km`,
        descriptionVi: 'Tốc độ mục tiêu ngày thi đấu chính thức (PMP)',
        descriptionEn: 'Planned Marathon/Race Pace (PMP)'
      }
    },
    splitStrategy: {
      strategyType: 'negative_split',
      titleVi: 'Chiến thuật Negative Split (Phân phối năng lượng tối ưu)',
      titleEn: 'Negative Split Strategy (Optimal Energy Distribution)',
      firstHalf: {
        distanceKm: halfDist,
        paceFormatted: `${formatPace(firstHalfPace)}/km`,
        noteVi: 'Chạy giữ nhịp tim ổn định, bảo toàn glycogen',
        noteEn: 'Conserve glycogen, keep heart rate controlled'
      },
      secondHalf: {
        distanceKm: Math.round((dist - halfDist) * 10) / 10,
        paceFormatted: `${formatPace(secondHalfPace)}/km`,
        noteVi: 'Tăng tốc vượt đối thủ ở 1/3 chặng cuối',
        noteEn: 'Progressive surge past competitors in the final third'
      }
    }
  };
}

/**
 * 2. Thuật toán Chia Để Trị (Divide and Conquer) - Lập Kế Hoạch Chu Kỳ Hóa
 * Macrocycle -> 4 Mesocycles -> Microcycles (Tuần) -> Atomic Sessions (Ngày)
 */
export function generateRaceRoadmap({
  athleteId,
  raceName = 'Upcoming Race',
  targetDistanceKm = 21.0975,
  targetTimeSeconds = 7200,
  raceDate,
  startDate,
  daysPerWeek = 4,
  longRunDay = 'sunday', // 'saturday' | 'sunday'
  currentWeeklyKm = 25
}) {
  const dist = Number(targetDistanceKm) || 21.0975;
  const freq = Math.max(3, Math.min(5, Number(daysPerWeek) || 4));

  // 1. Tính toán Pace Modeling
  const paceModel = calculatePaceModel({
    targetDistanceKm: dist,
    targetTimeSeconds: Number(targetTimeSeconds)
  });

  // 2. DIVIDE (Macrocycle -> Tính tổng số tuần)
  const today = new Date();
  const start = startDate ? new Date(startDate) : today;
  let race = raceDate ? new Date(raceDate) : new Date(today.getTime() + 12 * 7 * 86400000);

  // Đảm bảo raceDate luôn ở tương lai
  if (race.getTime() <= start.getTime()) {
    race = new Date(start.getTime() + 12 * 7 * 86400000);
  }

  const totalDays = Math.ceil((race.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  let totalWeeks = Math.max(4, Math.min(24, Math.ceil(totalDays / 7)));

  // 3. DIVIDE (Macro -> 4 Mesocycles chuẩn Olympic)
  // Base (30%) -> Build/Threshold (35%) -> Peak (20%) -> Taper (15%)
  const baseWeeksCount = Math.max(1, Math.round(totalWeeks * 0.30));
  const buildWeeksCount = Math.max(1, Math.round(totalWeeks * 0.35));
  const peakWeeksCount = Math.max(1, Math.round(totalWeeks * 0.20));
  const taperWeeksCount = Math.max(1, totalWeeks - (baseWeeksCount + buildWeeksCount + peakWeeksCount));

  // 4. DIVIDE & CONQUER (Microcycles - Tuần với Double Constraint Rule <= 10%/tuần & Deload Week)
  let baseMileage = Math.max(18, Number(currentWeeklyKm) || 22);
  // Khối lượng đỉnh ước tính theo cự ly: 5K (25-35km), 10K (35-45km), HM (45-60km), FM (65-85km)
  let peakTargetMileage = dist * 2.6;
  if (dist <= 5) peakTargetMileage = 30;
  else if (dist <= 10) peakTargetMileage = 40;
  else if (dist <= 21.1) peakTargetMileage = 52;
  else peakTargetMileage = 72;

  const weeks = [];
  let currentVol = baseMileage;

  for (let w = 1; w <= totalWeeks; w++) {
    let phase = 'base';
    let phaseTitleVi = 'Giai đoạn 1: Xây nền thể lực (Base Building)';
    let phaseTitleEn = 'Phase 1: Aerobic Base Building';
    let phaseColor = '#00A3A6'; // Teal

    if (w <= baseWeeksCount) {
      phase = 'base';
      phaseTitleVi = 'Giai đoạn 1: Xây nền thể lực (Base Building)';
      phaseTitleEn = 'Phase 1: Aerobic Base Building';
      phaseColor = '#00A3A6';
    } else if (w <= baseWeeksCount + buildWeeksCount) {
      phase = 'build';
      phaseTitleVi = 'Giai đoạn 2: Phát triển ngưỡng (Build & Threshold)';
      phaseTitleEn = 'Phase 2: Lactate Threshold Build';
      phaseColor = '#0080A0';
    } else if (w <= totalWeeks - taperWeeksCount) {
      phase = 'peak';
      phaseTitleVi = 'Giai đoạn 3: Đạt đỉnh & Tốc độ (Peak & Specific)';
      phaseTitleEn = 'Phase 3: Peak Volume & Race Specific';
      phaseColor = '#78BE20'; // Lime Green
    } else {
      phase = 'taper';
      phaseTitleVi = 'Giai đoạn 4: Giảm tải & Sẵn sàng (Tapering)';
      phaseTitleEn = 'Phase 4: Race Taper & Carb-Load';
      phaseColor = '#f59e0b';
    }

    // Double Constraint Rule: Tuần xả tải (Deload) sau mỗi 3 tuần tải nặng
    const isDeload = (w % 4 === 0) && phase !== 'taper' && w < totalWeeks - 1;
    const isRaceWeek = (w === totalWeeks);

    let weeklyMileage = currentVol;

    if (isRaceWeek) {
      // Tuần thi đấu: giảm 50% mileage + ngày race
      weeklyMileage = Math.round((currentVol * 0.5) + (dist * 0.4));
    } else if (phase === 'taper') {
      // Tuần taper: giảm 25% - 40%
      weeklyMileage = Math.round(currentVol * 0.70);
      currentVol = weeklyMileage;
    } else if (isDeload) {
      // Tuần xả tải: giảm 25% để cơ thể siêu bù đắp (Supercompensation)
      weeklyMileage = Math.round(currentVol * 0.75);
    } else {
      // Tăng tối đa 8% - 10% (Progression Cap Rule)
      const nextVol = Math.min(peakTargetMileage, currentVol * 1.085);
      weeklyMileage = Math.round(nextVol);
      currentVol = weeklyMileage;
    }

    // 5. CONQUER (Chia tuần thành các buổi tập ngày nguyên tử)
    // Quy tắc Olympic Runna: Hard Days Spacing (Tránh 2 bài nặng liên tiếp)
    const sessions = generateDailySessions({
      weekNumber: w,
      phase,
      weeklyMileage,
      daysPerWeek: freq,
      longRunDay,
      paceModel,
      isRaceWeek,
      isDeload,
      targetDist: dist
    });

    weeks.push({
      weekNumber: w,
      phase,
      phaseTitleVi,
      phaseTitleEn,
      phaseColor,
      weeklyMileage,
      isDeload,
      isRaceWeek,
      acwrPredicted: isDeload ? 0.82 : (phase === 'taper' ? 0.75 : 1.12),
      sessions
    });
  }

  // 6. COMBINE: Đánh giá thích ứng với dữ liệu Garmin Health thực tế (nếu có)
  const healthData = getGarminHealth(athleteId);
  const readiness = evaluateReadiness(healthData?.latest);

  // Áp dụng luật thích ứng tức thời cho buổi tập ngày hôm nay (Adaptive Downgrade)
  const adaptedWeeks = applyGarminReadinessAdaptation(weeks, readiness);

  const planResult = {
    id: `plan_${athleteId}_${Date.now()}`,
    athleteId: String(athleteId),
    raceName,
    targetDistanceKm: dist,
    targetTimeSeconds,
    raceDate: race.toISOString().split('T')[0],
    startDate: start.toISOString().split('T')[0],
    daysPerWeek: freq,
    longRunDay,
    totalWeeks,
    paceModel,
    phases: [
      { id: 'base', nameVi: 'Xây nền (Base)', nameEn: 'Base Building', weeks: baseWeeksCount, color: '#00A3A6' },
      { id: 'build', nameVi: 'Phát triển (Build)', nameEn: 'Build & Threshold', weeks: buildWeeksCount, color: '#0080A0' },
      { id: 'peak', nameVi: 'Đạt đỉnh (Peak)', nameEn: 'Peak & Specific', weeks: peakWeeksCount, color: '#78BE20' },
      { id: 'taper', nameVi: 'Giảm tải (Taper)', nameEn: 'Tapering', weeks: taperWeeksCount, color: '#f59e0b' }
    ],
    weeks: adaptedWeeks,
    garminReadiness: readiness,
    createdAt: new Date().toISOString()
  };

  // Lưu kế hoạch vào storage theo athleteId (Rule #6)
  const allPlans = readPlans();
  allPlans[String(athleteId)] = planResult;
  writePlans(allPlans);

  return planResult;
}

/**
 * Sinh cấu trúc chi tiết các buổi tập nguyên tử trong tuần
 * Tuân thủ quy tắc Runna: Không xếp 2 bài nặng liền nhau
 */
function generateDailySessions({
  weekNumber,
  phase,
  weeklyMileage,
  daysPerWeek,
  longRunDay,
  paceModel,
  isRaceWeek,
  isDeload,
  targetDist
}) {
  const sessions = [];

  // Tính cự ly bài chạy dài (Long Run): 28% - 33% tổng tuần
  let longRunKm = Math.round(weeklyMileage * 0.32);
  if (isRaceWeek) {
    longRunKm = targetDist; // Race Day!
  } else if (longRunKm > targetDist * 0.95 && targetDist <= 21.1) {
    longRunKm = Math.round(targetDist * 0.9);
  }

  const remainingKm = Math.max(5, weeklyMileage - longRunKm);

  // Phân bổ ngày theo cấu trúc Runna để cách bài nặng ít nhất 48h
  // Days: 1 (Mon), 2 (Tue), 3 (Wed), 4 (Thu), 5 (Fri), 6 (Sat), 7 (Sun)
  let daySchedule = [];

  if (daysPerWeek === 3) {
    // Thứ 3 (Interval/Tempo) - Thứ 5 (Easy) - Chủ nhật (Long Run)
    daySchedule = [
      { dayIndex: 2, dayNameVi: 'Thứ Ba', dayNameEn: 'Tuesday', type: 'quality' },
      { dayIndex: 4, dayNameVi: 'Thứ Năm', dayNameEn: 'Thursday', type: 'easy' },
      { dayIndex: longRunDay === 'saturday' ? 6 : 7, dayNameVi: longRunDay === 'saturday' ? 'Thứ Bảy' : 'Chủ Nhật', dayNameEn: longRunDay === 'saturday' ? 'Saturday' : 'Sunday', type: 'long' }
    ];
  } else if (daysPerWeek === 4) {
    // Thứ 3 (Interval) - Thứ 5 (Tempo/Threshold) - Thứ 7 (Easy) - Chủ nhật (Long Run)
    daySchedule = [
      { dayIndex: 2, dayNameVi: 'Thứ Ba', dayNameEn: 'Tuesday', type: 'interval' },
      { dayIndex: 4, dayNameVi: 'Thứ Năm', dayNameEn: 'Thursday', type: 'tempo' },
      { dayIndex: 6, dayNameVi: 'Thứ Bảy', dayNameEn: 'Saturday', type: 'easy' },
      { dayIndex: 7, dayNameVi: 'Chủ Nhật', dayNameEn: 'Sunday', type: 'long' }
    ];
  } else {
    // 5 buổi: Thứ 2 (Easy) - Thứ 3 (Interval) - Thứ 5 (Tempo) - Thứ 7 (Easy) - CN (Long)
    daySchedule = [
      { dayIndex: 1, dayNameVi: 'Thứ Hai', dayNameEn: 'Monday', type: 'easy' },
      { dayIndex: 2, dayNameVi: 'Thứ Ba', dayNameEn: 'Tuesday', type: 'interval' },
      { dayIndex: 4, dayNameVi: 'Thứ Năm', dayNameEn: 'Thursday', type: 'tempo' },
      { dayIndex: 6, dayNameVi: 'Thứ Bảy', dayNameEn: 'Saturday', type: 'easy' },
      { dayIndex: 7, dayNameVi: 'Chủ Nhật', dayNameEn: 'Sunday', type: 'long' }
    ];
  }

  const qualityDaysCount = daySchedule.filter(d => d.type !== 'long').length;
  const kmPerSession = Math.max(3.5, Math.round((remainingKm / qualityDaysCount) * 10) / 10);

  daySchedule.forEach(slot => {
    let session = null;

    if (slot.type === 'long') {
      if (isRaceWeek) {
        session = {
          dayIndex: slot.dayIndex,
          dayNameVi: slot.dayNameVi,
          dayNameEn: slot.dayNameEn,
          workoutType: 'race',
          titleVi: `🏅 NGÀY THI ĐẤU CHÍNH THỨC (${targetDist}km)`,
          titleEn: `🏅 OFFICIAL RACE DAY (${targetDist}km)`,
          distanceKm: targetDist,
          targetPaceFormatted: paceModel.physiologicalPaces.racePace.formatted,
          intensity: 'Race Pace',
          badgeColor: '#78BE20',
          structure: {
            warmUpVi: '10 phút khởi động nhẹ nhàng + bài tập xoay khớp cơ',
            warmUpEn: '10 min easy warm-up jog + dynamic mobility drills',
            mainSetVi: `${targetDist}km theo chiến thuật Negative Split: Nửa đầu ${paceModel.splitStrategy.firstHalf.paceFormatted}, nửa sau bứt phá ${paceModel.splitStrategy.secondHalf.paceFormatted}`,
            mainSetEn: `${targetDist}km with Negative Split: First half @ ${paceModel.splitStrategy.firstHalf.paceFormatted}, second half surge @ ${paceModel.splitStrategy.secondHalf.paceFormatted}`,
            coolDownVi: '1km đi bộ thả lỏng + bù nước điện giải ngay lập tức',
            coolDownEn: '1km cool-down walk + immediate rehydration & recovery shake'
          },
          nutritionTipVi: 'Uống 150ml điện giải mỗi 20 phút. Cắn 1 gel năng lượng ở phút 40 và phút 80.',
          nutritionTipEn: 'Sip 150ml electrolytes every 20 min. Consume 1 carb gel at 40 min & 80 min.'
        };
      } else {
        session = {
          dayIndex: slot.dayIndex,
          dayNameVi: slot.dayNameVi,
          dayNameEn: slot.dayNameEn,
          workoutType: 'long_run',
          titleVi: `Chạy dài tích lũy (Long Run ${longRunKm}km)`,
          titleEn: `Aerobic Long Run (${longRunKm}km)`,
          distanceKm: longRunKm,
          targetPaceFormatted: paceModel.physiologicalPaces.easyZone2.formatted,
          intensity: 'Zone 2 Aerobic',
          badgeColor: '#00A3A6',
          structure: {
            warmUpVi: '1.5km chạy chậm khởi động Zone 1 + ép dẻo động',
            warmUpEn: '1.5km slow warm-up jog Zone 1 + dynamic stretching',
            mainSetVi: `${longRunKm - 2.5}km chạy đều ổn định ở Zone 2 (${paceModel.physiologicalPaces.easyZone2.formatted}). ${phase === 'peak' ? '2km cuối đẩy lên Race Pace.' : ''}`,
            mainSetEn: `${longRunKm - 2.5}km steady in Zone 2 (${paceModel.physiologicalPaces.easyZone2.formatted}). ${phase === 'peak' ? 'Last 2km surge to Race Pace.' : ''}`,
            coolDownVi: '1km chạy thả lỏng + 10 phút căng cơ tĩnh',
            coolDownEn: '1km gentle cool-down + 10 min static stretching'
          },
          nutritionTipVi: 'Mang theo ít nhất 500ml nước điện giải và 1 gói energy gel nếu chạy trên 70 phút.',
          nutritionTipEn: 'Carry at least 500ml electrolytes and 1 energy gel for runs exceeding 70 mins.'
        };
      }
    } else if (slot.type === 'interval' || (slot.type === 'quality' && phase === 'peak')) {
      const reps = Math.min(8, Math.max(4, Math.floor(kmPerSession * 0.6)));
      session = {
        dayIndex: slot.dayIndex,
        dayNameVi: slot.dayNameVi,
        dayNameEn: slot.dayNameEn,
        workoutType: 'interval',
        titleVi: `Biến tốc VO2Max (${reps} x 800m/1000m)`,
        titleEn: `VO2Max Intervals (${reps} reps)`,
        distanceKm: kmPerSession,
        targetPaceFormatted: paceModel.physiologicalPaces.intervalVO2.formatted,
        intensity: 'Zone 5 VO2Max',
        badgeColor: '#ef4444',
        structure: {
          warmUpVi: '1.5km chạy Zone 2 + 4 lần bứt tốc ngắn (Strides 100m)',
          warmUpEn: '1.5km Zone 2 jog + 4 x 100m acceleration strides',
          mainSetVi: `${reps} hiệp x 800m @ ${paceModel.physiologicalPaces.intervalVO2.formatted}, nghỉ jog nhẹ 2 phút giữa mỗi hiệp`,
          mainSetEn: `${reps} reps x 800m @ ${paceModel.physiologicalPaces.intervalVO2.formatted} with 2 min recovery jog between reps`,
          coolDownVi: '1km chạy chậm Zone 1 thả lỏng cơ đùi',
          coolDownEn: '1km slow Zone 1 cool-down to flush lactic acid'
        },
        nutritionTipVi: 'Bổ sung 20-30g carbs hấp thu nhanh trước bài tập 30 phút (chuối hoặc bánh ngọt nhẹ).',
        nutritionTipEn: 'Consume 20-30g fast-acting carbs 30 mins before workout (banana or energy snack).'
      };
    } else if (slot.type === 'tempo' || (slot.type === 'quality' && phase === 'build')) {
      const tempoKm = Math.min(10, Math.max(4, Math.round(kmPerSession * 0.7)));
      session = {
        dayIndex: slot.dayIndex,
        dayNameVi: slot.dayNameVi,
        dayNameEn: slot.dayNameEn,
        workoutType: 'tempo',
        titleVi: `Chạy ngưỡng Lactic (Tempo Run ${tempoKm}km)`,
        titleEn: `Lactate Threshold Tempo (${tempoKm}km)`,
        distanceKm: kmPerSession,
        targetPaceFormatted: paceModel.physiologicalPaces.tempoThreshold.formatted,
        intensity: 'Zone 4 Threshold',
        badgeColor: '#f59e0b',
        structure: {
          warmUpVi: '1.5km chạy khởi động Zone 2 nhẹ nhàng',
          warmUpEn: '1.5km easy Zone 2 warm-up',
          mainSetVi: `${tempoKm}km chạy đều đặn ở Ngưỡng Lactic (${paceModel.physiologicalPaces.tempoThreshold.formatted}). Cảm giác nỗ lực 8/10.`,
          mainSetEn: `${tempoKm}km continuous at Lactate Threshold (${paceModel.physiologicalPaces.tempoThreshold.formatted}). Effort: 8/10.`,
          coolDownVi: '1km chạy thả lỏng + giãn cơ đùi sau',
          coolDownEn: '1km recovery jog + hamstring & calf stretches'
        },
        nutritionTipVi: 'Uống đủ nước trong ngày để hạn chế chuột rút khi chạy pace ngưỡng.',
        nutritionTipEn: 'Hydrate well throughout the day to prevent cramping during threshold efforts.'
      };
    } else {
      // Easy Recovery Run
      session = {
        dayIndex: slot.dayIndex,
        dayNameVi: slot.dayNameVi,
        dayNameEn: slot.dayNameEn,
        workoutType: 'easy',
        titleVi: `Chạy nhẹ phục hồi (${kmPerSession}km Easy)`,
        titleEn: `Aerobic Recovery Run (${kmPerSession}km Easy)`,
        distanceKm: kmPerSession,
        targetPaceFormatted: paceModel.physiologicalPaces.easyZone2.formatted,
        intensity: 'Zone 2 Aerobic',
        badgeColor: '#00A3A6',
        structure: {
          warmUpVi: 'Khởi động xoay khớp cổ chân, khớp gối 5 phút',
          warmUpEn: '5 min ankle & knee mobility rotations',
          mainSetVi: `${kmPerSession}km chạy hoàn toàn thoải mái ở Zone 2 (${paceModel.physiologicalPaces.easyZone2.formatted}). Có thể nói chuyện cả câu mà không hụt hơi.`,
          mainSetEn: `${kmPerSession}km strictly in Zone 2 (${paceModel.physiologicalPaces.easyZone2.formatted}). Conversational conversational pace.`,
          coolDownVi: 'Đi bộ thả lỏng 3 phút + bài giãn cơ tĩnh',
          coolDownEn: '3 min cool-down walk + static stretching'
        },
        nutritionTipVi: 'Bữa ăn giàu đạm (protein) sau bài chạy để tái tạo các vi sợi cơ.',
        nutritionTipEn: 'Protein-rich meal post-run to rebuild microscopic muscle fibers.'
      };
    }

    sessions.push(session);
  });

  return sessions;
}

/**
 * 3. Thuật toán Thích Ứng Động (Adaptive Rescheduling & Downgrade)
 * Đọc điểm sẵn sàng Garmin Health: Nếu mệt mỏi (Sleep < 65, RHR +5 bpm) -> Hạ tải tức thời
 */
export function applyGarminReadinessAdaptation(weeks, readiness) {
  if (!weeks || !Array.isArray(weeks) || weeks.length === 0) return weeks;
  if (!readiness || !readiness.shouldDowngrade) return weeks;

  // Clone để không đột biến trực tiếp
  const clonedWeeks = JSON.parse(JSON.stringify(weeks));
  const currentWeek = clonedWeeks[0]; // Tuần hiện tại
  if (!currentWeek || !Array.isArray(currentWeek.sessions)) return clonedWeeks;

  // Tìm bài tập nặng đầu tiên trong tuần (Interval hoặc Tempo) để hạ tải
  currentWeek.sessions.forEach(sess => {
    if (['interval', 'tempo'].includes(sess.workoutType)) {
      sess.originalType = sess.workoutType;
      sess.originalTitleVi = sess.titleVi;
      sess.originalTitleEn = sess.titleEn;
      sess.isAdapted = true;
      sess.workoutType = 'recovery_adapted';
      sess.badgeColor = '#38bdf8';
      sess.titleVi = `[ĐÃ HẠ TẢI] Chạy nhẹ Zone 2 phục hồi (Garmin báo mệt)`;
      sess.titleEn = `[ADAPTED] Zone 2 Active Recovery (Fatigue Detected)`;
      sess.adaptationNoteVi = `Hệ chuyên gia Runna tự động hạ bài nặng sang chạy nhẹ phục hồi do: ${readiness.downgradeReasonVi}`;
      sess.adaptationNoteEn = `Runna expert engine adapted workout to active recovery due to: ${readiness.downgradeReasonEn}`;
      sess.structure.mainSetVi = `Chạy nhẹ nhàng 30-40 phút ở Zone 2. Không ép tốc độ. Nếu cơ thể quá mệt, hãy chuyển sang nghỉ ngơi hoàn toàn (Rest Day).`;
      sess.structure.mainSetEn = `Easy 30-40 min jog in Zone 2. Zero speed pressure. Convert to complete Rest Day if exhaustion persists.`;
    }
  });

  return clonedWeeks;
}

/**
 * Lấy danh sách các giải chạy sắp tới từ club_goal.json
 */
export function getUpcomingRaces() {
  try {
    if (fs.existsSync(CLUB_GOAL_FILE)) {
      const data = JSON.parse(fs.readFileSync(CLUB_GOAL_FILE, 'utf8'));
      if (Array.isArray(data.events)) {
        const todayStr = new Date().toISOString().split('T')[0];
        return data.events.filter(ev => ev.date >= todayStr);
      }
    }
  } catch (err) {
    console.error('[RaceTraining] Error reading events:', err);
  }
  return [];
}

/**
 * Lấy giáo án hiện tại của Vận động viên theo Athlete ID
 */
export function getAthleteTrainingPlan(athleteId) {
  if (!athleteId) return null;
  const plans = readPlans();
  return plans[String(athleteId)] || null;
}

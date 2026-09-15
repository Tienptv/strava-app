/**
 * Sports Science Service (Garmin / Firstbeat & Jack Daniels VDOT Models)
 * Cung cấp thuật toán tính toán sinh lý học thể thao cho AI Coach:
 * 1. ACWR (Acute:Chronic Workload Ratio) & Garmin Training Status
 * 2. Jack Daniels VDOT & Race Time Predictions (5K, 10K, 21K)
 * 3. Heart Rate Zone 2 & Cadence Analysis
 * 4. Recovery Advisor (Thời gian phục hồi cơ bắp)
 * 
 * Tuân thủ Quy tắc 6: Athlete ID là khóa chính duy nhất.
 */

/**
 * Tính số giây / km
 */
function getPaceSeconds(seconds, meters) {
  if (!seconds || !meters || meters <= 0) return 9999;
  return seconds / (meters / 1000);
}

/**
 * Format số giây thành chuỗi "mm:ss"
 */
function formatPaceStr(secPerKm) {
  if (!secPerKm || secPerKm >= 9999 || secPerKm <= 0) return '--:--';
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format số giây thành chuỗi "h:mm:ss" hoặc "mm:ss" cho cự ly đua
 */
function formatRaceTime(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '--:--';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 1. Thuật toán ACWR (Acute:Chronic Workload Ratio) theo mô hình Banister & Gabbett
 * - Acute Load: Khối lượng tập 7 ngày gần nhất (km hoặc km x cường độ)
 * - Chronic Load: Khối lượng tập 28 ngày gần nhất / 4 tuần
 * - ACWR = Acute / Chronic
 */
export function calculateACWR(activities = [], athleteId = null) {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Lọc hoạt động chạy bộ của đúng athleteId trong 28 ngày qua
  const runActivities = (activities || []).filter(act => {
    // Kiểm tra định danh Athlete ID
    if (athleteId) {
      const actAthId = act.athlete?.id || act.athleteId;
      if (actAthId && String(actAthId) !== String(athleteId)) {
        return false;
      }
    }
    const t = (act.type || '').toLowerCase();
    const isRun = ['run', 'virtualrun', 'trailrun', 'trail run'].includes(t) || t.includes('run') || t.includes('trail') || !t;
    if (!isRun) return false;

    const actDate = new Date(act.start_date_local || act.start_date);
    if (isNaN(actDate.getTime())) return false;
    const daysAgo = (now - actDate) / dayMs;
    return daysAgo >= 0 && daysAgo <= 28;
  });

  let acuteLoadKm = 0;   // 7 ngày gần nhất
  let chronicLoadKm = 0; // 28 ngày gần nhất
  let acuteRunsCount = 0;
  let chronicRunsCount = 0;

  runActivities.forEach(act => {
    const actDate = new Date(act.start_date_local || act.start_date);
    const daysAgo = (now - actDate) / dayMs;
    const distKm = (act.distance || 0) / 1000;

    // Trọng số cường độ dựa vào pace hoặc nhịp tim (nếu có)
    let intensityFactor = 1.0;
    if (act.average_heartrate) {
      if (act.average_heartrate >= 165) intensityFactor = 1.25;
      else if (act.average_heartrate >= 150) intensityFactor = 1.1;
      else if (act.average_heartrate <= 135) intensityFactor = 0.9;
    }

    const weightedKm = distKm * intensityFactor;

    if (daysAgo <= 7) {
      acuteLoadKm += weightedKm;
      acuteRunsCount++;
    }
    if (daysAgo <= 28) {
      chronicLoadKm += weightedKm;
      chronicRunsCount++;
    }
  });

  // Chronic load trung bình tuần của 4 tuần trước
  const weeklyChronicAvg = Math.max(0.5, chronicLoadKm / 4);
  const acwrRaw = weeklyChronicAvg > 0 ? (acuteLoadKm / weeklyChronicAvg) : 1.0;
  const acwr = Math.round(acwrRaw * 100) / 100;

  // Phân loại Trạng thái Thể lực (Garmin Training Status)
  let statusKey = 'maintaining';
  let statusColor = '#00A3A6'; // Teal default
  let labelVi = 'Duy trì thể lực';
  let labelEn = 'Maintaining';
  let descVi = 'Khối lượng tập luyện duy trì ổn định thể lực hiện tại.';
  let descEn = 'Your workload is keeping your fitness steady.';

  if (acuteRunsCount === 0 && chronicRunsCount === 0) {
    statusKey = 'no_data';
    statusColor = '#94a3b8';
    labelVi = 'Chưa đủ dữ liệu';
    labelEn = 'No Data';
    descVi = 'Hãy ghi nhận thêm các bài chạy để kích hoạt đo lường thể lực.';
    descEn = 'Log more runs to activate sports science tracking.';
  } else if (acuteLoadKm < 2 && chronicLoadKm > 10) {
    statusKey = 'detraining';
    statusColor = '#f59e0b';
    labelVi = 'Mất phong độ (Detraining)';
    labelEn = 'Detraining';
    descVi = 'Bạn đã nghỉ nhiều ngày liên tục. Thể lực hiếu khí đang có dấu hiệu giảm sút.';
    descEn = 'Extended inactivity detected. Aerobic base is decreasing.';
  } else if (acwr > 1.5) {
    statusKey = 'overreaching';
    statusColor = '#ef4444'; // Red alert
    labelVi = 'Cảnh báo quá tải (Overreaching)';
    labelEn = 'Overreaching (Injury Risk)';
    descVi = `Tỷ lệ tải tuần đạt ${acwr}x (vượt ngưỡng 1.5). Nguy cơ chấn thương gân cơ cao do tăng cự ly quá nhanh!`;
    descEn = `Weekly workload ratio is ${acwr}x (>1.5 threshold). High injury risk due to sudden volume increase!`;
  } else if (acwr >= 1.0 && acwr <= 1.35) {
    statusKey = 'productive';
    statusColor = '#78BE20'; // Brand Lime Green
    labelVi = 'Tập luyện hiệu quả (Productive)';
    labelEn = 'Productive (Sweet Spot)';
    descVi = `Tỷ lệ tải đạt ${acwr}x nằm trong vùng tối ưu (Sweet Spot 1.0 - 1.3). Thể lực đang phát triển rất tốt.`;
    descEn = `Workload ratio is ${acwr}x in the optimal Sweet Spot (1.0 - 1.35). Aerobic fitness is progressing well.`;
  } else if (acwr > 1.35 && acwr <= 1.5) {
    statusKey = 'very_high';
    statusColor = '#eab308';
    labelVi = 'Cường độ cao (High Workload)';
    labelEn = 'High Workload';
    descVi = `Tải luyện tập đạt ${acwr}x đang tiệm cận giới hạn chịu đựng. Hãy chú ý dinh dưỡng và giấc ngủ.`;
    descEn = `Workload ratio of ${acwr}x is nearing upper limits. Prioritize nutrition and sleep.`;
  } else if (acwr >= 0.75 && acwr < 1.0) {
    // Nếu tuần trước rất cao và tuần này hạ tải có chủ đích -> Peaking
    if (chronicLoadKm > 20 && acuteLoadKm >= 10) {
      statusKey = 'peaking';
      statusColor = '#00A3E0'; // Sky Blue
      labelVi = 'Điểm rơi phong độ (Peaking)';
      labelEn = 'Peaking';
      descVi = `Thể lực dồi dào sau khi giảm tải hợp lý. Sẵn sàng bứt phá mục tiêu hoặc kỷ lục cá nhân PR!`;
      descEn = `Well-rested with tapered volume. Ready for peak race performance or personal bests!`;
    } else {
      statusKey = 'maintaining';
      statusColor = '#00A3A6';
      labelVi = 'Duy trì (Maintaining)';
      labelEn = 'Maintaining';
      descVi = 'Tải luyện tập đủ để giữ nền tảng thể lực. Có thể tăng nhẹ cự ly nếu muốn bứt phá.';
      descEn = 'Volume is sufficient to hold your current base. Increase gradually to progress.';
    }
  } else {
    statusKey = 'recovery';
    statusColor = '#38bdf8';
    labelVi = 'Phục hồi (Recovery)';
    labelEn = 'Recovery';
    descVi = 'Khối lượng chạy nhẹ nhàng, cơ thể đang phục hồi và tái tạo các sợi cơ.';
    descEn = 'Low intensity workload. Muscles and joints are in an active recovery phase.';
  }

  return {
    acwr,
    acuteLoadKm: Math.round(acuteLoadKm * 10) / 10,
    chronicLoadKm: Math.round(chronicLoadKm * 10) / 10,
    acuteRunsCount,
    statusKey,
    statusColor,
    labelVi,
    labelEn,
    descVi,
    descEn
  };
}

/**
 * 2. Thuật toán Jack Daniels VDOT & Race Predictor (Pete Riegel Formula)
 * - Tìm bài chạy tốt nhất (Best Effort) >= 2.5km trong 90 ngày
 * - Dự đoán thời gian 5K, 10K, 21K
 * - Tính các dải Pace tập luyện: Zone 2 (Easy), Tempo, Interval
 */
export function calculateVDOTAndPredictions(activities = [], athleteId = null) {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Lọc hoạt động trong 90 ngày
  const recentRuns = (activities || []).filter(act => {
    if (athleteId) {
      const actAthId = act.athlete?.id || act.athleteId;
      if (actAthId && String(actAthId) !== String(athleteId)) {
        return false;
      }
    }
    const t = (act.type || '').toLowerCase();
    const isRun = ['run', 'virtualrun', 'trailrun', 'trail run'].includes(t) || t.includes('run') || !t;
    if (!isRun) return false;

    const dist = (act.distance || 0) / 1000;
    const time = act.moving_time || 0;
    if (dist < 2.5 || time < 300) return false; // Cần bài chạy ít nhất 2.5km

    const actDate = new Date(act.start_date_local || act.start_date);
    const daysAgo = (now - actDate) / dayMs;
    return daysAgo <= 90;
  });

  if (recentRuns.length === 0) {
    return {
      hasBenchmark: false,
      vdot: null,
      predicted5k: null,
      predicted10k: null,
      predicted21k: null,
      trainingPaces: {
        easyZone2: '6:30 - 7:15',
        tempo: '5:45 - 6:15',
        interval: '5:10 - 5:35'
      }
    };
  }

  // Tìm bài chạy có tốc độ tốt nhất (lowest paceSeconds) với cự ly >= 3km (hoặc dài nhất nếu < 3km)
  let bestRun = recentRuns[0];
  let bestPaceSec = getPaceSeconds(bestRun.moving_time, bestRun.distance);

  recentRuns.forEach(act => {
    const pSec = getPaceSeconds(act.moving_time, act.distance);
    // Ưu tiên bài chạy dài hơn và pace tốt
    const weightedPace = pSec - ((act.distance / 1000) * 1.5); // thưởng nhỏ cho cự ly dài hơn
    const currentBestWeighted = bestPaceSec - ((bestRun.distance / 1000) * 1.5);
    if (weightedPace < currentBestWeighted && pSec > 180 && pSec < 900) {
      bestRun = act;
      bestPaceSec = pSec;
    }
  });

  const d1 = (bestRun.distance || 5000) / 1000;
  const t1 = bestRun.moving_time || 1500;

  // Công thức Riegel: T2 = T1 * (D2 / D1)^1.06
  const predictTime = (targetDistKm) => {
    if (d1 <= 0 || t1 <= 0) return 0;
    return t1 * Math.pow(targetDistKm / d1, 1.06);
  };

  const time5k = predictTime(5);
  const time10k = predictTime(10);
  const time21k = predictTime(21.0975);

  // Ước lượng chỉ số VDOT Jack Daniels chuẩn xác từ 5K Time (phút)
  // Bảng chuẩn Jack Daniels: 5K 30m -> VDOT 32, 5K 25m -> VDOT 38, 5K 20m -> VDOT 48, 5K 16m -> VDOT 60
  const time5kMin = time5k / 60;
  let estimatedVdot = 30;
  if (time5kMin > 0) {
    estimatedVdot = Math.max(20, Math.min(85, Math.round(960 / time5kMin)));
  }

  // Dải Pace tập luyện theo Jack Daniels VDOT:
  // - Easy Pace (Zone 2): Pace 5K + 60s đến 90s
  // - Tempo Pace (Zone 4 Threshold): Pace 10K - 10s đến 15s
  // - Interval Pace (Zone 5 VO2): Pace 5K - 10s đến 15s
  const pace5kSec = time5k / 5;
  const pace10kSec = time10k / 10;

  const easyMin = pace5kSec + 65;
  const easyMax = pace5kSec + 105;
  const tempoMin = pace10kSec - 15;
  const tempoMax = pace10kSec + 5;
  const intervalMin = Math.max(150, pace5kSec - 18);
  const intervalMax = pace5kSec - 5;

  return {
    hasBenchmark: true,
    benchmarkDistanceKm: Math.round(d1 * 10) / 10,
    benchmarkPaceStr: formatPaceStr(bestPaceSec),
    vdot: estimatedVdot,
    predicted5k: formatRaceTime(time5k),
    predicted10k: formatRaceTime(time10k),
    predicted21k: formatRaceTime(time21k),
    trainingPaces: {
      easyZone2: `${formatPaceStr(easyMin)} - ${formatPaceStr(easyMax)}`,
      tempo: `${formatPaceStr(tempoMin)} - ${formatPaceStr(tempoMax)}`,
      interval: `${formatPaceStr(intervalMin)} - ${formatPaceStr(intervalMax)}`
    }
  };
}

/**
 * 3. Thuật toán Ước tính Thời gian Phục hồi (Garmin Recovery Advisor)
 * - Dựa trên cự ly bài chạy gần nhất, nhịp tim trung bình, độ cao leo và ACWR
 */
export function calculateRecoveryHours(latestRun, acwr = 1.0) {
  if (!latestRun) return 0;
  const distKm = (latestRun.distance || 0) / 1000;
  const durationMin = (latestRun.moving_time || 0) / 60;
  const hr = latestRun.average_heartrate || null;

  let baseHours = 12;

  // Tính theo cự ly
  if (distKm >= 21) baseHours = 48;
  else if (distKm >= 14) baseHours = 36;
  else if (distKm >= 9) baseHours = 24;
  else if (distKm >= 5) baseHours = 18;
  else baseHours = 12;

  // Điều chỉnh theo nhịp tim (nếu có)
  if (hr && hr >= 165) baseHours += 6;
  else if (hr && hr <= 135) baseHours = Math.max(8, baseHours - 6);

  // Điều chỉnh theo tải tích lũy ACWR
  if (acwr > 1.4) baseHours += 8;

  // Tính thời gian đã trôi qua từ bài chạy gần nhất
  const now = new Date();
  const runDate = new Date(latestRun.start_date_local || latestRun.start_date);
  const hoursPassed = Math.max(0, Math.floor((now - runDate) / (1000 * 60 * 60)));

  const remainingRecoveryHours = Math.max(0, baseHours - hoursPassed);
  return {
    totalRequiredHours: baseHours,
    remainingHours: remainingRecoveryHours,
    isFullyRecovered: remainingRecoveryHours === 0
  };
}

/**
 * 4. Phân tích Guồng chân (Cadence) & Nhịp tim
 */
export function analyzeCadenceAndHeartRate(latestRun) {
  if (!latestRun) return null;
  const hr = latestRun.average_heartrate ? Math.round(latestRun.average_heartrate) : null;
  const cadence = latestRun.average_cadence ? Math.round(latestRun.average_cadence * 2) : (latestRun.cadence || null);

  let cadenceTipVi = null;
  let cadenceTipEn = null;

  if (cadence) {
    if (cadence < 155) {
      cadenceTipVi = `Guồng chân ${cadence} spm hơi thấp (sải bước quá dài). Hãy bước ngắn hơn và tăng tần số lên 165-175 spm để giảm áp lực lên đầu gối.`;
      cadenceTipEn = `Cadence of ${cadence} spm indicates over-striding. Shorten strides and target 165-175 spm to protect knee joints.`;
    } else if (cadence >= 170) {
      cadenceTipVi = `Guồng chân ${cadence} spm rất tối ưu, tiết kiệm năng lượng và chuyển động thanh thoát.`;
      cadenceTipEn = `Optimal cadence of ${cadence} spm with efficient turnover and low impact.`;
    }
  }

  return {
    heartRate: hr,
    cadence,
    cadenceTipVi,
    cadenceTipEn
  };
}

/**
 * Hàm tổng hợp toàn bộ Metrics Khoa Học Thể Thao
 */
export function getSportsScienceMetrics(activities = [], athleteId = null, latestRun = null) {
  const trainingStatus = calculateACWR(activities, athleteId);
  const racePredictions = calculateVDOTAndPredictions(activities, athleteId);
  const recovery = calculateRecoveryHours(latestRun, trainingStatus.acwr);
  const biomechanics = analyzeCadenceAndHeartRate(latestRun);

  return {
    trainingStatus,
    racePredictions,
    recovery,
    biomechanics
  };
}

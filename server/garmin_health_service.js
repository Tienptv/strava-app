/**
 * Garmin Health Service (Garmin Connect / Firstbeat Biometrics)
 * Quản lý dữ liệu sinh trắc học sức khỏe:
 * - Giấc ngủ (Sleep Hours, Sleep Score)
 * - Nhịp tim nghỉ ngơi (Resting Heart Rate - RHR)
 * - Biến thiên nhịp tim (HRV Status & HRV ms)
 * - Năng lượng cơ thể (Body Battery) & Mức độ căng thẳng (Stress)
 * 
 * Tuân thủ nghiêm ngặt Quy tắc 6: Athlete ID là khóa chính duy nhất.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.join(__dirname, '..', 'Storage');
const GARMIN_HEALTH_FILE = path.join(STORAGE_DIR, 'garmin_health_data.json');

// Đảm bảo thư mục Storage tồn tại
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function readData() {
  try {
    if (fs.existsSync(GARMIN_HEALTH_FILE)) {
      const raw = fs.readFileSync(GARMIN_HEALTH_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[GarminHealth] Error reading file:', err);
  }
  return {};
}

function writeData(data) {
  try {
    fs.writeFileSync(GARMIN_HEALTH_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[GarminHealth] Error writing file:', err);
    return false;
  }
}

/**
 * Lấy dữ liệu sức khỏe của Vận động viên theo Athlete ID
 * @param {string|number} athleteId
 */
export function getGarminHealth(athleteId) {
  if (!athleteId) return null;
  const store = readData();
  const athKey = String(athleteId);
  return store[athKey] || null;
}

/**
 * Đánh giá điểm sẵn sàng (Readiness) và phát hiện mệt mỏi sinh trắc học
 * Theo chuẩn thể thao Garmin / Firstbeat & Science for Sport
 */
export function evaluateReadiness(healthRecord) {
  if (!healthRecord) {
    return {
      readinessScore: 80,
      status: 'good',
      labelVi: 'Thể lực bình thường',
      labelEn: 'Normal Readiness',
      shouldDowngrade: false,
      downgradeReasonVi: '',
      downgradeReasonEn: '',
      color: '#00A3A6'
    };
  }

  const { sleepHours = 7, sleepScore = 75, restingHeartRate = 55, baselineRhr = 52, hrvStatus = 'balanced', bodyBattery = 75 } = healthRecord;

  let score = 80;
  let shouldDowngrade = false;
  const reasonsVi = [];
  const reasonsEn = [];

  // 1. Phân tích giấc ngủ (Nguyên tắc y học thể thao: phục hồi hệ thần kinh trung ương)
  if (sleepScore < 60 || sleepHours < 5.5) {
    score -= 25;
    shouldDowngrade = true;
    reasonsVi.push(`Giấc ngủ kém (${sleepHours}h, điểm ${sleepScore}/100)`);
    reasonsEn.push(`Poor sleep (${sleepHours}h, score ${sleepScore}/100)`);
  } else if (sleepScore < 70 || sleepHours < 6.5) {
    score -= 10;
  } else if (sleepScore >= 85 && sleepHours >= 7.5) {
    score += 10;
  }

  // 2. Phân tích nhịp tim nghỉ ngơi (RHR Elevated >= +5 bpm là dấu hiệu mệt mỏi/viêm cơ)
  const rhrDiff = restingHeartRate - (baselineRhr || 52);
  if (rhrDiff >= 5) {
    score -= 20;
    shouldDowngrade = true;
    reasonsVi.push(`Nhịp tim nghỉ tăng +${rhrDiff} bpm (dấu hiệu quá tải/viêm cơ)`);
    reasonsEn.push(`Elevated resting HR +${rhrDiff} bpm (signs of fatigue/strain)`);
  } else if (rhrDiff <= -2) {
    score += 5;
  }

  // 3. Phân tích trạng thái HRV (Biến thiên nhịp tim)
  if (hrvStatus === 'low' || hrvStatus === 'poor') {
    score -= 20;
    shouldDowngrade = true;
    reasonsVi.push('HRV xuống thấp (hệ thần kinh giao cảm căng thẳng)');
    reasonsEn.push('Low HRV status (sympathetic nervous system stress)');
  } else if (hrvStatus === 'unbalanced') {
    score -= 10;
  } else if (hrvStatus === 'balanced') {
    score += 5;
  }

  // 4. Body Battery
  if (bodyBattery < 40) {
    score -= 15;
    shouldDowngrade = true;
    reasonsVi.push(`Body Battery cạn kiệt (${bodyBattery}%)`);
    reasonsEn.push(`Low Body Battery (${bodyBattery}%)`);
  }

  const clampedScore = Math.max(15, Math.min(100, score));

  let status = 'good';
  let labelVi = 'Sẵn sàng tập luyện';
  let labelEn = 'Prime Readiness';
  let color = '#78BE20'; // Lime green

  if (clampedScore >= 85) {
    status = 'optimal';
    labelVi = 'Thể lực đỉnh cao (Optimal)';
    labelEn = 'Peak Readiness (Optimal)';
    color = '#78BE20';
  } else if (clampedScore >= 70) {
    status = 'good';
    labelVi = 'Sẵn sàng tập luyện (Good)';
    labelEn = 'Good Readiness';
    color = '#00A3A6'; // Brand teal
  } else if (clampedScore >= 55) {
    status = 'fair';
    labelVi = 'Cần chú ý thể lực (Fair)';
    labelEn = 'Moderate Fatigue (Caution)';
    color = '#f59e0b'; // Amber
  } else {
    status = 'poor';
    labelVi = 'Cảnh báo mệt mỏi / Cần nghỉ ngơi (Fatigue)';
    labelEn = 'High Fatigue (Rest Advised)';
    color = '#ef4444'; // Red
    shouldDowngrade = true;
  }

  return {
    readinessScore: clampedScore,
    status,
    labelVi,
    labelEn,
    color,
    shouldDowngrade,
    downgradeReasonVi: reasonsVi.join('; '),
    downgradeReasonEn: reasonsEn.join('; ')
  };
}

/**
 * Lưu/Cập nhật dữ liệu sức khỏe của Vận động viên theo Athlete ID (Rule #6)
 */
export function saveGarminHealth(athleteId, inputData) {
  if (!athleteId) {
    throw new Error('Athlete ID is mandatory (Rule #6)');
  }

  const athKey = String(athleteId);
  const store = readData();
  const currentRecord = store[athKey] || { history: [] };

  const today = new Date().toISOString().split('T')[0];
  const latestEntry = {
    date: inputData.date || today,
    sleepHours: Number(inputData.sleepHours) || 7.0,
    sleepScore: Number(inputData.sleepScore) || 75,
    restingHeartRate: Number(inputData.restingHeartRate) || 55,
    baselineRhr: Number(inputData.baselineRhr) || 52,
    hrvStatus: inputData.hrvStatus || 'balanced', // balanced, unbalanced, low
    hrvMs: Number(inputData.hrvMs) || 60,
    bodyBattery: Number(inputData.bodyBattery) || 80,
    stressLevel: Number(inputData.stressLevel) || 25,
    source: inputData.source || 'manual_entry',
    updatedAt: new Date().toISOString()
  };

  const readiness = evaluateReadiness(latestEntry);
  latestEntry.readiness = readiness;

  // Cập nhật lịch sử (giữ tối đa 30 ngày)
  const history = Array.isArray(currentRecord.history) ? currentRecord.history : [];
  const existingIdx = history.findIndex(h => h.date === latestEntry.date);
  if (existingIdx >= 0) {
    history[existingIdx] = latestEntry;
  } else {
    history.unshift(latestEntry);
  }
  const trimmedHistory = history.slice(0, 30);

  store[athKey] = {
    athleteId: athKey,
    latest: latestEntry,
    history: trimmedHistory
  };

  writeData(store);
  return store[athKey];
}

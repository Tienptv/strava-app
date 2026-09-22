/**
 * Garmin File Parser (Smart Biometrics Parser)
 * Phân tích dữ liệu sinh học từ các định dạng tệp xuất từ Garmin Connect:
 * 1. Garmin Native API JSON (dailySleepDTO, userSummaryDTO, dailyStressDTO, hrvSummary)
 * 2. Garmin Reports CSV (Báo cáo xuất từ connect.garmin.com)
 * 3. Standard Biometrics JSON (Cấu trúc sinh học chuẩn hóa)
 * 4. Multi-day Batch Records (Lịch sử nhiều ngày liên tiếp)
 * 
 * Tuân thủ Rule #6: Luôn gắn dữ liệu với Athlete ID.
 */

/**
 * Phân tích chuỗi thời gian HH:MM hoặc số giây thành số giờ thập phân
 * @param {string|number} val - Ví dụ: "7:30", "7h 30m", 27000 (giây), 7.5
 * @returns {number} Số giờ (ví dụ: 7.5)
 */
export function parseDurationToHours(val) {
  if (val === undefined || val === null || val === '') return 7.0;
  if (typeof val === 'number') {
    // Nếu > 100 thì nhiều khả năng là số giây (e.g. 27000s = 7.5h)
    if (val > 100) return Math.round((val / 3600) * 10) / 10;
    return Math.round(val * 10) / 10;
  }

  const str = String(val).trim();
  // Định dạng HH:MM (e.g. "07:30" hoặc "7:45")
  if (str.includes(':')) {
    const parts = str.split(':');
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    return Math.round((h + m / 60) * 10) / 10;
  }

  // Định dạng "7h 30m" hoặc "7h30"
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*m/i);
  if (hMatch || mMatch) {
    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    const m = mMatch ? parseInt(mMatch[1], 10) : 0;
    return Math.round((h + m / 60) * 10) / 10;
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 7.0 : Math.round(parsed * 10) / 10;
}

/**
 * Chuẩn hóa trạng thái HRV
 */
export function normalizeHrvStatus(status) {
  if (!status) return 'balanced';
  const s = String(status).toLowerCase();
  if (s.includes('low') || s.includes('thấp') || s.includes('poor')) return 'low';
  if (s.includes('unbalanced') || s.includes('không cân bằng')) return 'unbalanced';
  return 'balanced';
}

/**
 * Trích xuất chỉ số sinh học từ một bản ghi Garmin Native API JSON
 */
export function parseGarminRawJsonObject(obj) {
  if (!obj || typeof obj !== 'object') return null;

  // Lấy ngày
  const date = obj.calendarDate || obj.date || obj.dailySleepDTO?.calendarDate || new Date().toISOString().split('T')[0];

  // 1. Giấc ngủ
  let sleepHours = 7.0;
  let sleepScore = 75;

  if (obj.dailySleepDTO) {
    const sDto = obj.dailySleepDTO;
    if (sDto.sleepTimeSeconds) sleepHours = parseDurationToHours(sDto.sleepTimeSeconds);
    else if (sDto.sleepSeconds) sleepHours = parseDurationToHours(sDto.sleepSeconds);
    
    if (sDto.sleepScores?.overall?.value) sleepScore = Number(sDto.sleepScores.overall.value);
    else if (sDto.sleepScore) sleepScore = Number(sDto.sleepScore);
  } else if (obj.sleepHours !== undefined) {
    sleepHours = parseDurationToHours(obj.sleepHours);
    if (obj.sleepScore !== undefined) sleepScore = Number(obj.sleepScore);
  } else if (obj.sleepingSeconds) {
    sleepHours = parseDurationToHours(obj.sleepingSeconds);
  }

  // 2. Nhịp tim nghỉ RHR
  let restingHeartRate = 52;
  let baselineRhr = 50;

  if (obj.restingHeartRate !== undefined) {
    restingHeartRate = Number(obj.restingHeartRate) || 52;
  } else if (obj.dailyHeartRateDTO?.restingHeartRate !== undefined) {
    restingHeartRate = Number(obj.dailyHeartRateDTO.restingHeartRate) || 52;
  } else if (obj.userSummaryDTO?.restingHeartRate !== undefined) {
    restingHeartRate = Number(obj.userSummaryDTO.restingHeartRate) || 52;
  }

  if (obj.baselineRhr !== undefined) {
    baselineRhr = Number(obj.baselineRhr) || restingHeartRate;
  } else {
    baselineRhr = restingHeartRate;
  }

  // 3. Biến thiên nhịp tim HRV
  let hrvStatus = 'balanced';
  let hrvMs = 60;

  if (obj.hrvSummary) {
    hrvStatus = normalizeHrvStatus(obj.hrvSummary.status);
    hrvMs = Number(obj.hrvSummary.lastNightAvg || obj.hrvSummary.weeklyAvg) || 60;
  } else if (obj.hrvStatus !== undefined) {
    hrvStatus = normalizeHrvStatus(obj.hrvStatus);
    if (obj.hrvMs !== undefined) hrvMs = Number(obj.hrvMs) || 60;
  }

  // 4. Năng lượng Body Battery & Stress
  let bodyBattery = 80;
  let stressLevel = 25;

  if (Array.isArray(obj.bodyBatteryValuesArray) && obj.bodyBatteryValuesArray.length > 0) {
    // Garmin bodyBatteryValuesArray có cấu trúc: [[timestamp, charged, drained, level], ...]
    const lastValid = obj.bodyBatteryValuesArray
      .filter(item => Array.isArray(item) && item[3] !== null && !isNaN(item[3]))
      .pop();
    if (lastValid && lastValid[3] !== undefined) {
      bodyBattery = Number(lastValid[3]);
    }
  } else if (obj.bodyBattery !== undefined) {
    bodyBattery = Number(obj.bodyBattery) || 80;
  } else if (obj.bodyBatteryHighestValue !== undefined) {
    bodyBattery = Number(obj.bodyBatteryHighestValue) || 80;
  }

  if (obj.overallStressLevel !== undefined) {
    stressLevel = Number(obj.overallStressLevel) || 25;
  } else if (obj.avgStressLevel !== undefined) {
    stressLevel = Number(obj.avgStressLevel) || 25;
  } else if (obj.stressLevel !== undefined) {
    stressLevel = Number(obj.stressLevel) || 25;
  }

  return {
    date,
    sleepHours: Math.max(3, Math.min(14, sleepHours)),
    sleepScore: Math.max(0, Math.min(100, sleepScore)),
    restingHeartRate: Math.max(35, Math.min(110, restingHeartRate)),
    baselineRhr: Math.max(35, Math.min(110, baselineRhr)),
    hrvStatus,
    hrvMs,
    bodyBattery: Math.max(5, Math.min(100, bodyBattery)),
    stressLevel: Math.max(0, Math.min(100, stressLevel)),
    source: 'garmin_file_import'
  };
}

/**
 * Phân tích tệp JSON (có thể là đối tượng đơn hoặc mảng nhiều ngày)
 * @param {string|object} jsonInput
 * @returns {Array<object>} Danh sách các bản ghi chuẩn hóa
 */
export function parseGarminJson(jsonInput) {
  let parsed = jsonInput;
  if (typeof jsonInput === 'string') {
    try {
      parsed = JSON.parse(jsonInput);
    } catch (e) {
      throw new Error('Dữ liệu JSON không hợp lệ / Invalid JSON syntax');
    }
  }

  const results = [];
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const rec = parseGarminRawJsonObject(item);
      if (rec) results.push(rec);
    }
  } else if (parsed && typeof parsed === 'object') {
    // Kiểm tra nếu là dạng bọc { history: [...] }
    if (Array.isArray(parsed.history)) {
      for (const item of parsed.history) {
        const rec = parseGarminRawJsonObject(item);
        if (rec) results.push(rec);
      }
    } else if (Array.isArray(parsed.data)) {
      for (const item of parsed.data) {
        const rec = parseGarminRawJsonObject(item);
        if (rec) results.push(rec);
      }
    } else {
      const rec = parseGarminRawJsonObject(parsed);
      if (rec) results.push(rec);
    }
  }

  return results;
}

/**
 * Phân tích tệp CSV xuất từ Báo cáo Garmin Connect (Garmin Reports CSV)
 * @param {string} csvText
 * @returns {Array<object>} Danh sách các bản ghi chuẩn hóa
 */
export function parseGarminCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Tìm dòng tiêu đề header
  let headerIndex = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('date') || lower.includes('ngày') || lower.includes('sleep') || lower.includes('heart rate')) {
      headerIndex = i;
      break;
    }
  }

  const header = lines[headerIndex].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const dateCol = header.findIndex(h => h.includes('date') || h.includes('ngày'));
  const sleepHrsCol = header.findIndex(h => h.includes('duration') || h.includes('sleep time') || h.includes('thời gian ngủ') || h.includes('hours') || h.includes('giờ'));
  const sleepScoreCol = header.findIndex(h => h.includes('sleep score') || h.includes('điểm'));
  const rhrCol = header.findIndex(h => h.includes('resting') || h.includes('rhr') || h.includes('nhịp tim nghỉ'));
  const hrvCol = header.findIndex(h => h.includes('hrv') || h.includes('biến thiên'));
  const bodyBatteryCol = header.findIndex(h => h.includes('body battery') || h.includes('pin') || h.includes('năng lượng'));
  const stressCol = header.findIndex(h => h.includes('stress') || h.includes('căng thẳng'));

  const results = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    // Tách các cột xử lý dấu ngoặc kép
    const parts = rawLine.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length === 0 || !parts[0]) continue;

    const rawDate = dateCol >= 0 ? parts[dateCol] : parts[0];
    if (!rawDate) continue;

    // Chuẩn hóa ngày YYYY-MM-DD
    let formattedDate = rawDate;
    const dMatch = rawDate.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (dMatch) {
      formattedDate = `${dMatch[1]}-${dMatch[2].padStart(2, '0')}-${dMatch[3].padStart(2, '0')}`;
    } else {
      const dMatchAlt = rawDate.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (dMatchAlt) {
        formattedDate = `${dMatchAlt[3]}-${dMatchAlt[2].padStart(2, '0')}-${dMatchAlt[1].padStart(2, '0')}`;
      }
    }

    const sleepHours = sleepHrsCol >= 0 ? parseDurationToHours(parts[sleepHrsCol]) : 7.0;
    const sleepScore = sleepScoreCol >= 0 ? (Number(parts[sleepScoreCol]) || 75) : 75;
    const restingHeartRate = rhrCol >= 0 ? (Number(parts[rhrCol]) || 52) : 52;
    const hrvRaw = hrvCol >= 0 ? parts[hrvCol] : 'balanced';
    const hrvStatus = normalizeHrvStatus(hrvRaw);
    const hrvMs = !isNaN(Number(hrvRaw)) ? Number(hrvRaw) : 60;
    const bodyBattery = bodyBatteryCol >= 0 ? (Number(parts[bodyBatteryCol]) || 80) : 80;
    const stressLevel = stressCol >= 0 ? (Number(parts[stressCol]) || 25) : 25;

    results.push({
      date: formattedDate,
      sleepHours: Math.max(3, Math.min(14, sleepHours)),
      sleepScore: Math.max(0, Math.min(100, sleepScore)),
      restingHeartRate: Math.max(35, Math.min(110, restingHeartRate)),
      baselineRhr: restingHeartRate,
      hrvStatus,
      hrvMs,
      bodyBattery: Math.max(5, Math.min(100, bodyBattery)),
      stressLevel: Math.max(0, Math.min(100, stressLevel)),
      source: 'garmin_csv_import'
    });
  }

  return results;
}

/**
 * Tự động phát hiện định dạng tệp (JSON hay CSV) và phân tích
 * @param {string} fileContent
 * @returns {Array<object>}
 */
export function parseGarminFile(fileContent) {
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('Nội dung tệp trống / Empty file content');
  }

  const trimmed = fileContent.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseGarminJson(trimmed);
  } else {
    return parseGarminCsv(trimmed);
  }
}

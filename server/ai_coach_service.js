/**
 * AI Coach Service for Strava Desktop Software
 * Hỗ trợ phân tích cá nhân hóa bằng Google Gemini API (gemini-1.5-flash)
 * Kèm bộ Smart Heuristic Coach nội bộ (Fallback tự động khi offline hoặc chưa nhập API Key)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.join(__dirname, '../Storage');
const AI_CACHE_FILE = path.join(STORAGE_DIR, 'ai_coach_cache.json');
const CONFIG_FILE = path.join(STORAGE_DIR, 'challenge_config.json');

// Đọc API Key từ config file hoặc .env
function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (cfg.geminiApiKey && cfg.geminiApiKey.trim() !== '') {
        return cfg.geminiApiKey.trim();
      }
    }
  } catch (_) {}
  return null;
}

// Đọc/Ghi Cache
function readAiCache() {
  try {
    if (fs.existsSync(AI_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(AI_CACHE_FILE, 'utf8')) || {};
    }
  } catch (e) {
    console.error('[AI Coach] Lỗi đọc cache:', e.message);
  }
  return {};
}

function writeAiCache(cacheData) {
  try {
    if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
    fs.writeFileSync(AI_CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
  } catch (e) {
    console.error('[AI Coach] Lỗi ghi cache:', e.message);
  }
}

// Chuyển đổi giây thành chuỗi pace "mm:ss"
function formatPace(totalSeconds, distanceKm) {
  if (!distanceKm || distanceKm <= 0 || !totalSeconds || totalSeconds <= 0) return '--:--';
  const secPerKm = totalSeconds / distanceKm;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Tính số giây/km để so sánh độ nhanh chậm
function getPaceSeconds(totalSeconds, distanceKm) {
  if (!distanceKm || distanceKm <= 0 || !totalSeconds || totalSeconds <= 0) return 9999;
  return totalSeconds / distanceKm;
}

/**
 * Trích xuất đặc trưng các hoạt động của runner
 */
export function extractRunnerContext({ athlete, activities = [], goal = 0, currentDist = 0, paceAnalysis = {}, hasPenalty = false, penaltyDue = 0 }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Lọc bài chạy
  const runActivities = (activities || [])
    .filter(act => {
      const t = (act.type || '').toLowerCase();
      return ['run', 'virtualrun', 'trailrun', 'trail run'].includes(t) || t.includes('run') || t.includes('trail') || !t;
    })
    .sort((a, b) => new Date(b.start_date_local) - new Date(a.start_date_local));

  // Bài chạy gần nhất
  const latestRun = runActivities[0] || null;
  let daysSinceLastRun = 999;
  let latestRunInfo = null;

  if (latestRun) {
    const runDate = new Date(latestRun.start_date_local.endsWith('Z') ? latestRun.start_date_local.slice(0, -1) : latestRun.start_date_local);
    const diffTime = Math.abs(now.setHours(0, 0, 0, 0) - new Date(runDate).setHours(0, 0, 0, 0));
    daysSinceLastRun = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const distKm = Math.round((latestRun.distance / 1000) * 10) / 10;
    const paceStr = formatPace(latestRun.moving_time, distKm);
    const paceSec = getPaceSeconds(latestRun.moving_time, distKm);

    // NHỊP TIM: Trích xuất để AI phân tích cường độ, bảo mật không hiển thị thô ra UI
    const avgHeartRate = latestRun.average_heartrate ? Math.round(latestRun.average_heartrate) : null;
    const maxHeartRate = latestRun.max_heartrate ? Math.round(latestRun.max_heartrate) : null;

    latestRunInfo = {
      id: latestRun.id,
      name: latestRun.name || 'Buổi chạy',
      distanceKm: distKm,
      movingTimeSec: latestRun.moving_time,
      movingTimeStr: `${Math.floor(latestRun.moving_time / 3600)}h ${Math.floor((latestRun.moving_time % 3600) / 60)}m`,
      pace: paceStr,
      paceSeconds: paceSec,
      elevationGain: Math.round(latestRun.total_elevation_gain || 0),
      dateStr: runDate.toLocaleDateString('vi-VN'),
      avgHeartRate,
      maxHeartRate
    };
  }

  // Tính chuỗi ngày chạy liên tục (Streak) đến bài chạy gần nhất
  let streak = 0;
  if (latestRun && daysSinceLastRun <= 1) {
    const datesWithRun = new Set(
      runActivities.map(a => {
        const d = new Date(a.start_date_local.endsWith('Z') ? a.start_date_local.slice(0, -1) : a.start_date_local);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    );

    let checkDate = new Date();
    if (daysSinceLastRun === 1) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const k = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (datesWithRun.has(k)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Tính Pace trung bình của các bài chạy trong tháng hiện tại
  let monthTotalDist = 0;
  let monthTotalSec = 0;
  runActivities.forEach(a => {
    const d = new Date(a.start_date_local.endsWith('Z') ? a.start_date_local.slice(0, -1) : a.start_date_local);
    if (d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth) {
      monthTotalDist += (a.distance || 0) / 1000;
      monthTotalSec += a.moving_time || 0;
    }
  });

  const avgMonthPaceSec = monthTotalDist > 0 ? monthTotalSec / monthTotalDist : 9999;
  const avgMonthPaceStr = formatPace(monthTotalSec, monthTotalDist);

  // Đánh giá combo [Streak + Pace]
  let paceIntensity = 'normal'; // 'fast', 'moderate', 'recovery'
  if (latestRunInfo && avgMonthPaceSec < 9000) {
    if (latestRunInfo.paceSeconds < avgMonthPaceSec - 15) {
      paceIntensity = 'fast'; // Nhanh hơn bình thường đáng kể
    } else if (latestRunInfo.paceSeconds > avgMonthPaceSec + 25) {
      paceIntensity = 'recovery'; // Chạy chậm hồi phục
    }
  }

  // Đánh giá nhịp tim định tính (không đưa số bpm ra ngoài)
  let cardioStrain = 'unknown';
  if (latestRunInfo && latestRunInfo.avgHeartRate) {
    if (latestRunInfo.avgHeartRate > 165) {
      cardioStrain = 'high_intensity'; // Vùng yếm khí / ngưỡng nặng
    } else if (latestRunInfo.avgHeartRate >= 140) {
      cardioStrain = 'aerobic_endurance'; // Vùng hiếu khí bền vững
    } else {
      cardioStrain = 'light_aerobic'; // Vùng hồi phục nhẹ nhàng
    }
  }

  return {
    athleteName: athlete?.firstname ? `${athlete.firstname} ${athlete.lastname || ''}`.trim() : 'Runner',
    athleteId: athlete?.id ? String(athlete.id) : null,
    goal,
    currentDist: Math.round(currentDist * 10) / 10,
    remainingKm: paceAnalysis?.remainingKm || Math.max(0, Math.round((goal - currentDist) * 10) / 10),
    daysLeft: paceAnalysis?.daysLeft || 0,
    requiredPacePerDay: paceAnalysis?.requiredPacePerDay || '0.0',
    isGoalReached: goal > 0 && currentDist >= goal,
    hasPenalty,
    penaltyDue,
    latestRun: latestRunInfo,
    daysSinceLastRun,
    streak,
    paceIntensity,
    cardioStrain,
    avgMonthPaceStr
  };
}

/**
 * Bộ Smart Heuristic Fallback (Khi offline hoặc không có API Key)
 */
function generateHeuristicAdvice(ctx, lang = 'vi') {
  const isVi = lang === 'vi';
  let title = isVi ? 'Tư vấn & Kế hoạch' : 'Coach Recommendations';
  let type = 'info';
  let message = '';
  let badge = 'Smart Coach';

  // 1. Nếu chưa đặt mục tiêu
  if (ctx.goal <= 0) {
    return {
      title,
      type: 'info',
      badge,
      message: isVi
        ? 'Hãy thiết lập mục tiêu tháng để nhận phân tích chi tiết và kế hoạch chạy bộ khoa học!'
        : 'Set your monthly goal to unlock intelligent training advice and personalized workouts!',
      actionPlan: isVi ? 'Đặt mục tiêu từ 50km - 150km phù hợp với thể lực.' : 'Set a realistic target between 50km - 150km.'
    };
  }

  // 2. Nếu đã hoàn thành mục tiêu
  if (ctx.isGoalReached) {
    return {
      title,
      type: 'success',
      badge: 'Goal Achieved 🎯',
      message: isVi
        ? `Xuất sắc! Bạn đã hoàn thành mục tiêu ${ctx.goal} km của tháng. Hãy chuyển sang các bài chạy nhẹ phục hồi hoặc đặt thêm mục tiêu phụ thử thách bản thân.`
        : `Brilliant! You completed your ${ctx.goal} km goal. Focus on easy recovery runs or set an optional stretch goal.`,
      actionPlan: isVi ? 'Chạy thả lỏng 3-5km hoặc nghỉ ngơi tái tạo năng lượng.' : 'Easy 3-5km recovery jog or active rest.'
    };
  }

  // 3. TRỌNG TÂM 4: Cảnh báo nghỉ hoạt động quá lâu (Inactivity Alert - Đang lười/ngắt quãng)
  if (ctx.daysSinceLastRun >= 3) {
    type = 'warning';
    badge = 'Inactivity Alert ⚠️';
    if (ctx.daysSinceLastRun >= 5) {
      message = isVi
        ? `Đã ${ctx.daysSinceLastRun} ngày rồi bạn chưa xỏ giày! Cơ bắp đang dần nguội và mục tiêu tháng còn thiếu ${ctx.remainingKm} km (${ctx.requiredPacePerDay} km/ngày). Tuyệt đối không chạy gấp đôi để "bù" ngày nghỉ; hãy khởi động thật kỹ và bắt đầu lại bằng bài chạy nhẹ 3-4km hôm nay!`
        : `It's been ${ctx.daysSinceLastRun} days without running! Muscle readiness is fading and you still need ${ctx.remainingKm} km. Do not overcompensate with double mileage; warm up thoroughly and ease back in with a gentle 3-4km run today!`;
    } else {
      message = isVi
        ? `Bạn đã nghỉ ${ctx.daysSinceLastRun} ngày liên tiếp. Để hoàn thành mục tiêu ${ctx.goal} km còn lại trong ${ctx.daysLeft} ngày, bạn cần duy trì ${ctx.requiredPacePerDay} km/ngày. Hãy ra đường hôm nay để giữ nhịp chạy nhé!`
        : `You have been inactive for ${ctx.daysSinceLastRun} days. You need ${ctx.requiredPacePerDay} km/day over the next ${ctx.daysLeft} days to hit your target. Lace up today to keep the momentum going!`;
    }

    if (ctx.hasPenalty && ctx.penaltyDue > 0) {
      message += isVi ? ` Lưu ý áp lực cam kết quỹ ${ctx.penaltyDue}k đang tăng dần!` : ` Keep in mind your potential penalty commitment!`;
    }

    return {
      title,
      type,
      badge,
      message,
      actionPlan: isVi ? 'Khởi động khớp cổ chân/gối, chạy nhẹ 3-4km pace thoải mái.' : 'Dynamic stretching + easy 3-4km jog.'
    };
  }

  // 4. TRỌNG TÂM 2: Cảnh báo quá tải khi kết hợp [Streak + Pace]
  if (ctx.streak >= 3) {
    if (ctx.paceIntensity === 'fast' || ctx.cardioStrain === 'high_intensity') {
      type = 'warning';
      badge = 'Recovery Needed 🛑';
      message = isVi
        ? `Bạn đã chạy liên tiếp ${ctx.streak} ngày với nhịp độ cao và tải tim mạch lớn! Nguy cơ quá tải gân cơ và chấn thương ống đồng đang rất cao. Ngày mai bạn nên NGHỈ HOÀN TOÀN (Rest Day) hoặc chỉ đi bộ thả lỏng để cơ thể tái tạo mô cơ.`
        : `You've run ${ctx.streak} consecutive days at a high intensity pace! Overuse and tendon injury risk is elevated. Tomorrow should be a complete REST DAY or a gentle walking session.`;
      return {
        title,
        type,
        badge,
        message,
        actionPlan: isVi ? 'Nghỉ ngơi hoàn toàn, ngâm chân nước ấm, ngủ đủ giấc.' : 'Full rest day, foam rolling, hydration.'
      };
    } else {
      type = 'info';
      badge = `Streak ${ctx.streak} Days 🔥`;
      message = isVi
        ? `Thói quen tuyệt vời với chuỗi ${ctx.streak} ngày chạy liên tục ở nhịp độ kiểm soát tốt. Dù vậy, hãy luân phiên một ngày chạy ngắn nhẹ nhàng 2-3km để hệ tuần hoàn phục hồi.`
        : `Superb discipline with a ${ctx.streak}-day streak at controlled effort. Consider keeping tomorrow short and easy (2-3km) to allow active recovery.`;
      return {
        title,
        type,
        badge,
        message,
        actionPlan: isVi ? 'Chạy phục hồi 2-3km pace chậm hoặc nghỉ ngơi 1 ngày.' : '2-3km recovery run or rest day.'
      };
    }
  }

  // 5. TRỌNG TÂM 1 & 3: Phân tích bài chạy gần nhất và gợi ý bài tiếp theo
  if (ctx.latestRun) {
    const isLongRun = ctx.latestRun.distanceKm >= 9;
    const isFastPace = ctx.paceIntensity === 'fast';

    if (isLongRun) {
      type = 'success';
      badge = 'Long Run Done 🏅';
      message = isVi
        ? `Buổi chạy dài ${ctx.latestRun.distanceKm} km gần nhất của bạn rất chất lượng (pace ${ctx.latestRun.pace}), bổ sung đáng kể vào tổng cự ly. Hãy bổ sung nước, điện giải và dành ngày mai chạy nhẹ 3-4km để xả cơ.`
        : `Your recent ${ctx.latestRun.distanceKm} km long run (pace ${ctx.latestRun.pace}) was solid and banked valuable mileage. Hydrate well and plan an easy 3-4km shakeout next.`;
    } else if (isFastPace) {
      type = 'success';
      badge = 'Fast Pace ⚡';
      message = isVi
        ? `Bài chạy ${ctx.latestRun.distanceKm} km vừa qua bạn duy trì tốc độ rất bốc (pace ${ctx.latestRun.pace}). Để đạt mục tiêu ${ctx.goal} km cả tháng, hãy cân bằng giữa bài chạy nhanh và các bài chạy bền dài hơi.`
        : `Great speed on your ${ctx.latestRun.distanceKm} km run with a fast pace of ${ctx.latestRun.pace}. Balance fast tempo runs with steady aerobic volume to meet your ${ctx.goal} km target.`;
    } else {
      type = ctx.remainingKm > 0 ? 'info' : 'success';
      badge = 'On Track 👍';
      message = isVi
        ? `Bài chạy ${ctx.latestRun.distanceKm} km (pace ${ctx.latestRun.pace}) duy trì phong độ ổn định. Bạn còn thiếu ${ctx.remainingKm} km trong ${ctx.daysLeft} ngày (${ctx.requiredPacePerDay} km/ngày). Duy trì đều đặn 3-4 buổi/tuần bạn sẽ về đích an toàn!`
        : `Good steady run of ${ctx.latestRun.distanceKm} km (pace ${ctx.latestRun.pace}). Remaining: ${ctx.remainingKm} km in ${ctx.daysLeft} days (${ctx.requiredPacePerDay} km/day). Maintain 3-4 runs per week to comfortably reach the finish line!`;
    }

    return {
      title,
      type,
      badge,
      message,
      actionPlan: isVi
        ? `Buổi tới: Chạy ${Math.max(3, Math.min(8, Math.round(parseFloat(ctx.requiredPacePerDay) * 1.5)))} km ở nhịp thở trò chuyện thoải mái.`
        : `Next session: ${Math.max(3, Math.min(8, Math.round(parseFloat(ctx.requiredPacePerDay) * 1.5)))} km at conversational pace.`
    };
  }

  // Fallback chung
  return {
    title,
    type: 'info',
    badge,
    message: isVi
      ? `Cần chạy trung bình ${ctx.requiredPacePerDay} km/ngày trong ${ctx.daysLeft} ngày còn lại để hoàn thành mục tiêu ${ctx.goal} km.`
      : `Aim for ${ctx.requiredPacePerDay} km/day across the remaining ${ctx.daysLeft} days to hit ${ctx.goal} km.`,
    actionPlan: isVi ? 'Lên lịch chạy 3-4 buổi/tuần.' : 'Schedule 3-4 runs this week.'
  };
}

/**
 * Gọi Google Gemini API để phân tích chuyên sâu
 */
async function callGeminiApi(ctx, apiKey, lang = 'vi') {
  const isVi = lang === 'vi';
  const prompt = `
Bạn là một Huấn Luyện Viên Điền Kinh Cá Nhân (Running Coach AI) chuyên nghiệp, tâm huyết và chu đáo.
Dưới đây là dữ liệu chạy bộ thực tế của học viên:
- Tên học viên: ${ctx.athleteName}
- Mục tiêu tháng: ${ctx.goal} km
- Số km đã chạy tháng này: ${ctx.currentDist} km
- Số km còn thiếu: ${ctx.remainingKm} km
- Số ngày còn lại trong tháng: ${ctx.daysLeft} ngày
- Tốc độ km cần duy trì mỗi ngày: ${ctx.requiredPacePerDay} km/ngày
- Có cam kết nộp phạt CLB: ${ctx.hasPenalty ? `Có (phạt ước tính: ${ctx.penaltyDue}k VNĐ)` : 'Không'}
- Bài chạy gần nhất: ${ctx.latestRun ? `${ctx.latestRun.name}, Cự ly: ${ctx.latestRun.distanceKm} km, Pace: ${ctx.latestRun.pace} /km, Thời gian: ${ctx.latestRun.movingTimeStr}, Độ cao leo: ${ctx.latestRun.elevationGain}m, Ngày: ${ctx.latestRun.dateStr}` : 'Chưa có bài chạy gần đây'}
- Số ngày đã nghỉ từ bài chạy gần nhất: ${ctx.daysSinceLastRun} ngày
- Số ngày chạy liên tiếp (Streak): ${ctx.streak} ngày
- Cường độ Pace so với trung bình tháng (${ctx.avgMonthPaceStr}/km): ${ctx.paceIntensity === 'fast' ? 'Nhanh hơn bình thường (cường độ cao)' : ctx.paceIntensity === 'recovery' ? 'Chậm hơn bình thường (chạy phục hồi)' : 'Bình thường'}
- Tải tim mạch (Chỉ dùng để suy luận, KHÔNG ĐƯỢC để lộ số bpm): ${ctx.cardioStrain === 'high_intensity' ? 'Cường độ tim mạch cao' : ctx.cardioStrain === 'aerobic_endurance' ? 'Vùng hiếu khí bền vững' : ctx.cardioStrain === 'light_aerobic' ? 'Nhẹ nhàng phục hồi' : 'Không rõ'}

QUY TẮC CỰC KỲ QUAN TRỌNG:
1. BẢO MẬT SỨC KHỎE: Tuyệt đối KHÔNG viết số nhịp tim cụ thể (bpm) ra câu trả lời. Chỉ đánh giá định tính thể lực.
2. COMBO [STREAK + PACE]: Nếu chạy liên tiếp >= 3 ngày với pace nhanh, BẮT BUỘC cảnh báo nguy cơ chấn thương và khuyên ngày mai nghỉ ngơi (Rest Day).
3. INACTIVITY ALERT: Nếu số ngày nghỉ >= 3 ngày, BẮT BUỘC nhắc nhở thân thiện, khuyên không chạy bù quá đà kẻo chấn thương.
4. ĐỘ DÀI: Ngắn gọn, súc tích (chỉ từ 2 đến 3 câu). Văn phong gần gũi, khích lệ, chuyên môn thể thao cao.
5. NGÔN NGỮ: ${isVi ? 'Tiếng Việt' : 'Tiếng Anh'}.

HÃY TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON HỢP LỆ THEO CẤU TRÚC:
{
  "badge": "Chuỗi ngắn (vd: 'Long Run Done 🏅' hoặc 'Recovery Needed 🛑' hoặc 'Inactivity Alert ⚠️' hoặc 'On Track 👍')",
  "type": "success" | "warning" | "info",
  "message": "Nội dung 2-3 câu lời khuyên của Coach",
  "actionPlan": "Gợi ý cự ly & dạng bài tập tiếp theo (1 câu ngắn)"
}
`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 600,
      responseMimeType: 'application/json'
    }
  };

  // Thử model gemini-1.5-flash trước, nếu lỗi fallback sang gemini-2.0-flash
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[AI Coach] Model ${model} trả về lỗi ${response.status}:`, errText);
        continue;
      }

      const resData = await response.json();
      const content = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          title: isVi ? 'Tư vấn & Kế hoạch' : 'Coach Recommendations',
          type: parsed.type || 'info',
          badge: parsed.badge || 'AI Coach ✨',
          message: parsed.message,
          actionPlan: parsed.actionPlan || '',
          strategyTip: parsed.strategyTip || '',
          recoveryTip: parsed.recoveryTip || '',
          readinessScore: parsed.readinessScore || null,
          provider: 'gemini'
        };
      }
    } catch (e) {
      console.warn(`[AI Coach] Thất bại khi gọi model ${model}:`, e.message);
    }
  }

  throw new Error('Không thể kết nối tới Google Gemini API sau khi thử các model.');
}

/**
 * Chuẩn hóa và bổ sung các trường tư vấn mở rộng cho AI Coach
 */
function formatAdviceResult(res, ctx, isVi) {
  if (!res) return res;
  let strategyTip = res.strategyTip || '';
  if (!strategyTip) {
    if (ctx.isGoalReached) {
      strategyTip = isVi
        ? 'Đã hoàn thành mục tiêu tháng. Duy trì các bài chạy nhẹ 3-5km dưỡng sức.'
        : 'Monthly goal completed. Maintain easy 3-5km recovery runs.';
    } else if (ctx.goal <= 0) {
      strategyTip = isVi
        ? 'Hãy chọn mục tiêu tháng từ 50km - 150km phù hợp với thể lực.'
        : 'Set a suitable monthly goal between 50km - 150km.';
    } else {
      const remainingWeeks = Math.max(1, Math.ceil(ctx.daysLeft / 7));
      const sessionsPerWeek = Math.min(4, Math.max(2, Math.round(parseFloat(ctx.remainingKm) / 6) || 3));
      const kmPerSession = (parseFloat(ctx.remainingKm) / (remainingWeeks * sessionsPerWeek)).toFixed(1);
      strategyTip = isVi
        ? `Duy trì ~${sessionsPerWeek} buổi/tuần, mỗi buổi ~${kmPerSession} km để về đích bền bỉ.`
        : `Aim for ~${sessionsPerWeek} runs/week (~${kmPerSession} km each) to hit your target smoothly.`;
    }
  }

  let recoveryTip = res.recoveryTip || '';
  if (!recoveryTip) {
    if (ctx.streak >= 3 || ctx.paceIntensity === 'fast') {
      recoveryTip = isVi
        ? 'Bù 400ml nước điện giải sau chạy, chườm lạnh cơ bắp và giãn cơ kỹ 10 phút.'
        : 'Sip 400ml electrolytes post-run, cold compress, and do 10 mins stretching.';
    } else {
      recoveryTip = isVi
        ? 'Uống đủ 2-2.5L nước/ngày, nạp đủ protein sau chạy và ngủ đủ 7-8 tiếng.'
        : 'Hydrate 2-2.5L daily, refuel with protein, and sleep 7-8h for recovery.';
    }
  }

  let readinessScore = res.readinessScore;
  if (!readinessScore) {
    if (ctx.streak >= 4) readinessScore = 74;
    else if (ctx.streak >= 2) readinessScore = 85;
    else if (ctx.daysSinceLastRun >= 5) readinessScore = 76;
    else if (ctx.daysSinceLastRun >= 3) readinessScore = 82;
    else readinessScore = 92;
  }

  return {
    ...res,
    strategyTip,
    recoveryTip,
    readinessScore
  };
}

/**
 * Hàm chính: Lấy lời khuyên AI Coach (có Caching thông minh)
 */
export async function getAiCoachAdvice(inputData, forceRefresh = false) {
  const athleteKey = inputData.athlete?.id ? String(inputData.athlete.id) : (inputData.athlete?.firstname || 'default_user');
  const todayStr = new Date().toISOString().slice(0, 10);
  const cache = readAiCache();
  const isVi = (inputData.lang || 'vi') === 'vi';

  const ctx = extractRunnerContext(inputData);
  const latestActId = ctx.latestRun?.id ? String(ctx.latestRun.id) : 'no_act';
  const cacheKey = `${athleteKey}_${latestActId}_${todayStr}_${inputData.lang || 'vi'}`;

  // Kiểm tra cache nếu không ép buộc refresh
  if (!forceRefresh && cache[cacheKey]) {
    const cached = formatAdviceResult(cache[cacheKey], ctx, isVi);
    return { ...cached, fromCache: true };
  }

  let result = null;
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      result = await callGeminiApi(ctx, apiKey, inputData.lang || 'vi');
      result.provider = 'Google Gemini Flash';
    } catch (err) {
      console.warn('[AI Coach] Tự động fallback sang Smart Heuristic:', err.message);
      result = generateHeuristicAdvice(ctx, inputData.lang || 'vi');
      result.provider = 'Smart Heuristic (Fallback)';
    }
  } else {
    result = generateHeuristicAdvice(ctx, inputData.lang || 'vi');
    result.provider = 'Smart Heuristic Engine';
  }

  result = formatAdviceResult(result, ctx, isVi);

  // Lưu vào Cache
  cache[cacheKey] = {
    ...result,
    generatedAt: new Date().toISOString()
  };
  writeAiCache(cache);

  return result;
}

/**
 * Sinh Kế hoạch tập luyện 7 ngày trong tuần (Weekly Training Plan)
 */
export async function getWeeklyTrainingPlan(inputData) {
  const isVi = (inputData.lang || 'vi') === 'vi';
  const ctx = extractRunnerContext(inputData);
  const now = new Date();
  
  // Xác định ngày Thứ 2 của tuần hiện tại
  const dayOfWeek = now.getDay(); // 0: CN, 1: T2, ..., 6: T7
  const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);

  // Tạo khung 7 ngày từ T2 đến CN
  const dayNamesVi = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const dayNamesEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Gom bài chạy trong tuần hiện tại
  const weekRunsMap = new Map();
  (inputData.activities || []).forEach(act => {
    const t = (act.type || '').toLowerCase();
    if (['run', 'virtualrun', 'trailrun', 'trail run'].includes(t) || t.includes('run') || !t) {
      const actDate = new Date(act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local);
      const dateKey = `${actDate.getFullYear()}-${String(actDate.getMonth() + 1).padStart(2, '0')}-${String(actDate.getDate()).padStart(2, '0')}`;
      const dist = Math.round((act.distance / 1000) * 10) / 10;
      const prev = weekRunsMap.get(dateKey) || 0;
      weekRunsMap.set(dateKey, prev + dist);
    }
  });

  const weekSchedule = [];
  let totalKmRunThisWeek = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isPast = d < now.setHours(0, 0, 0, 0);
    const isToday = d.getTime() === now.setHours(0, 0, 0, 0);
    const ranKm = weekRunsMap.get(dateKey) || 0;
    if (ranKm > 0) totalKmRunThisWeek += ranKm;

    weekSchedule.push({
      dayIndex: i,
      dayName: isVi ? dayNamesVi[i] : dayNamesEn[i],
      dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
      isPast,
      isToday,
      ranKm,
      isCompleted: ranKm > 0
    });
  }

  // Phân bổ km thông minh cho các ngày còn lại
  const remainingDays = weekSchedule.filter(s => !s.isCompleted && (s.isToday || !s.isPast));
  const suggestedTotalWeekKm = Math.max(15, Math.round(parseFloat(ctx.requiredPacePerDay) * 7));
  const kmNeededThisWeek = Math.max(0, suggestedTotalWeekKm - totalKmRunThisWeek);

  // Phân bổ bài tập
  let kmAssigned = 0;
  remainingDays.forEach((slot, idx) => {
    // Ngày cuối cùng (Thứ 7 hoặc CN) là Long run
    const isWeekend = slot.dayIndex === 5 || slot.dayIndex === 6;
    if (isWeekend && kmNeededThisWeek > 6) {
      slot.workoutType = isVi ? 'Long Run (Chạy dài)' : 'Long Run';
      slot.suggestedKm = Math.min(12, Math.max(6, Math.round(kmNeededThisWeek * 0.45)));
      slot.focus = isVi ? 'Rèn luyện sức bền tim phổi, pace thả lỏng đều' : 'Build aerobic endurance, steady easy pace';
      slot.badge = 'Long Run';
    } else if (idx % 2 === 1) {
      slot.workoutType = isVi ? 'Nghỉ hồi phục (Rest Day)' : 'Rest / Recovery';
      slot.suggestedKm = 0;
      slot.focus = isVi ? 'Giãn cơ nhẹ, ngâm chân, để cơ bắp hồi phục' : 'Active recovery, stretching, hydration';
      slot.badge = 'Rest';
    } else {
      slot.workoutType = isVi ? 'Easy Run (Chạy nhẹ)' : 'Easy Aerobic Run';
      slot.suggestedKm = Math.max(3, Math.min(6, Math.round(kmNeededThisWeek / Math.max(1, remainingDays.length))));
      slot.focus = isVi ? 'Chạy ở tốc độ trò chuyện thoải mái, giữ nhịp' : 'Conversational pace, maintain aerobic base';
      slot.badge = 'Easy';
    }
    kmAssigned += slot.suggestedKm || 0;
  });

  return {
    athleteName: ctx.athleteName,
    weeklyGoalKm: suggestedTotalWeekKm,
    totalRanThisWeek: Math.round(totalKmRunThisWeek * 10) / 10,
    schedule: weekSchedule,
    coachSummary: isVi
      ? `Tuần này bạn đã hoàn thành ${Math.round(totalKmRunThisWeek * 10) / 10} km. Kế hoạch trên giúp bạn phân bổ ${suggestedTotalWeekKm} km khoa học, xen kẽ ngày nghỉ để tránh quá tải.`
      : `You completed ${Math.round(totalKmRunThisWeek * 10) / 10} km this week. This schedule balances ${suggestedTotalWeekKm} km with rest intervals to prevent fatigue.`
  };
}

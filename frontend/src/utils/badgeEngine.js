/**
 * badgeEngine.js
 * 
 * Động cơ tính toán và đánh giá 16 huy hiệu vinh danh của Royal HaskoningDHV Running Club.
 * Tuân thủ Quy tắc số 6: Athlete ID làm khóa chính duy nhất (Unique Primary Key).
 */

export const BADGE_CATEGORIES = [
  { id: 'all', labelVi: 'Tất Cả', labelEn: 'All Badges', icon: '🏆' },
  { id: 'distance', labelVi: 'Cột Mốc Cự Ly', labelEn: 'Distance Milestones', icon: '🎯' },
  { id: 'cumulative', labelVi: 'Tích Lũy Km', labelEn: 'Cumulative Distance', icon: '📈' },
  { id: 'discipline', labelVi: 'Kỷ Luật & Thói Quen', labelEn: 'Discipline & Habits', icon: '🔥' },
  { id: 'speed_style', labelVi: 'Phong Cách & Tốc Độ', labelEn: 'Style & Speed', icon: '⚡' },
];

export const BADGE_DEFINITIONS = [
  // --- 1. Cột Mốc Cự Ly Đơn Lẻ ---
  {
    id: 'novice_5k',
    category: 'distance',
    tier: 'bronze',
    icon: '🥉',
    titleVi: 'Tân Binh 5K',
    titleEn: '5K Novice',
    descVi: 'Hoàn thành ít nhất một buổi chạy cự ly từ 5.0 km trở lên.',
    descEn: 'Complete at least one run of 5.0 km or greater.',
    target: 5.0,
    unit: 'km',
    quoteVi: 'Hành trình vạn dặm khởi đầu từ những bước chân 5K đầu tiên!',
    quoteEn: 'A journey of a thousand miles begins with a single 5K step!',
    color: '#CD7F32',
    gradient: 'linear-gradient(135deg, #B87333 0%, #E6BF83 100%)'
  },
  {
    id: 'challenger_10k',
    category: 'distance',
    tier: 'silver',
    icon: '🥈',
    titleVi: 'Chiến Binh 10K',
    titleEn: '10K Challenger',
    descVi: 'Chinh phục cự ly chạy 10.0 km trong một buổi tập.',
    descEn: 'Conquer a 10.0 km run in a single session.',
    target: 10.0,
    unit: 'km',
    quoteVi: '10K - Cột mốc chứng minh thể lực và ý chí bền bỉ vượt trội!',
    quoteEn: '10K - Proving your stamina and resilient mental endurance!',
    color: '#A0AEC0',
    gradient: 'linear-gradient(135deg, #718096 0%, #E2E8F0 100%)'
  },
  {
    id: 'half_marathon_21k',
    category: 'distance',
    tier: 'gold',
    icon: '🥇',
    titleVi: 'Bán Marathon 21K',
    titleEn: 'Half Marathon 21K',
    descVi: 'Hoàn thành buổi chạy cự ly Bán Marathon (21.1 km trở lên).',
    descEn: 'Complete a Half Marathon distance run of 21.1 km or more.',
    target: 21.1,
    unit: 'km',
    quoteVi: '21.1K vinh quang! Bạn đã là một chân chạy đường trường cự phách!',
    quoteEn: 'Glorious 21.1K! You are now a master endurance long-distance runner!',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #D97706 0%, #FDE68A 100%)'
  },
  {
    id: 'full_marathon_42k',
    category: 'distance',
    tier: 'diamond',
    icon: '💎',
    titleVi: 'Huyền Thoại 42K',
    titleEn: '42K Marathon Legend',
    descVi: 'Chinh phục cự ly Marathon huyền thoại (42.195 km trở lên).',
    descEn: 'Conquer the legendary Full Marathon distance (42.195 km or more).',
    target: 42.195,
    unit: 'km',
    quoteVi: '42.195K - Đỉnh cao ý chí phi thường của con người Haskoning!',
    quoteEn: '42.195K - The pinnacle of extraordinary will and human spirit!',
    color: '#00A3A6',
    gradient: 'linear-gradient(135deg, #00A3A6 0%, #38BDF8 100%)'
  },

  // --- 2. Tích Lũy Km ---
  {
    id: 'club_50k',
    category: 'cumulative',
    tier: 'bronze',
    icon: '🎖️',
    titleVi: 'Câu Lạc Bộ 50K',
    titleEn: '50K Club',
    descVi: 'Tích lũy tổng quãng đường đạt mốc 50 km.',
    descEn: 'Accumulate a total running distance of at least 50 km.',
    target: 50.0,
    unit: 'km',
    quoteVi: 'Mỗi km đều tạo nên giá trị cho sức khỏe và tinh thần đồng đội.',
    quoteEn: 'Every kilometer adds value to health and team spirit.',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #059669 0%, #6EE7B7 100%)'
  },
  {
    id: 'centurion_100k',
    category: 'cumulative',
    tier: 'silver',
    icon: '🛡️',
    titleVi: 'Chiến Binh Bách Dặm',
    titleEn: 'Centurion 100K',
    descVi: 'Chạm mốc tích lũy 100 km chạy bộ.',
    descEn: 'Reach the milestone of 100 km cumulative running distance.',
    target: 100.0,
    unit: 'km',
    quoteVi: '100 km đã qua! Bàn chân bạn đã in dấu ấn qua muôn nẻo đường.',
    quoteEn: '100 km completed! Your footprints have left marks across roads.',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #2563EB 0%, #93C5FD 100%)'
  },
  {
    id: 'titanium_150k',
    category: 'cumulative',
    tier: 'gold',
    icon: '⚡',
    titleVi: 'Siêu Nhân Bền Bỉ',
    titleEn: '150K Titanium',
    descVi: 'Vượt mốc tích lũy 150 km trong hành trình thể thao.',
    descEn: 'Cross the 150 km cumulative running distance milestone.',
    target: 150.0,
    unit: 'km',
    quoteVi: 'Ý chí titan thép, năng lượng thể thao bất tận của Haskoning!',
    quoteEn: 'Titanium willpower, endless Haskoning athletic energy!',
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #C4B5FD 100%)'
  },
  {
    id: 'the_beast_200k',
    category: 'cumulative',
    tier: 'diamond',
    icon: '🦁',
    titleVi: 'Quái Kiệt 200K+',
    titleEn: '200K+ The Beast',
    descVi: 'Chinh phục trọn vẹn chỉ tiêu 200 km danh giá của CLB.',
    descEn: 'Master the club prestigious 200 km premier target.',
    target: 200.0,
    unit: 'km',
    quoteVi: 'Chiến binh 200K - Biểu tượng tự hào của CLB 200K Running Club!',
    quoteEn: '200K Warrior - The proud symbol of 200K Running Club!',
    color: '#002D54',
    gradient: 'linear-gradient(135deg, #002D54 0%, #00A3A6 100%)'
  },
  {
    id: 'legend_500k',
    category: 'cumulative',
    tier: 'diamond',
    icon: '👑',
    titleVi: 'Đại Sứ 500K Lịch Sử',
    titleEn: '500K Legend',
    descVi: 'Đạt cột mốc kỷ lục tích lũy 500 km toàn thời gian.',
    descEn: 'Achieve the historic record of 500 km all-time cumulative distance.',
    target: 500.0,
    unit: 'km',
    quoteVi: 'Huyền thoại sống! Người truyền cảm hứng xỏ giày cho toàn thể công ty.',
    quoteEn: 'Living legend! Inspiring the entire team to lace up and run.',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #BE185D 0%, #F472B6 100%)'
  },

  // --- 3. Kỷ Luật & Thói Quen ---
  {
    id: 'streak_flame',
    category: 'discipline',
    tier: 'silver',
    icon: '🔥',
    titleVi: 'Ngọn Lửa Bền Bỉ',
    titleEn: 'Streak Flame',
    descVi: 'Duy trì ít nhất 4 tuần liên tiếp, mỗi tuần có từ 2 buổi chạy trở lên.',
    descEn: 'Maintain at least 4 consecutive weeks with 2 or more runs per week.',
    target: 4,
    unit: 'tuần / weeks',
    quoteVi: 'Kỷ luật chính là chiếc cầu nối vững chắc biến mục tiêu thành hiện thực!',
    quoteEn: 'Discipline is the solid bridge turning ambitious goals into reality!',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #FCA5A5 100%)'
  },
  {
    id: 'weekend_warrior',
    category: 'discipline',
    tier: 'bronze',
    icon: '⚔️',
    titleVi: 'Chiến Binh Cuối Tuần',
    titleEn: 'Weekend Warrior',
    descVi: 'Chạy cả Thứ 7 và Chủ Nhật trong cùng một tuần để nạp năng lượng.',
    descEn: 'Run on both Saturday and Sunday in the same week to recharge.',
    target: 2,
    unit: 'buổi / runs',
    quoteVi: 'Biến ngày cuối tuần thành những chuyến phiêu lưu đầy năng lượng!',
    quoteEn: 'Transform weekends into energized and vibrant running adventures!',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #EA580C 0%, #FDBA74 100%)'
  },
  {
    id: 'gold_diligence',
    category: 'discipline',
    tier: 'gold',
    icon: '⭐',
    titleVi: 'Chuyên Cần Vàng',
    titleEn: 'Gold Diligence',
    descVi: 'Tham gia chạy ít nhất 15 ngày khác nhau trong một tháng.',
    descEn: 'Run on at least 15 distinct active days within a single month.',
    target: 15,
    unit: 'ngày / days',
    quoteVi: 'Nửa tháng gắn bó với đường chạy - Thói quen thép của nhà vô địch!',
    quoteEn: 'Half the month on the road - The iron habit of a champion!',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #D97706 0%, #FCD34D 100%)'
  },
  {
    id: 'iron_shield',
    category: 'discipline',
    tier: 'silver',
    icon: '🛡️',
    titleVi: 'Lá Chắn Bất Bại',
    titleEn: 'Iron Shield (0đ Fine)',
    descVi: 'Hoàn thành 100% mục tiêu cam kết, giữ sạch bảng phạt (0 VND nợ phạt).',
    descEn: 'Achieve 100% of committed target, zero penalties incurred (0 VND).',
    target: 100,
    unit: '%',
    quoteVi: 'Bảo vệ ví tiền 200k xuất sắc và giữ vững lời thề cam kết thể thao!',
    quoteEn: 'Flawlessly defended the 200k pledge and upheld the runner promise!',
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #0D9488 0%, #5EEAD4 100%)'
  },
  {
    id: 'target_breaker',
    category: 'discipline',
    tier: 'gold',
    icon: '🚀',
    titleVi: 'Vượt Ngưỡng Kỳ Tích',
    titleEn: 'Target Breaker',
    descVi: 'Vượt mức chỉ tiêu cá nhân cam kết từ 120% trở lên.',
    descEn: 'Exceed the personal committed target by 120% or more.',
    target: 120,
    unit: '%',
    quoteVi: 'Không chỉ hoàn thành, bạn đã vượt qua giới hạn của chính mình!',
    quoteEn: 'Not just finishing, you completely surpassed your own limits!',
    color: '#78BE20',
    gradient: 'linear-gradient(135deg, #65A30D 0%, #A3E635 100%)'
  },

  // --- 4. Phong Cách & Tốc Độ ---
  {
    id: 'early_bird',
    category: 'speed_style',
    tier: 'bronze',
    icon: '🌅',
    titleVi: 'Chim Sớm Haskoning',
    titleEn: 'Haskoning Early Bird',
    descVi: 'Hoàn thành ít nhất một buổi chạy đón bình minh trước 06:00 sáng.',
    descEn: 'Complete at least one dawn run starting before 06:00 AM.',
    target: 1,
    unit: 'buổi / run',
    quoteVi: 'Đón bình minh rạng rỡ và cảm nhận bầu không khí trong lành buổi sớm!',
    quoteEn: 'Greeting the radiant dawn and inhaling the crisp early morning air!',
    color: '#0284C7',
    gradient: 'linear-gradient(135deg, #0284C7 0%, #7DD3FC 100%)'
  },
  {
    id: 'night_owl',
    category: 'speed_style',
    tier: 'bronze',
    icon: '🌙',
    titleVi: 'Cú Đêm Xả Stress',
    titleEn: 'Night Owl Runner',
    descVi: 'Hoàn thành ít nhất một buổi chạy thư giãn sau 20:00 tối.',
    descEn: 'Complete at least one relaxing run starting after 20:00 PM.',
    target: 1,
    unit: 'buổi / run',
    quoteVi: 'Xả sạch mọi căng thẳng sau giờ làm việc bằng những bước chạy êm ả.',
    quoteEn: 'Sweat away workday stress with peaceful and calming night strides.',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #A5B4FC 100%)'
  },
  {
    id: 'lightning_5k',
    category: 'speed_style',
    tier: 'silver',
    icon: '⚡',
    titleVi: 'Tia Chớp 5K (Sub-30)',
    titleEn: 'Lightning 5K (Sub-30)',
    descVi: 'Chạy cự ly $\\ge 5$ km với tốc độ Pace dưới 6:00 phút/km (hoàn thành dưới 30 phút).',
    descEn: 'Run $\\ge 5$ km with an average pace under 6:00 min/km (under 30 minutes).',
    target: 6.0,
    unit: 'min/km',
    quoteVi: 'Tốc độ như tia chớp! Đôi chân thanh thoát lướt gió trên cung đường.',
    quoteEn: 'Lightning speed! Light feet gliding gracefully across the course.',
    color: '#EAB308',
    gradient: 'linear-gradient(135deg, #CA8A04 0%, #FDE047 100%)'
  },
  {
    id: 'rocket_5k',
    category: 'speed_style',
    tier: 'gold',
    icon: '🚀',
    titleVi: 'Hỏa Tiễn 5K (Sub-25)',
    titleEn: 'Rocket 5K (Sub-25)',
    descVi: 'Chạy cự ly $\\ge 5$ km với tốc độ Pace dưới 5:00 phút/km (hoàn thành dưới 25 phút).',
    descEn: 'Run $\\ge 5$ km with an average pace under 5:00 min/km (under 25 minutes).',
    target: 5.0,
    unit: 'min/km',
    quoteVi: 'Thần tốc phi thường! Đẳng cấp vận động viên bứt tốc hàng đầu!',
    quoteEn: 'Extraordinary speed! Top-tier acceleration of a premier runner!',
    color: '#DC2626',
    gradient: 'linear-gradient(135deg, #B91C1C 0%, #F87171 100%)'
  }
];

/**
 * Đánh giá toàn bộ 16 huy hiệu cho một VĐV dựa trên Athlete ID và dữ liệu hoạt động.
 * 
 * @param {Object} params
 * @param {string|number} params.athleteId - Strava Athlete ID (Khóa chính)
 * @param {Array} params.activities - Danh sách toàn bộ bài tập
 * @param {Object} [params.challengeRow] - Dòng dữ liệu tháng của runner trong bảng giải đấu
 * @param {number} [params.targetKm] - Mục tiêu cá nhân cam kết
 * @returns {Object} - Kết quả tính toán huy hiệu đầy đủ
 */
export function evaluateAthleteBadges({
  athleteId,
  activities = [],
  challengeRow = null,
  targetKm = 50
} = {}) {
  const normId = String(athleteId || '');

  // 1. Lọc bài chạy theo chuẩn Athlete ID (Rule 6)
  const runnerActs = activities.filter(act => {
    const actId = String(act.athlete?.id || act.athleteId || act.athlete_id || '');
    return actId && actId === normId;
  });

  // 2. Thu thập các chỉ số cơ bản
  let maxSingleKm = 0;
  let totalKm = 0;
  const activeDaysSet = new Set();
  const weekYearMap = {}; // { '2026-W38': count }
  const weekendRunsMap = {}; // { '2026-W38': { sat: bool, sun: bool } }
  let hasEarlyBird = false;
  let hasNightOwl = false;
  let hasLightning5k = false;
  let hasRocket5k = false;
  let bestLightningDate = null;
  let bestRocketDate = null;
  let earlyBirdDate = null;
  let nightOwlDate = null;

  runnerActs.forEach(act => {
    // Chuyển cự ly sang km
    let distKm = 0;
    if (act.distance > 500) {
      distKm = act.distance / 1000;
    } else {
      distKm = Number(act.distance) || 0;
    }

    if (distKm > maxSingleKm) {
      maxSingleKm = distKm;
    }
    totalKm += distKm;

    const startDate = new Date(act.start_date_local || act.start_date || act.start_date_utc || Date.now());
    if (!isNaN(startDate.getTime())) {
      // Ngày chạy
      const dayKey = startDate.toISOString().slice(0, 10);
      activeDaysSet.add(dayKey);

      // Giờ chạy: ưu tiên trích xuất giờ trực tiếp từ start_date_local của Strava
      let hour = startDate.getHours();
      const localStr = String(act.start_date_local || act.start_date || '');
      const match = localStr.match(/T(\d{2}):/);
      if (match) {
        hour = parseInt(match[1], 10);
      }

      if (hour < 6) {
        hasEarlyBird = true;
        if (!earlyBirdDate) earlyBirdDate = startDate.toISOString();
      }
      if (hour >= 20) {
        hasNightOwl = true;
        if (!nightOwlDate) nightOwlDate = startDate.toISOString();
      }

      // Tuần & Cuối tuần
      const weekKey = getISOWeekKey(startDate);
      weekYearMap[weekKey] = (weekYearMap[weekKey] || 0) + 1;

      const dayOfWeek = startDate.getDay(); // 0 = Sunday, 6 = Saturday
      if (!weekendRunsMap[weekKey]) weekendRunsMap[weekKey] = { sat: false, sun: false };
      if (dayOfWeek === 6) weekendRunsMap[weekKey].sat = true;
      if (dayOfWeek === 0) weekendRunsMap[weekKey].sun = true;

      // Pace tính toán
      const movingTimeSec = Number(act.moving_time) || Number(act.elapsed_time) || 0;
      if (distKm >= 4.95 && movingTimeSec > 0) {
        const paceSecPerKm = movingTimeSec / distKm;
        const paceMin = paceSecPerKm / 60;
        if (paceMin < 6.0) {
          hasLightning5k = true;
          if (!bestLightningDate) bestLightningDate = startDate.toISOString();
        }
        if (paceMin < 5.0) {
          hasRocket5k = true;
          if (!bestRocketDate) bestRocketDate = startDate.toISOString();
        }
      }
    }
  });

  // Nếu trong challengeRow có tổng km lớn hơn (tích lũy lịch sử), ưu tiên số lớn hơn
  if (challengeRow) {
    const rowActual = Number(challengeRow.actualKm || challengeRow.actual || challengeRow.totalDistance || 0);
    if (rowActual > totalKm) {
      totalKm = rowActual;
    }
  }

  // Tính chuỗi tuần liên tiếp có >= 2 buổi chạy
  const sortedWeeks = Object.keys(weekYearMap).sort();
  let maxConsecutiveWeeks = 0;
  let currentConsecutive = 0;
  sortedWeeks.forEach(wk => {
    if (weekYearMap[wk] >= 2) {
      currentConsecutive += 1;
      if (currentConsecutive > maxConsecutiveWeeks) {
        maxConsecutiveWeeks = currentConsecutive;
      }
    } else {
      currentConsecutive = 0;
    }
  });

  // Kiểm tra có tuần nào chạy cả T7 & CN không
  const hasWeekendWarrior = Object.values(weekendRunsMap).some(w => w.sat && w.sun);

  // Kiểm tra hoàn thành mục tiêu & nợ phạt
  const target = Number(challengeRow?.targetKm || targetKm || 50);
  const percentCompleted = target > 0 ? (totalKm / target) * 100 : 0;
  const isTargetBreaker = percentCompleted >= 120;
  const hasZeroPenalty = challengeRow ? (challengeRow.penaltyK === 0 || challengeRow.penaltyVnd === 0 || percentCompleted >= 100) : (percentCompleted >= 100);

  // 3. Đánh giá từng huy hiệu
  const evaluatedBadges = BADGE_DEFINITIONS.map(def => {
    let unlocked = false;
    let progress = 0;
    let currentVal = 0;
    let unlockedAt = null;

    switch (def.id) {
      case 'novice_5k':
        currentVal = maxSingleKm;
        progress = Math.min(100, Math.round((maxSingleKm / 5.0) * 100));
        unlocked = maxSingleKm >= 4.95;
        break;
      case 'challenger_10k':
        currentVal = maxSingleKm;
        progress = Math.min(100, Math.round((maxSingleKm / 10.0) * 100));
        unlocked = maxSingleKm >= 9.95;
        break;
      case 'half_marathon_21k':
        currentVal = maxSingleKm;
        progress = Math.min(100, Math.round((maxSingleKm / 21.1) * 100));
        unlocked = maxSingleKm >= 21.05;
        break;
      case 'full_marathon_42k':
        currentVal = maxSingleKm;
        progress = Math.min(100, Math.round((maxSingleKm / 42.195) * 100));
        unlocked = maxSingleKm >= 42.1;
        break;

      case 'club_50k':
        currentVal = totalKm;
        progress = Math.min(100, Math.round((totalKm / 50.0) * 100));
        unlocked = totalKm >= 50.0;
        break;
      case 'centurion_100k':
        currentVal = totalKm;
        progress = Math.min(100, Math.round((totalKm / 100.0) * 100));
        unlocked = totalKm >= 100.0;
        break;
      case 'titanium_150k':
        currentVal = totalKm;
        progress = Math.min(100, Math.round((totalKm / 150.0) * 100));
        unlocked = totalKm >= 150.0;
        break;
      case 'the_beast_200k':
        currentVal = totalKm;
        progress = Math.min(100, Math.round((totalKm / 200.0) * 100));
        unlocked = totalKm >= 200.0;
        break;
      case 'legend_500k':
        currentVal = totalKm;
        progress = Math.min(100, Math.round((totalKm / 500.0) * 100));
        unlocked = totalKm >= 500.0;
        break;

      case 'streak_flame':
        currentVal = maxConsecutiveWeeks;
        progress = Math.min(100, Math.round((maxConsecutiveWeeks / 4) * 100));
        unlocked = maxConsecutiveWeeks >= 4;
        break;
      case 'weekend_warrior':
        currentVal = hasWeekendWarrior ? 2 : 1;
        progress = hasWeekendWarrior ? 100 : 50;
        unlocked = hasWeekendWarrior;
        break;
      case 'gold_diligence':
        currentVal = activeDaysSet.size;
        progress = Math.min(100, Math.round((activeDaysSet.size / 15) * 100));
        unlocked = activeDaysSet.size >= 15;
        break;
      case 'iron_shield':
        currentVal = hasZeroPenalty ? 100 : Math.round(percentCompleted);
        progress = hasZeroPenalty ? 100 : Math.min(99, Math.round(percentCompleted));
        unlocked = hasZeroPenalty;
        break;
      case 'target_breaker':
        currentVal = Math.round(percentCompleted);
        progress = Math.min(100, Math.round((percentCompleted / 120) * 100));
        unlocked = isTargetBreaker;
        break;

      case 'early_bird':
        unlocked = hasEarlyBird;
        progress = hasEarlyBird ? 100 : 0;
        unlockedAt = earlyBirdDate;
        break;
      case 'night_owl':
        unlocked = hasNightOwl;
        progress = hasNightOwl ? 100 : 0;
        unlockedAt = nightOwlDate;
        break;
      case 'lightning_5k':
        unlocked = hasLightning5k;
        progress = hasLightning5k ? 100 : 0;
        unlockedAt = bestLightningDate;
        break;
      case 'rocket_5k':
        unlocked = hasRocket5k;
        progress = hasRocket5k ? 100 : 0;
        unlockedAt = bestRocketDate;
        break;

      default:
        unlocked = false;
        progress = 0;
    }

    return {
      ...def,
      unlocked,
      progress,
      currentVal: typeof currentVal === 'number' ? Math.round(currentVal * 10) / 10 : currentVal,
      unlockedAt
    };
  });

  const unlockedCount = evaluatedBadges.filter(b => b.unlocked).length;
  const totalBadges = evaluatedBadges.length;
  const completionRate = Math.round((unlockedCount / totalBadges) * 100);

  return {
    athleteId: normId,
    totalBadges,
    unlockedCount,
    completionRate,
    badges: evaluatedBadges,
    summary: {
      totalKm: Math.round(totalKm * 10) / 10,
      maxSingleKm: Math.round(maxSingleKm * 10) / 10,
      activeDays: activeDaysSet.size,
      consecutiveWeeks: maxConsecutiveWeeks,
      percentCompleted: Math.round(percentCompleted)
    }
  };
}

/**
 * Trả về key ISO Week định dạng YYYY-Www
 */
function getISOWeekKey(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

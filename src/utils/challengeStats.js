export const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export const normalize = (n) => removeVietnameseTones(n || '').trim().toLowerCase().replace(/[\.\s_-]/g, '');

/**
 * Tìm matchKey của athlete hiện tại trong danh sách participants
 * @param {Object} athlete - Thông tin athlete đang đăng nhập ({ id, firstname, lastname })
 * @param {Object} participants - Danh sách participants của tháng/nhóm
 * @returns {string|null} Key đại diện cho athlete (vd: "Tien_P.", "Sang_N.", "133066813"...)
 */
export function getAthleteMatchKey(athlete, participants = {}) {
  if (!athlete) return null;
  const normFname = normalize(athlete.firstname);
  const normLname = normalize(athlete.lastname);

  // 1. Khớp theo ID nếu có
  if (athlete.id) {
    const keyById = Object.keys(participants || {}).find(k => {
      const p = participants[k];
      return (p && p.id && String(p.id) === String(athlete.id)) || (k === String(athlete.id));
    });
    if (keyById) return keyById;
  }

  // 2. Khớp đúng thứ tự Tên - Họ (Tuyệt đối không đảo ngược Tên - Họ để tránh nhầm 2 runner khác nhau)
  const keyByDirectName = Object.keys(participants || {}).find(k => {
    const p = participants[k];
    if (!p) return false;
    const pFname = normalize(p.firstname);
    const pLname = normalize(p.lastname);
    
    // Firstname bắt buộc phải khớp chính xác
    if (pFname !== normFname) return false;
    
    // Lastname phải khớp hoặc khớp chữ cái đầu
    if (!normLname) return true;
    return (
      pLname === normLname || 
      pLname.startsWith(normLname) || 
      normLname.startsWith(pLname)
    );
  });
  if (keyByDirectName) return keyByDirectName;

  // 3. Fallback định dạng chuẩn Strava: Firstname_L. (vd: Tien_P.)
  const lastInitial = athlete.lastname ? (athlete.lastname.trim().charAt(0) + '.') : '';
  return lastInitial ? `${athlete.firstname}_${lastInitial}` : (athlete.firstname || String(athlete.id || 'runner'));
}

// Dữ liệu baseline Total-km chốt cuối tháng 7/2026 từ file Storage/Tong km To 17082026.csv
export const DEFAULT_TOTAL_KM_BASE = {
  cutoffDate: '2026-07-31T23:59:59.999Z',
  items: [
    { name: 'Abba Vũ', athleteId: 73380484, baseDistance: 4056.3 },
    { name: 'An Ha', athleteId: 110041582, baseDistance: 803.9 },
    { name: 'Andie Le', athleteId: 82871822, baseDistance: 0 },
    { name: 'Benjamin Dang', athleteId: 83759389, baseDistance: 0 },
    { name: 'binh ngo', athleteId: 47556665, baseDistance: 0 },
    { name: 'Chi Nguyen-Thanh', athleteId: 53686864, baseDistance: 0 },
    { name: 'Cuong Nguyen', athleteId: 50684496, baseDistance: 4249.7 },
    { name: 'Đạt Nguyễn', athleteId: 108464598, baseDistance: 0 },
    { name: 'Dũng Nguyễn', athleteId: 102790720, baseDistance: 0 },
    { name: 'Hendrien Nel', athleteId: 34217516, baseDistance: 0 },
    { name: 'Herman van den Bosch', athleteId: 78524143, baseDistance: 0 },
    { name: 'Học Phạm Thái', athleteId: 99613505, baseDistance: 0 },
    { name: 'Huy Hoang', athleteId: 103943712, baseDistance: 9763.4 },
    { name: 'Huy Nguyễn', athleteId: 56445371, baseDistance: 9763.4 },
    { name: 'Huy Vu', athleteId: 51364143, baseDistance: 9763.4 },
    { name: 'Huynh Nguyen', athleteId: 25463522, baseDistance: 9763.4 },
    { name: 'Ilse van den Bosch', athleteId: 52287099, baseDistance: 0 },
    { name: 'Katy Nguyen', athleteId: 149162660, baseDistance: 576.5 },
    { name: 'Kha Mai Le', athleteId: 82860849, baseDistance: 0 },
    { name: 'Khoa Le', athleteId: 79129542, baseDistance: 0 },
    { name: 'Khương Phạm', athleteId: 129623990, baseDistance: 2103.4 },
    { name: 'Lieu Vo', athleteId: 72851794, baseDistance: 3641.8 },
    { name: 'Nam Nguyen', athleteId: 83767014, baseDistance: 0 },
    { name: 'Nguyen Hien', athleteId: 107853634, baseDistance: 0 },
    { name: 'Peter Vkhanh', athleteId: 82620973, baseDistance: 0 },
    { name: 'Pha Vo', athleteId: 134088880, baseDistance: 274.4 },
    { name: 'pham tien', athleteId: 120540594, baseDistance: 0.2 },
    { name: 'Phú Nguyễn Thiên', athleteId: 167860841, baseDistance: 0 },
    { name: 'Phuong Ngo', athleteId: 126486870, baseDistance: 1334.6 },
    { name: 'Phuong Tran', athleteId: 48977253, baseDistance: 1672.0 },
    { name: 'Quy Truong', athleteId: 79037203, baseDistance: 8259.2 },
    { name: 'Sang Nguyen', athleteId: 125487039, baseDistance: 1912.9 },
    { name: 'Sơn Nguyễn-Lê', athleteId: 78216355, baseDistance: 6810.4 },
    { name: 'Tam Nguyen', athleteId: 106178600, baseDistance: 3221.2 },
    { name: 'Thắm Đỗ', athleteId: 108300453, baseDistance: 0 },
    { name: 'Thanh Dao', athleteId: 87080139, baseDistance: 3810.9 },
    { name: 'Thanh Xuan', athleteId: 106101923, baseDistance: 3810.9 },
    { name: 'Thinh Vu', athleteId: 77523597, baseDistance: 4784.5 },
    { name: 'Tien PhamTV', athleteId: 133066813, baseDistance: 2597.0 },
    { name: 'Tran Mai Ngan', athleteId: 82514882, baseDistance: 0 },
    { name: 'Trong Tran', athleteId: 81517643, baseDistance: 1617.4 },
    { name: 'Vĩnh Phạm', athleteId: 5391817, baseDistance: 0 },
    { name: 'vu duong', athleteId: 101067787, baseDistance: 0 },
    { name: 'Vuong Nguyen', athleteId: 36760912, baseDistance: 0 },
    { name: '俊宇 杨', athleteId: 118715057, baseDistance: 0 }
  ]
};

/**
 * Xử lý danh sách hoạt động thô từ Strava thành dữ liệu ma trận hiển thị Challenge
 * @param {Array} activities - Danh sách hoạt động (club activities & imported activities)
 * @param {Object} participantsMap - Object chứa danh sách người tham gia được chọn
 * @param {number} year - Năm hiện tại
 * @param {number} month - Tháng hiện tại (1-12)
 * @param {Object} totalKmBase - Dữ liệu baseline All-Time km từ file Storage/Tong km To 17082026.csv
 * @returns {Array} Mảng dữ liệu các dòng (mỗi dòng tương ứng 1 runner)
 */
export function processChallengeData(activities, participantsMap, year, month, totalKmBase = null) {
  // Lấy số ngày trong tháng
  const daysInMonth = new Date(year, month, 0).getDate();

  // Khởi tạo map chứa dữ liệu của các participants
  const runnerStats = {};

  Object.keys(participantsMap).forEach(key => {
    const member = { ...participantsMap[key] };
    
    // Khởi tạo mảng ngày (index 1 -> daysInMonth, index 0 bỏ qua cho dễ dùng)
    const dailyDistances = new Array(daysInMonth + 1).fill(0);
    const dailyMovingTime = new Array(daysInMonth + 1).fill(0);

    runnerStats[key] = {
      member,
      matchKey: key,
      dailyDistances,
      dailyMovingTime,
      totalDistance: 0,
      totalMovingTime: 0,
      totalDays: 0,
      averagePace: 0,
      allTimeDistance: null,
      baseDistance: null
    };
  });

  // Tự động gán Athlete ID từ danh sách activities vào runnerStats nếu chưa có ID
  activities.forEach(act => {
    if (act.athlete?.id) {
      const actFname = normalize(act.athlete.firstname);
      const actLname = normalize(act.athlete.lastname);
      Object.keys(runnerStats).forEach(key => {
        const mem = runnerStats[key].member;
        if (!mem.id) {
          const memFname = normalize(mem.firstname);
          const memLname = normalize(mem.lastname);
          if (memFname === actFname && (memLname === actLname || memLname.startsWith(actLname) || actLname.startsWith(memLname))) {
            mem.id = act.athlete.id;
          }
        }
      });
    }
  });

  // Lọc các hoạt động trong tháng hiện tại và loại bỏ trùng lặp
  const seenActKeys = new Set();
  const currentMonthActivities = activities.filter(act => {
    // Bỏ qua các hoạt động ẩn (private, hide_from_home, visibility != everyone)
    if (act.private === true || act.private === 'true' || act.private === 'TRUE') return false;
    if (act.hide_from_home === true || act.hide_from_home === 'true' || act.hide_from_home === 'TRUE') return false;
    if (act.visibility !== undefined && String(act.visibility).toLowerCase() !== 'everyone') return false;

    // Chỉ lấy các hoạt động có quãng đường >= 0.005km (5 mét)
    if (act.distance === undefined || act.distance < 5) {
      return false;
    }

    if (!act.start_date_local) {
      return false; // Bắt buộc phải có ngày giờ hợp lệ để gắn vào ma trận lịch tháng
    }

    // Sửa lỗi timezone: start_date_local của Strava có 'Z' nhưng là giờ local, parse luôn sẽ bị sai múi giờ
    const localDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
    const date = new Date(localDateStr);
    if (isNaN(date.getTime())) return false;

    const actYear = date.getFullYear();
    const actMonth = date.getMonth() + 1;
    const actDay = date.getDate();

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;

    if (actYear === year && actMonth === month) {
      if (isCurrentMonth && actDay > now.getDate()) {
        return false;
      }

      // Deduplicate: Tránh đúp hoạt động khi import nhiều file CSV cùng lúc hoặc từ nhiều folder
      const actId = act.id ? String(act.id) : null;
      const athleteId = act.athlete?.id || '';
      const athleteName = `${normalize(act.athlete?.firstname)}_${normalize(act.athlete?.lastname)}`;
      const timeMinute = localDateStr.substring(0, 16); // 'YYYY-MM-DDTHH:mm'
      const distMeter = Math.round(act.distance);
      const moveSec = act.moving_time || 0;

      const compKey = `composite_${athleteId || athleteName}_${timeMinute}_${distMeter}_${moveSec}`;
      const idKey = actId ? `id_${actId}` : null;

      if (idKey && seenActKeys.has(idKey)) return false;
      if (seenActKeys.has(compKey)) return false;

      if (idKey) seenActKeys.add(idKey);
      seenActKeys.add(compKey);
      return true;
    }
    return false;
  });

  // Cộng dồn dữ liệu hoạt động vào runner tương ứng theo từng ngày trong tháng
  currentMonthActivities.forEach(act => {
    let matchKey = null;

    // 1. Thử match bằng ID trước (ưu tiên cao nhất vì chính xác tuyệt đối)
    if (act.athlete?.id) {
      const foundIdKey = Object.keys(runnerStats).find(k => runnerStats[k].member.id && String(runnerStats[k].member.id) === String(act.athlete.id));
      if (foundIdKey) {
        matchKey = foundIdKey;
      }
    } 
    
    // 2. Fallback match bằng tên
    if (!matchKey) {
      const fname = normalize(act.athlete?.firstname);
      const lname = normalize(act.athlete?.lastname);
      
      const foundKey = Object.keys(runnerStats).find(k => {
        const mem = runnerStats[k].member;
        const memFname = normalize(mem.firstname);
        const memLname = normalize(mem.lastname);
        return memFname === fname && 
               (memLname === lname || memLname.startsWith(lname) || lname.startsWith(memLname));
      });

      if (foundKey) {
        matchKey = foundKey;
      }
    }

    if (matchKey && runnerStats[matchKey]) {
      const distanceKm = (act.distance || 0) / 1000;
      const movingTime = act.moving_time || 0;

      if (act.start_date_local) {
        const localDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
        const date = new Date(localDateStr);
        const day = date.getDate(); // 1-31
        if (day >= 1 && day <= daysInMonth) {
          runnerStats[matchKey].dailyDistances[day] += distanceKm;
          runnerStats[matchKey].dailyMovingTime[day] += movingTime;
        }
      }
    }
  });

  // Chuẩn bị dữ liệu Total-km base (sử dụng DEFAULT_TOTAL_KM_BASE nếu chưa tải xong API)
  const effectiveTotalKmBase = (totalKmBase && Array.isArray(totalKmBase.items) && totalKmBase.items.length > 0)
    ? totalKmBase
    : DEFAULT_TOTAL_KM_BASE;

  const baseItems = effectiveTotalKmBase.items;

  // Ngày kết thúc của tháng đang xem
  const endOfMonthDate = new Date(year, month, 0); 
  const eomYear = endOfMonthDate.getFullYear();
  const eomMonth = String(endOfMonthDate.getMonth() + 1).padStart(2, '0');
  const eomDay = String(endOfMonthDate.getDate()).padStart(2, '0');
  const endOfMonthDateStr = `${eomYear}-${eomMonth}-${eomDay}`;

  // Lọc và deduplicate tất cả hoạt động từ 01/08/2026 đến hết tháng đang xem
  const seenAllTimeKeys = new Set();
  const allTimeActivities = activities.filter(act => {
    if (act.private === true || act.private === 'true' || act.private === 'TRUE') return false;
    if (act.hide_from_home === true || act.hide_from_home === 'true' || act.hide_from_home === 'TRUE') return false;
    if (act.visibility !== undefined && String(act.visibility).toLowerCase() !== 'everyone') return false;

    if (act.distance === undefined || act.distance < 5) return false;
    if (!act.start_date_local) return false;

    const localDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
    const date = new Date(localDateStr);
    if (isNaN(date.getTime())) return false;

    const actDateStr = localDateStr.substring(0, 10);
    const now = new Date();

    // Lấy các hoạt động từ 01/08/2026 đến cuối tháng đang xem
    if (actDateStr >= '2026-08-01' && actDateStr <= endOfMonthDateStr) {
      const actYear = date.getFullYear();
      const actMonth = date.getMonth() + 1;
      const actDay = date.getDate();
      const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
      if (isCurrentMonth && actDay > now.getDate()) {
        return false;
      }

      const actId = act.id ? String(act.id) : null;
      const athleteId = act.athlete?.id || '';
      const athleteName = `${normalize(act.athlete?.firstname)}_${normalize(act.athlete?.lastname)}`;
      const timeMinute = localDateStr.substring(0, 16);
      const distMeter = Math.round(act.distance);
      const moveSec = act.moving_time || 0;

      const compKey = `comp_${athleteId || athleteName}_${timeMinute}_${distMeter}_${moveSec}`;
      const idKey = actId ? `id_${actId}` : null;

      if (idKey && seenAllTimeKeys.has(idKey)) return false;
      if (seenAllTimeKeys.has(compKey)) return false;

      if (idKey) seenAllTimeKeys.add(idKey);
      seenAllTimeKeys.add(compKey);
      return true;
    }
    return false;
  });

  // Tính toán các chỉ số tổng kết (Tổng km, tổng ngày, tổng thời gian, Pace, Streak, Σ All-km)
  const result = Object.values(runnerStats).map(stat => {
    let activeDays = 0;
    let sumDistance = 0;
    let sumMovingTime = 0;

    for (let i = 1; i <= daysInMonth; i++) {
      if (stat.dailyDistances[i] > 0) {
        activeDays++;
        sumDistance += stat.dailyDistances[i];
        sumMovingTime += stat.dailyMovingTime[i];
      }
    }

    stat.totalDays = activeDays;
    // Tổng quãng đường trong tháng = đúng tổng số km của tất cả các ngày
    stat.totalDistance = Math.round(sumDistance * 100) / 100;
    stat.totalMovingTime = sumMovingTime;

    // Tính Pace (phút/km)
    if (stat.totalDistance > 0 && stat.totalMovingTime > 0) {
      const paceInSeconds = stat.totalMovingTime / stat.totalDistance;
      const paceMinutes = Math.floor(paceInSeconds / 60);
      const paceSeconds = Math.floor(paceInSeconds % 60).toString().padStart(2, '0');
      stat.averagePace = `${paceMinutes}:${paceSeconds} /km`;
    } else {
      stat.averagePace = '-';
    }

    // Tính streak (chuỗi ngày chạy liên tục)
    let currentStreak = 0;
    let maxStreak = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      if (stat.dailyDistances[i] > 0) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }
    stat.maxStreak = maxStreak;

    // =========================================================================
    // TÍNH Σ All-km (Tổng km tháng 7 + cộng dồn các ngày từ 01/08/2026 đến hết tháng đang xem)
    // =========================================================================
    const memFname = normalize(stat.member.firstname);
    const memLname = normalize(stat.member.lastname);

    // Tìm item khớp trong baseItems (dữ liệu chốt cuối tháng 7/2026)
    const matchedBaseItem = baseItems.find(item => {
      // 1. Khớp theo Athlete ID
      if (item.athleteId && stat.member.id && String(item.athleteId) === String(stat.member.id)) {
        return true;
      }
      // 2. Khớp theo firstname và lastname
      const itemParts = (item.name || '').trim().split(/\s+/);
      const itemFname = normalize(itemParts[0]);
      const itemLname = normalize(itemParts.slice(1).join(''));
      if (itemFname === memFname && (itemLname === memLname || itemLname.startsWith(memLname) || memLname.startsWith(itemLname))) {
        return true;
      }
      // 3. Fallback cho Thanh Xuan / Xuan Nguyen
      if (itemFname === 'xuan' && (memLname.startsWith('x') || memFname === 'xuan' || memLname === 'xuan')) {
        return true;
      }
      return false;
    });

    const isBaseFileApplicable = (year > 2026 || (year === 2026 && month >= 7));
    const isBaseFileOnly = (year === 2026 && month === 7);

    // Tính tổng km tích lũy từ các hoạt động deduplicated từ 01/08/2026 đến cuối tháng đang xem
    let accumulatedDistance = 0;
    if (!isBaseFileOnly && isBaseFileApplicable) {
      allTimeActivities.forEach(act => {
        let isActMatch = false;
        if (act.athlete?.id && stat.member.id && String(act.athlete.id) === String(stat.member.id)) {
          isActMatch = true;
        } else {
          const actFname = normalize(act.athlete?.firstname);
          const actLname = normalize(act.athlete?.lastname);
          if (actFname === memFname && (memLname === actLname || memLname.startsWith(actLname) || actLname.startsWith(memLname))) {
            isActMatch = true;
          }
        }
        if (isActMatch) {
          accumulatedDistance += (act.distance || 0) / 1000;
        }
      });
    }

    if (isBaseFileApplicable) {
      if (matchedBaseItem && matchedBaseItem.baseDistance !== null && matchedBaseItem.baseDistance !== undefined) {
        stat.baseDistance = matchedBaseItem.baseDistance;
        stat.allTimeDistance = Math.round((stat.baseDistance + (isBaseFileOnly ? 0 : accumulatedDistance)) * 100) / 100;
      } else {
        stat.baseDistance = 0;
        stat.allTimeDistance = Math.round(accumulatedDistance * 100) / 100;
      }
    } else {
      // Các tháng trước tháng 7/2026
      stat.baseDistance = null;
      stat.allTimeDistance = null;
    }

    return stat;
  });

  // Sắp xếp theo tổng quãng đường giảm dần
  result.sort((a, b) => b.totalDistance - a.totalDistance);

  // Gán thứ hạng (rank)
  result.forEach((stat, index) => {
    stat.rank = index + 1;
  });

  // Tìm Rùa chăm chỉ (người chạy nhiều ngày nhất nhưng không phải hạng 1)
  const maxDays = Math.max(...result.map(s => s.totalDays), 0);
  result.forEach(stat => {
    if (stat.totalDays === maxDays && maxDays >= 5 && stat.rank > 1) {
      stat.isTurtle = true;
    }
  });

  return result;
}

/**
 * Tính tổng km của toàn bộ các tháng trong năm
 * Loại bỏ trùng lặp cho các hoạt động không có ngày tháng (từ club API)
 */
export function getCombinedDistance(activities, participantsMap, year) {
  let sum = 0;
  
  // Khởi tạo map chứa dữ liệu của các participants
  const runnerStats = {};
  Object.keys(participantsMap).forEach(key => {
    runnerStats[key] = {
      member: participantsMap[key]
    };
  });

  const normalize = (n) => (n || '').trim().toLowerCase().replace(/[\.\s]/g, '');
  const seenCombinedKeys = new Set();

  activities.forEach(act => {
    if (act.distance === undefined || act.distance < 5) return;

    let matchKey = null;

    // 1. Thử match bằng ID trước
    if (act.athlete?.id) {
      const foundIdKey = Object.keys(runnerStats).find(k => runnerStats[k].member.id && String(runnerStats[k].member.id) === String(act.athlete.id));
      if (foundIdKey) matchKey = foundIdKey;
    } 
    
    // 2. Fallback match bằng tên
    if (!matchKey) {
      const fname = normalize(act.athlete?.firstname);
      const lname = normalize(act.athlete?.lastname);
      
      const foundKey = Object.keys(runnerStats).find(k => {
        const mem = runnerStats[k].member;
        const memFname = normalize(mem.firstname);
        const memLname = normalize(mem.lastname);
        return memFname === fname && 
               (memLname === lname || memLname.startsWith(lname) || lname.startsWith(memLname));
      });

      if (foundKey) matchKey = foundKey;
    }

    if (matchKey) {
      const distanceKm = (act.distance || 0) / 1000;

      if (act.start_date_local) {
        const localDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
        const date = new Date(localDateStr);
        if (isNaN(date.getTime())) return;
        const actYear = date.getFullYear();

        if (actYear === year) {
          const actId = act.id ? String(act.id) : null;
          const timeMinute = localDateStr.substring(0, 16);
          const distMeter = Math.round(act.distance);
          const moveSec = act.moving_time || 0;
          const actKey = actId ? `id_${actId}` : `comp_${matchKey}_${timeMinute}_${distMeter}_${moveSec}`;

          if (!seenCombinedKeys.has(actKey)) {
            seenCombinedKeys.add(actKey);
            sum += distanceKm;
          }
        }
      }
    }
  });

  return Math.round(sum * 100) / 100;
}

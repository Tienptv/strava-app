/**
 * Xử lý danh sách hoạt động thô từ Strava thành dữ liệu ma trận hiển thị Challenge
 * @param {Array} activities - Danh sách hoạt động (club activities)
 * @param {Object} participantsMap - Object chứa danh sách người tham gia được chọn
 * @param {number} year - Năm hiện tại
 * @param {number} month - Tháng hiện tại (1-12)
 * @returns {Array} Mảng dữ liệu các dòng (mỗi dòng tương ứng 1 runner)
 */
export function processChallengeData(activities, participantsMap, year, month) {
  // Lấy số ngày trong tháng
  const daysInMonth = new Date(year, month, 0).getDate();

  // Khởi tạo map chứa dữ liệu của các participants
  const runnerStats = {};

  Object.keys(participantsMap).forEach(key => {
    const member = participantsMap[key];
    
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
    };
  });

  // Lọc các hoạt động
  // Lưu ý: Strava Club API không trả về ngày tháng. Do đó, với các hoạt động không có start_date_local,
  // chúng ta đành mặc định cộng vào tổng số thay vì vứt bỏ.
  const currentMonthActivities = activities.filter(act => {
    // Chỉ lấy các hoạt động có quãng đường >= 0.005km (5 mét)
    if (act.distance === undefined || act.distance < 5) {
      return false;
    }

    if (!act.start_date_local) return true; // Chấp nhận các hoạt động từ club (không có ngày)
    // Sửa lỗi timezone: start_date_local của Strava có 'Z' nhưng là giờ local, parse luôn sẽ bị sai múi giờ
    const localDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
    const date = new Date(localDateStr);
    const actYear = date.getFullYear();
    const actMonth = date.getMonth() + 1;
    const actDay = date.getDate();

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;

    if (actYear === year && actMonth === month) {
      if (isCurrentMonth && actDay > now.getDate()) {
        return false;
      }
      return true;
    }
    return false;
  });

  // Cộng dồn dữ liệu hoạt động vào runner tương ứng
  currentMonthActivities.forEach(act => {
    let matchKey = null;

    // 1. Thử match bằng ID trước (ưu tiên cao nhất vì chính xác tuyệt đối)
    if (act.athlete?.id) {
      const foundIdKey = Object.keys(runnerStats).find(k => runnerStats[k].member.id === act.athlete.id);
      if (foundIdKey) {
        matchKey = foundIdKey;
      }
    } 
    
    // 2. Fallback match bằng tên (vì API Club Activities thường ẩn ID)
    if (!matchKey) {
      const normalize = (n) => (n || '').trim().toLowerCase().replace(/[\.\s]/g, '');
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
        runnerStats[matchKey].dailyDistances[day] += distanceKm;
        runnerStats[matchKey].dailyMovingTime[day] += movingTime;
      }
      
      runnerStats[matchKey].totalDistance += distanceKm;
      runnerStats[matchKey].totalMovingTime += movingTime;
    }
  });

  // Tính toán các chỉ số tổng kết
  const result = Object.values(runnerStats).map(stat => {
    // Đếm số ngày có chạy
    let activeDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      if (stat.dailyDistances[i] > 0) {
        activeDays++;
      }
    }
    stat.totalDays = activeDays;

    // Tính Pace (phút/km)
    if (stat.totalDistance > 0) {
      // Pace = tổng thời gian (giây) / tổng quãng đường (km)
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
        // Có thể reset currentStreak nếu cần, 
        // nhưng với challenge tính theo tháng, ta quan tâm maxStreak nhất
        currentStreak = 0;
      }
    }
    stat.maxStreak = maxStreak;

    // Làm tròn tổng số km
    stat.totalDistance = Math.round(stat.totalDistance * 100) / 100;

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

  activities.forEach(act => {
    if (act.distance === undefined || act.distance < 5) return;

    let matchKey = null;

    // 1. Thử match bằng ID trước
    if (act.athlete?.id) {
      const foundIdKey = Object.keys(runnerStats).find(k => runnerStats[k].member.id === act.athlete.id);
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
        const actYear = date.getFullYear();
        const actMonth = date.getMonth() + 1;

        if (actYear === year) {
          sum += distanceKm;
        }
      } else {
        // Cộng luôn các hoạt động club không có ngày tháng (chỉ cộng 1 lần cho tổng cộng dồn)
        sum += distanceKm;
      }
    }
  });

  return Math.round(sum * 100) / 100;
}

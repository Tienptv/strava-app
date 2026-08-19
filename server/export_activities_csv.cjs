const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

(async () => {
  dotenv.config({ path: path.join(__dirname, '../.env') });
  
  const { StravaAPI } = await import('./strava.js');
  
  const strava = new StravaAPI(
    process.env.STRAVA_CLIENT_ID,
    process.env.STRAVA_CLIENT_SECRET
  );

  const TOKENS_FILE = path.join(__dirname, '../Storage/tokens.json');
  const CLUB_MEMBERS_FILE = path.join(__dirname, '../Storage/club_members_export.csv');
  const CLUB_ID = '878992'; // ID của Haskoning Vietnam Running Club
  
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const OUT_FILE = path.join(__dirname, `../Storage/data-activities_${dateStr}.csv`);

  if (!fs.existsSync(TOKENS_FILE)) {
    console.error('Không tìm thấy tokens.json. Bạn cần Admin đăng nhập Strava trước.');
    process.exit(1);
  }

  // Đọc danh sách member để mapping ID
  const memberMap = new Map();
  if (fs.existsSync(CLUB_MEMBERS_FILE)) {
    const lines = fs.readFileSync(CLUB_MEMBERS_FILE, 'utf8').split('\n').filter(l => l.trim());
    if (lines.length > 1) {
      // Bỏ qua header
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 3) {
          const id = parts[0].trim();
          const fName = parts[1].trim();
          const lName = parts[2].trim();
          const fullName = `${fName} ${lName}`.trim();
          if (id && id !== 'undefined') {
            memberMap.set(fullName, id);
          }
        }
      }
    }
  }

  const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  const athleteIds = Object.keys(tokensData);
  
  if (athleteIds.length === 0) {
    console.error('Không có token nào trong tokens.json.');
    process.exit(1);
  }

  // Dùng token đầu tiên (giả định là Admin) để lấy dữ liệu Club
  const adminId = athleteIds[0];
  let tokenObj = tokensData[adminId];
  let access_token = tokenObj.access_token;

  console.log(`Bắt đầu lấy dữ liệu Club (ID: ${CLUB_ID}) bằng quyền của Admin ${adminId}...`);
  
  const csvHeaders = ['Athlete ID', 'Tên VĐV', 'Loại', 'Tên Hoạt Động', 'Ngày Giờ', 'Quãng Đường (km)', 'Thời Gian (phút)', 'Pace (phút/km)'];
  const csvRows = [];

  const formatPace = (speedMetersPerSec) => {
    if (!speedMetersPerSec || speedMetersPerSec <= 0) return '0:00';
    const paceSeconds = 1000 / speedMetersPerSec;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.floor(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  try {
    let acts;
    try {
      // API của Club thường trả tối đa 200 hoạt động gần nhất
      acts = await strava.getClubActivities(access_token, CLUB_ID, { page: 1, per_page: 200 });
    } catch (err) {
      if (err.message.includes('401') && tokenObj.refresh_token) {
        console.log(`Token của Admin ${adminId} hết hạn. Đang làm mới (refresh) token...`);
        const newTokens = await strava.refreshToken(tokenObj.refresh_token);
        
        tokenObj.access_token = newTokens.access_token;
        tokenObj.refresh_token = newTokens.refresh_token;
        tokenObj.expires_at = newTokens.expires_at;
        tokensData[adminId] = tokenObj;
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokensData, null, 2), 'utf8');
        
        access_token = tokenObj.access_token;
        acts = await strava.getClubActivities(access_token, CLUB_ID, { page: 1, per_page: 200 });
      } else {
        throw err;
      }
    }

    if (!Array.isArray(acts)) {
      console.warn(`Lỗi: Data trả về không hợp lệ từ Club API`);
      return;
    }

    for (const act of acts) {
      // CHỈ LẤY CÁC HOẠT ĐỘNG CHẠY (Run)
      if (act.type !== 'Run') {
        continue;
      }

      const distKm = (act.distance / 1000).toFixed(2);
      const timeMins = (act.moving_time / 60).toFixed(2);
      
      const avgSpeed = act.average_speed || (act.distance / act.moving_time); 
      const paceStr = formatPace(avgSpeed);
      
      const actName = `"${(act.name || '').replace(/"/g, '""')}"`;
      
      // Lấy tên VĐV từ API Club
      const firstName = act.athlete?.firstname || '';
      const lastName = act.athlete?.lastname || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const vdvName = `"${fullName}"`;
      
      // Mapping ID
      let actAthleteId = 'Unknown';
      if (memberMap.has(fullName)) {
        actAthleteId = memberMap.get(fullName);
      } else if (act.athlete?.id) {
        actAthleteId = act.athlete.id;
      }

      // VÌ Club API không trả về start_date_local, ta sẽ lấy ngày giờ hiện tại
      // để import vào ngày hôm nay
      const activityDate = act.start_date_local || act.start_date || today.toISOString();

      csvRows.push([
        actAthleteId,
        vdvName,
        act.type,
        actName,
        activityDate,
        distKm,
        timeMins,
        paceStr
      ]);
    }
  } catch (err) {
    console.error(`Lỗi khi lấy dữ liệu Club: ${err.message}`);
  }

  if (csvRows.length === 0) {
    console.log('Không có hoạt động nào trong khoảng thời gian này.');
    return;
  }

  // Sắp xếp giảm dần theo ngày (mặc dù có thể cùng ngày nếu fake date)
  csvRows.sort((a, b) => new Date(b[4]) - new Date(a[4]));

  const csvContent = [csvHeaders.join(',')]
    .concat(csvRows.map(row => row.join(',')))
    .join('\n');

  if (!fs.existsSync(path.dirname(OUT_FILE))) {
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  }

  fs.writeFileSync(OUT_FILE, '\ufeff' + csvContent, 'utf8');
  console.log(`\nHoàn tất! Đã xuất ${csvRows.length} hoạt động (chỉ Run) của Club ra file: ${OUT_FILE}`);

})();

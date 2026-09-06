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
  const OUT_FILE = path.join(__dirname, `../Storage/activities_export_${dateStr}.csv`);

  if (!fs.existsSync(TOKENS_FILE)) {
    console.error('Không tìm thấy tokens.json. Bạn cần Admin đăng nhập Strava trước.');
    process.exit(1);
  }

  // Đọc danh sách file Total-km*.csv và data-*.csv để làm từ điển mapping tên (khôi phục Full Name và ID từ tên rút gọn)
  const memberMap = new Map();
  const storageDir = path.join(__dirname, '../Storage');
  if (fs.existsSync(storageDir)) {
    const allFiles = fs.readdirSync(storageDir);
    const totalKmFiles = allFiles.filter(f => f.toLowerCase().startsWith('total-km') && f.endsWith('.csv'));
    const dataFiles = allFiles.filter(f => f.startsWith('data-') && f.endsWith('.csv'));
    
    // Hàm phụ trợ để xử lý tên và map
    const mapName = (id, fullName) => {
      if (fullName && fullName !== 'Name' && fullName !== 'name') {
        const nameParts = fullName.split(' ');
        if (nameParts.length > 1) {
          const lastName = nameParts.pop();
          const firstName = nameParts.join(' ');
          const abbrName = firstName + ' ' + lastName[0].toUpperCase() + '.';
          memberMap.set(abbrName, { id, fullName });
        } else {
          memberMap.set(fullName, { id, fullName });
        }
      }
    };

    // 1. Quét Total-km*.csv trước
    totalKmFiles.forEach(f => {
      try {
        const content = fs.readFileSync(path.join(storageDir, f), 'utf8').split('\n');
        for (let i = 1; i < content.length; i++) {
          const line = content[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          if (parts.length >= 2) {
            let fullName = parts[0].trim();
            let idStr = parts[1].trim();
            if (idStr.includes('/athletes/')) {
              let id = idStr.replace('/athletes/', '');
              mapName(id, fullName);
            }
          }
        }
      } catch (err) {}
    });

    // 2. Quét data-*.csv sau (sẽ ghi đè nếu trùng lặp vì name ở đây chính xác hơn)
    dataFiles.forEach(f => {
      try {
        const content = fs.readFileSync(path.join(storageDir, f), 'utf8').split('\n');
        for (let i = 1; i < content.length; i++) {
          const line = content[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          if (parts.length >= 5) {
            let id = parts[0].replace(/"/g, '').replace('/athletes/', '');
            let fullName = parts[4].replace(/"/g, '').trim();
            mapName(id, fullName);
          }
        }
      } catch (err) {}
    });
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
      // CHỈ LẤY CÁC HOẠT ĐỘNG CHẠY (Run, VirtualRun, TrailRun)
      if (!['Run', 'VirtualRun', 'TrailRun'].includes(act.type)) {
        continue;
      }

      const distKm = (act.distance / 1000).toFixed(2);
      const timeMins = (act.moving_time / 60).toFixed(2);
      
      const avgSpeed = act.average_speed || (act.distance / act.moving_time); 
      const paceStr = formatPace(avgSpeed);
      
      const actName = `"${(act.name || '').replace(/"/g, '""')}"`;
      
      // Lấy tên VĐV rút gọn từ API Club (ví dụ: Katy N.)
      const firstName = act.athlete?.firstname || '';
      const lastName = act.athlete?.lastname || '';
      const abbrName = `${firstName} ${lastName}`.trim();
      
      // Mapping ID & Full Name từ từ điển
      let actAthleteId = 'Unknown';
      let finalFullName = abbrName; // Mặc định dùng tên rút gọn nếu không map được
      
      if (memberMap.has(abbrName)) {
        const mappedData = memberMap.get(abbrName);
        actAthleteId = mappedData.id;
        finalFullName = mappedData.fullName;
      } else if (act.athlete?.id) {
        actAthleteId = act.athlete.id;
      }

      const vdvName = `"${finalFullName}"`;

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

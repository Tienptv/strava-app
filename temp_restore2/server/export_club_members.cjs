const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// We need to import StravaAPI but it is an ES module. So we'll use dynamic import
// inside an async IIFE
(async () => {
  dotenv.config({ path: path.join(__dirname, '../.env') });
  
  const { StravaAPI } = await import('./strava.js');
  
  const strava = new StravaAPI(
    process.env.STRAVA_CLIENT_ID,
    process.env.STRAVA_CLIENT_SECRET
  );

  const TOKENS_FILE = path.join(__dirname, '../Storage/tokens.json');
  const OUT_FILE = path.join(__dirname, '../Storage/club_members_export.csv');
  const CLUB_ID = '878992';

  if (!fs.existsSync(TOKENS_FILE)) {
    console.error('Không tìm thấy tokens.json. Bạn cần đăng nhập Strava trước.');
    process.exit(1);
  }

  const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  const athleteIds = Object.keys(tokens);
  
  if (athleteIds.length === 0) {
    console.error('Không có token nào trong tokens.json.');
    process.exit(1);
  }

  // Lấy token đầu tiên
  let tokenData = tokens[athleteIds[0]];
  
  // Tự động refresh token nếu hết hạn
  const nowSec = Math.floor(Date.now() / 1000);
  if (tokenData.expires_at && tokenData.expires_at < nowSec && tokenData.refresh_token) {
    console.log('Token hết hạn, đang refresh...');
    try {
      const refreshed = await strava.refreshToken(tokenData.refresh_token);
      tokenData = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || tokenData.refresh_token,
        expires_at: refreshed.expires_at,
      };
      tokens[athleteIds[0]] = tokenData;
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
      console.log('Refresh token thành công.');
    } catch (err) {
      console.error('Lỗi refresh token:', err.message);
      process.exit(1);
    }
  }

  const accessToken = tokenData.access_token;
  console.log(`Đang lấy danh sách thành viên cho Club ${CLUB_ID}...`);

  let allMembers = [];
  let page = 1;
  const per_page = 200; // API Strava cho phép max 200

  while (true) {
    try {
      console.log(`Fetching page ${page}...`);
      const members = await strava.getClubMembers(accessToken, CLUB_ID, { page, per_page });
      
      if (!members || members.length === 0) {
        break;
      }

      allMembers = allMembers.concat(members);
      
      if (members.length < per_page) {
        break;
      }
      page++;
    } catch (err) {
      console.error('Lỗi khi gọi API:', err.message);
      break;
    }
  }

  console.log(`Đã lấy thành công tổng cộng: ${allMembers.length} thành viên.`);

  // Ghi ra file CSV
  let csvContent = 'Match Key,First Name,Last Name,Admin,Owner\n';
  allMembers.forEach(m => {
    const fn = (m.firstname || '').replace(/,/g, '');
    const ln = (m.lastname || '').replace(/,/g, '');
    const matchKey = `${fn}_${ln}`;
    csvContent += `${matchKey},${fn},${ln},${m.admin},${m.owner}\n`;
  });

  fs.writeFileSync(OUT_FILE, csvContent, 'utf8');
  console.log(`Đã lưu danh sách vào file: ${OUT_FILE}`);
})();

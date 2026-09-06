const fs = require('fs');
const path = require('path');

async function fetchAvatars() {
  const mappingPath = path.join(__dirname, '../Storage/name_mapping.json');
  const avatarsPath = path.join(__dirname, '../Storage/avatars.json');
  
  if (!fs.existsSync(mappingPath)) {
    console.error('Không tìm thấy name_mapping.json');
    return;
  }
  
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  const avatars = fs.existsSync(avatarsPath) ? JSON.parse(fs.readFileSync(avatarsPath, 'utf8')) : {};
  
  let count = 0;
  
  for (const key of Object.keys(mapping)) {
    const data = mapping[key];
    if (data.athleteId) {
      // Bỏ qua nếu đã có ảnh thật (không phải Not found và không phải logo mặc định)
      if (avatars[key] && 
          avatars[key].profile_medium && 
          avatars[key].profile_medium !== 'Not found' &&
          !avatars[key].profile_medium.includes('logo-strava-lg.png')) {
        continue;
      }
      
      console.log(`Đang lấy avatar cho ${key} (ID: ${data.athleteId})...`);
      try {
        const fetchOptions = process.env.STRAVA_COOKIE ? {
          headers: {
            'Cookie': process.env.STRAVA_COOKIE,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        } : {};

        const res = await fetch(`https://www.strava.com/athletes/${data.athleteId}`, fetchOptions);
        if (res.ok) {
          const html = await res.text();
          const match = html.match(/<meta[^>]*property=['"]og:image['"][^>]*content=['"]([^'"]+)['"]/i) || 
                        html.match(/<meta[^>]*content=['"]([^'"]+)['"][^>]*property=['"]og:image['"]/i);
          if (match) {
            let mediumUrl = match[1];
            // Sometimes it returns a default avatar, we can just save it anyway.
            avatars[key] = {
              profile_medium: mediumUrl,
              profile: mediumUrl.replace('/medium.jpg', '/large.jpg').replace('/full.jpg', '/large.jpg')
            };
            console.log(` -> Tìm thấy avatar: ${mediumUrl}`);
            count++;
          } else {
            console.log(` -> Không tìm thấy ảnh (Not found)`);
            avatars[key] = { profile_medium: null };
          }
        }
      } catch (err) {
        console.error(`Lỗi lấy ảnh cho ${key}: ${err.message}`);
      }
      
      // Delay để tránh bị block (1s)
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  fs.writeFileSync(avatarsPath, JSON.stringify(avatars, null, 2), 'utf8');
  console.log(`Hoàn tất! Đã cập nhật ${count} avatar.`);
}

fetchAvatars();

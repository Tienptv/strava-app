const fs = require('fs');

// BẠN HÃY DÁN COOKIE VÀO BIẾN NÀY (giữ nguyên trong dấu backtick ` `)
const STRAVA_COOKIE = '_strava4_session=ek4hdoqtoa7q9ro6rbsr4t8vdqchu5fh';

async function testAvatar(athleteId) {
  try {
    const res = await fetch(`https://www.strava.com/athletes/${athleteId}`, {
      headers: {
        'Cookie': STRAVA_COOKIE,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/<meta[^>]*property=['"]og:image['"][^>]*content=['"]([^'"]+)['"]/i) || 
                    html.match(/<meta[^>]*content=['"]([^'"]+)['"][^>]*property=['"]og:image['"]/i);
      if (match) {
        console.log(`[Athlete ${athleteId}] Tìm thấy Avatar (og:image): ${match[1]}`);
      } else {
        console.log(`[Athlete ${athleteId}] Không tìm thấy thẻ og:image, đang lưu HTML để phân tích...`);
        fs.writeFileSync('test_private.html', html, 'utf8');
      }
    } else {
      console.log(`[Athlete ${athleteId}] Request lỗi: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.error('Lỗi fetch:', e);
  }
}

// Test tài khoản Lieu Vo
testAvatar('72851794');

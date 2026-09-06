const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// ==========================================
// CẤU HÌNH CỦA BẠN (YOUR CONFIGURATION)
// ==========================================
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const COOKIE_VALUE = '1h93r2unrvf1vlf3vu6pqir0hhmmb6tf';
const CLUB_URL = 'https://www.strava.com/clubs/878992/members';
const STORAGE_DIR = path.join(__dirname, '../Storage');
// ==========================================

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractAllTimeStats(html) {
  const tableRegex = /<table[^>]*class=\"[^\"]*striped[^\"]*\"[^>]*>([\s\S]*?)<\/table>/is;
  const match = html.match(tableRegex);
  if (!match) return null;
  
  const tableHtml = match[1];
  
  // Lấy danh sách các bộ môn từ button tab
  const buttons = tableHtml.match(/<button[^>]*title=\"([^\"]+)\"/gis);
  const sports = [];
  if (buttons) {
    buttons.forEach(b => {
      const titleMatch = b.match(/title=\"([^\"]+)\"/i);
      if (titleMatch) sports.push(titleMatch[1]);
    });
  }

  if (sports.length === 0) sports.push('Sport 1', 'Sport 2', 'Sport 3');

  // Trích xuất phần dữ liệu đằng sau chữ All-Time
  // Bỏ giới hạn tới tbody đầu tiên, mà quét tới cuối table
  const allTimeRegex = /<th[^>]*>\s*All-Time\s*<\/th>([\s\S]*)/is;
  const allTimeMatch = tableHtml.match(allTimeRegex);
  if (!allTimeMatch) return null;

  const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
  const stats = {};
  
  let rowMatch;
  while ((rowMatch = rowRegex.exec(allTimeMatch[1])) !== null) {
    const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
    }
    
    // Ví dụ: cells = ['Distance', '4,062.0 km', '2,608.1 km']
    if (cells.length >= 2 && cells[0] !== 'All-Time') {
      const metric = cells[0];
      for (let i = 0; i < sports.length; i++) {
        if (cells[i + 1]) {
          stats[`${sports[i]} - ${metric}`] = cells[i + 1];
        }
      }
    }
  }
  return stats;
}

function extractAthleteName(html) {
  const titleRegex = /<title>(.*?)<\/title>/i;
  const match = html.match(titleRegex);
  if (match) {
    let name = match[1].replace('Strava Runner Profile | ', '').replace('Strava Cyclist Profile | ', '');
    name = name.split(' | ')[0];
    return name.trim();
  }
  return 'Unknown';
}

async function scrapeMembers() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  console.log('Đang khởi chạy trình duyệt...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new"
  });
  
  const page = await browser.newPage();
  await page.setCookie({
    name: '_strava4_session',
    value: COOKIE_VALUE,
    domain: 'www.strava.com'
  });
  
  console.log(`Đang truy cập trang nhóm: ${CLUB_URL}`);
  await page.goto(CLUB_URL, { waitUntil: 'networkidle2' });
  
  const clubHtml = await page.content();
  const linkMatches = clubHtml.match(/\/athletes\/\d+/g);
  let athleteLinks = [];
  if (linkMatches) {
    athleteLinks = Array.from(new Set(linkMatches)).map(link => `https://www.strava.com${link}`);
  }
  
  console.log(`Đã tìm thấy ${athleteLinks.length} thành viên. Bắt đầu trích xuất dữ liệu đa bộ môn...`);
  
  const results = [];
  
  for (let i = 0; i < athleteLinks.length; i++) {
    const url = athleteLinks[i];
    console.log(`[${i + 1}/${athleteLinks.length}] Đang xử lý ${url}...`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await delay(1500); 
      
      const html = await page.content();
      const stats = extractAllTimeStats(html);
      const name = extractAthleteName(html);
      
      if (stats && Object.keys(stats).length > 0) {
        results.push({
          athlete_id: url.split('/').pop(),
          name: name,
          url: url,
          ...stats
        });
        console.log(`  -> Thành công: ${name}`);
      } else {
        console.log(`  -> Không tìm thấy dữ liệu All-Time cho ${name}`);
      }
    } catch (err) {
      console.error(`  -> Lỗi khi truy cập ${url}:`, err.message);
    }
  }
  
  await browser.close();
  
  const jsonPath = path.join(STORAGE_DIR, 'members_stats.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\nĐã lưu JSON: ${jsonPath}`);
  
  if (results.length > 0) {
    const csvPath = path.join(STORAGE_DIR, 'members_stats.csv');
    const headers = new Set(['athlete_id', 'name', 'url']);
    results.forEach(r => Object.keys(r).forEach(k => headers.add(k)));
    const headerArr = Array.from(headers);
    
    const csvRows = [headerArr.join(',')];
    for (const row of results) {
      const values = headerArr.map(h => {
        let val = row[h] || '';
        if (String(val).includes(',')) val = `"${val}"`;
        return val;
      });
      csvRows.push(values.join(','));
    }
    fs.writeFileSync(csvPath, csvRows.join('\n'));
    console.log(`Đã lưu CSV: ${csvPath}`);
  }
}

scrapeMembers().catch(console.error);

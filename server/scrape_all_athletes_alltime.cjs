const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '../Storage');
const OUTPUT_CSV = path.join(STORAGE_DIR, 'All_Time_KM_02092026.csv');
const OUTPUT_JSON = path.join(STORAGE_DIR, 'All_Time_KM_02092026.json');
const BASELINE_CSV = path.join(STORAGE_DIR, 'Tong km To 02092026.csv');

const cookieFile = path.join(STORAGE_DIR, 'puppeteer_data/strava_cookie.txt');
const cookieVal = fs.existsSync(cookieFile) ? fs.readFileSync(cookieFile, 'utf8').trim() : '';

function parseComparisonHtml(html) {
  const result = {
    allTimeKm: 0,
    allTimeActivities: 0,
    allTimeTime: '',
    allTimeElev: '',
    year2026Km: 0,
    year2026Activities: 0,
    year2026Time: '',
    year2026Elev: ''
  };

  if (!html || typeof html !== 'string') return result;

  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  let runTable = null;
  for (const t of tables) {
    if (/<button[^>]*class='[^']*selected[^']*'[^>]*title='Run'/i.test(t) ||
        /<button[^>]*title='Run'[^>]*class='[^']*selected[^']*'/i.test(t)) {
      runTable = t;
      break;
    }
  }

  if (!runTable) return result;

  // 1. All-Time Stats from Run Table
  const allTimeSection = runTable.match(/<th>\s*All-Time\s*<\/th>[\s\S]*?<\/table>/i);
  if (allTimeSection) {
    const distMatch = allTimeSection[0].match(/<td>\s*Distance\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
    if (distMatch) {
      const dStr = distMatch[1].replace(/,/g, '').replace('km', '').trim();
      result.allTimeKm = parseFloat(dStr) || 0;
    }

    const actMatch = allTimeSection[0].match(/<td>\s*Activities\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
    if (actMatch) {
      result.allTimeActivities = parseInt(actMatch[1].replace(/,/g, '').trim(), 10) || 0;
    }

    const timeMatch = allTimeSection[0].match(/<td>\s*Time\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
    if (timeMatch) {
      result.allTimeTime = timeMatch[1].trim();
    }

    const elevMatch = allTimeSection[0].match(/<td>\s*Elev Gain\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
    if (elevMatch) {
      result.allTimeElev = elevMatch[1].trim();
    }
  }

  // 2. 2026 Year-to-Date Stats from Run Table
  const ytdSection = runTable.match(/id='sport-\d+-ytd'[\s\S]*?<\/tbody>/i);
  if (ytdSection) {
    const distMatch = ytdSection[0].match(/<td>\s*Distance\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
    if (distMatch) {
      const dStr = distMatch[1].replace(/,/g, '').replace('km', '').trim();
      result.year2026Km = parseFloat(dStr) || 0;
    }

    const actMatch = ytdSection[0].match(/<td>\s*Activities\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
    if (actMatch) {
      result.year2026Activities = parseInt(actMatch[1].replace(/,/g, '').trim(), 10) || 0;
    }

    const timeMatch = ytdSection[0].match(/<td>\s*Time\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
    if (timeMatch) {
      result.year2026Time = timeMatch[1].trim();
    }

    const elevMatch = ytdSection[0].match(/<td>\s*Elev Gain\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
    if (elevMatch) {
      result.year2026Elev = elevMatch[1].trim();
    }
  }

  return result;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const athleteListFile = path.join(__dirname, '../scratch_athletes_to_scrape.json');
  const athletes = JSON.parse(fs.readFileSync(athleteListFile, 'utf8'));

  console.log(`🚀 Bắt đầu quét All-Time & 2026 KM cho ${athletes.length} thành viên qua API Strava Web...`);

  const results = [];

  for (let i = 0; i < athletes.length; i++) {
    const ath = athletes[i];
    const url = `https://www.strava.com/athletes/${ath.id}/profile_sidebar_comparison?hl=en-US`;
    process.stdout.write(`[${(i + 1).toString().padStart(2, ' ')}/${athletes.length}] ${ath.name.padEnd(24)} (${ath.id}): `);

    try {
      const res = await fetch(url, {
        headers: {
          'Cookie': `_strava4_session=${cookieVal}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
        }
      });

      if (res.status === 200) {
        const html = await res.text();
        const stats = parseComparisonHtml(html);

        const record = {
          athleteId: ath.id,
          name: ath.name,
          allTimeKm: stats.allTimeKm,
          allTimeActivities: stats.allTimeActivities,
          allTimeTime: stats.allTimeTime,
          allTimeElev: stats.allTimeElev,
          year2026Km: stats.year2026Km,
          year2026Activities: stats.year2026Activities,
          year2026Time: stats.year2026Time,
          year2026Elev: stats.year2026Elev,
          scrapedAt: '2026-09-02T23:59:59.999Z'
        };

        results.push(record);
        console.log(`✅ All-Time: ${stats.allTimeKm.toFixed(1).padStart(7)} km (${stats.allTimeActivities.toString().padStart(4)} runs) | 2026: ${stats.year2026Km.toFixed(1).padStart(7)} km`);
      } else {
        console.log(`⚠️ HTTP Status ${res.status}`);
        results.push({
          athleteId: ath.id,
          name: ath.name,
          allTimeKm: 0,
          allTimeActivities: 0,
          allTimeTime: '',
          allTimeElev: '',
          year2026Km: 0,
          year2026Activities: 0,
          year2026Time: '',
          year2026Elev: '',
          scrapedAt: '2026-09-02T23:59:59.999Z'
        });
      }
    } catch (err) {
      console.log(`❌ Lỗi kết nối: ${err.message}`);
      results.push({
        athleteId: ath.id,
        name: ath.name,
        allTimeKm: 0,
        allTimeActivities: 0,
        allTimeTime: '',
        allTimeElev: '',
        year2026Km: 0,
        year2026Activities: 0,
        year2026Time: '',
        year2026Elev: '',
        scrapedAt: '2026-09-02T23:59:59.999Z'
      });
    }

    await delay(350); // Polite delay
  }

  // 1. Lưu ra tệp CSV riêng (All_Time_KM_02092026.csv)
  console.log(`\n💾 Đang lưu tệp CSV riêng: ${OUTPUT_CSV}...`);
  const headers = [
    'Athlete ID',
    'Name',
    'All-Time Run KM',
    'All-Time Run Activities',
    'All-Time Run Time',
    'All-Time Run Elev Gain',
    '2026 Run KM',
    '2026 Run Activities',
    '2026 Run Time',
    '2026 Run Elev Gain',
    'Scraped Date'
  ];

  const lines = [headers.join(',')];
  results.forEach(r => {
    lines.push([
      r.athleteId,
      `"${r.name.replace(/"/g, '""')}"`,
      r.allTimeKm,
      r.allTimeActivities,
      `"${r.allTimeTime}"`,
      `"${r.allTimeElev}"`,
      r.year2026Km,
      r.year2026Activities,
      `"${r.year2026Time}"`,
      `"${r.year2026Elev}"`,
      r.scrapedAt
    ].join(','));
  });
  fs.writeFileSync(OUTPUT_CSV, lines.join('\n'), 'utf8');

  // 2. Lưu ra tệp JSON (All_Time_KM_02092026.json)
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf8');

  // 3. Tạo tệp tương thích cho hệ thống Challenge Table: Tong km To 02092026.csv
  // Format: Athlete ID,Name,km
  const baselineLines = ['Athlete ID,Name,km'];
  results.forEach(r => {
    baselineLines.push(`${r.athleteId},${r.name},${r.allTimeKm}`);
  });
  fs.writeFileSync(BASELINE_CSV, baselineLines.join('\n'), 'utf8');

  console.log(`✅ Đã lưu tệp chuẩn hóa: ${BASELINE_CSV}`);
  console.log(`\n🎉 HOÀN TẤT THÀNH CÔNG CHO ${results.length} THÀNH VIÊN!`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

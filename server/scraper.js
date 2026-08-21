import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Typical path to Chrome on Windows
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PUPPETEER_DATA_DIR = path.join(__dirname, '../Storage/puppeteer_data');

/**
 * Open Chrome visibly, let user log in to Strava.
 * Puppeteer will save cookies natively via userDataDir.
 */
export async function loginAndGetCookie() {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome không được tìm thấy ở ${CHROME_PATH}.`);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--window-size=1280,800',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();
    // Giả mạo User-Agent như trình duyệt thật
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    // Xóa cờ webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.goto('https://www.strava.com/login', { waitUntil: 'networkidle2', timeout: 45000 });

    console.log('🔑 Vui lòng đăng nhập Strava trên cửa sổ Chrome...');

    // Poll until user finishes login
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: Đăng nhập quá 3 phút. Vui lòng thử lại.'));
      }, 180000);

      const interval = setInterval(async () => {
        try {
          const currentUrl = page.url();
          // Chỉ coi là đăng nhập thành công khi Strava chuyển hướng về dashboard hoặc feed
          if (currentUrl.includes('/dashboard') || currentUrl.includes('/feed') || currentUrl.endsWith('strava.com/') || currentUrl.endsWith('strava.com')) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve();
          }
        } catch (e) {
          // Navigating, ignore
        }
      }, 1500);
    });

    console.log(`✅ Đăng nhập thành công! Phiên đăng nhập đã được lưu.`);
    
    // Extract actual _strava4_session cookie
    const cookies = await page.cookies();
    const sessionCookie = cookies.find(c => c.name === '_strava4_session');
    const cookieValue = sessionCookie ? sessionCookie.value : 'session_saved';
    
    // Save to a simple text file (removed to ensure reset on close)
    await browser.close();
    return cookieValue;
  } catch (error) {
    try { await browser.close(); } catch(e) {}
    throw error;
  }
}

/**
 * Get saved cookies from file.
 * Returns null as we no longer persist cookies on backend.
 */
export function getSavedCookie() {
  return null;
}

export async function scrapeClubActivities(clubId, sessionCookie, limit = 50) {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome không được tìm thấy ở ${CHROME_PATH}. Vui lòng cài đặt Chrome ở đường dẫn mặc định.`);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--no-first-run',
      '--window-size=1280,800',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  const allActivities = new Map();

  function parseEntries(entries) {
    entries.forEach(entry => {
      if (entry.entity !== 'Activity' || !entry.activity) return;
      const act = entry.activity;
      const activityId = act.id || '';
      const title = act.activityName || '';
      const activityType = act.type || 'Run';
      let dateText = act.startDate || act.timeAndLocation?.displayDate || '';
      
      if (dateText.endsWith('Z')) {
        const d = new Date(dateText);
        if (!isNaN(d.getTime())) {
          d.setHours(d.getHours() + 7);
          dateText = d.toISOString().substring(0, 19) + 'Z';
        }
      }
      
      const athleteName = act.athlete?.athleteName || act.athlete?.firstName || 'Unknown Athlete';
      let distance = '0', time = '0', elev = '0';
      
      if (act.stats && Array.isArray(act.stats)) {
        act.stats.forEach(stat => {
          const key = stat.key || '';
          if (key.includes('_subtitle')) return;
          const value = stat.value ? String(stat.value).replace(/<[^>]*>?/gm, '').trim() : '';
          const subtitleStat = act.stats.find(s => s.key === key + '_subtitle');
          const subtitle = subtitleStat && subtitleStat.value ? String(subtitleStat.value).toLowerCase() : '';
          
          if (subtitle.includes('distance') || subtitle.includes('khoảng cách')) distance = value;
          else if (subtitle.includes('time') || subtitle.includes('thời gian')) time = value;
          else if (subtitle.includes('elev') || subtitle.includes('độ cao')) elev = value;
        });
        
        if (distance === '0' && time === '0') {
          const stat1 = act.stats.find(s => s.key === 'stat_one');
          const stat3 = act.stats.find(s => s.key === 'stat_three');
          if (stat1) distance = stat1.value ? String(stat1.value).replace(/<[^>]*>?/gm, '').trim() : '';
          if (stat3) time = stat3.value ? String(stat3.value).replace(/<[^>]*>?/gm, '').trim() : '';
        }
      }
      
      if (activityId) {
        allActivities.set(activityId, {
          id: activityId,
          athleteName: athleteName,
          date: dateText,
          title: title,
          distance: distance,
          time: time,
          elevation: elev,
          type: activityType
        });
      }
    });
  }

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Block images, CSS, fonts to speed up page load
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Intercept API calls to get more feed items while scrolling
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('feed') && (response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr')) {
        try {
          const text = await response.text();
          const json = JSON.parse(text);
          if (json.entries) {
            parseEntries(json.entries);
          }
        } catch (e) {}
      }
    });

    if (sessionCookie && sessionCookie !== 'session_saved') {
      await page.setCookie({
        name: '_strava4_session',
        value: sessionCookie,
        domain: '.strava.com'
      });
      console.log('🍪 Đã inject 1 session cookie (thủ công)');
    }

    const url = `https://www.strava.com/clubs/${clubId}/recent_activity`;
    console.log('⏳ Đang tải trang', url);
    const t0 = Date.now();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/session/new')) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng bấm "🔑 Đăng nhập Strava" để đăng nhập lại.');
    }

    try {
      await page.waitForSelector('[data-react-props]', { timeout: 5000 });
    } catch (e) {
      console.log('⚠️ Không tìm thấy data-react-props, thử tiếp...');
    }

    console.log(`✅ Tải trang xong trong ${Date.now() - t0}ms`);

    // Lấy danh sách prop strings từ DOM
    const initialPropsStrings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-react-props]'))
        .map(el => el.getAttribute('data-react-props'));
    });

    for (const str of initialPropsStrings) {
      try {
        const props = JSON.parse(str);
        if (props?.appContext?.preFetchedEntries) {
          parseEntries(props.appContext.preFetchedEntries);
        }
      } catch (e) {}
    }

    // Scroll to fetch more if limit > allActivities.size
    let noNewDataCount = 0;
    const maxEmptyScrolls = 10; // Tối đa 10 lần cuộn không có dữ liệu mới
    
    while (allActivities.size < limit && noNewDataCount < maxEmptyScrolls) {
      const prevSize = allActivities.size;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 2000)); // Chờ 2s để API load
      
      if (allActivities.size === prevSize) {
        noNewDataCount++;
      } else {
        noNewDataCount = 0;
      }
      
      console.log(`Đang cuộn lấy thêm dữ liệu: ${allActivities.size}/${limit}`);
    }

    await browser.close();
    
    // Convert to array and slice to exact limit
    const finalArray = Array.from(allActivities.values()).slice(0, limit);
    return finalArray;
  } catch (error) {
    try { await browser.close(); } catch(e) {}
    throw error;
  }
}

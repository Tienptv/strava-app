import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Typical path to Chrome on Windows
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const COOKIE_FILE = path.join(__dirname, '../Storage/.strava-cookies.json');

/**
 * Open Chrome visibly, let user log in to Strava, save ALL cookies.
 */
export async function loginAndGetCookie() {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome không được tìm thấy ở ${CHROME_PATH}.`);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://www.strava.com/login', { waitUntil: 'networkidle2', timeout: 45000 });

    const email = process.env.STRAVA_EMAIL;
    const password = process.env.STRAVA_PASSWORD;
    
    if (email && password) {
      console.log('🤖 Tự động điền thông tin đăng nhập từ .env...');
      try {
        // Cố gắng tắt popup Cookie nếu có (chờ 3s)
        await page.waitForXPath("//button[contains(., 'Accept All')]", { timeout: 3000 })
          .then(btn => btn.click())
          .catch(() => {}); // Không có popup thì bỏ qua
          
        await page.waitForSelector('#email', { timeout: 15000 });
        await page.type('#email', email);
        await page.type('#password', password);
        await Promise.all([
          page.click('#login-button'),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
        ]);
        console.log('Đã gửi form đăng nhập, đang chờ trang load...');
      } catch (e) {
        console.log('⚠️ Không thể tự động điền form (có thể do load chậm hoặc đổi UI):', e.message);
      }
    } else {
      console.log('🔑 Chờ bạn đăng nhập Strava trên cửa sổ Chrome...');
    }

    // Poll until user finishes login (hoặc auto-login thành công)
    const allCookies = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: Đăng nhập quá 3 phút. Vui lòng thử lại.'));
      }, 180000);

      const interval = setInterval(async () => {
        try {
          const currentUrl = page.url();
          // Chỉ coi là đăng nhập thành công khi Strava chuyển hướng về dashboard hoặc feed
          if (currentUrl.includes('/dashboard') || currentUrl.includes('/feed') || currentUrl.endsWith('strava.com/') || currentUrl.endsWith('strava.com')) {
            
            // Grab ALL cookies from Strava
            const cookies = await page.cookies('https://www.strava.com');
            if (cookies.length > 0) {
              clearInterval(interval);
              clearTimeout(timeout);
              resolve(cookies);
            }
          }
        } catch (e) {
          // Navigating, ignore
        }
      }, 1500);
    });

    await browser.close();

    // Save ALL cookies to file
    const dir = path.dirname(COOKIE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COOKIE_FILE, JSON.stringify({
      cookies: allCookies,
      savedAt: new Date().toISOString()
    }, null, 2));

    const sessionCookie = allCookies.find(c => c.name === '_strava4_session');
    console.log(`✅ Đăng nhập thành công! Đã lưu ${allCookies.length} cookies.`);
    return sessionCookie ? sessionCookie.value : 'session_saved';

  } catch (error) {
    try { await browser.close(); } catch(e) {}
    throw error;
  }
}

/**
 * Get saved cookies from file.
 * Returns the _strava4_session value for backward compat.
 */
export function getSavedCookie() {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      const data = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
      if (data.cookies && Array.isArray(data.cookies)) {
        const session = data.cookies.find(c => c.name === '_strava4_session');
        return session ? session.value : null;
      }
      // Legacy format
      return data.cookie || null;
    }
  } catch (e) {}
  return null;
}

/**
 * Get ALL saved cookies from file (for injection).
 */
function getAllSavedCookies() {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      const data = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
      if (data.cookies && Array.isArray(data.cookies)) {
        return data.cookies;
      }
    }
  } catch (e) {}
  return null;
}

export async function scrapeClubActivities(clubId, sessionCookie) {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome không được tìm thấy ở ${CHROME_PATH}. Vui lòng cài đặt Chrome ở đường dẫn mặc định.`);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--no-first-run',
    ],
  });

  try {
    const page = await browser.newPage();

    // Block images, CSS, fonts to speed up page load
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Try to inject ALL saved cookies first (best chance of auth success)
    const allCookies = getAllSavedCookies();
    if (allCookies && allCookies.length > 0) {
      // Puppeteer setCookie needs objects with name, value, domain at minimum
      const cookiesToSet = allCookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain || '.strava.com',
        path: c.path || '/',
        httpOnly: c.httpOnly || false,
        secure: c.secure || false,
        sameSite: c.sameSite || 'Lax',
      }));
      await page.setCookie(...cookiesToSet);
      console.log(`🍪 Đã inject ${cookiesToSet.length} cookies từ file đã lưu`);
    } else if (sessionCookie) {
      // Fallback: inject single session cookie
      await page.setCookie({
        name: '_strava4_session',
        value: sessionCookie,
        domain: '.strava.com'
      });
      console.log('🍪 Đã inject 1 session cookie');
    }

    const url = `https://www.strava.com/clubs/${clubId}/recent_activity`;
    console.log('⏳ Đang tải trang', url);
    const t0 = Date.now();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Check if we are redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/session/new')) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng bấm "🔑 Đăng nhập Strava" để đăng nhập lại.');
    }

    // Wait for the react-props data (in the initial HTML, very fast)
    try {
      await page.waitForSelector('[data-react-props]', { timeout: 5000 });
    } catch (e) {
      console.log('⚠️ Không tìm thấy data-react-props, thử tiếp...');
    }

    console.log(`✅ Tải trang xong trong ${Date.now() - t0}ms`);

    // Execute extraction in browser context
    const activities = await page.evaluate(() => {
      const results = [];
      const elements = document.querySelectorAll('[data-react-props]');
      
      for (const el of elements) {
        try {
          const props = JSON.parse(el.getAttribute('data-react-props'));
          if (props && props.appContext && props.appContext.preFetchedEntries) {
            const entries = props.appContext.preFetchedEntries;
            
            entries.forEach(entry => {
              if (entry.entity !== 'Activity' || !entry.activity) return;
              
              const act = entry.activity;
              
              const activityId = act.id || '';
              const title = act.activityName || '';
              const activityType = act.type || 'Run';
              let dateText = act.startDate || act.timeAndLocation?.displayDate || '';
              // Fix timezone: Strava API returns true UTC. We need to convert it to GMT+7 pseudo-local 
              // string so the frontend challengeStats.js correctly interprets the day.
              if (dateText.endsWith('Z')) {
                const d = new Date(dateText);
                if (!isNaN(d.getTime())) {
                  d.setHours(d.getHours() + 7);
                  dateText = d.toISOString().substring(0, 19) + 'Z';
                }
              }
              const athleteName = act.athlete?.athleteName || act.athlete?.firstName || 'Unknown Athlete';
              
              let distance = '0';
              let time = '0';
              let elev = '0';
              
              if (act.stats && Array.isArray(act.stats)) {
                // Try to map by subtitle first
                act.stats.forEach(stat => {
                  const key = stat.key || '';
                  if (key.includes('_subtitle')) return;
                  
                  const value = stat.value ? stat.value.replace(/<[^>]*>?/gm, '').trim() : '';
                  const subtitleStat = act.stats.find(s => s.key === key + '_subtitle');
                  const subtitle = subtitleStat && subtitleStat.value ? subtitleStat.value.toLowerCase() : '';
                  
                  if (subtitle.includes('distance') || subtitle.includes('khoảng cách')) {
                    distance = value;
                  } else if (subtitle.includes('time') || subtitle.includes('thời gian')) {
                    time = value;
                  } else if (subtitle.includes('elev') || subtitle.includes('độ cao')) {
                    elev = value;
                  }
                });

                // Fallback if no subtitles matched
                if (distance === '0' && time === '0') {
                    const stat1 = act.stats.find(s => s.key === 'stat_one');
                    const stat3 = act.stats.find(s => s.key === 'stat_three');
                    if (stat1) distance = stat1.value ? stat1.value.replace(/<[^>]*>?/gm, '').trim() : '';
                    if (stat3) time = stat3.value ? stat3.value.replace(/<[^>]*>?/gm, '').trim() : '';
                }
              }

              results.push({
                id: activityId,
                athleteName: athleteName,
                date: dateText,
                title: title,
                distance: distance,
                time: time,
                elevation: elev,
                type: activityType
              });
            });
            break; // Found the correct prop, no need to check others
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      return results;
    });

    await browser.close();
    return activities;
  } catch (error) {
    try { await browser.close(); } catch(e) {}
    throw error;
  }
}


import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find Google Chrome or Microsoft Edge on Windows
export function getBrowserExecutable() {
  const commonPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null,
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, 'Google\\Chrome\\Application\\chrome.exe') : null,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const COOKIE_FILE = path.join(__dirname, '../Storage/.strava-cookies.json');

/**
 * Lấy cookie session đã lưu từ file .strava-cookies.json
 */
export function getSavedCookie() {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      const data = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
      if (data && data.cookies && Array.isArray(data.cookies)) {
        const session = data.cookies.find(c => c.name === '_strava4_session');
        if (session && session.value) return session.value;
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Lấy toàn bộ cookies đã lưu để inject vào trang scrape
 */
export function getAllSavedCookies() {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      const data = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
      if (data && data.cookies && Array.isArray(data.cookies)) {
        return data.cookies;
      }
    }
  } catch (e) {}
  return [];
}

/**
 * Trích xuất cookie trực tiếp từ cửa sổ Chrome chính đang chạy qua CDP port 9222
 */
export async function extractCookiesFromActiveBrowser(cdpPort = 9222) {
  try {
    const browser = await puppeteer.connect({ 
      browserURL: `http://127.0.0.1:${cdpPort}`,
      defaultViewport: null 
    });
    
    const pages = await browser.pages();
    if (pages.length === 0) {
      await browser.disconnect();
      return null;
    }

    const page = pages[0];
    const client = await page.target().createCDPSession();
    const res = await client.send('Network.getAllCookies');
    
    await browser.disconnect();

    if (res && res.cookies && res.cookies.length > 0) {
      const stravaCookies = res.cookies.filter(c => c.domain && c.domain.includes('strava.com'));
      if (stravaCookies.length > 0) {
        const cookieMap = new Map();
        for (const c of stravaCookies) {
          cookieMap.set(c.name, c);
        }
        const uniqueCookies = Array.from(cookieMap.values());
        
        const session = uniqueCookies.find(c => c.name === '_strava4_session');
        if (!session || !session.value) {
          // Chưa có phiên đăng nhập trên Strava
          return null;
        }

        const cookieDir = path.dirname(COOKIE_FILE);
        if (!fs.existsSync(cookieDir)) fs.mkdirSync(cookieDir, { recursive: true });
        fs.writeFileSync(COOKIE_FILE, JSON.stringify({ 
          cookies: uniqueCookies, 
          savedAt: new Date().toISOString() 
        }, null, 2));
        
        console.log(`⚡ [AUTO_COOKIE] Đã tự động bắt được ${uniqueCookies.length} Strava cookies từ Chrome đang mở (Session: Có)`);
        return session.value;
      }
    }
  } catch (err) {
    // Port 9222 chưa mở hoặc Chrome app chưa chạy
  }
  return null;
}

/**
 * Xóa sạch cookies trình duyệt và session Strava/Google qua CDP port 9222
 */
export async function clearCookiesFromActiveBrowser(cdpPort = 9222) {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      try { fs.unlinkSync(COOKIE_FILE); } catch (_) {}
    }

    const browser = await puppeteer.connect({ 
      browserURL: `http://127.0.0.1:${cdpPort}`,
      defaultViewport: null 
    });
    
    const pages = await browser.pages();
    if (pages.length > 0) {
      const client = await pages[0].target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
      try {
        await client.send('Network.clearBrowserCache');
      } catch (_) {}
    }
    
    await browser.disconnect();
    console.log('🧹 [CDP] Đã xóa toàn bộ cookies của trình duyệt Chrome.');
    return true;
  } catch (err) {
    // Không kết nối được tới CDP (ví dụ web browser thường không có port 9222)
    return false;
  }
}

/**
 * Mở Chrome cho người dùng đăng nhập Strava.
 * Tự động theo dõi tất cả các tab (kể cả đăng nhập bằng Google/Facebook),
 * phát hiện khi vào Dashboard/Onboarding, lưu cookie và tự động đóng trình duyệt.
 */
export async function loginAndGetCookie() {
  const browserPath = getBrowserExecutable();
  if (!browserPath) {
    throw new Error('Không tìm thấy trình duyệt Google Chrome hoặc Microsoft Edge trên máy tính của bạn.');
  }

  console.log('🚀 Đang khởi động trình duyệt Chrome...');
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--window-size=1280,800',
      '--window-position=100,100',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: null,
  });

  try {
    // Sử dụng ngay tab đầu tiên của trình duyệt để không bị sinh ra tab about:blank thừa
    const initialPages = await browser.pages();
    const page = initialPages.length > 0 ? initialPages[0] : await browser.newPage();
    
    // Giả lập User-Agent như trình duyệt thông thường
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('🔑 Đang mở trang đăng nhập Strava: https://www.strava.com/login ...');
    try {
      await page.goto('https://www.strava.com/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.bringToFront();
    } catch (navErr) {
      console.warn('Lưu ý khi mở trang login:', navErr.message);
    }

    console.log('🔑 Vui lòng đăng nhập Strava trên cửa sổ Chrome vừa mở...');

    function isSuccessUrl(rawUrl) {
      if (!rawUrl) return false;
      const url = rawUrl.toLowerCase();
      if (!url.includes('strava.com')) return false;

      // Còn ở các trang đăng nhập, xác thực, 2FA, checkpoint
      if (
        url.includes('/login') ||
        url.includes('/session') ||
        url.includes('/two_factor') ||
        url.includes('/challenge') ||
        url.includes('/checkpoint') ||
        url.includes('/register') ||
        url.includes('/oauth')
      ) {
        return false;
      }

      // Đã vào bất kỳ trang nào khác của Strava (dashboard, feed, onboarding, athletes, v.v.)
      return true;
    }

    // Chờ phát hiện đăng nhập thành công
    await new Promise((resolve, reject) => {
      let isResolved = false;

      const finish = (reason) => {
        if (isResolved) return;
        isResolved = true;
        if (interval) clearInterval(interval);
        if (timeout) clearTimeout(timeout);
        console.log(`✅ [XÁC NHẬN ĐĂNG NHẬP THÀNH CÔNG] Lý do: ${reason}`);
        resolve();
      };

      const fail = (err) => {
        if (isResolved) return;
        isResolved = true;
        if (interval) clearInterval(interval);
        if (timeout) clearTimeout(timeout);
        reject(err);
      };

      // Timeout 5 phút
      const timeout = setTimeout(() => {
        fail(new Error('Timeout: Đăng nhập quá 5 phút. Vui lòng thử lại.'));
      }, 300000);

      // 1. Lắng nghe event điều hướng trên trang chính
      page.on('framenavigated', (frame) => {
        try {
          if (frame === page.mainFrame()) {
            const u = frame.url();
            if (isSuccessUrl(u)) finish(`Điều hướng trang chính: ${u}`);
          }
        } catch (_) {}
      });

      // 2. Lắng nghe mọi tab/cửa sổ mới mở ra (Google/Facebook OAuth)
      browser.on('targetcreated', async (target) => {
        try {
          if (target.type() === 'page') {
            const newP = await target.page();
            if (newP) {
              newP.on('framenavigated', (frame) => {
                try {
                  if (frame === newP.mainFrame()) {
                    const u = frame.url();
                    if (isSuccessUrl(u)) finish(`Điều hướng tab phụ: ${u}`);
                  }
                } catch (_) {}
              });
            }
          }
        } catch (_) {}
      });

      // 3. Polling dự phòng mỗi 500ms CHỈ ĐỌC page.url() (đồng bộ, tuyệt đối không await p.title() để không bị treo)
      let checkCount = 0;
      const interval = setInterval(async () => {
        if (isResolved) return;
        checkCount++;

        try {
          if (!browser.isConnected()) {
            const saved = getSavedCookie();
            if (saved) {
              finish('Trình duyệt đóng và đã phát hiện cookie');
            } else {
              fail(new Error('Cửa sổ trình duyệt đã bị đóng trước khi hoàn tất đăng nhập.'));
            }
            return;
          }

          const pages = await browser.pages();
          for (const p of pages) {
            const u = p.url(); // Thuộc tính đồng bộ, chạy tức thì
            if (isSuccessUrl(u)) {
              finish(`Phát hiện URL thành công: ${u}`);
              return;
            }
          }

          if (checkCount % 6 === 0) {
            console.log(`[CHECK_LOGIN] Đang chờ đăng nhập... URLs: ${pages.map(p => p.url()).join(' | ')}`);
          }
        } catch (_) {}
      }, 500);
    });

    console.log(`✅ Đăng nhập Strava thành công! Đang lưu cookie và đóng Chrome...`);
    
    // Đợi 2 giây để Strava hoàn tất lưu cookie (tăng từ 1.5s)
    await new Promise(r => setTimeout(r, 2000));

    // Thu thập TẤT CẢ cookies bằng CDP Network.getAllCookies() — hoạt động đúng cả khi đăng nhập Google OAuth
    let allCookies = [];
    try {
      const openPages = await browser.pages();
      if (openPages.length > 0) {
        try {
          // Dùng CDP để lấy toàn bộ cookies của browser (không phụ thuộc URL trang)
          const client = await openPages[0].target().createCDPSession();
          const res = await client.send('Network.getAllCookies');
          if (res && res.cookies) allCookies = res.cookies;
        } catch (_) {
          // Fallback: lấy cookies từng tab
          for (const p of openPages) {
            try {
              const c = await p.cookies();
              allCookies.push(...c);
            } catch (_) {}
          }
        }
      }
    } catch (_) {}

    // Khử trùng lặp cookies theo tên
    const cookieMap = new Map();
    for (const c of allCookies) {
      if (c.domain && c.domain.includes('strava.com')) {
        cookieMap.set(c.name, c);
      }
    }
    const uniqueCookies = Array.from(cookieMap.values());

    // Lưu vào tệp Storage/.strava-cookies.json
    try {
      const cookieDir = path.dirname(COOKIE_FILE);
      if (!fs.existsSync(cookieDir)) fs.mkdirSync(cookieDir, { recursive: true });
      fs.writeFileSync(COOKIE_FILE, JSON.stringify({ 
        cookies: uniqueCookies, 
        savedAt: new Date().toISOString() 
      }, null, 2));
      console.log(`💾 Đã lưu ${uniqueCookies.length} cookies vào ${COOKIE_FILE}`);
    } catch (saveErr) {
      console.warn('Lỗi khi ghi cookie file:', saveErr.message);
    }

    console.log(`🍪 [COOKIE_DEBUG] Tổng cookies Strava thu thập được: ${uniqueCookies.length}. Tên: ${uniqueCookies.map(c => c.name).join(', ')}`);
    const sessionCookie = uniqueCookies.find(c => c.name === '_strava4_session');
    if (!sessionCookie) {
      console.warn('⚠️ [COOKIE_DEBUG] Không tìm thấy _strava4_session! Kiểm tra lại quá trình đăng nhập.');
    }
    const cookieValue = sessionCookie ? sessionCookie.value : (uniqueCookies.length > 0 ? uniqueCookies[0].value : '');
    
    // Đóng hoàn toàn trình duyệt Chrome (có timeout và fallback force-kill)
    console.log('🔒 Đang đóng cửa sổ Chrome...');
    try {
      await Promise.race([
        browser.close(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout closing Chrome')), 2500))
      ]);
      console.log('✅ Đã đóng Chrome thành công.');
    } catch (closeErr) {
      console.warn('⚠️ Đang buộc tắt tiến trình Chrome:', closeErr.message);
      try {
        const proc = browser.process();
        if (proc && !proc.killed) {
          proc.kill('SIGKILL');
        }
      } catch (kErr) {
        console.warn('Lỗi kill Chrome process:', kErr.message);
      }
    }

    return cookieValue;
  } catch (error) {
    try { 
      const proc = browser.process();
      if (proc && !proc.killed) proc.kill('SIGKILL');
    } catch(e) {}
    throw error;
  }
}

export async function scrapeClubActivities(clubId, sessionCookie, limit = 50) {
  const browserPath = getBrowserExecutable();
  if (!browserPath) {
    throw new Error('Không tìm thấy trình duyệt Google Chrome hoặc Microsoft Edge trên máy tính của bạn.');
  }

  const browser = await puppeteer.launch({
    executablePath: browserPath,
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
      
      // Nhận diện chính xác bộ môn (Run, TrailRun, VirtualRun, v.v.)
      let rawType = act.sport_type || act.sportType || act.type || act.activityType || 'Run';
      let activityType = 'Run';
      if (typeof rawType === 'string') {
        const lower = rawType.toLowerCase().replace(/[\s_-]/g, '');
        if (lower.includes('trail')) {
          activityType = 'TrailRun';
        } else if (lower.includes('virtual')) {
          activityType = 'VirtualRun';
        } else if (lower.includes('run')) {
          activityType = 'Run';
        } else {
          activityType = rawType;
        }
      }

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
      let rawDistanceStat = null;
      let rawElevStat = null;
      
      if (act.stats && Array.isArray(act.stats)) {
        act.stats.forEach(stat => {
          const key = stat.key || '';
          if (key.includes('_subtitle')) return;
          const value = stat.value ? String(stat.value).replace(/<[^>]*>?/gm, '').trim() : '';
          const subtitleStat = act.stats.find(s => s.key === key + '_subtitle');
          const subtitle = subtitleStat && subtitleStat.value ? String(subtitleStat.value).toLowerCase() : '';
          
          if (subtitle.includes('distance') || subtitle.includes('khoảng cách')) {
            distance = value;
            rawDistanceStat = stat.value;
          } else if (subtitle.includes('time') || subtitle.includes('thời gian')) {
            time = value;
          } else if (subtitle.includes('elev') || subtitle.includes('độ cao')) {
            elev = value;
            rawElevStat = stat.value;
          }
        });
        
        if (distance === '0' && time === '0') {
          const stat1 = act.stats.find(s => s.key === 'stat_one');
          const stat3 = act.stats.find(s => s.key === 'stat_three');
          if (stat1) {
            distance = stat1.value ? String(stat1.value).replace(/<[^>]*>?/gm, '').trim() : '';
            rawDistanceStat = stat1.value;
          }
          if (stat3) time = stat3.value ? String(stat3.value).replace(/<[^>]*>?/gm, '').trim() : '';
        }
      }
      
      // Tự động nhận diện đơn vị và quy đổi sang Kilomet (KM)
      // Strava có thể trả về 'mi' (miles/dặm) hoặc 'km' hoặc 'm' tùy thiết lập của tài khoản đang cào
      let numDistance = 0;
      const distStrToCheck = (rawDistanceStat ? String(rawDistanceStat) : String(distance)).toLowerCase();
      const isMiles = distStrToCheck.includes('mile') || distStrToCheck.includes(' mi') || distStrToCheck.includes('>mi<') || distStrToCheck.includes('> mi<') || distStrToCheck.includes('dặm');
      const isKm = distStrToCheck.includes('kilometer') || distStrToCheck.includes('km') || distStrToCheck.includes('kilomét') || distStrToCheck.includes('ki-lô-mét');
      const isMeters = !isMiles && !isKm && (distStrToCheck.includes('meter') || distStrToCheck.includes(' m<') || distStrToCheck.includes('>m<') || distStrToCheck.endsWith(' m') || distStrToCheck.includes(' mét'));

      if (distance) {
        const cleaned = distance.toString().replace(/,/g, '.').replace(/[^0-9.]/g, ' ').trim().split(/\s+/)[0];
        numDistance = parseFloat(cleaned);
        if (!isNaN(numDistance)) {
          if (isMiles) {
            numDistance = numDistance * 1.609344;
          } else if (isMeters) {
            numDistance = numDistance / 1000;
          }
          numDistance = Math.round(numDistance * 100) / 100;
          distance = `${numDistance.toFixed(2)} km`;
        }
      }
      
      // Xử lý độ cao (elevation) nếu đơn vị là ft (feet) -> mét
      if (elev && elev !== '0') {
        const elevStrToCheck = (rawElevStat ? String(rawElevStat) : String(elev)).toLowerCase();
        const isFeet = elevStrToCheck.includes('ft') || elevStrToCheck.includes('feet');
        const cleanedElev = elev.toString().replace(/,/g, '').replace(/[^0-9.]/g, ' ').trim().split(/\s+/)[0];
        let numElev = parseFloat(cleanedElev);
        if (!isNaN(numElev)) {
          if (isFeet) numElev = Math.round(numElev * 0.3048);
          else numElev = Math.round(numElev);
          elev = `${numElev} m`;
        }
      }
      
      // Bỏ qua các hoạt động có khoảng cách < 0.05 km
      if (isNaN(numDistance) || numDistance < 0.05) {
        return;
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

    const savedCookies = getAllSavedCookies();
    if (savedCookies && savedCookies.length > 0) {
      await page.setCookie(...savedCookies);
      console.log(`🍪 Đã inject ${savedCookies.length} cookies từ file đã lưu`);
    } else if (sessionCookie && sessionCookie !== 'session_saved') {
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
      try {
        if (fs.existsSync(COOKIE_FILE)) fs.unlinkSync(COOKIE_FILE);
      } catch (_) {}
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
        const entries = props?.appContext?.preFetchedEntries || props?.preFetchedEntries || props?.feed?.entries || props?.entries;
        if (entries) {
          parseEntries(entries);
        }
      } catch (e) {}
    }

    // Scroll to fetch more if limit > runCount
    let noNewDataCount = 0;
    const maxEmptyScrolls = 10; // Tối đa 10 lần cuộn không có dữ liệu mới
    
    let getRunCount = () => Array.from(allActivities.values()).filter(a => {
      const t = (a.type || '').toLowerCase();
      return ['run', 'virtualrun', 'trailrun', 'trail run'].includes(t) || t.includes('run') || t.includes('trail');
    }).length;
    let runCount = getRunCount();

    while (runCount < limit && noNewDataCount < maxEmptyScrolls) {
      const prevSize = allActivities.size;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 2000)); // Chờ 2s để API load
      
      if (allActivities.size === prevSize) {
        noNewDataCount++;
      } else {
        noNewDataCount = 0;
      }
      
      runCount = getRunCount();
      console.log(`Đang cuộn lấy thêm dữ liệu: ${runCount}/${limit} Run/TrailRun (Tổng act: ${allActivities.size})`);
    }

    await browser.close();
    
    // Convert to array and return all. The caller will filter and slice.
    return Array.from(allActivities.values());
  } catch (error) {
    try { await browser.close(); } catch(e) {}
    throw error;
  }
}

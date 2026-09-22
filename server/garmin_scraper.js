/**
 * Garmin Connect Web Scraper (Biometrics Auto-Scraper)
 * Tự động cào dữ liệu sức khỏe sinh học từ Garmin Connect bằng Puppeteer-Core
 * 
 * Các chỉ số sinh học:
 * - Giấc ngủ: Thời gian ngủ thực tế, Điểm số giấc ngủ (Sleep Score)
 * - Nhịp tim nghỉ: Resting Heart Rate (RHR)
 * - Biến thiên nhịp tim: HRV Status & HRV ms (Firstbeat rmSSD)
 * - Năng lượng cơ thể: Body Battery & Mức độ Stress
 * 
 * Tuân thủ Quy tắc 6: Mọi phiên đăng nhập và dữ liệu gắn chặt với Strava Athlete ID.
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBrowserExecutable } from './scraper.js';
import { saveGarminHealth } from './garmin_health_service.js';
import { parseGarminRawJsonObject } from './garmin_parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.join(__dirname, '..', 'Storage');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Trả về đường dẫn lưu trữ cookies Garmin theo Athlete ID (Rule #6)
 */
export function getGarminCookieFile(athleteId) {
  if (!athleteId) throw new Error('Athlete ID is required for Garmin cookie storage (Rule #6)');
  return path.join(STORAGE_DIR, `.garmin-cookies-${athleteId}.json`);
}

/**
 * Lấy danh sách cookie đã lưu của Vận động viên
 */
export function getSavedGarminCookies(athleteId) {
  try {
    const file = getGarminCookieFile(athleteId);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.cookies)) {
        return data.cookies;
      }
    }
  } catch (err) {
    console.error(`[GarminScraper] Error reading cookies for athlete ${athleteId}:`, err);
  }
  return [];
}

/**
 * Lấy trạng thái kết nối tài khoản Garmin của Vận động viên
 */
export function getGarminSessionStatus(athleteId) {
  if (!athleteId) return { connected: false, athleteId: null };

  const file = getGarminCookieFile(athleteId);
  if (!fs.existsSync(file)) {
    return { connected: false, athleteId: String(athleteId), savedAt: null };
  }

  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    const cookies = data.cookies || [];
    // Kiểm tra các cookie nhận diện phiên đăng nhập Garmin Connect
    const hasSession = cookies.some(c => 
      c.name.includes('SESSION') || 
      c.name.includes('GARMIN-SSO-GUID') || 
      c.name.includes('JWT_USER_TOKEN') ||
      c.name.includes('oauth_token')
    );

    return {
      connected: cookies.length > 0 && hasSession,
      athleteId: String(athleteId),
      savedAt: data.savedAt || null,
      cookiesCount: cookies.length
    };
  } catch (err) {
    return { connected: false, athleteId: String(athleteId), error: err.message };
  }
}

/**
 * Trích xuất cookie Garmin trực tiếp từ Chrome đang chạy qua CDP port 9222 (nếu có)
 */
export async function extractGarminCookiesFromActiveBrowser(athleteId, cdpPort = 9222) {
  if (!athleteId) return false;
  try {
    const browser = await puppeteer.connect({ 
      browserURL: `http://127.0.0.1:${cdpPort}`,
      defaultViewport: null 
    });
    
    const pages = await browser.pages();
    if (pages.length === 0) {
      await browser.disconnect();
      return false;
    }

    const client = await pages[0].target().createCDPSession();
    const res = await client.send('Network.getAllCookies');
    await browser.disconnect();

    if (res && res.cookies && res.cookies.length > 0) {
      const garminCookies = res.cookies.filter(c => c.domain && c.domain.includes('garmin.com'));
      const hasSession = garminCookies.some(c => 
        c.name.includes('SESSION') || 
        c.name.includes('GARMIN-SSO-GUID') || 
        c.name.includes('JWT_USER_TOKEN') ||
        c.name.includes('oauth_token')
      );

      if (garminCookies.length > 0 && hasSession) {
        const cookieFile = getGarminCookieFile(athleteId);
        fs.writeFileSync(cookieFile, JSON.stringify({
          athleteId: String(athleteId),
          cookies: garminCookies,
          savedAt: new Date().toISOString()
        }, null, 2), 'utf8');
        console.log(`[GarminScraper] Đã tự động bắt ${garminCookies.length} cookies Garmin từ Chrome đang mở cho Athlete #${athleteId}!`);
        return true;
      }
    }
  } catch (_) {}
  return false;
}

/**
 * Mở Chrome để người dùng đăng nhập Garmin Connect 1 lần duy nhất.
 * Tự động bắt cookies khi vào Dashboard / Modern và lưu theo Athlete ID.
 */
export async function loginGarminSession(athleteId) {
  if (!athleteId) throw new Error('Athlete ID is mandatory (Rule #6)');

  // 1. Thử tự động bắt cookie từ Chrome đang mở nếu có
  try {
    const autoCaptured = await extractGarminCookiesFromActiveBrowser(athleteId);
    if (autoCaptured) {
      return {
        success: true,
        athleteId: String(athleteId),
        message: 'Đã tự động kết nối với phiên Garmin Connect từ trình duyệt Chrome đang mở!'
      };
    }
  } catch (_) {}

  const browserPath = getBrowserExecutable();
  if (!browserPath) {
    throw new Error('Không tìm thấy trình duyệt Google Chrome hoặc Edge trên máy tính!');
  }

  const profileDir = path.join(STORAGE_DIR, `garmin_profile_${athleteId}`);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  console.log(`[GarminScraper] Mở trình duyệt để Athlete #${athleteId} đăng nhập Garmin Connect...`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: false,
      defaultViewport: null,
      userDataDir: profileDir,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = (await browser.pages())[0] || (await browser.newPage());
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    );
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Mở trang đăng nhập Garmin Connect
    await page.goto('https://connect.garmin.com/signin', { credentials: 'omit', waitUntil: 'domcontentloaded' });

    // Lắng nghe và chờ người dùng đăng nhập thành công
    const maxWaitTime = 180000; // 3 phút
    const pollInterval = 1500;
    const startTime = Date.now();

    let saved = false;

    while (Date.now() - startTime < maxWaitTime) {
      const isStillConnected = typeof browser.isConnected === 'function' ? browser.isConnected() : browser.connected;
      if (!isStillConnected) {
        throw new Error('Trình duyệt đã bị đóng trước khi hoàn tất đăng nhập.');
      }

      const currentPages = await browser.pages();
      for (const p of currentPages) {
        const url = p.url();
        // Khi URL đã chuyển sang connect.garmin.com/app/home, /modern hoặc dashboard
        const isAtGarminApp = url.includes('connect.garmin.com/app') || 
                              url.includes('connect.garmin.com/modern') || 
                              url.includes('/dashboard') || 
                              url.includes('/home');

        if (isAtGarminApp) {
          // Lấy cookies
          const client = await p.target().createCDPSession();
          const { cookies } = await client.send('Network.getAllCookies');
          const garminCookies = cookies.filter(c => c.domain && c.domain.includes('garmin.com'));

          const hasValidSession = garminCookies.some(c => 
            c.name.includes('SESSION') || 
            c.name.includes('GARMIN-SSO-GUID') || 
            c.name.includes('JWT_USER_TOKEN') ||
            c.name.includes('oauth_token')
          );

          if (garminCookies.length > 0 && hasValidSession) {
            const cookieFile = getGarminCookieFile(athleteId);
            fs.writeFileSync(
              cookieFile,
              JSON.stringify({
                athleteId: String(athleteId),
                cookies: garminCookies,
                savedAt: new Date().toISOString()
              }, null, 2),
              'utf8'
            );
            console.log(`[GarminScraper] Đã bắt thành công ${garminCookies.length} cookies cho Athlete #${athleteId}!`);
            saved = true;
            break;
          }
        }
      }

      if (saved) break;
      await new Promise(r => setTimeout(r, pollInterval));
    }

    await browser.close();

    if (!saved) {
      throw new Error('Hết thời gian chờ đăng nhập Garmin Connect (3 phút). Vui lòng thử lại!');
    }

    return {
      success: true,
      athleteId: String(athleteId),
      message: 'Đã liên kết tài khoản Garmin Connect thành công!'
    };
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    throw err;
  }
}

/**
 * Tự động cào dữ liệu sinh học Garmin Connect theo ngày cho Athlete ID
 * @param {string|number} athleteId
 * @param {string} targetDate - Định dạng YYYY-MM-DD (Mặc định hôm nay)
 */
export async function scrapeGarminBiometrics(athleteId, targetDate) {
  if (!athleteId) throw new Error('Athlete ID is mandatory (Rule #6)');

  const dateStr = targetDate || new Date().toISOString().split('T')[0];
  const cookies = getSavedGarminCookies(athleteId);

  if (!cookies || cookies.length === 0) {
    throw new Error('Chưa đăng nhập Garmin Connect. Vui lòng bấm "Đăng nhập Garmin Connect" trước!');
  }

  const browserPath = getBrowserExecutable();
  if (!browserPath) {
    throw new Error('Không tìm thấy trình duyệt Google Chrome hoặc Edge trên hệ thống!');
  }

  console.log(`[GarminScraper] Bắt đầu tự động cào dữ liệu Garmin cho Athlete #${athleteId} ngày ${dateStr}...`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true, // Chạy ngầm
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    );

    // Bơm cookies đã lưu vào phiên duyệt
    const client = await page.target().createCDPSession();
    for (const c of cookies) {
      try {
        await client.send('Network.setCookie', {
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path || '/',
          secure: c.secure || false,
          httpOnly: c.httpOnly || false,
          sameSite: c.sameSite || 'Lax',
          expires: c.expires > 0 ? c.expires : undefined
        });
      } catch (_) {}
    }

    // Điều hướng vào Garmin Connect App Home để kích hoạt session context
    await page.goto('https://connect.garmin.com/app/home', {
      waitUntil: 'domcontentloaded',
      timeout: 35000
    });

    const currentUrl = page.url();
    // Nếu bị chuyển hướng về trang signin -> Phiên đã hết hạn
    if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
      await browser.close();
      throw new Error('Phiên đăng nhập Garmin Connect đã hết hạn. Vui lòng bấm "Đăng nhập Garmin Connect" để xác thực lại!');
    }

    // Chờ 2s để các script nội bộ của Garmin sẵn sàng
    await new Promise(r => setTimeout(r, 2000));

    // Thực thi các lệnh fetch authenticated nội tại của trang để tránh bị Cloudflare/CORS chặn
    const rawData = await page.evaluate(async (d) => {
      const out = { date: d };

      const safeFetch = async (urls) => {
        for (const u of urls) {
          try {
            const res = await fetch(u, { headers: { 'Accept': 'application/json', 'NK': 'NT' } });
            if (res && res.ok) return await res.json();
          } catch (_) {}
        }
        return null;
      };

      // 1. Giấc ngủ (Sleep Data)
      out.sleep = await safeFetch([
        `/modern/proxy/wellness-service/wellness/dailySleepData?date=${d}`,
        `/wellness-service/wellness/dailySleepData?date=${d}`
      ]);

      // 2. Nhịp tim nghỉ ngơi (Resting Heart Rate)
      out.heartRate = await safeFetch([
        `/modern/proxy/wellness-service/wellness/dailyHeartRate?date=${d}`,
        `/wellness-service/wellness/dailyHeartRate?date=${d}`
      ]);

      // 3. Năng lượng & Stress (Body Battery & Daily Stress)
      out.stress = await safeFetch([
        `/modern/proxy/wellness-service/wellness/dailyStress/${d}`,
        `/wellness-service/wellness/dailyStress/${d}`,
        `/modern/proxy/wellness-service/wellness/dailyStress?date=${d}`
      ]);

      // 4. Biến thiên nhịp tim (HRV)
      out.hrv = await safeFetch([
        `/modern/proxy/hrv-service/hrv/${d}`,
        `/hrv-service/hrv/${d}`
      ]);

      // 5. User Summary
      out.summary = await safeFetch([
        `/modern/proxy/usersummary-service/usersummary/daily?calendarDate=${d}`,
        `/usersummary-service/usersummary/daily?calendarDate=${d}`
      ]);

      return out;
    }, dateStr);

    await browser.close();

    // Gom dữ liệu vào đối tượng chuẩn Garmin
    const combinedObject = {
      date: dateStr,
      dailySleepDTO: rawData.sleep?.dailySleepDTO || rawData.sleep,
      dailyHeartRateDTO: rawData.heartRate,
      restingHeartRate: rawData.heartRate?.restingHeartRate || rawData.summary?.restingHeartRate || rawData.sleep?.dailySleepDTO?.restingHeartRate,
      bodyBatteryValuesArray: rawData.stress?.bodyBatteryValuesArray,
      overallStressLevel: rawData.stress?.overallStressLevel || rawData.summary?.overallStressLevel,
      hrvSummary: rawData.hrv?.hrvSummary || rawData.hrv,
      userSummaryDTO: rawData.summary
    };

    const normalized = parseGarminRawJsonObject(combinedObject);
    normalized.source = 'garmin_auto_scrape';

    // Lưu vào kho dữ liệu theo athleteId (Rule #6)
    const savedRecord = saveGarminHealth(athleteId, normalized);

    console.log(`[GarminScraper] Cào thành công dữ liệu ngày ${dateStr} cho Athlete #${athleteId}:`, normalized);

    return {
      success: true,
      athleteId: String(athleteId),
      date: dateStr,
      data: normalized,
      health: savedRecord
    };
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    console.error(`[GarminScraper] Lỗi cào dữ liệu cho Athlete #${athleteId}:`, err);
    throw err;
  }
}

/**
 * Xóa session cookies của Vận động viên (Đăng xuất Garmin Connect)
 */
export function disconnectGarminSession(athleteId) {
  if (!athleteId) return false;
  try {
    const file = getGarminCookieFile(athleteId);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`[GarminScraper] Đã xóa cookies Garmin của Athlete #${athleteId}`);
      return true;
    }
  } catch (err) {
    console.error(`[GarminScraper] Lỗi xóa cookies cho Athlete #${athleteId}:`, err);
  }
  return false;
}

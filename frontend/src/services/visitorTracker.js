/**
 * visitorTracker.js - Dịch vụ theo dõi lượt truy cập và nhịp tim (Heartbeat)
 * Hỗ trợ nhận diện thiết bị (iPhone, Android, Windows, Mac), định danh khách vãng lai,
 * và gửi heartbeat định kỳ về Render Cloud backend.
 */

// Hàm tạo UUID v4 đơn giản không phụ thuộc thư viện ngoài
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Lấy hoặc khởi tạo Visitor ID duy nhất lưu vĩnh viễn trong localStorage
function getOrCreateVisitorId() {
  if (typeof window === 'undefined') return 'server_render';
  try {
    let vid = localStorage.getItem('strava_visitor_id');
    if (!vid) {
      vid = `v_${generateUUID().substring(0, 13)}`;
      localStorage.setItem('strava_visitor_id', vid);
    }
    return vid;
  } catch (_) {
    return `v_anon_${Date.now()}`;
  }
}

// Phân tích thông tin thiết bị, hệ điều hành và trình duyệt từ userAgent
export function detectDeviceInfo() {
  if (typeof window === 'undefined' || !window.navigator) {
    return { deviceType: 'Desktop', deviceModel: 'Unknown Device', browser: 'Browser', os: 'Unknown' };
  }

  const ua = navigator.userAgent || '';
  const uaLower = ua.toLowerCase();

  // 1. Phân loại thiết bị (Mobile hay Desktop)
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(uaLower) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /macintosh/i.test(uaLower)); // iPadOS

  const deviceType = isMobile ? 'Mobile' : 'Desktop';

  // 2. Nhận diện Hệ điều hành (OS)
  let os = 'Unknown OS';
  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/cros/i.test(ua)) os = 'ChromeOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // 3. Nhận diện Trình duyệt (Browser)
  let browser = 'Browser';
  if (/zalo/i.test(uaLower)) browser = 'Zalo In-App';
  else if (/fbav|fban|facebook/i.test(uaLower)) browser = 'Facebook App';
  else if (/edg/i.test(uaLower)) browser = 'Edge';
  else if (/crios|chrome/i.test(uaLower)) browser = 'Chrome';
  else if (/safari/i.test(uaLower) && !/chrome|crios/i.test(uaLower)) browser = 'Safari';
  else if (/firefox|fxios/i.test(uaLower)) browser = 'Firefox';
  else if (/opera|opr/i.test(uaLower)) browser = 'Opera';

  // 4. Chuỗi tóm tắt thiết bị thân thiện
  const isPwa = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || 
    window.navigator.standalone === true;

  let deviceModel = `${os} (${browser}${isPwa ? ' PWA' : ''})`;
  if (isMobile) {
    if (/iphone/i.test(ua)) deviceModel = `iPhone (${browser}${isPwa ? ' PWA' : ''})`;
    else if (/ipad/i.test(ua)) deviceModel = `iPad (${browser})`;
    else if (/android/i.test(ua)) deviceModel = `Android (${browser})`;
  }

  return {
    deviceType,
    deviceModel,
    browser,
    os,
    isPwa: Boolean(isPwa)
  };
}

let trackerInitialized = false;
let heartbeatTimer = null;
let currentTrackerOptions = {};

/**
 * Khởi động theo dõi phiên truy cập ngầm
 * @param {Object} options - { athlete, athleteId }
 */
export function initVisitorTracker(options = {}) {
  if (typeof window === 'undefined') return;
  currentTrackerOptions = { ...currentTrackerOptions, ...options };

  if (trackerInitialized) {
    // Nếu đã khởi tạo rồi, chỉ cập nhật danh tính nếu có
    updateVisitorIdentity(currentTrackerOptions);
    return;
  }
  trackerInitialized = true;

  const visitorId = getOrCreateVisitorId();
  const deviceInfo = detectDeviceInfo();

  const sendHeartbeat = async (eventType = 'ping') => {
    try {
      const athlete = currentTrackerOptions.athlete || null;
      const athleteId = currentTrackerOptions.athleteId || (athlete?.id ? String(athlete.id) : '');
      const isGuest = !athleteId || athleteId === 'guest' || athlete?.isGuest;

      let athleteName = '';
      if (!isGuest && athlete) {
        athleteName = athlete.name || `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim();
      }

      const avatar = !isGuest && athlete ? (athlete.profile_medium || athlete.profile || null) : null;
      const pathname = window.location.pathname || '/';

      const payload = {
        visitorId,
        athleteId: isGuest ? '' : athleteId,
        athleteName,
        avatar,
        isGuest: Boolean(isGuest),
        deviceType: deviceInfo.deviceType,
        deviceModel: deviceInfo.deviceModel,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        isPwa: deviceInfo.isPwa,
        pathname,
        eventType,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString()
      };

      // Sử dụng fetch không chặn luồng chính
      await fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (_) {
      // Bỏ qua lỗi ngầm để không ảnh hưởng đến trải nghiệm người dùng
    }
  };

  // 1. Gửi nhịp tim đầu tiên ngay khi mở web
  sendHeartbeat('open');

  // 2. Gửi định kỳ mỗi 35 giây
  heartbeatTimer = setInterval(() => {
    // Chỉ gửi khi tab đang mở (document.visibilityState !== 'hidden')
    if (document.visibilityState !== 'hidden') {
      sendHeartbeat('ping');
    }
  }, 35000);

  // 3. Lắng nghe khi người dùng chuyển trang hoặc quay lại tab
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendHeartbeat('focus');
    }
  });

  // 4. Lắng nghe trước khi người dùng đóng trang
  window.addEventListener('pagehide', () => {
    sendHeartbeat('leave');
  });
}

function updateVisitorIdentity(options = {}) {
  // Cập nhật tham chiếu athlete khi người dùng vừa đăng nhập hoặc đổi tài khoản
  if (options.athlete || options.athleteId) {
    try {
      const visitorId = getOrCreateVisitorId();
      const deviceInfo = detectDeviceInfo();
      const athlete = options.athlete;
      const athleteId = options.athleteId || (athlete?.id ? String(athlete.id) : '');
      const isGuest = !athleteId || athleteId === 'guest' || athlete?.isGuest;

      let athleteName = '';
      if (!isGuest && athlete) {
        athleteName = athlete.name || `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim();
      }

      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          athleteId: isGuest ? '' : athleteId,
          athleteName,
          avatar: !isGuest && athlete ? (athlete.profile_medium || athlete.profile || null) : null,
          isGuest: Boolean(isGuest),
          deviceType: deviceInfo.deviceType,
          deviceModel: deviceInfo.deviceModel,
          pathname: window.location.pathname || '/',
          eventType: 'login_update',
          timestamp: new Date().toISOString()
        }),
        keepalive: true
      }).catch(() => {});
    } catch (_) {}
  }
}

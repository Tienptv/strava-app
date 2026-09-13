import { useState, useEffect, useCallback } from 'react';

/**
 * Phân loại kích thước màn hình theo tiêu chuẩn Window Size Classes:
 * - compact: < 375px (iPhone SE, Galaxy Z Flip, Android nhỏ)
 * - standard: 375px - 430px (iPhone 12/13/14/15/16, Galaxy S22/S23/S24, Pixel 7/8)
 * - large: 431px - 600px (iPhone 14/15/16 Pro Max, Galaxy S23/S24 Ultra, Pixel Pro)
 * - tablet: 601px - 1024px (iPad Mini, tablet, hoặc điện thoại xoay ngang)
 * - desktop: > 1024px (Laptop, PC, màn hình rộng)
 */
export function getScreenTier(width) {
  if (width < 375) return 'compact';
  if (width <= 430) return 'standard';
  if (width <= 600) return 'large';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

/**
 * Đọc thông số thiết bị hiện tại một cách an toàn (SSR/Client compatible)
 */
export function readDeviceSpecs() {
  if (typeof window === 'undefined') {
    return {
      width: 1200,
      height: 800,
      dpr: 1,
      screenTier: 'desktop',
      orientation: 'landscape',
      isMobile: false,
      isCompactPhone: false,
      isStandardPhone: false,
      isLargePhone: false,
      isTablet: false,
      isDesktop: true,
      isLandscape: true,
      isPortrait: false,
      isTouchDevice: false,
      isIOS: false,
      isAndroid: false,
      hasNotch: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const orientation = width > height ? 'landscape' : 'portrait';
  const screenTier = getScreenTier(width);

  const isTouchDevice = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const hasNotch = isIOS && (Math.max(width, height) >= 812);

  return {
    width,
    height,
    dpr,
    screenTier,
    orientation,
    isMobile: width <= 768,
    isCompactPhone: screenTier === 'compact',
    isStandardPhone: screenTier === 'standard',
    isLargePhone: screenTier === 'large',
    isTablet: screenTier === 'tablet',
    isDesktop: screenTier === 'desktop',
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
    isTouchDevice,
    isIOS,
    isAndroid,
    hasNotch,
  };
}

/**
 * Hook tự động nhận diện và đồng bộ thông số màn hình lên root DOM HTML
 */
export function useDeviceScreen() {
  const [specs, setSpecs] = useState(readDeviceSpecs);

  const updateSpecs = useCallback(() => {
    const next = readDeviceSpecs();
    setSpecs(next);

    // Đồng bộ thuộc tính vào <html data-...> để CSS nhận diện và co giãn trực tiếp
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-screen-tier', next.screenTier);
      root.setAttribute('data-orientation', next.orientation);
      root.setAttribute('data-dpr', Math.round(next.dpr).toString());
      root.setAttribute('data-is-mobile', next.isMobile ? 'true' : 'false');
      if (next.isIOS) {
        root.setAttribute('data-platform', 'ios');
      } else if (next.isAndroid) {
        root.setAttribute('data-platform', 'android');
      } else {
        root.setAttribute('data-platform', 'desktop');
      }

      // Đặt biến CSS --app-height xử lý triệt để lỗi 100vh trên Safari/Chrome Mobile
      root.style.setProperty('--app-height', `${next.height}px`);
      root.style.setProperty('--app-width', `${next.width}px`);
    }
  }, []);

  useEffect(() => {
    updateSpecs();

    const handleResize = () => updateSpecs();
    const handleOrientationChange = () => {
      // Đợi ngắn 100ms để kích thước viewport ổn định sau khi màn hình xoay
      setTimeout(updateSpecs, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });

    // Hỗ trợ visualViewport API cho thanh bàn phím ảo và toolbar thu phóng
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [updateSpecs]);

  return specs;
}

export default useDeviceScreen;

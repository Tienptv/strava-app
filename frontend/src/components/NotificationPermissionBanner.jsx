import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import { Share, PlusSquare, BellRing, X, User, Check } from 'lucide-react';
import Swal from 'sweetalert2';

// Hàm chuẩn hóa VAPID Public Key từ Base64 sang Uint8Array (Bắt buộc cho Web Push API)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const NotificationPermissionBanner = ({ apiFetch, athleteId, athlete }) => {
  const { lang, t } = useLang();

  // Kiểm tra an toàn cho môi trường duyệt web
  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window;
  const isServiceWorkerSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
  const isPushSupported = typeof window !== 'undefined' && 'PushManager' in window;

  const [permission, setPermission] = useState(() => {
    return isNotificationSupported ? Notification.permission : 'unsupported';
  });
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [visible, setVisible] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  // Danh bạ thành viên CLB để chọn danh tính khi ở chế độ Khách
  const [roster, setRoster] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(() => {
    try {
      const saved = localStorage.getItem('linked_athlete');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [showPicker, setShowPicker] = useState(false);

  const isGuest = !athleteId || athleteId === 'guest' || athlete?.isGuest;

  useEffect(() => {
    // Kiểm tra thiết bị iOS
    const userAgent = typeof window !== 'undefined' && window.navigator ? window.navigator.userAgent.toLowerCase() : '';
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Kiểm tra đang chạy ở chế độ PWA (Standalone) hay Browser
    const isPwa = typeof window !== 'undefined' && (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || 
      window.navigator.standalone === true
    );
    setIsStandalone(Boolean(isPwa));

    // Kiểm tra nếu người dùng đã từng bấm tắt banner
    const closed = localStorage.getItem('hide_notification_banner');
    if (closed === 'true') {
      setVisible(false);
    }

    // Tự động đồng bộ Push Token nếu quyền đã được cấp trước đó và là VĐV đã đăng nhập
    if (!isGuest && permission === 'granted' && isPushSupported && isServiceWorkerSupported) {
      syncPushSubscription();
    }
  }, [isGuest, permission, isPushSupported, isServiceWorkerSupported]);

  // Hàm tự động đồng bộ push subscription khi mở app
  const syncPushSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration || !registration.pushManager) return;

      let subscription = await registration.pushManager.getSubscription();
      const rawVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BNv3stD9r4G1c1d7Yf8EsDrNNPpP3M8aR3lx-vP-5vEe3vbIyDym9DyZ-JfVV8H18026BE3A6sIj9PvUlMl-FVA';
      const applicationServerKey = urlBase64ToUint8Array(rawVapidKey);

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
      }

      const targetId = athleteId || athlete?.id || '';
      const targetName = athlete?.name || (athlete?.firstname ? `${athlete.firstname} ${athlete.lastname || ''}`.trim() : '');
      const targetKey = athlete?.matchKey || '';

      const ua = navigator.userAgent;
      let deviceName = 'Mobile Device';
      if (/android/i.test(ua)) deviceName = 'Android Chrome';
      else if (/iphone|ipad|ipod/i.test(ua)) deviceName = isStandalone ? 'iPhone PWA' : 'iPhone Safari';
      else if (/windows/i.test(ua)) deviceName = 'Windows PC';
      else if (/macintosh/i.test(ua)) deviceName = 'Mac';

      if (targetId && targetId !== 'guest') {
        await apiFetch('/wpn/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            subscription,
            athleteId: targetId,
            athleteName: targetName,
            athleteKey: targetKey,
            device: deviceName
          })
        });
        console.log(`[WPN] Tự động đồng bộ Push Token thành công cho ${targetName} (${deviceName})`);
      }
    } catch (err) {
      console.warn('[WPN] Auto-sync push warning:', err.message);
    }
  };

  const handleSubscribe = async () => {
    if (!isNotificationSupported || !isServiceWorkerSupported || !isPushSupported) {
      Swal.fire({
        title: lang === 'en' ? '⚠️ Not Supported' : '⚠️ Trình duyệt chưa hỗ trợ',
        text: lang === 'en' 
          ? 'Web Push Notifications are not supported in this browser. Please use Chrome on Android or Add to Home Screen on iOS.' 
          : 'Trình duyệt này chưa hỗ trợ Web Push. Vui lòng mở bằng Chrome (Android) hoặc Thêm vào MH chính (iOS).',
        icon: 'warning',
        confirmButtonColor: '#00A3A6'
      });
      return;
    }

    setSubscribing(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        const rawVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BNv3stD9r4G1c1d7Yf8EsDrNNPpP3M8aR3lx-vP-5vEe3vbIyDym9DyZ-JfVV8H18026BE3A6sIj9PvUlMl-FVA';
        const applicationServerKey = urlBase64ToUint8Array(rawVapidKey);

        const registration = await navigator.serviceWorker.ready;
        if (!registration || !registration.pushManager) {
          throw new Error('PushManager not available on service worker registration');
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });

        // Xác định danh tính VĐV
        const targetId = athleteId || athlete?.id || '';
        const targetName = athlete?.name || (athlete?.firstname ? `${athlete.firstname} ${athlete.lastname || ''}`.trim() : '');
        const targetKey = athlete?.matchKey || '';

        // Tên thiết bị thân thiện
        const ua = navigator.userAgent;
        let deviceName = 'Mobile Device';
        if (/android/i.test(ua)) deviceName = 'Android Chrome';
        else if (/iphone|ipad|ipod/i.test(ua)) deviceName = isStandalone ? 'iPhone PWA' : 'iPhone Safari';
        else if (/windows/i.test(ua)) deviceName = 'Windows PC';
        else if (/macintosh/i.test(ua)) deviceName = 'Mac';

        // Gửi subscription lên server
        const subRes = await apiFetch('/wpn/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            subscription,
            athleteId: targetId,
            athleteName: targetName,
            athleteKey: targetKey,
            device: deviceName
          })
        });

        if (subRes && subRes.success) {
          Swal.fire({
            title: `🎉 ${t('phoneNotificationsEnabled')}`,
            text: t('phoneNotificationsDesc').replace('{name}', targetName || (lang === 'en' ? 'your account' : 'bạn')),
            icon: 'success',
            showCancelButton: true,
            confirmButtonColor: '#00A3A6',
            cancelButtonColor: '#64748b',
            confirmButtonText: lang === 'en' ? '🚀 Send Test Push' : '🚀 Bắn thử thông báo',
            cancelButtonText: lang === 'en' ? 'Close' : 'Đóng'
          }).then(async (result) => {
            if (result.isConfirmed) {
              await apiFetch('/wpn/send', {
                method: 'POST',
                body: JSON.stringify({
                  targetId: targetId,
                  athleteName: targetName,
                  title: '🏃 Haskoning Running Club',
                  body: lang === 'en' ? '🎉 Notifications successfully connected to PC Admin!' : '🎉 Thông báo đã kết nối thành công với Ban Quản Trị!',
                  url: '/'
                })
              });
            }
          });
          setVisible(false);
          localStorage.removeItem('hide_notification_banner');
        } else {
          throw new Error(subRes?.error || 'Failed to save subscription on server');
        }
      } else if (permissionResult === 'denied') {
        Swal.fire({
          title: lang === 'en' ? '⚠️ Permission Denied' : '⚠️ Quyền thông báo bị từ chối',
          text: lang === 'en'
            ? 'You have blocked notifications. Please go to your browser settings to allow notifications for this site.'
            : 'Bạn đã chặn thông báo. Vui lòng vào Cài đặt trình duyệt để cho phép trang này gửi thông báo.',
          icon: 'warning',
          confirmButtonColor: '#00A3A6'
        });
      }
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
      Swal.fire({
        title: lang === 'en' ? '⚠️ Subscription Error' : '⚠️ Lỗi kích hoạt thông báo',
        text: err.message || (lang === 'en' ? 'Could not subscribe to push notifications.' : 'Không thể đăng ký nhận thông báo.'),
        icon: 'error',
        confirmButtonColor: '#00A3A6'
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('hide_notification_banner', 'true');
  };

  // Người dùng yêu cầu: Nếu ở chế độ Guest thì tạm hold, không cần nhận thông báo
  if (isGuest) return null;

  if (!visible) return null;
  if (permission === 'granted' && !isIOS) return null;
  if (isStandalone && permission === 'granted') return null;

  return (
    <div className="notification-banner" style={{
      background: 'linear-gradient(135deg, #002D54 0%, #00A3A6 100%)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '12px',
      margin: '12px 16px',
      boxShadow: '0 4px 14px rgba(0, 163, 166, 0.28)',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <BellRing size={22} style={{ flexShrink: 0, color: '#78BE20' }} />
          <div style={{ minWidth: 0 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, letterSpacing: '0.01em' }}>
              {isIOS && !isStandalone ? t('installPwaTitle') : t('enableNotifications')}
            </h4>
            <div style={{ margin: 0, fontSize: '12.5px', opacity: 0.95, lineHeight: 1.4 }}>
              {isIOS && !isStandalone ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    {t('installPwaGuidePrefix')} <Share size={14} style={{ verticalAlign: 'middle' }} /> {t('installPwaGuideMid')} <b>{t('installPwaGuideAction')}</b> <PlusSquare size={14} style={{ verticalAlign: 'middle' }} />
                  </span>
                  <span style={{ fontSize: '11px', opacity: 0.8, fontStyle: 'italic' }}>
                    {t('installPwaDismissHint')}
                  </span>
                </div>
              ) : (
                t('enableNotificationsDesc')
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          {(!isIOS || isStandalone) && isNotificationSupported && (
            <button 
              onClick={handleSubscribe}
              disabled={subscribing}
              style={{
                background: '#78BE20',
                color: 'white',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(120, 190, 32, 0.4)',
                opacity: subscribing ? 0.7 : 1,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {subscribing ? (lang === 'en' ? 'Enabling...' : 'Đang bật...') : t('enable')}
            </button>
          )}
          <button 
            onClick={handleClose}
            title={t('dismiss')}
            aria-label={t('dismiss')}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;

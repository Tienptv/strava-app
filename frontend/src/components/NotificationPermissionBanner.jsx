import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import { Share, PlusSquare, BellRing, X } from 'lucide-react';

const NotificationPermissionBanner = ({ apiFetch, athleteId }) => {
  const { t } = useLang();
  
  // Kiểm tra an toàn cho môi trường duyệt web (Safari iOS không hỗ trợ window.Notification trực tiếp)
  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window;
  const isServiceWorkerSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
  const isPushSupported = typeof window !== 'undefined' && 'PushManager' in window;

  const [permission, setPermission] = useState(() => {
    return isNotificationSupported ? Notification.permission : 'unsupported';
  });
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Kiểm tra thiết bị iOS
    const userAgent = typeof window !== 'undefined' && window.navigator ? window.navigator.userAgent.toLowerCase() : '';
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Kiểm tra đang chạy ở chế độ Phím tắt (PWA / Standalone) hay Trình duyệt web thông thường
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
  }, []);

  const handleSubscribe = async () => {
    if (!isNotificationSupported || !isServiceWorkerSupported || !isPushSupported) {
      console.warn('Web Push Notifications are not supported in this browser environment.');
      return;
    }
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult === 'granted') {
        const applicationServerKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const registration = await navigator.serviceWorker.ready;
        if (!registration || !registration.pushManager) {
          console.warn('PushManager not available on service worker registration');
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });

        // Gửi subscription lên server
        await apiFetch('/wpn/subscribe', {
          method: 'POST',
          body: JSON.stringify({ subscription, athleteId })
        });
        
        console.log('Subscribed to Push Notifications successfully');
        setVisible(false);
      }
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
    }
  };

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('hide_notification_banner', 'true');
  };

  if (!visible) return null;
  // Đã cấp quyền trên PC / Android -> không cần hiện banner
  if (permission === 'granted' && !isIOS) return null;
  // Trên iOS PWA (Shortcut) và đã được cấp quyền -> không cần hiện banner
  if (isStandalone && permission === 'granted') return null;

  return (
    <div className="notification-banner" style={{
      background: 'linear-gradient(135deg, #002D54 0%, #00A3A6 100%)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '10px',
      margin: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 14px rgba(0, 163, 166, 0.28)',
      position: 'relative',
      overflow: 'hidden',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1, flex: 1, minWidth: 0 }}>
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
      
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', zIndex: 1, marginLeft: '12px', flexShrink: 0 }}>
        {(!isIOS || isStandalone) && isNotificationSupported && (
          <button 
            onClick={handleSubscribe}
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
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {t('enable')}
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
  );
};

export default NotificationPermissionBanner;


import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import { CheckCircle, AlertCircle, Share, PlusSquare, BellRing, X } from 'lucide-react';

const NotificationPermissionBanner = ({ apiFetch, athleteId }) => {
  const { t } = useLang();
  const [permission, setPermission] = useState(Notification.permission);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Check if it's iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if running as PWA / Standalone
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(isPwa);

    // Check localStorage if user closed the banner manually
    const closed = localStorage.getItem('hide_notification_banner');
    if (closed === 'true') {
      setVisible(false);
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult === 'granted') {
        // Lấy public key từ env
        const applicationServerKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const registration = await navigator.serviceWorker.ready;
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
  if (permission === 'granted' && !isIOS) return null; // Đã cấp quyền, trên PC/Android ko hiện
  if (isStandalone && permission === 'granted') return null; // Trên iOS PWA và đã có quyền

  return (
    <div className="notification-banner" style={{
      background: 'linear-gradient(135deg, #002D54 0%, #00A3A6 100%)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      margin: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 14px rgba(0, 163, 166, 0.35)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
        <BellRing size={24} style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>
            {isIOS && !isStandalone ? t('installPwaTitle') || 'Cài đặt ứng dụng để nhận thông báo' : t('enableNotifications') || 'Bật thông báo'}
          </h4>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
            {isIOS && !isStandalone 
              ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  Bấm <Share size={14} /> dưới màn hình Safari, chọn <b>Thêm vào MH chính</b> <PlusSquare size={14} />
                </span>
              ) 
              : t('enableNotificationsDesc') || 'Không bỏ lỡ cảnh báo và cập nhật quan trọng từ HRC.'}
          </p>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', zIndex: 1 }}>
        {(!isIOS || isStandalone) && (
          <button 
            onClick={handleSubscribe}
            style={{
              background: '#78BE20',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(120, 190, 32, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            {t('enable') || 'Bật'}
          </button>
        )}
        <button 
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            opacity: 0.7,
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;

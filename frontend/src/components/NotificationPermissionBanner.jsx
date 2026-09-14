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

    // Tải danh bạ VĐV nếu ở chế độ khách
    if (isGuest) {
      fetch('/api/wpn/athletes-roster')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && Array.isArray(data.roster)) {
            setRoster(data.roster);

            // Tự động phát hiện nếu người dùng đã từng ghim VĐV trên Bảng xếp hạng
            try {
              const saved = localStorage.getItem('linked_athlete');
              if (!saved) {
                const pinned = JSON.parse(localStorage.getItem('pinnedRunners') || '[]');
                if (pinned.length > 0) {
                  const match = data.roster.find(m => m.name === pinned[0] || m.matchKey === pinned[0]);
                  if (match) {
                    setSelectedAthlete(match);
                    localStorage.setItem('linked_athlete', JSON.stringify(match));
                  }
                }
              }
            } catch (_) {}
          }
        })
        .catch(() => {});
    }
  }, [isGuest]);

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
        let targetId = athleteId;
        let targetName = athlete?.name || (athlete?.firstname ? `${athlete.firstname} ${athlete.lastname || ''}`.trim() : '');
        let targetKey = athlete?.matchKey || '';

        if (isGuest) {
          if (selectedAthlete) {
            targetId = selectedAthlete.id || selectedAthlete.athleteId || selectedAthlete.name;
            targetName = selectedAthlete.name;
            targetKey = selectedAthlete.matchKey || selectedAthlete.name;
          } else {
            targetId = 'guest';
            targetName = 'Khách Xem';
          }
        }

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
            confirmButtonColor: '#00A3A6'
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

  const handleSelectAthlete = (item) => {
    setSelectedAthlete(item);
    if (item) {
      localStorage.setItem('linked_athlete', JSON.stringify(item));
    } else {
      localStorage.removeItem('linked_athlete');
    }
    setShowPicker(false);
  };

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

      {/* Mục chọn danh tính khi ở chế độ Khách */}
      {isGuest && (!isIOS || isStandalone) && (
        <div style={{
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.18)',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={13} style={{ color: '#78BE20' }} />
            <span>{t('receivingFor')}</span>
            <span style={{ fontWeight: 800, color: '#fbbf24' }}>
              {selectedAthlete ? selectedAthlete.name : (lang === 'en' ? 'All Club' : 'Chung toàn CLB')}
            </span>
          </div>

          <button
            onClick={() => setShowPicker(v => !v)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {t('changeRecipient')}
          </button>

          {showPicker && (
            <div style={{ width: '100%', marginTop: '6px' }}>
              <select
                value={selectedAthlete ? selectedAthlete.name : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    handleSelectAthlete(null);
                  } else {
                    const found = roster.find(m => m.name === val);
                    handleSelectAthlete(found || { name: val });
                  }
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  background: '#fff',
                  color: '#002D54',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <option value="">{t('generalBroadcastOnly')}</option>
                {roster.map(m => (
                  <option key={m.id || m.name} value={m.name}>
                    🏃 {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPermissionBanner;

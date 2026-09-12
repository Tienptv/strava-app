import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

const CHECK_INTERVAL_MS = 3 * 60 * 1000; // 3 phút kiểm tra 1 lần

export function useAutoUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersionInfo, setNewVersionInfo] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const isUpdatingRef = useRef(false);

  const performReload = useCallback((targetBuildId) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    if (targetBuildId) {
      localStorage.setItem('app_build_id', targetBuildId);
    }
    // Hard reload - giữ nguyên athleteId, athlete trong localStorage
    window.location.reload();
  }, []);

  const checkVersion = useCallback(async () => {
    // Nếu đang chuẩn bị reload thì bỏ qua
    if (isUpdatingRef.current) return;

    try {
      const res = await fetch(`/api/app/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (!res.ok) return;

      const data = await res.json();
      if (!data || !data.buildId) return;

      const currentLocalBuildId = localStorage.getItem('app_build_id');

      // 1. Lần đầu tiên người dùng vào web: lưu lại buildId hiện tại
      if (!currentLocalBuildId) {
        localStorage.setItem('app_build_id', data.buildId);
        if (data.version) localStorage.setItem('appVersion', data.version);
        return;
      }

      // 2. Nếu phát hiện buildId trên Server khác với buildId trên Client
      if (currentLocalBuildId !== data.buildId) {
        console.log(`[Auto-Update] Phát hiện mã nguồn mới trên Cloud! Local: ${currentLocalBuildId} -> Server: ${data.buildId}`);
        setNewVersionInfo(data);
        setUpdateAvailable(true);
      }
    } catch (err) {
      // Bỏ qua lỗi kết nối tạm thời khi offline hoặc mạng gián đoạn
      console.debug('[Auto-Update] Check error (ignored):', err.message);
    }
  }, []);

  // Tầng 1: Kiểm tra khi vừa tải trang
  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  // Tầng 2: Kiểm tra khi người dùng mở khóa điện thoại hoặc quay lại tab trình duyệt
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    const handleFocus = () => {
      checkVersion();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkVersion]);

  // Tầng 3: Heartbeat định kỳ mỗi 3 phút
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [checkVersion]);

  // Đếm ngược 3 giây tự động reload khi có update
  useEffect(() => {
    if (!updateAvailable || !newVersionInfo) return;

    let timer = 3;
    const interval = setInterval(() => {
      timer -= 1;
      setCountdown(timer);
      if (timer <= 0) {
        clearInterval(interval);
        performReload(newVersionInfo.buildId);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [updateAvailable, newVersionInfo, performReload]);

  return {
    updateAvailable,
    newVersionInfo,
    countdown,
    reloadNow: () => performReload(newVersionInfo?.buildId)
  };
}

/**
 * Toast thông báo tự động làm mới giao diện
 */
export function AutoUpdateToast({ updateAvailable, countdown, newVersionInfo, onReloadNow }) {
  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '1.5px solid #00A3A6',
        borderRadius: '16px',
        padding: '12px 20px',
        boxShadow: '0 12px 30px rgba(0, 163, 166, 0.35), 0 4px 10px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        color: '#ffffff',
        fontFamily: 'inherit',
        maxWidth: '92vw',
        width: 'max-content',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(0, 163, 166, 0.2)',
          border: '1px solid rgba(0, 163, 166, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2dd4bf',
          flexShrink: 0
        }}
      >
        <Sparkles size={18} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Phiên bản mới đã sẵn sàng!</span>
          {newVersionInfo?.version && (
            <span style={{ fontSize: '0.75rem', background: '#00A3A6', padding: '1px 6px', borderRadius: '8px', color: '#fff' }}>
              v{newVersionInfo.version}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Tự động cập nhật sau <strong style={{ color: '#38bdf8' }}>{countdown}s</strong> (giữ nguyên đăng nhập)
        </div>
      </div>

      <button
        onClick={onReloadNow}
        style={{
          background: 'linear-gradient(135deg, #00A3A6 0%, #007A7C 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          padding: '8px 14px',
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(0, 163, 166, 0.4)',
          whiteSpace: 'nowrap',
          marginLeft: '4px'
        }}
      >
        <RefreshCw size={14} className="animate-spin" />
        <span>Làm mới</span>
      </button>
    </div>
  );
}

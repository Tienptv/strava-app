import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Radio, Smartphone, Monitor, Users, RefreshCw, Trash2, Search, 
  Eye, Clock, Globe, Shield, Activity, Sparkles, AlertCircle, CheckCircle2, ChevronRight, ExternalLink
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useLang } from '../i18n/LangContext';

export default function LiveVisitorsTool({ apiFetch, isSuperAdmin }) {
  const { lang, t } = useLang();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    onlineNow: 0,
    mobileToday: 0,
    desktopToday: 0,
    totalToday: 0,
    totalTracked: 0
  });
  const [sessions, setSessions] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'online' | 'mobile' | 'desktop'
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(15);

  const countdownTimerRef = useRef(null);

  // Tải dữ liệu từ server
  const fetchLiveVisitors = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await apiFetch('/admin/live-visitors');
      if (res && res.success) {
        setStats(res.stats || {
          onlineNow: 0,
          mobileToday: 0,
          desktopToday: 0,
          totalToday: 0,
          totalTracked: 0
        });
        setSessions(res.sessions || []);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu người truy cập:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [apiFetch]);

  // Khởi tạo và chu kỳ auto-refresh 15 giây
  useEffect(() => {
    fetchLiveVisitors();
  }, [fetchLiveVisitors]);

  useEffect(() => {
    if (!autoRefresh) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    setCountdown(15);
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchLiveVisitors();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [autoRefresh, fetchLiveVisitors]);

  // Xóa lịch sử phiên truy cập
  const handleClearHistory = async () => {
    const result = await Swal.fire({
      title: t('confirmClearVisitorsTitle'),
      text: t('confirmClearVisitorsText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: t('clearHistory'),
      cancelButtonText: t('cancel') || (lang === 'en' ? 'Cancel' : 'Hủy')
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch('/admin/live-visitors', { method: 'DELETE' });
        if (res && res.success) {
          Swal.fire({
            icon: 'success',
            title: lang === 'en' ? 'Cleared!' : 'Đã dọn sạch!',
            text: res.message || (lang === 'en' ? 'Visitor sessions cleared successfully.' : 'Đã dọn dẹp lịch sử người truy cập.'),
            timer: 2000,
            showConfirmButton: false
          });
          fetchLiveVisitors();
        }
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: lang === 'en' ? 'Error' : 'Lỗi',
          text: err.message
        });
      }
    }
  };

  // Helper format thời gian
  const formatTimeAgo = (secondsAgo) => {
    if (secondsAgo === undefined || secondsAgo === null) return '';
    if (secondsAgo < 60) return t('justNow');
    const minutes = Math.floor(secondsAgo / 60);
    if (minutes < 60) {
      return (t('minutesAgo') || '{minutes}m ago').replace('{minutes}', minutes);
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return (t('hoursAgo') || '{hours}h ago').replace('{hours}', hours);
    }
    const days = Math.floor(hours / 24);
    return `${days} ${lang === 'en' ? 'days ago' : 'ngày trước'}`;
  };

  const formatClockTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '--:--';
    }
  };

  const formatPageName = (pathname) => {
    if (!pathname || pathname === '/') return lang === 'en' ? 'Dashboard (/)' : 'Trang chủ (/)';
    if (pathname.includes('/leaderboard')) return lang === 'en' ? 'Leaderboard (/leaderboard)' : 'Bảng xếp hạng (/leaderboard)';
    if (pathname.includes('/administer')) return lang === 'en' ? 'Admin Panel (/administer)' : 'Trang Quản trị (/administer)';
    if (pathname.includes('/ai-coach')) return lang === 'en' ? 'AI Coach (/ai-coach)' : 'Huấn luyện viên AI (/ai-coach)';
    if (pathname.includes('/activities')) return lang === 'en' ? 'Activities (/activities)' : 'Hoạt động (/activities)';
    return pathname;
  };

  // Lọc và tìm kiếm danh sách
  const filteredSessions = sessions.filter(session => {
    // 1. Lọc theo tab/loại
    if (filterType === 'online' && !session.isOnline) return false;
    if (filterType === 'mobile' && session.deviceType !== 'Mobile') return false;
    if (filterType === 'desktop' && session.deviceType === 'Mobile') return false;

    // 2. Tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (session.athleteName || '').toLowerCase();
      const visitorId = (session.visitorId || '').toLowerCase();
      const device = (session.deviceModel || '').toLowerCase();
      const browser = (session.browser || '').toLowerCase();
      const ip = (session.ip || '').toLowerCase();
      const lastPage = (session.lastPage || '').toLowerCase();
      return name.includes(q) || visitorId.includes(q) || device.includes(q) || browser.includes(q) || ip.includes(q) || lastPage.includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. HEADER & CONTROLS */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '14px',
        background: '#ffffff',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 6px rgba(0, 45, 84, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 163, 166, 0.15) 0%, rgba(0, 45, 84, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)'
          }}>
            <Radio size={24} className={stats.onlineNow > 0 ? "pulse-icon" : ""} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t('liveVisitorsTitle')}
              {stats.onlineNow > 0 && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                  {stats.onlineNow} {lang === 'en' ? 'LIVE' : 'TRỰC TUYẾN'}
                </span>
              )}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('liveVisitorsSubtitle')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: autoRefresh ? 'var(--accent)' : 'var(--border)',
              background: autoRefresh ? 'rgba(0, 163, 166, 0.08)' : '#f8fafc',
              color: autoRefresh ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title={lang === 'en' ? 'Toggle 15s auto-refresh' : 'Bật/tắt tự động làm mới mỗi 15s'}
          >
            <Clock size={15} />
            <span>{autoRefresh ? `${t('autoRefresh15s')} (${countdown}s)` : (lang === 'en' ? 'Auto-refresh off' : 'Tự động làm mới: Tắt')}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchLiveVisitors(true)}
            disabled={refreshing}
            className="btn btn--secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={15} className={refreshing ? "spin" : ""} />
            <span>{t('refreshNow')}</span>
          </button>

          {/* Clear History */}
          {isSuperAdmin && (
            <button
              onClick={handleClearHistory}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                background: '#fff5f5',
                color: '#dc2626',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={t('clearHistory')}
            >
              <Trash2 size={15} />
              <span>{t('clearHistory')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THREE KEY KPI CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: 🟢 Đang Online */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 4px 14px rgba(34, 197, 94, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
              {t('onlineNow')}
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--primary-navy)', lineHeight: 1.1, margin: '8px 0 4px' }}>
              {stats.onlineNow}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 500 }}>
              {t('onlineNowDesc')}
            </div>
          </div>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 6px 16px rgba(34, 197, 94, 0.3)'
          }}>
            <Radio size={26} />
          </div>
        </div>

        {/* Card 2: 📱 Lượt xem điện thoại hôm nay */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 163, 166, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)',
          border: '1px solid rgba(0, 163, 166, 0.3)',
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 4px 14px rgba(0, 163, 166, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smartphone size={16} />
              {t('mobileToday')}
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--primary-navy)', lineHeight: 1.1, margin: '8px 0 4px' }}>
              {stats.mobileToday}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#0e7490', fontWeight: 500 }}>
              {t('mobileTodayDesc')}
            </div>
          </div>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 6px 16px rgba(0, 163, 166, 0.3)'
          }}>
            <Smartphone size={26} />
          </div>
        </div>

        {/* Card 3: 👥 Tổng lượt truy cập hôm nay */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 45, 84, 0.06) 0%, rgba(255, 255, 255, 0.95) 100%)',
          border: '1px solid rgba(0, 45, 84, 0.2)',
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 4px 14px rgba(0, 45, 84, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} />
              {t('totalVisitorsToday')}
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--primary-navy)', lineHeight: 1.1, margin: '8px 0 4px' }}>
              {stats.totalToday}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {t('totalVisitorsTodayDesc')}
            </div>
          </div>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #002D54 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 6px 16px rgba(0, 45, 84, 0.25)'
          }}>
            <Users size={26} />
          </div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH TOOLBAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid var(--border)'
      }}>
        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterType === 'all' ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: filterType === 'all' ? 'var(--accent)' : '#ffffff',
              color: filterType === 'all' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {(t('filterAll') || 'Tất cả ({count})').replace('{count}', sessions.length)}
          </button>

          <button
            onClick={() => setFilterType('online')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterType === 'online' ? '1px solid #16a34a' : '1px solid var(--border)',
              background: filterType === 'online' ? '#16a34a' : '#ffffff',
              color: filterType === 'online' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {(t('filterOnlineOnly') || '🟢 Đang Online ({count})').replace('{count}', stats.onlineNow)}
          </button>

          <button
            onClick={() => setFilterType('mobile')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterType === 'mobile' ? '1px solid #0284c7' : '1px solid var(--border)',
              background: filterType === 'mobile' ? '#0284c7' : '#ffffff',
              color: filterType === 'mobile' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {(t('filterMobileOnly') || '📱 Điện thoại ({count})').replace('{count}', sessions.filter(s => s.deviceType === 'Mobile').length)}
          </button>

          <button
            onClick={() => setFilterType('desktop')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterType === 'desktop' ? '1px solid #475569' : '1px solid var(--border)',
              background: filterType === 'desktop' ? '#475569' : '#ffffff',
              color: filterType === 'desktop' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {(t('filterDesktopOnly') || '💻 Máy tính ({count})').replace('{count}', sessions.filter(s => s.deviceType !== 'Mobile').length)}
          </button>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 260px', maxWidth: '380px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder={t('searchVisitorsPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              background: '#f8fafc',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* 4. SESSIONS LIST (CARD VIEW - RESPONSIVE MOBILE FIRST) */}
      {loading ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)'
        }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px', color: 'var(--accent)' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>{lang === 'en' ? 'Loading live visitor sessions...' : 'Đang tải danh sách người truy cập...'}</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          border: '1px dashed #cbd5e1'
        }}>
          <Radio size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ margin: '0 0 6px', color: 'var(--primary-navy)', fontSize: '1rem', fontWeight: 700 }}>
            {searchQuery ? t('noVisitorsFiltered') : t('noVisitorsFound')}
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {lang === 'en' ? 'When runners open the Render link, their sessions will appear here in real-time.' : 'Khi thành viên mở đường link Render trên điện thoại, thông tin sẽ xuất hiện tại đây tức thì.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredSessions.map((session, idx) => {
            const isOnline = session.isOnline;
            const isGuest = session.isGuest !== false && !session.athleteId;
            const isMobile = session.deviceType === 'Mobile';

            return (
              <div 
                key={session.visitorId || idx}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: isOnline ? '1.5px solid #86efac' : '1px solid var(--border)',
                  boxShadow: isOnline 
                    ? '0 4px 16px rgba(34, 197, 94, 0.12)' 
                    : '0 2px 6px rgba(0, 45, 84, 0.03)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Online Left Accent Bar */}
                {isOnline && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '4px',
                    background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)'
                  }} />
                )}

                {/* Top Row: Avatar, Identity, Online Badge, Time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  
                  {/* Left: Avatar & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      {session.avatar ? (
                        <img 
                          src={session.avatar} 
                          alt={session.athleteName || 'User'} 
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: isOnline ? '2.5px solid #22c55e' : '2px solid #cbd5e1'
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: isGuest 
                            ? 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)' 
                            : 'linear-gradient(135deg, rgba(0, 163, 166, 0.2) 0%, rgba(0, 45, 84, 0.2) 100%)',
                          color: isGuest ? '#64748b' : 'var(--primary-navy)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          border: isOnline ? '2.5px solid #22c55e' : '2px solid transparent'
                        }}>
                          {session.athleteName ? session.athleteName.charAt(0).toUpperCase() : (isMobile ? '📱' : '👤')}
                        </div>
                      )}

                      {/* Online Status Dot */}
                      {isOnline && (
                        <span style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '13px',
                          height: '13px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          border: '2px solid #ffffff',
                          boxShadow: '0 0 6px #22c55e'
                        }} />
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                          {session.athleteName || `${lang === 'en' ? 'Guest' : 'Khách'} #${(session.visitorId || '').slice(-6)}`}
                        </span>

                        {/* Guest / Member Tag */}
                        {isGuest ? (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#f1f5f9',
                            color: '#64748b'
                          }}>
                            {t('guestVisitor')}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(0, 163, 166, 0.1)',
                            color: 'var(--accent)'
                          }}>
                            {t('memberVisitor')}
                          </span>
                        )}

                        {/* PWA Badge */}
                        {session.isPwa && (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            background: 'rgba(120, 190, 32, 0.15)',
                            color: '#4d7c0f',
                            border: '1px solid rgba(120, 190, 32, 0.3)'
                          }}>
                            PWA App
                          </span>
                        )}
                      </div>

                      {/* Device & Browser info line */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {isMobile ? <Smartphone size={14} color="#0284c7" /> : <Monitor size={14} color="#475569" />}
                        <span style={{ fontWeight: 600, color: isMobile ? '#0369a1' : '#334155' }}>
                          {session.deviceModel || (isMobile ? 'Mobile' : 'Desktop')}
                        </span>
                        {session.browser && (
                          <span>• {session.browser} ({session.os || 'OS'})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Pill & Time Ago */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {isOnline ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: '#dcfce7',
                        color: '#15803d',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: '1px solid #86efac'
                      }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                        {t('onlineNowBadge')}
                      </span>
                    ) : (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        color: '#64748b',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        border: '1px solid var(--border)'
                      }}>
                        {(t('offlineBadge') || 'Rời đi {time}').replace('{time}', formatTimeAgo(session.secondsAgo))}
                      </span>
                    )}

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {lang === 'en' ? 'Last active' : 'Cập nhật'}: {formatClockTime(session.lastSeen)}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Page viewed & Details */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  background: '#f8fafc',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #f1f5f9',
                  fontSize: '0.8rem'
                }}>
                  {/* Current Page */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-navy)' }}>
                    <Eye size={15} color="var(--accent)" />
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('viewingPage')}</span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: 'var(--primary-navy)',
                      background: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0'
                    }}>
                      {formatPageName(session.lastPage)}
                    </span>
                  </div>

                  {/* Duration & Views */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-secondary)' }}>
                    {session.durationMinutes && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} color="#64748b" />
                        <span>{(t('durationMinutes') || '{minutes} phút').replace('{minutes}', session.durationMinutes)}</span>
                      </span>
                    )}

                    {session.firstSeen && (
                      <span>
                        {t('firstSeenLabel')} <b>{formatClockTime(session.firstSeen)}</b>
                      </span>
                    )}

                    {session.ip && isSuperAdmin && (
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }} title="Client IP">
                        IP: {session.ip}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

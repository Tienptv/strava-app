import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, ShieldAlert, Users } from 'lucide-react';
import NotificationPermissionBanner from './components/NotificationPermissionBanner';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClubView from './pages/ClubView';
import Administer from './pages/Administer';
import NextGenDashboard from './pages/NextGenDashboard';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useLang } from './i18n/LangContext';
import { APP_VERSION } from './config/version';
import { useAutoUpdate, AutoUpdateToast } from './utils/useAutoUpdate';
import { useDeviceScreen } from './utils/useDeviceScreen';
import { initVisitorTracker } from './services/visitorTracker';
import Swal from 'sweetalert2';

const API_BASE = '/api';

function App() {
  const [athlete, setAthlete] = useState(null);
  const [athleteId, setAthleteId] = useState(localStorage.getItem('athleteId'));
  const [loading, setLoading] = useState(true);
  const [challengeMonth, setChallengeMonth] = useState(new Date().getMonth() + 1);
  const [challengeYear, setChallengeYear] = useState(new Date().getFullYear());
  const [userRoles, setUserRoles] = useState({ isSuperAdmin: false, isSubAdmin: false, isAdmin: false });
  const [userAccessConfig, setUserAccessConfig] = useState(null);
  const { t, lang } = useLang();
  const { isMobile } = useDeviceScreen();

  // Tự động kiểm tra phiên bản mới từ Render Cloud và reload mượt mà
  const { updateAvailable, newVersionInfo, countdown, reloadNow } = useAutoUpdate();

  // Kiểm tra đã đăng nhập chưa hoặc có cờ Guest Mode
  useEffect(() => {
    const storedAppVersion = localStorage.getItem('appVersion');
    if (storedAppVersion !== APP_VERSION) {
      localStorage.setItem('appVersion', APP_VERSION);
    }

    const isGuestQuery = window.location.search.includes('guest=') || window.location.pathname === '/leaderboard';
    const isGuestStored = localStorage.getItem('isGuest') === 'true';

    const storedId = localStorage.getItem('athleteId');
    const storedAthlete = localStorage.getItem('athlete');
    if (storedId && storedAthlete && storedId !== 'guest') {
      setAthleteId(storedId);
      setAthlete(JSON.parse(storedAthlete));
    } else if (isGuestQuery || isGuestStored) {
      const guestAthlete = { id: 'guest', firstname: 'Khách', lastname: 'Xem', isGuest: true, profile_medium: null };
      setAthleteId('guest');
      setAthlete(guestAthlete);
      localStorage.setItem('isGuest', 'true');
    }
    setLoading(false);
  }, []);

  // Khởi chạy theo dõi phiên truy cập trực tiếp (Live Visitor Heartbeat Tracker)
  useEffect(() => {
    initVisitorTracker({ athlete, athleteId });
  }, [athlete, athleteId]);

  // Đăng nhập nhanh chế độ Khách (Xem công khai trên Render / điện thoại)
  const handleGuestLogin = () => {
    const guestAthlete = { id: 'guest', firstname: 'Khách', lastname: 'Xem', isGuest: true, profile_medium: null };
    setAthleteId('guest');
    setAthlete(guestAthlete);
    localStorage.setItem('isGuest', 'true');
  };

  // Đăng nhập dành cho Thành viên (Phương án 3: Dropdown tên + Passcode CLB)
  const handleMemberLogin = (athleteData) => {
    if (!athleteData || !athleteData.id) return;
    const id = String(athleteData.id);
    setAthleteId(id);
    setAthlete(athleteData);
    localStorage.removeItem('isGuest');
    localStorage.setItem('athleteId', id);
    localStorage.setItem('athlete', JSON.stringify(athleteData));
    localStorage.setItem('isMemberVerified', 'true');
  };

  // Hàm gọi API có kèm athlete ID
  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-athlete-id': athleteId || '',
        ...options.headers,
      },
    });
    if (!res.ok) {
      if (res.status === 401 && athleteId !== 'guest') {
        handleLogout();
        throw new Error(t('sessionExpired'));
      }
      let errorMsg = `API error: ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData && errorData.error) {
          errorMsg = errorData.error;
        }
      } catch (_) {}
      throw new Error(errorMsg);
    }
    return res.json();
  }, [athleteId]);

  // Đăng nhập: lấy URL OAuth (hỗ trợ đổi tài khoản Strava thật sự)
  const handleLogin = async (forceSwitch = false) => {
    try {
      const clientOrigin = window.location.origin.includes('127.0.0.1')
        ? window.location.origin.replace('127.0.0.1', 'localhost')
        : window.location.origin;

      if (forceSwitch) {
        // 1. Hiển thị loading nhẹ nhàng (chạy ngầm hoàn toàn, không cần hộp thoại xác nhận)
        Swal.fire({
          title: t('switchAccountLoggingOut'),
          html: `
            <div style="font-size: 0.9rem; color: #475569; margin-top: 8px;">
              ${t('switchAccountRedirecting')}
            </div>
          `,
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // 2. Mở popup logout Strava ngay lập tức trong luồng click để xóa sạch cookie phiên cũ
        const logoutWin = window.open('https://www.strava.com/logout', 'strava_logout_popup', 'width=100,height=100,top=0,left=0');

        // 3. Xóa sạch trạng thái local của app & gọi server logout
        try {
          await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ athleteId }),
          });
        } catch (_) {}

        localStorage.removeItem('athleteId');
        localStorage.removeItem('athlete');
        localStorage.removeItem('isGuest');
        sessionStorage.removeItem('stravaCookie');

        // 4. Lấy URL OAuth từ backend
        const res = await fetch(`${API_BASE}/auth/url?origin=${encodeURIComponent(clientOrigin)}&prompt=force`);
        const data = await res.json();
        if (!data.url) {
          Swal.close();
          return;
        }

        // 5. Sau 1.4s (khi Strava đã hủy session cũ), đóng popup và chuyển hướng thẳng sang trang Strava Login
        setTimeout(() => {
          if (logoutWin && !logoutWin.closed) {
            try { logoutWin.close(); } catch (_) {}
          }
          window.location.href = data.url;
        }, 1400);
        return;
      }

      // Đăng nhập thông thường (không ép đổi tài khoản)
      // Hiển thị hộp thoại hướng dẫn đăng nhập Strava App chính giữa màn hình
      const confirmResult = await Swal.fire({
        title: `<span style="color: var(--primary-navy, #002D54); font-weight: 800; font-size: 1.25rem;">${t('preLoginTitle')}</span>`,
        html: `
          <div style="font-size: 0.95rem; color: #334155; line-height: 1.6; text-align: center; padding: 4px 0;">
            <p style="margin-bottom: 14px; font-weight: 500;">
              ${t('preLoginDesc')}
            </p>
            <div style="background: rgba(0, 163, 166, 0.08); border-left: 4px solid var(--accent, #00A3A6); padding: 10px 14px; border-radius: 8px; font-size: 0.86rem; color: var(--primary-navy, #002D54); text-align: left; line-height: 1.5;">
              ${t('preLoginGuestHint')}
            </div>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: t('preLoginContinueBtn'),
        cancelButtonText: t('preLoginCancelBtn'),
        confirmButtonColor: '#00A3A6',
        cancelButtonColor: '#64748b',
        focusConfirm: true,
        reverseButtons: true,
        position: 'center'
      });

      if (!confirmResult.isConfirmed) {
        return;
      }

      const res = await fetch(`${API_BASE}/auth/url?origin=${encodeURIComponent(clientOrigin)}&prompt=auto`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  // Xử lý callback từ Strava
  const handleCallback = async (code) => {
    try {
      const clientOrigin = window.location.origin.includes('127.0.0.1')
        ? window.location.origin.replace('127.0.0.1', 'localhost')
        : window.location.origin;
      const res = await fetch(`${API_BASE}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, origin: clientOrigin }),
      });
      const data = await res.json();

      if (res.ok && data.athlete) {
        setAthlete(data.athlete);
        setAthleteId(data.athleteId.toString());
        localStorage.setItem('athleteId', data.athleteId.toString());
        localStorage.setItem('athlete', JSON.stringify(data.athlete));

        if (data.cookie) {
          sessionStorage.setItem('stravaCookie', data.cookie);
          window.dispatchEvent(new CustomEvent('cookieUpdated', { detail: data.cookie }));
          // Lưu cookie vào server để scraper Puppeteer inject được
          try {
            await fetch(`${API_BASE}/strava/cookie`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cookie: data.cookie }),
            });
          } catch (_) {}
        }
        return { success: true };
      }

      return {
        success: false,
        isNotAdmin: !!data.isNotAdmin,
        athleteId: data.athleteId || '',
        error: lang === 'en' ? (data.errorEn || data.error) : data.error
      };
    } catch (error) {
      console.error('Callback error:', error);
      return { success: false, error: error.message };
    }
  };

  // Tải vai trò quyền hạn (Roles)
  useEffect(() => {
    if (athleteId && athleteId !== 'guest') {
      apiFetch('/auth/roles')
        .then(roles => {
          if (roles) setUserRoles(roles);
        })
        .catch(err => console.error('Lỗi nạp roles:', err));
    } else {
      setUserRoles({ isSuperAdmin: false, isSubAdmin: false, isAdmin: false });
    }
  }, [athleteId, apiFetch]);

  // Tải ma trận phân quyền tính năng người dùng (User Feature Access Control)
  const refreshUserAccess = useCallback(() => {
    fetch(`${API_BASE}/user-access-control`)
      .then(res => res.json())
      .then(data => {
        if (data && data.config) {
          setUserAccessConfig(data.config);
        }
      })
      .catch(err => console.error('Lỗi nạp user access config:', err));
  }, []);

  useEffect(() => {
    refreshUserAccess();
  }, [refreshUserAccess]);

  // Đăng xuất
  const handleLogout = async () => {
    try {
      if (athleteId && athleteId !== 'guest') {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-athlete-id': athleteId || '',
          },
          body: JSON.stringify({ athleteId }),
        });
      }
    } catch (err) {
      console.warn('Logout API failed:', err);
    }
    setAthlete(null);
    setAthleteId(null);
    setUserRoles({ isSuperAdmin: false, isSubAdmin: false, isAdmin: false });
    localStorage.removeItem('athleteId');
    localStorage.removeItem('athlete');
    localStorage.removeItem('isGuest');
    localStorage.removeItem('isMemberVerified');
    sessionStorage.removeItem('stravaCookie');
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="loading__spinner"></div>
        <div className="loading__text">{t('loading')}</div>
      </div>
    );
  }

  const envSuperAdminIds = (import.meta.env.VITE_ADMIN_STRAVA_ID || '133066813')
    .toString()
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const isSuperAdmin = Boolean(userRoles.isSuperAdmin || (athlete && envSuperAdminIds.includes(athlete.id.toString())));
  const isAdmin = Boolean(userRoles.isAdmin || isSuperAdmin);

  return (
    <BrowserRouter>
      {athlete && <Navbar athlete={athlete} onLogout={handleLogout} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />}
      <div className={athlete ? "app-layout" : ""}>
        {athlete && isAdmin && !isMobile && (
          <Sidebar 
            apiFetch={apiFetch} 
            currentMonth={challengeMonth}
            currentYear={challengeYear}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            permissions={userRoles.permissions}
          />
        )}
        <main className={athlete ? "app-main" : ""}>
          {athlete && <NotificationPermissionBanner apiFetch={apiFetch} athleteId={athleteId} athlete={athlete} />}
          <ErrorBoundary>
            <Routes>
              <Route
                path="/"
                element={
                  athlete
                    ? <Dashboard 
                        athlete={athlete} 
                        isAdmin={isAdmin}
                        isSuperAdmin={isSuperAdmin}
                        apiFetch={apiFetch} 
                        challengeMonth={challengeMonth}
                        challengeYear={challengeYear}
                        setChallengeMonth={setChallengeMonth}
                        setChallengeYear={setChallengeYear}
                        userAccessConfig={userAccessConfig}
                      />
                    : <Login onLogin={handleLogin} onGuestAccess={handleGuestLogin} onMemberLogin={handleMemberLogin} />
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <Dashboard 
                    athlete={athlete || { id: 'guest', firstname: 'Khách', lastname: 'Xem', isGuest: true, profile_medium: null }} 
                    isAdmin={false}
                    isSuperAdmin={false}
                    apiFetch={apiFetch} 
                    challengeMonth={challengeMonth}
                    challengeYear={challengeYear}
                    setChallengeMonth={setChallengeMonth}
                    setChallengeYear={setChallengeYear}
                    userAccessConfig={userAccessConfig}
                  />
                }
              />
              <Route
                path="/nextgen"
                element={
                  athlete
                    ? <NextGenDashboard 
                        athlete={athlete} 
                        isAdmin={isAdmin}
                        isSuperAdmin={isSuperAdmin}
                        apiFetch={apiFetch} 
                        challengeMonth={challengeMonth}
                        challengeYear={challengeYear}
                        setChallengeMonth={setChallengeMonth}
                        setChallengeYear={setChallengeYear}
                        userAccessConfig={userAccessConfig}
                      />
                    : <Navigate to="/" replace />
                }
              />
              <Route
                path="/administer"
                element={
                  athlete && isAdmin
                    ? <Administer 
                        apiFetch={apiFetch} 
                        athlete={athlete} 
                        isSuperAdmin={isSuperAdmin}
                        isAdmin={isAdmin}
                        permissions={userRoles.permissions}
                      />
                    : <Navigate to="/" replace />
                }
              />
              <Route
                path="/callback"
                element={<CallbackHandler onCallback={handleCallback} />}
              />
              <Route
                path="/clubs/:clubId"
                element={
                  athlete
                    ? <ClubView apiFetch={apiFetch} />
                    : <Navigate to="/" replace />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {/* Thông báo tự động làm mới giao diện khi có bản cập nhật mới trên Cloud */}
      <AutoUpdateToast 
        updateAvailable={updateAvailable} 
        countdown={countdown} 
        newVersionInfo={newVersionInfo} 
        onReloadNow={reloadNow} 
      />
    </BrowserRouter>
  );
}

// Component xử lý OAuth callback
function CallbackHandler({ onCallback }) {
  const [status, setStatus] = useState('processing');
  const [errorDetails, setErrorDetails] = useState(null);
  const { t, lang } = useLang();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      onCallback(code).then((result) => {
        if (result && result.success) {
          setStatus('success');
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } else {
          setStatus('error');
          setErrorDetails(result || null);
        }
      });
    } else {
      setStatus('error');
    }
  }, []);

  if (status === 'error' && errorDetails?.isNotAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-main, #f8fafc)',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1.5px solid rgba(239, 68, 68, 0.35)',
          padding: '32px 24px',
          boxShadow: '0 10px 30px rgba(0, 45, 84, 0.12)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            border: '2px solid rgba(220, 38, 38, 0.2)'
          }}>
            <ShieldAlert size={34} />
          </div>

          <h2 style={{
            fontSize: '1.30rem',
            fontWeight: 800,
            color: 'var(--primary-navy, #002D54)',
            margin: '0 0 10px',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            {t('oauthNotAdminTitle')}
          </h2>

          <p style={{
            fontSize: '0.90rem',
            color: '#475569',
            lineHeight: 1.55,
            margin: '0 0 16px'
          }}>
            {t('oauthNotAdminDesc').replace('{id}', errorDetails.athleteId || '')}
          </p>

          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '24px',
            textAlign: 'left',
            fontSize: '0.82rem',
            color: '#92400e',
            lineHeight: 1.5
          }}>
            {lang === 'en'
              ? '🔒 To protect Strava developer limits, your Strava connection was safely revoked. Please return to the login screen and select your name under "Club Member Access".'
              : '🔒 Để bảo vệ hạn mức ứng dụng Strava, quyền kết nối vừa rồi đã được hệ thống tự động hủy an toàn. Bạn chỉ cần quay lại và chọn tên của mình ở mục "Đăng nhập Thành viên CLB".'}
          </div>

          <a
            href="/"
            className="btn btn--primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 22px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.92rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(0, 163, 166, 0.35)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <Users size={18} />
            <span>{t('oauthNotAdminAction')}</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="loading" style={{ minHeight: '100vh' }}>
      {status === 'processing' && (
        <>
          <div className="loading__spinner"></div>
          <div className="loading__text">{t('authenticating')}</div>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: '2.5rem' }}>✅</div>
          <div className="loading__text">{t('loginSuccess')}</div>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: '2.5rem' }}>❌</div>
          <div className="loading__text">{errorDetails?.error || t('authFailed')}</div>
          <a href="/" className="btn btn--secondary" style={{ marginTop: 16 }}>{t('backHome')}</a>
        </>
      )}
    </div>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClubView from './pages/ClubView';
import Administer from './pages/Administer';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useLang } from './i18n/LangContext';
import { APP_VERSION } from './config/version';

const API_BASE = '/api';

function App() {
  const [athlete, setAthlete] = useState(null);
  const [athleteId, setAthleteId] = useState(localStorage.getItem('athleteId'));
  const [loading, setLoading] = useState(true);
  const [challengeMonth, setChallengeMonth] = useState(new Date().getMonth() + 1);
  const [challengeYear, setChallengeYear] = useState(new Date().getFullYear());
  const [userRoles, setUserRoles] = useState({ isSuperAdmin: false, isSubAdmin: false, isAdmin: false });
  const { t } = useLang();

  // Kiểm tra đã đăng nhập chưa hoặc có cờ Guest Mode
  useEffect(() => {
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

  // Đăng nhập nhanh chế độ Khách (Xem công khai trên Render / điện thoại)
  const handleGuestLogin = () => {
    const guestAthlete = { id: 'guest', firstname: 'Khách', lastname: 'Xem', isGuest: true, profile_medium: null };
    setAthleteId('guest');
    setAthlete(guestAthlete);
    localStorage.setItem('isGuest', 'true');
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

  // Đăng nhập: lấy URL OAuth
  const handleLogin = async (forceSwitch = false) => {
    try {
      if (forceSwitch) {
        // Gọi backend xóa cookie/session trình duyệt trước khi mở trang đăng nhập
        try {
          await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ athleteId }),
          });
        } catch (_) {}
      }

      const clientOrigin = window.location.origin.includes('127.0.0.1')
        ? window.location.origin.replace('127.0.0.1', 'localhost')
        : window.location.origin;
      const res = await fetch(`${API_BASE}/auth/url?origin=${encodeURIComponent(clientOrigin)}&prompt=${forceSwitch ? 'force' : 'force'}`);
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

      if (data.athlete) {
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
        return true;
      }
      return false;
    } catch (error) {
      console.error('Callback error:', error);
      return false;
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

  const isSuperAdmin = userRoles.isSuperAdmin || (athlete && import.meta.env.VITE_ADMIN_STRAVA_ID && athlete.id.toString() === import.meta.env.VITE_ADMIN_STRAVA_ID);
  const isAdmin = userRoles.isAdmin || isSuperAdmin;

  return (
    <BrowserRouter>
      {athlete && <Navbar athlete={athlete} onLogout={handleLogout} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />}
      <div className={athlete ? "app-layout" : ""}>
        {athlete && isAdmin && (
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
                    />
                  : <Login onLogin={handleLogin} onGuestAccess={handleGuestLogin} />
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
                />
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
        </main>
      </div>
    </BrowserRouter>
  );
}

// Component xử lý OAuth callback
function CallbackHandler({ onCallback }) {
  const [status, setStatus] = useState('processing');
  const { t } = useLang();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      onCallback(code).then((success) => {
        if (success) {
          setStatus('success');
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } else {
          setStatus('error');
        }
      });
    } else {
      setStatus('error');
    }
  }, []);

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
          <div className="loading__text">{t('authFailed')}</div>
          <a href="/" className="btn btn--secondary" style={{ marginTop: 16 }}>{t('backHome')}</a>
        </>
      )}
    </div>
  );
}

export default App;

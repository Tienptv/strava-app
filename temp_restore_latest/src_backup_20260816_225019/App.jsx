import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClubView from './pages/ClubView';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useLang } from './i18n/LangContext';

const API_BASE = '/api';

function App() {
  const [athlete, setAthlete] = useState(null);
  const [athleteId, setAthleteId] = useState(localStorage.getItem('athleteId'));
  const [loading, setLoading] = useState(true);
  const { t } = useLang();

  // Kiểm tra đã đăng nhập chưa
  useEffect(() => {
    const storedId = localStorage.getItem('athleteId');
    const storedAthlete = localStorage.getItem('athlete');
    if (storedId && storedAthlete) {
      setAthleteId(storedId);
      setAthlete(JSON.parse(storedAthlete));
    }
    setLoading(false);
  }, []);

  // Hàm gọi API có kèm athlete ID
  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-athlete-id': athleteId,
        ...options.headers,
      },
    });
    if (!res.ok) {
      if (res.status === 401) {
        handleLogout();
        throw new Error(t('sessionExpired'));
      }
      throw new Error(`API error: ${res.status}`);
    }
    return res.json();
  }, [athleteId]);

  // Đăng nhập: lấy URL OAuth
  const handleLogin = async () => {
    try {
      const data = await fetch(`${API_BASE}/auth/url`).then(r => r.json());
      window.location.href = data.url;
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  // Xử lý callback từ Strava
  const handleCallback = async (code) => {
    try {
      const data = await fetch(`${API_BASE}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }).then(r => r.json());

      if (data.athlete) {
        setAthlete(data.athlete);
        setAthleteId(data.athleteId.toString());
        localStorage.setItem('athleteId', data.athleteId.toString());
        localStorage.setItem('athlete', JSON.stringify(data.athlete));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Callback error:', error);
      return false;
    }
  };

  // Đăng xuất
  const handleLogout = () => {
    setAthlete(null);
    setAthleteId(null);
    localStorage.removeItem('athleteId');
    localStorage.removeItem('athlete');
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="loading__spinner"></div>
        <div className="loading__text">{t('loading')}</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {athlete && <Navbar athlete={athlete} onLogout={handleLogout} />}
      <div className={athlete ? "app-layout" : ""}>
        {athlete && <Sidebar apiFetch={apiFetch} />}
        <main className={athlete ? "app-main" : ""}>
          <Routes>
            <Route
              path="/"
              element={
                athlete
                  ? <Dashboard athlete={athlete} apiFetch={apiFetch} />
                  : <Login onLogin={handleLogin} />
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

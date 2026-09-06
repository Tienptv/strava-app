import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Shield } from 'lucide-react';
import { useLang } from '../i18n/LangContext';



export default function Navbar({ athlete, onLogout, isAdmin, isSuperAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, switchLang, t } = useLang();

  return (
    <nav className="navbar">
      <div
        className="navbar__brand"
        style={{ cursor: 'pointer' }}
        onClick={() => navigate('/')}
      >
        <div className="navbar__brand-icon">🏃</div>
        Strava Tracker
      </div>

      <div className="navbar__nav">
        <button
          className={`navbar__link ${location.pathname === '/' ? 'navbar__link--active' : ''}`}
          onClick={() => navigate('/')}
        >
          <LayoutDashboard size={16} /> {t('dashboard')}
        </button>

        {isAdmin && (
          <button
            className={`navbar__link ${location.pathname === '/administer' ? 'navbar__link--active' : ''}`}
            onClick={() => navigate('/administer')}
            style={{ 
              color: location.pathname === '/administer' ? 'var(--accent)' : undefined,
              fontWeight: location.pathname === '/administer' ? 700 : undefined
            }}
          >
            <Shield size={16} /> Administrator
          </button>
        )}
      </div>

      <div className="navbar__user">
        {/* Language Switcher */}
        <div className="lang-switcher">
          <button
            className="lang-switcher__text-toggle"
            onClick={() => switchLang(lang === 'en' ? 'vi' : 'en')}
            title={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0, 163, 166, 0.3)',
              borderRadius: '20px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: 800,
              color: 'var(--primary-navy)',
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(0, 163, 166, 0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(0, 163, 166, 0.3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: lang === 'en' ? '1.05rem' : '0.7rem', opacity: lang === 'en' ? 1 : 0.4, transition: 'all 0.3s ease' }}>EN</span>
            <span style={{ fontSize: '0.85rem', opacity: 0.3, fontWeight: 400 }}>/</span>
            <span style={{ fontSize: lang === 'vi' ? '1.05rem' : '0.7rem', opacity: lang === 'vi' ? 1 : 0.4, transition: 'all 0.3s ease' }}>VI</span>
          </button>
        </div>

        {athlete.isGuest ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(0, 163, 166, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px'
            }}>
              🏃
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent, #00A3A6)' }}>
              {lang === 'en' ? 'Guest Viewer' : 'Khách Xem'}
            </span>
            <button 
              className="navbar__logout" 
              onClick={onLogout}
              style={{
                background: 'var(--primary-navy, #002D54)',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {lang === 'en' ? 'Strava Login' : 'Đăng nhập'}
            </button>
          </div>
        ) : (
          <>
            {athlete.profile_medium && (
              <img
                src={athlete.profile_medium}
                alt={athlete.firstname}
                className="navbar__avatar"
              />
            )}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {athlete.firstname} {athlete.lastname}
            </span>
            <button className="navbar__logout" onClick={onLogout}>
              <LogOut size={14} style={{ verticalAlign: 'text-bottom' }} /> {t('logout')}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

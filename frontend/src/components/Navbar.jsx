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
        style={{ cursor: 'pointer', gap: '6px' }}
        onClick={() => navigate('/')}
      >
        <div className="navbar__brand-icon" style={{ background: 'transparent', width: 38, height: 35, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logo-tight.webp" alt="Haskoning Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ fontWeight: 800, color: 'var(--primary-navy)', letterSpacing: '-0.01em' }}>200K Running Club</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 600, fontStyle: 'italic', letterSpacing: '0.02em' }}>
            Enhancing Society Together
          </span>
        </div>
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
              borderRadius: '10px',
              padding: '2px 6px',
              cursor: 'pointer',
              fontWeight: 800,
              color: 'var(--primary-navy)',
              display: 'flex',
              alignItems: 'baseline',
              gap: '2px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(0, 163, 166, 0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(0, 163, 166, 0.3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: lang === 'en' ? '0.62rem' : '0.48rem', opacity: lang === 'en' ? 1 : 0.4, transition: 'all 0.25s ease' }}>EN</span>
            <span style={{ fontSize: '0.52rem', opacity: 0.3, fontWeight: 400 }}>/</span>
            <span style={{ fontSize: lang === 'vi' ? '0.62rem' : '0.48rem', opacity: lang === 'vi' ? 1 : 0.4, transition: 'all 0.25s ease' }}>VI</span>
          </button>
        </div>

        {/* Mobile Quick Admin Button */}
        {isAdmin && (
          <button
            type="button"
            className={`navbar__mobile-admin-btn ${location.pathname === '/administer' ? 'active' : ''}`}
            onClick={() => navigate(location.pathname === '/administer' ? '/' : '/administer')}
            title={location.pathname === '/administer' ? t('dashboard') : 'Administrator'}
          >
            {location.pathname === '/administer' ? <LayoutDashboard size={16} /> : <Shield size={16} />}
            <span className="mobile-admin-label">{location.pathname === '/administer' ? t('dashboard') : 'Admin'}</span>
          </button>
        )}

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
            <span className="navbar__guest-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent, #00A3A6)' }}>
              {lang === 'en' ? 'Guest' : 'Khách'}
            </span>
            <button 
              className="navbar__logout" 
              onClick={onLogout}
              style={{
                background: 'var(--primary-navy, #002D54)',
                color: '#ffffff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {lang === 'en' ? 'Login' : 'Đăng nhập'}
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
            <span className="navbar__username" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {athlete.firstname}
            </span>
            <button className="navbar__logout" onClick={onLogout} title={t('logout')}>
              <LogOut size={14} style={{ verticalAlign: 'text-bottom' }} /> <span className="navbar__logout-text">{t('logout')}</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

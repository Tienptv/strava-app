import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Shield, Sparkles } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import NotificationBell from './NotificationBell';

export default function Navbar({ athlete, onLogout, isAdmin, isSuperAdmin, apiFetch }) {
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
        <div className="navbar__brand-icon" style={{ background: 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logo-tight.webp" alt="Haskoning Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div className="navbar__brand-text">
          <span className="navbar__brand-title">200K Running Club</span>
          <span className="navbar__brand-slogan">
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

        {/* Nút chuyển đổi độc lập sang Next-Gen PC UI/UX Lab */}
        <button
          type="button"
          className={`navbar__link navbar__link--nextgen ${location.pathname === '/nextgen' ? 'navbar__link--active' : ''}`}
          onClick={() => navigate(location.pathname === '/nextgen' ? '/' : '/nextgen')}
          title={location.pathname === '/nextgen' ? t('backToStableBtn') : 'Thử nghiệm giao diện độc lập Next-Gen PC Suite v2.0'}
          style={{
            background: location.pathname === '/nextgen' 
              ? 'linear-gradient(135deg, rgba(0, 163, 166, 0.22) 0%, rgba(120, 190, 32, 0.18) 100%)' 
              : 'rgba(0, 163, 166, 0.08)',
            border: '1px solid rgba(0, 163, 166, 0.35)',
            color: 'var(--accent)',
            fontWeight: 700,
            borderRadius: '10px',
            padding: '4px 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <Sparkles size={15} color="#00A3A6" />
          <span>{location.pathname === '/nextgen' ? t('backToStableBtn') : t('nextGenNavBtn')}</span>
        </button>
      </div>

      <div className="navbar__user">
        {/* Language Switcher */}
        <div className="lang-switcher">
          {/* Desktop view: Giữ nguyên nút EN / VI cho bản Desktop */}
          <button
            className="lang-switcher__text-toggle lang-switcher__desktop"
            onClick={() => switchLang(lang === 'en' ? 'vi' : 'en')}
            title={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
            aria-label={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0, 163, 166, 0.3)',
              borderRadius: '10px',
              padding: '2px 6px',
              cursor: 'pointer',
              fontWeight: 800,
              color: 'var(--primary-navy)',
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

          {/* Mobile view: Nút đơn gọn gàng, hiển thị VIE khi ở tiếng Anh và ENG khi ở tiếng Việt */}
          <button
            className="lang-switcher__single-toggle lang-switcher__mobile"
            onClick={() => switchLang(lang === 'en' ? 'vi' : 'en')}
            title={lang === 'en' ? 'Switch to Vietnamese (Chuyển sang tiếng Việt)' : 'Chuyển sang tiếng Anh (Switch to English)'}
            aria-label={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
          >
            {lang === 'en' ? 'VIE' : 'ENG'}
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
            <div 
              className={`navbar__avatar-wrapper ${isAdmin ? 'navbar__avatar-wrapper--admin' : ''}`}
              title={isAdmin ? (isSuperAdmin ? '⭐ Super Admin (Haskoning)' : '🛡️ Admin (Haskoning)') : athlete.firstname}
              onClick={() => isAdmin && navigate('/administer')}
              style={{ cursor: isAdmin ? 'pointer' : 'default' }}
            >
              {athlete.profile_medium ? (
                <img
                  src={athlete.profile_medium}
                  alt={athlete.firstname}
                  className="navbar__avatar"
                />
              ) : (
                <div className="navbar__avatar navbar__avatar--fallback">
                  {(athlete.firstname || 'U')[0].toUpperCase()}
                </div>
              )}
              {isAdmin && (
                <span className="navbar__avatar-admin-badge" title={isSuperAdmin ? 'Super Admin' : 'Admin'}>
                  {isSuperAdmin ? '⭐' : '🛡️'}
                </span>
              )}
            </div>
            <span className="navbar__username" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {athlete.firstname}
            </span>
            <NotificationBell apiFetch={apiFetch} athlete={athlete} />
            <button className="navbar__logout" onClick={onLogout} title={t('logout')}>
              <LogOut size={14} style={{ verticalAlign: 'text-bottom' }} /> <span className="navbar__logout-text">{t('logout')}</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

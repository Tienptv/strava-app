import { Activity, Users, TrendingUp, Timer, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import { useLang } from '../i18n/LangContext';



export default function Login({ onLogin, onGuestAccess }) {
  const { lang, switchLang, t } = useLang();

  return (
    <div className="login-page">
      {/* Language switcher on login page */}
      <div className="lang-switcher" style={{ position: 'absolute', top: 16, right: 20, zIndex: 10 }}>
        <button
          className="lang-switcher__text-toggle"
          onClick={() => switchLang(lang === 'en' ? 'vi' : 'en')}
          title={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(0, 163, 166, 0.22)',
            borderRadius: '16px',
            padding: '3px 10px',
            cursor: 'pointer',
            fontWeight: 800,
            color: 'var(--primary-navy)',
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(8px)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,163,166,0.15)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = 'rgba(0, 163, 166, 0.22)'; }}
        >
          <span style={{ fontSize: lang === 'en' ? '0.82rem' : '0.68rem', opacity: lang === 'en' ? 1 : 0.45, transition: 'all 0.25s ease' }}>EN</span>
          <span style={{ fontSize: '0.72rem', opacity: 0.3, fontWeight: 400 }}>/</span>
          <span style={{ fontSize: lang === 'vi' ? '0.82rem' : '0.68rem', opacity: lang === 'vi' ? 1 : 0.45, transition: 'all 0.25s ease' }}>VI</span>
        </button>
      </div>

      <div className="login-card">
        <div className="login-card__icon" style={{ width: '144px', height: '144px', margin: '0 auto 16px', background: 'transparent', boxShadow: 'none' }}>
          <img src="/logo.webp" alt="Haskoning Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h1 className="login-card__title">{t('appTitle')}</h1>
        <div style={{ color: 'var(--accent)', fontWeight: 600, fontStyle: 'italic', fontSize: '0.92rem', letterSpacing: '0.02em', margin: '-6px 0 10px' }}>
          Enhancing Society Together
        </div>
        <p className="login-card__subtitle">
          {t('appSubtitle')}
        </p>

        <div className="login-card__features">
          <div className="login-card__feature">
            <Activity size={18} className="login-card__feature-icon" />
            <span>{t('featureActivities')}</span>
          </div>
          <div className="login-card__feature">
            <Users size={18} className="login-card__feature-icon" />
            <span>{t('featureClubs')}</span>
          </div>
          <div className="login-card__feature">
            <TrendingUp size={18} className="login-card__feature-icon" />
            <span>{t('featureCharts')}</span>
          </div>
          <div className="login-card__feature">
            <Zap size={18} className="login-card__feature-icon" />
            <span>{t('featureLive')}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          {/* Nút Xem Ngay (Khách / Non-Admin trên điện thoại) */}
          <button 
            type="button" 
            className="btn btn-guest-access"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '13px 18px',
              background: 'linear-gradient(135deg, #00A3A6 0%, #007A7C 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.98rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0, 163, 166, 0.35)',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s ease'
            }}
            onClick={() => onGuestAccess && onGuestAccess()}
          >
            <span style={{ fontSize: '1.25rem' }}>🏆</span>
            <span>{lang === 'en' ? 'View Club Leaderboard (Guest)' : 'Xem Bảng Xếp Hạng CLB (Khách)'}</span>
            <ChevronRight size={18} />
          </button>

          <div style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border, #e2e8f0)' }} />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {lang === 'en' ? 'Or login with Strava' : 'Hoặc đăng nhập Strava'}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border, #e2e8f0)' }} />
          </div>

          <button className="btn btn--primary" onClick={() => onLogin(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="15.5,7 20,16 17.5,16 15.5,12 13.5,16 11,16"/>
              <polygon points="10.5,16 13,16 10,22 7,16 9.5,16 10,17"/>
            </svg>
            {t('loginButton')}
            <ChevronRight size={18} />
          </button>

          <button 
            type="button" 
            className="btn btn-switch-account" 
            onClick={() => onLogin(true)}
            title={t('switchAccountHint')}
          >
            <RefreshCw size={15} style={{ flexShrink: 0 }} />
            <span>{t('switchAccount')}</span>
          </button>
          
          <a 
            href="https://www.strava.com/account/recover" 
            target="_blank" 
            rel="noopener noreferrer"
            className="login-forgot-link"
          >
            {lang === 'en' ? 'Forgot Strava Password?' : 'Quên mật khẩu Strava?'}
          </a>
        </div>

        <p style={{ marginTop: 18, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {t('loginNote')}
        </p>
      </div>
    </div>
  );
}

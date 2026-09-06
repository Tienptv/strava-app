import { Activity, Users, TrendingUp, Timer, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import { useLang } from '../i18n/LangContext';



export default function Login({ onLogin, onGuestAccess }) {
  const { lang, switchLang, t } = useLang();

  return (
    <div className="login-page">
      {/* Language switcher on login page */}
      <div className="lang-switcher" style={{ position: 'absolute', top: 20, right: 24, zIndex: 10 }}>
        <button
          className="lang-switcher__text-toggle"
          onClick={() => switchLang(lang === 'en' ? 'vi' : 'en')}
          title={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(0, 163, 166, 0.2)',
            borderRadius: '20px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: 800,
            color: 'var(--primary-navy)',
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(8px)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,163,166,0.15)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(0, 163, 166, 0.2)'; }}
        >
          <span style={{ fontSize: lang === 'en' ? '1.15rem' : '0.75rem', opacity: lang === 'en' ? 1 : 0.4, transition: 'all 0.3s ease' }}>EN</span>
          <span style={{ fontSize: '0.9rem', opacity: 0.3, fontWeight: 400 }}>/</span>
          <span style={{ fontSize: lang === 'vi' ? '1.15rem' : '0.75rem', opacity: lang === 'vi' ? 1 : 0.4, transition: 'all 0.3s ease' }}>VI</span>
        </button>
      </div>

      <div className="login-card">
        <div className="login-card__icon">🏃</div>
        <h1 className="login-card__title">{t('appTitle')}</h1>
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
            <span>{lang === 'en' ? 'View Club Leaderboard (Public)' : 'Xem Bảng Xếp Hạng CLB (Khách)'}</span>
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
            className="btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              fontSize: '0.85rem',
              fontWeight: 500,
              padding: '10px 16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onClick={() => onLogin(true)}
            title={t('switchAccountHint')}
          >
            <RefreshCw size={15} />
            {t('switchAccount')}
          </button>
        </div>

        <p style={{ marginTop: 18, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {t('loginNote')}
        </p>
      </div>
    </div>
  );
}

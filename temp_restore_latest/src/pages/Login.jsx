import { Activity, Users, TrendingUp, Timer, ChevronRight, Zap } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

// SVG Flag components (circular) - duplicated for Login page (no navbar)
function VNFlag({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <clipPath id="vnClipLogin"><circle cx="20" cy="20" r="20"/></clipPath>
      <g clipPath="url(#vnClipLogin)">
        <rect width="40" height="40" fill="#DA251D"/>
        <polygon points="20,8 23.1,16.9 32.4,16.9 24.6,22.5 27.6,31.4 20,25.8 12.4,31.4 15.4,22.5 7.6,16.9 16.9,16.9" fill="#FFFF00"/>
      </g>
    </svg>
  );
}

function USFlag({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <clipPath id="usClipLogin"><circle cx="20" cy="20" r="20"/></clipPath>
      <g clipPath="url(#usClipLogin)">
        <rect width="40" height="40" fill="#B22234"/>
        <rect y="3.08" width="40" height="3.08" fill="white"/>
        <rect y="9.23" width="40" height="3.08" fill="white"/>
        <rect y="15.38" width="40" height="3.08" fill="white"/>
        <rect y="21.54" width="40" height="3.08" fill="white"/>
        <rect y="27.69" width="40" height="3.08" fill="white"/>
        <rect y="33.85" width="40" height="3.08" fill="white"/>
        <rect width="17" height="21.54" fill="#3C3B6E"/>
        <g fill="white">
          {[2, 6, 10, 14].map(x => [2.5, 7, 11.5, 16].map(y => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" />
          )))}
          {[4, 8, 12].map(x => [4.75, 9.25, 13.75].map(y => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" />
          )))}
        </g>
      </g>
    </svg>
  );
}

export default function Login({ onLogin }) {
  const { lang, switchLang, t } = useLang();

  return (
    <div className="login-page">
      {/* Language switcher on login page */}
      <div className="lang-switcher" style={{ position: 'absolute', top: 20, right: 24, zIndex: 10 }}>
        <button
          className={`lang-switcher__btn ${lang === 'vi' ? 'lang-switcher__btn--active' : ''}`}
          onClick={() => switchLang('vi')}
          title="Tiếng Việt"
        >
          <VNFlag size={28} />
        </button>
        <button
          className={`lang-switcher__btn ${lang === 'en' ? 'lang-switcher__btn--active' : ''}`}
          onClick={() => switchLang('en')}
          title="English"
        >
          <USFlag size={28} />
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

        <button className="btn btn--primary" onClick={onLogin}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="15.5,7 20,16 17.5,16 15.5,12 13.5,16 11,16"/>
            <polygon points="10.5,16 13,16 10,22 7,16 9.5,16 10,17"/>
          </svg>
          {t('loginButton')}
          <ChevronRight size={18} />
        </button>

        <p style={{ marginTop: 20, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {t('loginNote')}
        </p>
      </div>
    </div>
  );
}

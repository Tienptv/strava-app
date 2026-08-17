import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

// SVG Flag components (circular)
function VNFlag({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <clipPath id="vnClip"><circle cx="20" cy="20" r="20"/></clipPath>
      <g clipPath="url(#vnClip)">
        <rect width="40" height="40" fill="#DA251D"/>
        <polygon points="20,8 23.1,16.9 32.4,16.9 24.6,22.5 27.6,31.4 20,25.8 12.4,31.4 15.4,22.5 7.6,16.9 16.9,16.9" fill="#FFFF00"/>
      </g>
    </svg>
  );
}

function USFlag({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <clipPath id="usClip"><circle cx="20" cy="20" r="20"/></clipPath>
      <g clipPath="url(#usClip)">
        <rect width="40" height="40" fill="#B22234"/>
        <rect y="3.08" width="40" height="3.08" fill="white"/>
        <rect y="9.23" width="40" height="3.08" fill="white"/>
        <rect y="15.38" width="40" height="3.08" fill="white"/>
        <rect y="21.54" width="40" height="3.08" fill="white"/>
        <rect y="27.69" width="40" height="3.08" fill="white"/>
        <rect y="33.85" width="40" height="3.08" fill="white"/>
        <rect width="17" height="21.54" fill="#3C3B6E"/>
        <g fill="white" fontSize="3.5" fontFamily="serif">
          {/* Simplified stars */}
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

export default function Navbar({ athlete, onLogout }) {
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
      </div>

      <div className="navbar__user">
        {/* Language Switcher */}
        <div className="lang-switcher">
          <button
            className={`lang-switcher__btn ${lang === 'vi' ? 'lang-switcher__btn--active' : ''}`}
            onClick={() => switchLang('vi')}
            title="Tiếng Việt"
          >
            <VNFlag size={24} />
          </button>
          <button
            className={`lang-switcher__btn ${lang === 'en' ? 'lang-switcher__btn--active' : ''}`}
            onClick={() => switchLang('en')}
            title="English"
          >
            <USFlag size={24} />
          </button>
        </div>

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
      </div>
    </nav>
  );
}

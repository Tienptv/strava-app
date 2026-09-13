import React from 'react';
import { Trophy, Target, MapPin, Search, Coins } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

export default function MobileBottomNav({
  activeTab = 'leaderboard',
  onTabSelect,
  onOpenTreasury,
  onFindMe
}) {
  const { t } = useLang();

  const handleTabClick = (tabKey) => {
    if (tabKey === 'treasury') {
      if (onOpenTreasury) onOpenTreasury();
      return;
    }
    if (tabKey === 'findme') {
      if (onFindMe) onFindMe();
      return;
    }
    if (onTabSelect) {
      onTabSelect(tabKey);
    }
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {/* 1. BXH */}
      <button 
        type="button"
        className={`mobile-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
        onClick={() => handleTabClick('leaderboard')}
      >
        <div className="mobile-nav-icon">
          <Trophy size={19} />
        </div>
        <span className="mobile-nav-label">
          {t('navLeaderboard')}
        </span>
        {activeTab === 'leaderboard' && <span className="mobile-nav-indicator" />}
      </button>

      {/* 2. Mục Tiêu Cá Nhân & AI Coach */}
      <button 
        type="button"
        className={`mobile-nav-item ${activeTab === 'mygoal' ? 'active' : ''}`}
        onClick={() => handleTabClick('mygoal')}
      >
        <div className="mobile-nav-icon">
          <Target size={19} />
        </div>
        <span className="mobile-nav-label">
          {t('navMyGoal')}
        </span>
        {activeTab === 'mygoal' && <span className="mobile-nav-indicator" />}
      </button>

      {/* 3. Hành Trình CLB */}
      <button 
        type="button"
        className={`mobile-nav-item ${activeTab === 'journey' ? 'active' : ''}`}
        onClick={() => handleTabClick('journey')}
      >
        <div className="mobile-nav-icon">
          <MapPin size={19} />
        </div>
        <span className="mobile-nav-label">
          {t('navJourney')}
        </span>
        {activeTab === 'journey' && <span className="mobile-nav-indicator" />}
      </button>

      {/* 4. Quỹ CLB */}
      <button 
        type="button"
        className={`mobile-nav-item ${activeTab === 'treasury' ? 'active' : ''}`}
        onClick={() => handleTabClick('treasury')}
      >
        <div className="mobile-nav-icon">
          <Coins size={19} />
        </div>
        <span className="mobile-nav-label">
          {t('navTreasury')}
        </span>
      </button>

      {/* 5. Tìm VĐV */}
      <button 
        type="button"
        className="mobile-nav-item"
        onClick={() => handleTabClick('findme')}
      >
        <div className="mobile-nav-icon">
          <Search size={19} />
        </div>
        <span className="mobile-nav-label">
          {t('navSearch')}
        </span>
      </button>
    </nav>
  );
}


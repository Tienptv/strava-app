import React from 'react';
import { Trophy, MapPin, DollarSign, User, Search } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

export default function MobileBottomNav({
  activeTab = 'leaderboard',
  onTabSelect,
  onOpenTreasury,
  onFindMe
}) {
  const { lang } = useLang();

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
    <nav className="mobile-bottom-nav">
      {/* 1. BXH */}
      <button 
        className={`mobile-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
        onClick={() => handleTabClick('leaderboard')}
      >
        <div className="mobile-nav-icon">
          <Trophy size={20} />
        </div>
        <span className="mobile-nav-label">
          {lang === 'en' ? 'Rankings' : 'BXH'}
        </span>
      </button>

      {/* 2. Hành Trình CLB */}
      <button 
        className={`mobile-nav-item ${activeTab === 'journey' ? 'active' : ''}`}
        onClick={() => handleTabClick('journey')}
      >
        <div className="mobile-nav-icon">
          <MapPin size={20} />
        </div>
        <span className="mobile-nav-label">
          {lang === 'en' ? 'Journey' : 'Hành Trình'}
        </span>
      </button>

      {/* 3. Quỹ CLB */}
      <button 
        className="mobile-nav-item"
        onClick={() => handleTabClick('treasury')}
      >
        <div className="mobile-nav-icon">
          <span style={{ fontSize: '18px' }}>💰</span>
        </div>
        <span className="mobile-nav-label">
          {lang === 'en' ? 'Treasury' : 'Quỹ CLB'}
        </span>
      </button>

      {/* 4. Tìm VĐV / Của tôi */}
      <button 
        className="mobile-nav-item"
        onClick={() => handleTabClick('findme')}
      >
        <div className="mobile-nav-icon">
          <Search size={20} />
        </div>
        <span className="mobile-nav-label">
          {lang === 'en' ? 'Search' : 'Tìm Tôi'}
        </span>
      </button>
    </nav>
  );
}

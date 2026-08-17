import React from 'react';
import { useLang } from '../i18n/LangContext';
import { Map, MapPin } from 'lucide-react';

export default function ClubGoalProgress({ totalDistance = 0 }) {
  const { t } = useLang();
  
  // Default goal: Xuyên Việt (2360 km)
  const CLUB_GOAL_KM = 2360;

  const percent = Math.min(Math.round((totalDistance / CLUB_GOAL_KM) * 100) || 0, 100);

  return (
    <div className="club-goal-card">
      <div className="club-goal__header">
        <div className="club-goal__title">
          <Map size={20} color="var(--accent)" />
          <span>{t('clubGoalTitle')}</span>
        </div>
        <div className="club-goal__stats">
          <span className="current-dist">{totalDistance.toFixed(1)}</span>
          <span className="total-goal">/ {CLUB_GOAL_KM} km</span>
        </div>
      </div>
      
      <p className="club-goal__subtitle">{t('runAcrossVietnam')} ({percent}%)</p>

      <div className="vietnam-map-progress">
        <div className="map-labels">
          <span className="map-label start-label">Hà Nội</span>
          <span className="map-label end-label">Cà Mau</span>
        </div>
        
        <div className="map-track-container">
          {/* Background track */}
          <div className="map-track-bg"></div>
          
          {/* Filled track */}
          <div className="map-track-fill" style={{ width: `${percent}%` }}></div>
          
          {/* Moving Car / Runner icon */}
          <div 
            className="map-vehicle"
            style={{ 
              left: `calc(${percent}% - 24px)`, 
              display: 'flex', 
              alignItems: 'center' 
            }}
            title={`${percent}%`}
          >
            <span style={{ marginRight: '-50px', fontSize: '1.1em', zIndex: 1 }}>🏃‍♀️</span>
            <span style={{ fontSize: '1.2em', zIndex: 2 }}>🏃‍♂️</span>
          </div>
          
          {/* Destination Pin */}
          <div className="map-pin-end">
            <MapPin size={20} color="var(--accent)" fill="var(--bg-secondary)" />
          </div>
        </div>
      </div>
      
      {percent >= 100 && (
        <p className="goal-congrats" style={{ marginTop: '16px' }}>🎉 {t('clubGoalReached')}</p>
      )}
    </div>
  );
}

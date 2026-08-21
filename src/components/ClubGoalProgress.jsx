import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import { Compass, Edit2, X } from 'lucide-react';

export default function ClubGoalProgress({ totalDistance = 0, apiFetch }) {
  const { t } = useLang();
  
  const [targetKm, setTargetKm] = useState(9000);
  const [customTitle, setCustomTitle] = useState(null);
  const [customSubtitle, setCustomSubtitle] = useState(null);

  useEffect(() => {
    if (apiFetch) {
      apiFetch('/challenge/goal')
        .then(data => {
          if (data) {
            if (data.targetKm) setTargetKm(data.targetKm);
            if (data.customTitle !== undefined) setCustomTitle(data.customTitle);
            if (data.customSubtitle !== undefined) setCustomSubtitle(data.customSubtitle);
          }
        })
        .catch(err => console.error('Lỗi tải club goal:', err));
    }
  }, [apiFetch]);

  const goalTitle = customTitle || t('clubGoalTitle');
  const goalSubtitle = customSubtitle || t('runAcrossVietnam');
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState(targetKm);
  const [tempTitle, setTempTitle] = useState('');
  const [tempSubtitle, setTempSubtitle] = useState('');

  const handleOpenEdit = () => {
    setTempTarget(targetKm);
    setTempTitle(goalTitle);
    setTempSubtitle(goalSubtitle);
    setIsEditing(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    const val = parseInt(tempTarget);
    const newTarget = (val > 0) ? val : targetKm;
    const newTitle = (tempTitle && tempTitle !== t('clubGoalTitle')) ? tempTitle : null;
    const newSubtitle = (tempSubtitle && tempSubtitle !== t('runAcrossVietnam')) ? tempSubtitle : null;

    setTargetKm(newTarget);
    setCustomTitle(newTitle);
    setCustomSubtitle(newSubtitle);
    setIsEditing(false);

    if (apiFetch) {
      try {
        await apiFetch('/challenge/goal', {
          method: 'POST',
          body: JSON.stringify({
            targetKm: newTarget,
            customTitle: newTitle,
            customSubtitle: newSubtitle
          })
        });
      } catch (err) {
        console.error('Lỗi lưu club goal lên server:', err);
      }
    }
  };

  const percent = Math.min(Math.round((totalDistance / targetKm) * 100) || 0, 100);
  
  // Giới hạn logo không vượt quá chiều dài thanh bar
  const vehiclePos = percent > 96 ? 96 : percent;

  // Các thủ đô, thành phố lớn các nước trên đường đi từ TP.HCM đến Bắc Cực (~9.000 km)
  const milestones = [
    { name: t('hanoi'), icon: '🍜', percent: 13, pos: 'top' },
    { name: t('beijing'), icon: '🐼', percent: 38, pos: 'bottom' },
    { name: t('ulaanbaatar'), icon: '🐎', percent: 52, pos: 'top' },
    { name: t('irkutsk'), icon: '🐻', percent: 65, pos: 'bottom' },
    { name: t('norilsk'), icon: '⛄', percent: 80, pos: 'top' }
  ];

  return (
    <div className="club-goal-card">
      <div className="club-goal__header">
        <div className="club-goal__title">
          <Compass size={22} color="var(--accent)" />
          <span>{goalTitle}</span>
        </div>
        <div className="club-goal__stats">
          <span className="current-dist">{totalDistance.toFixed(1)}</span>
          <div className="target-display">
            <span className="total-goal">/ {targetKm} km</span>
            <button className="btn-icon btn-edit" onClick={handleOpenEdit} title="Edit Target">
              <Edit2 size={14} />
            </button>
          </div>
        </div>
      </div>
      
      <p className="club-goal__subtitle">{goalSubtitle} ({percent}%)</p>

      <div className="vietnam-map-progress">
        <div className="map-labels">
          <span className="map-label start-label">{t('startLocation')}</span>
          <span className="map-label end-label">{t('endLocation')}</span>
        </div>
        
        <div className="map-track-container">
          {/* Background track */}
          <div className="map-track-bg"></div>
          
          {/* Start Point Badge - HCM */}
          <div className="map-pin-start" title={t('startLocation')}>
            <div className="start-badge">
              <span>☕</span>
            </div>
          </div>

          {/* Filled track */}
          <div className="map-track-fill" style={{ width: `${percent}%` }}></div>
          
          {/* Milestones / Capitals & Cities with Fun Icons */}
          {milestones.map((ms, i) => {
            const isPassed = percent >= ms.percent;
            return (
              <div key={i} className={`map-milestone milestone-${ms.pos}`} style={{ left: `${ms.percent}%` }}>
                <div 
                  className={`milestone-badge ${isPassed ? 'milestone-badge--passed' : ''}`}
                  title={`${ms.name} (${ms.percent}%)`}
                >
                  <span className="milestone-badge__icon">{ms.icon}</span>
                </div>
                <span className={`milestone-name pos-${ms.pos}`}>{ms.name}</span>
              </div>
            );
          })}

          {/* Moving Car / Runner icon */}
          <div 
            className="map-vehicle"
            style={{ 
              left: `calc(${vehiclePos}% - 96px)`, 
              display: 'flex', 
              alignItems: 'center' 
            }}
            title={`${percent}%`}
          >
            <img src="/icegif-449-transparent.gif" alt="Runners" style={{ width: '192px', height: '192px', objectFit: 'contain', transform: 'scaleX(-1) translateY(calc(-31% - 54px))' }} />
          </div>
          
          {/* Destination Pin */}
          <div className="map-pin-end" title={t('endLocation')}>
            <div className="destination-badge">
              <span>🐻‍❄️</span>
            </div>
          </div>
        </div>
      </div>
      
      {percent >= 100 && (
        <p className="goal-congrats" style={{ marginTop: '16px' }}>🎉 {t('clubGoalReached')}</p>
      )}

      {/* Edit Goal Modal */}
      {isEditing && (
        <div className="goal-edit-modal-backdrop" onClick={() => setIsEditing(false)}>
          <div className="goal-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('editChallenge')}</h3>
              <button className="btn-icon" onClick={() => setIsEditing(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveGoal}>
              <div className="form-group">
                <label>{t('goalTitleLabel')}</label>
                <input 
                  type="text" 
                  value={tempTitle} 
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="modal-input"
                  placeholder={t('clubGoalTitle')}
                />
              </div>
              <div className="form-group">
                <label>{t('challengeDescLabel')}</label>
                <input 
                  type="text" 
                  value={tempSubtitle} 
                  onChange={(e) => setTempSubtitle(e.target.value)}
                  className="modal-input"
                  placeholder={t('runAcrossVietnam')}
                />
              </div>
              <div className="form-group">
                <label>{t('targetDistanceLabel')}</label>
                <input 
                  type="number" 
                  value={tempTarget} 
                  onChange={(e) => setTempTarget(e.target.value)}
                  className="modal-input"
                  min="1"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>{t('cancel')}</button>
                <button type="submit" className="btn-save">{t('saveChanges')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

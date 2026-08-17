import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import { Target, Edit2, Check, X } from 'lucide-react';

export default function PersonalGoal({ activities }) {
  const { t, lang } = useLang();
  const [goal, setGoal] = useState(100);
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState('100');
  const [currentDist, setCurrentDist] = useState(0);

  useEffect(() => {
    // Load saved goal from localStorage
    const savedGoal = localStorage.getItem('personalGoal');
    if (savedGoal) {
      setGoal(Number(savedGoal));
      setTempGoal(savedGoal);
    }
  }, []);

  useEffect(() => {
    // Calculate distance for the current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let dist = 0;
    if (activities && activities.length > 0) {
      activities.forEach(act => {
        if (act.start_date_local && act.distance) {
          const actDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
          const actDate = new Date(actDateStr);
          if (actDate.getFullYear() === currentYear && actDate.getMonth() === currentMonth) {
            dist += act.distance;
          }
        }
      });
    }
    
    // distance is in meters, convert to km
    setCurrentDist(dist / 1000);
  }, [activities]);

  const handleSave = () => {
    const val = Number(tempGoal);
    if (!isNaN(val) && val > 0) {
      setGoal(val);
      localStorage.setItem('personalGoal', val.toString());
      setIsEditing(false);
    }
  };

  const percent = Math.min(Math.round((currentDist / goal) * 100) || 0, 100);
  
  // Format current month text
  const monthName = new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="personal-goal-card">
      <div className="personal-goal__header">
        <div className="personal-goal__title">
          <Target size={20} color="var(--primary)" />
          <span>{t('personalGoalTitle')} - {monthName}</span>
        </div>
        {!isEditing && (
          <button className="btn-icon" onClick={() => setIsEditing(true)} title={t('editGoal')}>
            <Edit2 size={16} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="personal-goal__edit">
          <input 
            type="number" 
            value={tempGoal} 
            onChange={(e) => setTempGoal(e.target.value)}
            className="goal-input"
            min="1"
          />
          <span className="goal-unit">km</span>
          <button className="btn-icon btn-save" onClick={handleSave}><Check size={18} /></button>
          <button className="btn-icon btn-cancel" onClick={() => { setIsEditing(false); setTempGoal(goal.toString()); }}><X size={18} /></button>
        </div>
      ) : (
        <div className="personal-goal__stats">
          <div className="goal-numbers">
            <span className="current-dist">{currentDist.toFixed(1)}</span>
            <span className="total-goal">/ {goal} km</span>
          </div>
          <div className="goal-percent">{percent}%</div>
        </div>
      )}

      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ 
            width: `${percent}%`,
            background: percent >= 100 ? 'var(--success)' : 'var(--primary)'
          }}
        ></div>
      </div>
      {percent >= 100 && (
        <p className="goal-congrats">🎉 {t('goalReached')}</p>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useLang } from '../i18n/LangContext';
import { Target, Edit2, Check, X, ShieldAlert, ShieldCheck, Info, Sparkles, CheckCircle2 } from 'lucide-react';
import { getAthleteMatchKey } from '../utils/challengeStats';

export default function PersonalGoal({ 
  activities = [], 
  athlete, 
  apiFetch, 
  challengeMonth, 
  challengeYear, 
  challengeParticipants = {},
  challengeData = []
}) {
  const { t, lang } = useLang();
  
  const currentMonth = challengeMonth || (new Date().getMonth() + 1);
  const currentYear = challengeYear || new Date().getFullYear();
  
  // Identify the athlete's matchKey in the challenge participants
  const userMatchKey = getAthleteMatchKey(athlete, challengeParticipants);
  const userKey = userMatchKey ? `${userMatchKey}_${currentYear}_${currentMonth}` : null;

  const [goal, setGoal] = useState(100);
  const [hasPenalty, setHasPenalty] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState('100');
  const [tempPenalty, setTempPenalty] = useState(false);
  const [currentDist, setCurrentDist] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [allTimeFinancial, setAllTimeFinancial] = useState(null);

  // Fetch all-time financial contribution from penalties ledger
  useEffect(() => {
    if (apiFetch) {
      apiFetch('/penalties/ledger')
        .then(res => {
          if (res && Array.isArray(res.members)) {
            const athId = athlete?.id ? String(athlete.id) : null;
            const normFname = athlete?.firstname ? athlete.firstname.trim().toLowerCase() : '';
            const match = res.members.find(m => 
              (athId && m.athleteId && String(m.athleteId) === athId) ||
              (m.rawName && userMatchKey && m.rawName.toLowerCase() === userMatchKey.toLowerCase()) ||
              (normFname && m.fullName && m.fullName.toLowerCase().includes(normFname))
            );
            if (match && match.financialSummary) {
              setAllTimeFinancial(match.financialSummary);
            }
          }
        })
        .catch(() => {});
    }
  }, [apiFetch, athlete, userMatchKey]);

  // Fetch targets from backend API
  const loadUserTarget = useCallback(async () => {
    if (!apiFetch || !userKey) return;
    try {
      const data = await apiFetch('/challenge/targets', { cache: 'no-store' });
      if (data && userKey && data[userKey]) {
        const item = data[userKey];
        if (item.target !== undefined && item.target !== '') {
          const num = Number(item.target);
          const validNum = !isNaN(num) && num > 0 ? num : 0;
          setGoal(validNum);
          setTempGoal(validNum > 0 ? String(validNum) : '100');
        }
        if (item.penalty !== undefined) {
          setHasPenalty(Boolean(item.penalty));
          setTempPenalty(Boolean(item.penalty));
        }
      } else if (data && userMatchKey && data[userMatchKey]) {
        // Fallback to non-month-specific key if existing
        const item = data[userMatchKey];
        if (item.target !== undefined && item.target !== '') {
          const num = Number(item.target);
          if (!isNaN(num) && num > 0) {
            setGoal(num);
            setTempGoal(String(num));
          }
        }
        if (item.penalty !== undefined) {
          setHasPenalty(Boolean(item.penalty));
          setTempPenalty(Boolean(item.penalty));
        }
      }
    } catch (e) {
      console.error('Error loading target from API:', e);
    }
  }, [apiFetch, userKey, userMatchKey]);

  useEffect(() => {
    loadUserTarget();

    const handleTargetsUpdated = (e) => {
      loadUserTarget();
    };

    window.addEventListener('challengeTargetsUpdated', handleTargetsUpdated);
    return () => window.removeEventListener('challengeTargetsUpdated', handleTargetsUpdated);
  }, [loadUserTarget]);

  // Calculate distance for the current month
  useEffect(() => {
    // 1. If challengeData is available and user is present, use that distance for exact match
    if (challengeData && challengeData.length > 0 && userMatchKey) {
      const myRow = challengeData.find(r => r.matchKey === userMatchKey);
      if (myRow && myRow.totalDistance !== undefined) {
        setCurrentDist(myRow.totalDistance);
        return;
      }
    }

    // 2. Fallback: calculate from raw activities list
    let dist = 0;
    if (activities && activities.length > 0) {
      activities.forEach(act => {
        if (act.start_date_local && act.distance) {
          const actDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
          const actDate = new Date(actDateStr);
          if (actDate.getFullYear() === currentYear && (actDate.getMonth() + 1) === currentMonth) {
            // Only runs & trail runs
            const type = (act.type || '').toLowerCase();
            if (['run', 'virtualrun', 'trailrun', 'trail run'].includes(type) || type.includes('run') || type.includes('trail') || !type) {
              dist += act.distance;
            }
          }
        }
      });
    }
    
    // distance is in meters, convert to km
    setCurrentDist(Math.round((dist / 1000) * 100) / 100);
  }, [activities, challengeData, userMatchKey, currentYear, currentMonth]);

  const handleStartEdit = () => {
    setTempGoal(goal > 0 ? String(goal) : '');
    setTempPenalty(hasPenalty);
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const cleanStr = String(tempGoal).trim().replace(/^0+(?=\d)/, '');
    const num = cleanStr === '' ? 0 : parseInt(cleanStr, 10);
    const validTarget = isNaN(num) ? 0 : Math.max(0, num);
    const newPenalty = Boolean(tempPenalty);

    setGoal(validTarget);
    setHasPenalty(newPenalty);
    setIsEditing(false);

    if (apiFetch && userKey) {
      setSaving(true);
      try {
        await apiFetch('/challenge/targets', {
          method: 'POST',
          body: JSON.stringify({
            matchKey: userKey,
            target: validTarget,
            penalty: newPenalty
          })
        });

        // Trigger event so ChallengeTable & other components update in real time
        window.dispatchEvent(new CustomEvent('challengeTargetsUpdated', {
          detail: { matchKey: userMatchKey, year: currentYear, month: currentMonth, target: validTarget, penalty: newPenalty }
        }));

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } catch (err) {
        console.error('Error saving target to API:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempGoal(goal > 0 ? String(goal) : '');
    setTempPenalty(hasPenalty);
  };

  const percent = goal > 0 ? Math.min(Math.round((currentDist / goal) * 100) || 0, 100) : 0;
  const isGoalReached = goal > 0 && currentDist >= goal;

  // Tính tiền phạt dự kiến nếu có cam kết phạt và target > 0
  let penaltyDue = 0;
  let remainingKm = 0;
  if (hasPenalty && goal > 0) {
    remainingKm = Math.max(0, Math.round((goal - currentDist) * 10) / 10);
    if (remainingKm > 0) {
      const rawK = 200 * (remainingKm / goal);
      penaltyDue = Math.min(200, Math.ceil(rawK / 10) * 10);
    }
  }

  // Format month text
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString(
    lang === 'vi' ? 'vi-VN' : 'en-US', 
    { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }
  );

  return (
    <div className="personal-goal-card">
      <div className="personal-goal__header">
        <div className="personal-goal__title">
          <div className="personal-goal__icon-badge">
            <Target size={20} color="#00A3A6" />
          </div>
          <div>
            <span className="personal-goal__main-title">{t('personalGoalTitle')}</span>
            <span className="personal-goal__month-subtitle"> ({monthName})</span>
          </div>
        </div>
        {!isEditing && (
          <button className="btn-icon btn-edit-goal" onClick={handleStartEdit} title={t('editGoal')}>
            <Edit2 size={16} />
            <span style={{ fontSize: '0.8rem', marginLeft: '4px', fontWeight: 600 }}>{t('editGoal')}</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <form className="personal-goal__edit-form" onSubmit={handleSave}>
          <div className="personal-goal__edit-fields">
            <div className="form-group-compact">
              <label className="compact-label">{t('targetKm')}:</label>
              <div className="input-with-unit">
                <input 
                  type="number" 
                  value={tempGoal} 
                  onChange={(e) => setTempGoal(e.target.value)}
                  className="goal-input-premium"
                  placeholder="0"
                  min="0"
                  autoFocus
                />
                <span className="goal-unit-badge">km</span>
              </div>
            </div>

            <div className="form-group-compact penalty-toggle-group">
              <label className="penalty-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={tempPenalty} 
                  onChange={(e) => setTempPenalty(e.target.checked)}
                  className="custom-penalty-checkbox"
                />
                <span className="penalty-label-text">
                  <strong>{t('joinPenaltyChallenge')}</strong>
                  <small>{t('penaltyChallengeHint')}</small>
                </span>
              </label>
            </div>
          </div>

          <div className="personal-goal__edit-actions">
            <button type="button" className="btn-secondary-sm" onClick={handleCancel}>
              <X size={15} style={{ marginRight: 4 }} /> {t('cancel')}
            </button>
            <button type="submit" className="btn-primary-sm" disabled={saving}>
              <Check size={15} style={{ marginRight: 4 }} /> {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="personal-goal__stats">
            <div className="goal-numbers">
              <span className="current-dist">{currentDist.toFixed(1)}</span>
              <span className="total-goal">/ {goal > 0 ? `${goal} km` : `${t('target')}: 0 km`}</span>
            </div>
            <div className={`goal-percent-badge ${isGoalReached ? 'is-complete' : ''}`}>
              {percent}% {isGoalReached ? '🎯' : ''}
            </div>
          </div>

          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${Math.max(percent, goal > 0 ? 3 : 0)}%`,
                background: isGoalReached 
                  ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                  : 'linear-gradient(90deg, #00A3A6 0%, #B5D334 100%)'
              }}
            ></div>
          </div>

          {/* Penalty Status Card */}
          <div className="personal-goal__penalty-footer">
            {hasPenalty ? (
              <div className={`penalty-status-box ${isGoalReached ? 'penalty-status-safe' : 'penalty-status-active'}`}>
                <div className="penalty-status-header">
                  {isGoalReached ? (
                    <ShieldCheck size={18} className="penalty-icon safe" />
                  ) : (
                    <ShieldAlert size={18} className="penalty-icon warning" />
                  )}
                  <span className="penalty-status-title">
                    {t('penaltyCommitted')} (Max 200k)
                  </span>
                  {penaltyDue > 0 ? (
                    <span className="penalty-amount-badge owing">
                      {t('estimatedPenalty')} <strong>{penaltyDue}k</strong>
                    </span>
                  ) : (
                    <span className="penalty-amount-badge safe">
                      {t('penaltyFree')}
                    </span>
                  )}
                </div>
                {!isGoalReached && goal > 0 && (
                  <p className="penalty-status-desc">
                    🏃 {lang === 'vi' ? `Bạn còn thiếu ${remainingKm} km để hoàn thành mục tiêu và không phải nộp phạt.` : `You need ${remainingKm} more km to complete your goal and avoid penalty.`}
                  </p>
                )}
              </div>
            ) : (
              <div className="penalty-status-box penalty-status-none">
                <Info size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {t('penaltyNotCommitted')}
                </span>
                <button 
                  type="button" 
                  className="btn-link-penalty" 
                  onClick={handleStartEdit}
                >
                  + {t('joinPenaltyChallenge')}
                </button>
              </div>
            )}

            {saveSuccess && (
              <div className="sync-success-pill">
                <CheckCircle2 size={14} color="#10b981" />
                <span>{t('syncedWithAdmin')}</span>
              </div>
            )}

            {allTimeFinancial && (allTimeFinancial.totalPenaltyVND > 0 || allTimeFinancial.allTimeKmMoneyFile > 0) && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(0, 45, 84, 0.04)',
                border: '1px solid rgba(0, 45, 84, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: 'var(--primary-navy)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="#ea580c" />
                  {lang === 'vi' ? 'Đóng góp Quỹ CLB All-Time:' : 'Club All-Time Contribution:'}
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: '#c2410c' }}>
                    {(allTimeFinancial.totalPenaltyVND || 0).toLocaleString('vi-VN')} VNĐ
                  </span>
                  {allTimeFinancial.penaltyRank && (
                    <span style={{ background: '#ffedd5', color: '#9a3412', padding: '1px 6px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>
                      #{allTimeFinancial.penaltyRank}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {isGoalReached && (
            <p className="goal-congrats">🎉 {t('goalReached')}</p>
          )}
        </>
      )}
    </div>
  );
}


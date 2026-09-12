import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLang } from '../i18n/LangContext';
import { Target, Edit2, Check, X, ShieldAlert, ShieldCheck, Info, Sparkles, CheckCircle2, Clock, Activity, Calendar, TrendingUp, BarChart2 } from 'lucide-react';
import { getAthleteMatchKey } from '../utils/challengeStats';

export default function PersonalGoal({ 
  activities = [], 
  athlete, 
  apiFetch, 
  challengeMonth, 
  challengeYear, 
  challengeParticipants = {},
  challengeData = [],
  isAdmin = false,
  lockTargetsAfterDate = 0
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

  // Calculate if editing is locked by date
  let isLockedByDate = false;
  if (!isAdmin && lockTargetsAfterDate > 0) {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayYear = today.getFullYear();
    
    const isPastMonth = currentYear < todayYear || (currentYear === todayYear && currentMonth < todayMonth);
    const isCurrentMonth = currentYear === todayYear && currentMonth === todayMonth;
    
    if (isPastMonth) {
      isLockedByDate = true;
    } else if (isCurrentMonth && today.getDate() > lockTargetsAfterDate) {
      isLockedByDate = true;
    }
  }

  // Fetch all-time financial contribution from penalties ledger
  useEffect(() => {
    if (apiFetch) {
      apiFetch('/penalties/ledger')
        .then(res => {
          if (res && Array.isArray(res.members)) {
            const athId = athlete?.id ? String(athlete.id) : null;
            const normFullName = `${athlete?.firstname || ''} ${athlete?.lastname || ''}`.trim().toLowerCase();
            const match = res.members.find(m => 
              (athId && m.athleteId && String(m.athleteId) === athId) ||
              (m.rawName && userMatchKey && m.rawName.toLowerCase() === userMatchKey.toLowerCase()) ||
              (normFullName && m.fullName && m.fullName.toLowerCase() === normFullName)
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
      if (e && e.detail) {
        const { matchKey, year: updatedYear, month: updatedMonth, target, penalty } = e.detail;
        if (matchKey === userMatchKey && updatedYear == currentYear && updatedMonth == currentMonth) {
          if (target !== undefined) {
            const num = Number(target);
            const validTarget = !isNaN(num) && num > 0 ? num : 0;
            setGoal(validTarget);
            setTempGoal(validTarget > 0 ? String(validTarget) : '100');
          }
          if (penalty !== undefined) {
            setHasPenalty(Boolean(penalty));
            setTempPenalty(Boolean(penalty));
          }
        }
      }
      setTimeout(loadUserTarget, 300);
    };

    window.addEventListener('challengeTargetsUpdated', handleTargetsUpdated);
    return () => window.removeEventListener('challengeTargetsUpdated', handleTargetsUpdated);
  }, [loadUserTarget, userMatchKey, currentYear, currentMonth]);

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

  // Format month text
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString(
    lang === 'vi' ? 'vi-VN' : 'en-US', 
    { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }
  );

  // Smart Pace & Days Analysis
  const paceAnalysis = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = (today.getMonth() + 1 === currentMonth) && (today.getFullYear() === currentYear);
    const isPastMonth = (currentYear < today.getFullYear()) || (currentYear === today.getFullYear() && currentMonth < (today.getMonth() + 1));
    const isFutureMonth = (currentYear > today.getFullYear()) || (currentYear === today.getFullYear() && currentMonth > (today.getMonth() + 1));

    let daysPassed = 0;
    let daysLeft = 0;
    const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    if (isCurrentMonth) {
      daysPassed = today.getDate();
      daysLeft = Math.max(1, totalDaysInMonth - daysPassed + 1); // including today
    } else if (isPastMonth) {
      daysPassed = totalDaysInMonth;
      daysLeft = 0;
    } else {
      daysPassed = 0;
      daysLeft = totalDaysInMonth;
    }

    const remainingKm = Math.max(0, Math.round((goal - currentDist) * 10) / 10);
    const requiredPacePerDay = (daysLeft > 0 && remainingKm > 0) ? (remainingKm / daysLeft).toFixed(1) : '0.0';
    const expectedPercent = totalDaysInMonth > 0 ? (daysPassed / totalDaysInMonth) * 100 : 0;
    const currentPercent = goal > 0 ? (currentDist / goal) * 100 : 0;

    return {
      isCurrentMonth,
      isPastMonth,
      isFutureMonth,
      daysPassed,
      daysLeft,
      totalDaysInMonth,
      remainingKm,
      requiredPacePerDay,
      expectedPercent,
      currentPercent
    };
  }, [goal, currentDist, currentYear, currentMonth]);

  // Tính tiền phạt dự kiến nếu có cam kết phạt và target > 0
  let penaltyDue = 0;
  if (hasPenalty && goal > 0) {
    if (paceAnalysis.remainingKm > 0) {
      const rawK = 200 * (paceAnalysis.remainingKm / goal);
      penaltyDue = Math.min(200, Math.ceil(rawK / 10) * 10);
    }
  }

  // Calculate Monthly Statistics
  const monthlyStats = useMemo(() => {
    let totalDist = 0;
    let totalTime = 0;
    let longestRun = 0;
    let runsCount = 0;
    const activeDaysSet = new Set();

    if (activities && activities.length > 0) {
      activities.forEach(act => {
        if (act.start_date_local && act.distance) {
          const actDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
          const actDate = new Date(actDateStr);
          if (actDate.getFullYear() === currentYear && (actDate.getMonth() + 1) === currentMonth) {
            const type = (act.type || '').toLowerCase();
            if (['run', 'virtualrun', 'trailrun', 'trail run'].includes(type) || type.includes('run') || type.includes('trail') || !type) {
              const distKm = act.distance / 1000;
              totalDist += distKm;
              if (act.moving_time) totalTime += act.moving_time;
              if (distKm > longestRun) longestRun = distKm;
              runsCount++;
              activeDaysSet.add(actDate.getDate());
            }
          }
        }
      });
    }
    
    let avgPaceStr = '--:--';
    if (totalDist > 0 && totalTime > 0) {
      const paceSecondsPerKm = totalTime / totalDist;
      const mins = Math.floor(paceSecondsPerKm / 60);
      const secs = Math.floor(paceSecondsPerKm % 60);
      avgPaceStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const hours = Math.floor(totalTime / 3600);
    const minutes = Math.floor((totalTime % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      totalDistance: Math.round(totalDist * 10) / 10,
      totalTimeStr: timeStr,
      activeDays: activeDaysSet.size,
      runsCount,
      longestRun: Math.round(longestRun * 10) / 10,
      averagePace: avgPaceStr,
      avgDistPerRun: runsCount > 0 ? Math.round((totalDist / runsCount) * 10) / 10 : 0
    };
  }, [activities, currentYear, currentMonth]);

  const aiCoach = useMemo(() => {
    if (goal <= 0) {
      return {
        message: lang === 'vi' ? 'Hãy thiết lập mục tiêu tháng để nhận tư vấn và kế hoạch tập luyện cá nhân hóa!' : 'Set a monthly goal to get personalized coaching and training plans!',
        type: 'info'
      };
    }
    
    if (isGoalReached) {
      return {
        message: lang === 'vi' ? 'Tuyệt vời! Bạn đã đạt mục tiêu tháng này. Hãy nghỉ ngơi phục hồi hoặc đặt thêm một mục tiêu phụ (stretch goal) nhé.' : 'Incredible! You reached your goal. Take some rest or push for a stretch goal.',
        type: 'success'
      };
    }

    if (paceAnalysis.isPastMonth) {
      return {
        message: lang === 'vi' ? 'Tháng này đã kết thúc. Chúc bạn có những thành tích tốt hơn trong tương lai!' : 'This month has ended. Wish you better achievements in the future!',
        type: 'info'
      };
    }

    if (paceAnalysis.isFutureMonth) {
      return {
        message: lang === 'vi' ? 'Tháng này chưa bắt đầu. Hãy lên kế hoạch tập luyện sẵn sàng nhé!' : 'This month hasn\'t started yet. Get ready!',
        type: 'info'
      };
    }

    if (paceAnalysis.currentPercent >= paceAnalysis.expectedPercent) {
      return {
        message: lang === 'vi' 
          ? `Làm tốt lắm! Bạn đang đi đúng tiến độ. Cứ giữ nhịp độ tối thiểu ${paceAnalysis.requiredPacePerDay} km/ngày, bạn sẽ hoàn thành mục tiêu dễ dàng.` 
          : `Great job! You are on track. Maintain at least ${paceAnalysis.requiredPacePerDay} km/day to hit your goal easily.`,
        type: 'success'
      };
    } else {
      return {
        message: lang === 'vi' 
          ? `Bạn đang chậm hơn tiến độ dự kiến. Cần chạy trung bình ${paceAnalysis.requiredPacePerDay} km/ngày trong ${paceAnalysis.daysLeft} ngày còn lại. Hãy sắp xếp thời gian nhé!` 
          : `You're slightly behind schedule. You need to run ${paceAnalysis.requiredPacePerDay} km/day for the remaining ${paceAnalysis.daysLeft} days. You can do it!`,
        type: 'warning'
      };
    }
  }, [goal, isGoalReached, paceAnalysis, lang]);

  return (
    <div className="personal-goal-dashboard pg-layout-2col">
      
      {/* COLUMN 1: HERO CARD (MONTHLY GOAL + STATS + AI COACH) */}
      <div className="pg-card pg-hero-card">
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
            <button 
              className="btn-icon btn-edit-goal" 
              onClick={isLockedByDate ? undefined : handleStartEdit} 
              title={isLockedByDate ? `${lang === 'en' ? 'Only Admins can edit targets after day' : 'Chỉ Admin mới có thể thay đổi mục tiêu sau ngày'} ${lockTargetsAfterDate}` : t('editGoal')}
              style={isLockedByDate ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              disabled={isLockedByDate}
            >
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
            {/* Goal Progress Bar */}
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

            {isGoalReached && (
              <p className="goal-congrats">🎉 {t('goalReached')}</p>
            )}

            {/* Smart Pacing Metrics Bar */}
            <div className="pg-goal-smart-metrics">
              <div className="smart-metric-item">
                <span className="smart-metric-label">{t('daysRemaining')}</span>
                <span className="smart-metric-val">
                  {paceAnalysis.isCurrentMonth ? `${paceAnalysis.daysLeft} ${lang === 'vi' ? 'ngày' : 'days'}` : (paceAnalysis.isPastMonth ? (lang === 'vi' ? 'Đã hết' : 'Ended') : `${paceAnalysis.daysLeft} ${lang === 'vi' ? 'ngày' : 'days'}`)}
                </span>
              </div>
              <div className="smart-metric-divider" />
              <div className="smart-metric-item">
                <span className="smart-metric-label">{lang === 'vi' ? 'Còn thiếu' : 'Remaining'}</span>
                <span className="smart-metric-val highlight">
                  {isGoalReached ? '0 km' : `${paceAnalysis.remainingKm} km`}
                </span>
              </div>
              <div className="smart-metric-divider" />
              <div className="smart-metric-item">
                <span className="smart-metric-label">{t('dailyPaceTarget')}</span>
                <span className="smart-metric-val accent">
                  {isGoalReached ? (lang === 'vi' ? 'Đã hoàn thành' : 'Completed') : `${paceAnalysis.requiredPacePerDay} km/${lang === 'vi' ? 'ngày' : 'day'}`}
                </span>
              </div>
            </div>

            {/* 3x2 Monthly Stats Grid */}
            <div className="monthly-stats-grid">
              <div className="stat-widget">
                <div className="stat-widget-icon"><Activity size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Tổng Km' : 'Total Distance'}</span>
                  <span className="stat-widget-value">{monthlyStats.totalDistance} <small>km</small></span>
                </div>
              </div>
              <div className="stat-widget">
                <div className="stat-widget-icon"><Clock size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Thời gian' : 'Moving Time'}</span>
                  <span className="stat-widget-value">{monthlyStats.totalTimeStr}</span>
                </div>
              </div>
              <div className="stat-widget">
                <div className="stat-widget-icon"><Calendar size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Ngày chạy' : 'Active Days'}</span>
                  <span className="stat-widget-value">{monthlyStats.activeDays} <small>{lang === 'vi' ? 'ngày' : 'days'}</small></span>
                </div>
              </div>
              <div className="stat-widget">
                <div className="stat-widget-icon"><BarChart2 size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Tốc độ TB' : 'Avg Pace'}</span>
                  <span className="stat-widget-value">{monthlyStats.averagePace} <small>/km</small></span>
                </div>
              </div>
              <div className="stat-widget">
                <div className="stat-widget-icon"><TrendingUp size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Dài nhất' : 'Longest Run'}</span>
                  <span className="stat-widget-value">{monthlyStats.longestRun} <small>km</small></span>
                </div>
              </div>
              <div className="stat-widget">
                <div className="stat-widget-icon"><Target size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Số lần chạy' : 'Total Runs'}</span>
                  <span className="stat-widget-value">{monthlyStats.runsCount} <small>{lang === 'vi' ? 'lần' : 'runs'}</small></span>
                </div>
              </div>
            </div>

            {/* AI Coach / Recommendations */}
            <div className={`ai-coach-box ai-coach-${aiCoach.type}`}>
              <div className="ai-coach-icon">
                <Sparkles size={17} />
              </div>
              <div className="ai-coach-content">
                <h4 className="ai-coach-title">
                  {lang === 'vi' ? 'Tư vấn & Kế hoạch' : 'Coach Recommendations'}
                </h4>
                <p className="ai-coach-message">{aiCoach.message}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* COLUMN 2: ASIDE CARD (DISCIPLINE & CLUB FUND) */}
      <div className="pg-card pg-aside-penalty-card">
        <div className="personal-goal__header">
          <div className="personal-goal__title">
            <div className="personal-goal__icon-badge" style={{ background: 'rgba(255, 152, 0, 0.1)' }}>
              <ShieldAlert size={20} color="#FF9800" />
            </div>
            <div>
              <span className="personal-goal__main-title">{t('disciplineAndFund')}</span>
              <span className="personal-goal__month-subtitle"> ({monthName})</span>
            </div>
          </div>
        </div>

        <div className="pg-aside-content">
          <div className="personal-goal__penalty-section">
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
                <p className="penalty-status-desc">
                  {isGoalReached ? (
                    lang === 'vi' 
                      ? '🎉 Xuất sắc! Bạn đã hoàn thành mục tiêu đề ra và không bị phạt tiền tháng này.' 
                      : '🎉 Outstanding! You reached your goal and have 0k penalty.'
                  ) : (
                    lang === 'vi' 
                      ? `🏃 Bạn còn thiếu ${paceAnalysis.remainingKm} km để hoàn thành mục tiêu và tránh nộp phạt.` 
                      : `🏃 You need ${paceAnalysis.remainingKm} more km to complete your goal and avoid penalty.`
                  )}
                </p>
              </div>
            ) : (
              <div className="penalty-status-box penalty-status-none">
                <div className="penalty-status-header">
                  <Info size={18} className="penalty-icon neutral" />
                  <span className="penalty-status-title" style={{ color: 'var(--text-secondary)' }}>
                    {t('penaltyNotCommitted')}
                  </span>
                  <button 
                    type="button" 
                    className="btn-premium-action" 
                    onClick={isLockedByDate ? undefined : handleStartEdit}
                    title={isLockedByDate ? `${lang === 'en' ? 'Only Admins can edit targets after day' : 'Chỉ Admin mới có thể thay đổi mục tiêu sau ngày'} ${lockTargetsAfterDate}` : ''}
                    style={isLockedByDate ? { opacity: 0.5, cursor: 'not-allowed', textDecoration: 'none', marginLeft: 'auto' } : { marginLeft: 'auto' }}
                    disabled={isLockedByDate}
                  >
                    <Sparkles size={14} style={{ marginRight: 6 }} />
                    {lang === 'vi' ? 'Tham gia Phạt' : 'Join Penalty'}
                  </button>
                </div>
                <p className="penalty-status-desc" style={{ color: 'var(--text-muted)' }}>
                  🏃 {lang === 'vi' ? 'Tham gia mục tiêu có phạt để nâng cao kỷ luật và đóng góp quỹ nhóm.' : 'Join penalty goals to increase discipline and contribute to the club fund.'}
                </p>
              </div>
            )}
          </div>

          {saveSuccess && (
            <div className="sync-success-pill">
              <CheckCircle2 size={14} color="#10b981" />
              <span>{t('syncedWithAdmin')}</span>
            </div>
          )}

          {/* Club All-Time Contribution */}
          <div className="personal-goal__club-contribution">
            <div className="contribution-header">
              <div className="contribution-meta">
                <span className="contribution-title">{t('clubAllTimeContribution')}</span>
                <span className="contribution-sub">{lang === 'vi' ? 'Tích lũy toàn thời gian' : 'All-time accumulation'}</span>
              </div>
              {allTimeFinancial && allTimeFinancial.penaltyRank > 0 && (
                <span className="contribution-rank" title={lang === 'vi' ? 'Thứ hạng đóng góp' : 'Contribution Rank'}>
                  Top #{allTimeFinancial.penaltyRank}
                </span>
              )}
            </div>
            <div className="contribution-value">
              {allTimeFinancial ? (allTimeFinancial.totalPenaltyVND || 0).toLocaleString('vi-VN') : '0'} <small>VNĐ</small>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


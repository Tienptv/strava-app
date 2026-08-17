import React, { useState, useEffect, useCallback } from 'react';
import { useLang } from '../i18n/LangContext';
import { normalize } from '../utils/challengeStats';
import { Save, CheckCircle2, Target, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function ChallengeTable({ challengeData, year, month, apiFetch, athlete, isAdmin = false, allowEditOthers = false }) {
  const { t } = useLang();
  
  const [userData, setUserData] = useState({});
  const [quickTarget, setQuickTarget] = useState('');
  const [quickPenalty, setQuickPenalty] = useState(false);
  const [isSavingQuick, setIsSavingQuick] = useState(false);
  const [quickSaveSuccess, setQuickSaveSuccess] = useState(false);

  // Identify the SINGLE best matching row for the logged-in athlete
  const myRow = React.useMemo(() => {
    if (!athlete || !challengeData || challengeData.length === 0) return null;
    const athId = athlete.id ? String(athlete.id) : null;
    const normFname = normalize(athlete.firstname);
    const normLname = normalize(athlete.lastname);

    // 1. Khớp tuyệt đối theo ID vận động viên Strava (Chuẩn xác nhất)
    if (athId) {
      const matchById = challengeData.find(row => row.member?.id && String(row.member.id) === athId);
      if (matchById) return matchById;
    }

    // 2. Khớp đúng thứ tự Tên - Họ (Tuyệt đối không đảo Họ Tên)
    const matchByDirect = challengeData.find(row => {
      const mF = normalize(row.member?.firstname);
      const mL = normalize(row.member?.lastname);
      if (mF !== normFname) return false;
      if (!normLname) return true;
      return mL === normLname || (normLname && mL.startsWith(normLname.charAt(0))) || (mL && normLname.startsWith(mL));
    });
    if (matchByDirect) return matchByDirect;

    return null;
  }, [athlete, challengeData]);

  const myMatchKey = myRow ? myRow.matchKey : (athlete ? `${athlete.firstname}_${athlete.lastname ? athlete.lastname.trim().charAt(0) + '.' : ''}` : null);
  const myUserKey = myMatchKey ? `${myMatchKey}_${year}_${month}` : null;

  const loadTargets = useCallback(() => {
    if (apiFetch) {
      apiFetch('/challenge/targets', { cache: 'no-store' })
        .then(data => setUserData(data || {}))
        .catch(e => console.error("Error loading user data from API", e));
    }
  }, [apiFetch]);

  useEffect(() => {
    loadTargets();

    const handleTargetsUpdated = () => {
      loadTargets();
    };

    const handleFocus = () => {
      loadTargets();
    };

    window.addEventListener('challengeTargetsUpdated', handleTargetsUpdated);
    window.addEventListener('focus', handleFocus);

    // Live auto-sync: Poll every 8s so Admin and other athletes see updates in real time
    const interval = setInterval(loadTargets, 8000);

    return () => {
      window.removeEventListener('challengeTargetsUpdated', handleTargetsUpdated);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [loadTargets]);

  // Sync quickTarget and quickPenalty from userData whenever userData or month/year changes
  useEffect(() => {
    if (myUserKey && userData[myUserKey]) {
      const tgt = userData[myUserKey].target;
      setQuickTarget(tgt !== undefined && tgt !== '' ? String(tgt) : '');
      setQuickPenalty(Boolean(userData[myUserKey].penalty));
    } else if (myMatchKey && userData[myMatchKey]) {
      const tgt = userData[myMatchKey].target;
      setQuickTarget(tgt !== undefined && tgt !== '' ? String(tgt) : '');
      setQuickPenalty(Boolean(userData[myMatchKey].penalty));
    } else {
      setQuickTarget('');
      setQuickPenalty(false);
    }
  }, [userData, myUserKey, myMatchKey]);

  const saveToApi = (updates) => {
    if (apiFetch) {
      apiFetch('/challenge/targets', {
        method: 'POST',
        body: JSON.stringify(updates)
      }).catch(e => console.error("Error saving data", e));
    }
  };

  const onUserDataChange = (matchKey, field, value) => {
    const key = `${matchKey}_${year}_${month}`;
    setUserData(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
    saveToApi({ matchKey: key, [field]: value });
    
    // Broadcast change so PersonalGoal and other views update immediately
    window.dispatchEvent(new CustomEvent('challengeTargetsUpdated', {
      detail: { matchKey, year, month, [field]: value }
    }));
  };

  const handleSaveQuickGoal = async (e) => {
    if (e) e.preventDefault();
    if (!myMatchKey) return;
    setIsSavingQuick(true);
    const cleanStr = String(quickTarget).trim().replace(/^0+(?=\d)/, '');
    const num = cleanStr === '' ? '' : parseInt(cleanStr, 10);
    const validTarget = isNaN(num) ? '' : num;
    const isPen = Boolean(quickPenalty);

    const key = `${myMatchKey}_${year}_${month}`;
    setUserData(prev => ({
      ...prev,
      [key]: { ...prev[key], target: validTarget, penalty: isPen }
    }));

    if (apiFetch) {
      try {
        await apiFetch('/challenge/targets', {
          method: 'POST',
          body: JSON.stringify({ matchKey: key, target: validTarget, penalty: isPen })
        });
      } catch (err) {
        console.error('Error saving quick goal:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('challengeTargetsUpdated', {
      detail: { matchKey: myMatchKey, year, month, target: validTarget, penalty: isPen }
    }));

    setIsSavingQuick(false);
    setQuickSaveSuccess(true);
    setTimeout(() => setQuickSaveSuccess(false), 3000);
  };

  const handleTargetChange = (matchKey, val) => {
    if (val === '') {
      onUserDataChange(matchKey, 'target', '');
      return;
    }
    const cleanStr = String(val).replace(/^0+(?=\d)/, '');
    const num = parseInt(cleanStr, 10);
    onUserDataChange(matchKey, 'target', isNaN(num) ? '' : num);
  };

  const handleTargetBlur = (matchKey, val) => {
    if (val === '' || val === undefined) {
      onUserDataChange(matchKey, 'target', '');
      return;
    }
    const cleanStr = String(val).replace(/^0+(?=\d)/, '');
    const num = parseInt(cleanStr, 10);
    onUserDataChange(matchKey, 'target', isNaN(num) ? '' : num);
  };

  const handleTargetKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handlePenaltyChange = (matchKey, isChecked) => {
    onUserDataChange(matchKey, 'penalty', isChecked);
  };

  // Tính khoảng cách xa nhất trong 1 ngày của tháng để làm mốc cho heatmap (red -> green)
  const maxDailyDist = React.useMemo(() => {
    let max = 0;
    challengeData.forEach(row => {
      Object.values(row.dailyDistances).forEach(d => {
        if (d > max) max = d;
      });
    });
    return max > 0 ? max : 1;
  }, [challengeData]);

  // Hàm tính màu HSL từ đỏ (0) đến xanh lá (120)
  const getHeatmapColor = (dist) => {
    if (!dist || dist <= 0) return '';
    const ratio = Math.min(dist / maxDailyDist, 1);
    const hue = ratio * 120; // 0 is red, 120 is green
    return `hsl(${hue}, 75%, 85%)`; // Light pastel color so black/navy text is readable
  };

  // Calculate days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  if (!challengeData || challengeData.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📊</div>
        <div className="empty-state__title">{t('noChallengeData')}</div>
        <p>{t('noChallengeDataHint')}</p>
      </div>
    );
  }

  // Format Total time (seconds -> H:MM:SS)
  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="challenge-container">
      <div className="challenge-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section__title">
          {t('challengeMonth')} {month}/{year}
        </h2>
        
        {challengeData.length > 0 && challengeData[0].totalDistance > 0 && (
          <div className="runner-of-the-month" title="Runner of the Month">
             <span className="rotm-icon">🏆</span>
             <span className="rotm-name">{challengeData[0].member.firstname} {challengeData[0].member.lastname}</span>
             <span className="rotm-dist">{challengeData[0].totalDistance.toFixed(1)} km</span>
          </div>
        )}
      </div>

      {/* User Quick Goal & Penalty Bar */}
      {athlete && showQuickGoalBox && (
        <div className="runner-quick-goal-bar">
          <div className="quick-goal-header">
            <div className="quick-goal-icon">
              <Target size={20} color="#00A3A6" />
            </div>
            <div className="quick-goal-title-area">
              <div className="quick-goal-title">
                <strong>{t('yourMonthlyGoal')}</strong> ({month}/{year})
                {myRow && <span className="runner-me-badge">{t('you')}</span>}
              </div>
              <div className="quick-goal-subtitle">
                {t('quickSetupHint')}
              </div>
            </div>
          </div>

          <form className="quick-goal-form" onSubmit={handleSaveQuickGoal}>
            <div className="quick-goal-inputs">
              <div className="quick-input-field">
                <label className="quick-field-label">{t('targetKm')}:</label>
                <div className="quick-input-box">
                  <input 
                    type="number"
                    value={quickTarget}
                    onChange={(e) => setQuickTarget(e.target.value)}
                    placeholder="0"
                    className="quick-number-input"
                    min="0"
                  />
                  <span className="quick-unit-label">km</span>
                </div>
              </div>

              <label className="quick-penalty-box">
                <input 
                  type="checkbox"
                  checked={quickPenalty}
                  onChange={(e) => setQuickPenalty(e.target.checked)}
                  className="quick-checkbox"
                />
                <span className="quick-penalty-text">
                  <strong>{t('joinPenaltyChallenge')}</strong>
                </span>
              </label>
            </div>

            <div className="quick-goal-actions">
              <button 
                type="submit" 
                className="btn-quick-save"
                disabled={isSavingQuick}
              >
                <Save size={16} style={{ marginRight: 6 }} />
                {isSavingQuick ? t('saving') : t('saveGoalAndPenalty')}
              </button>
            </div>
          </form>

          {quickSaveSuccess && (
            <div className="quick-save-alert">
              <CheckCircle2 size={16} color="#10b981" />
              <span>{t('savedSuccessAdmin')}</span>
            </div>
          )}
        </div>
      )}

      <div className="challenge-table-wrapper">
        <table className="challenge-table">
          <thead>
            <tr>
              <th className="sticky-col first-col">{t('runner')}</th>
              {daysArray.map(day => (
                <th key={day} className="day-col">{day}</th>
              ))}
              <th className="sum-col sticky-right col-target">{t('target')}</th>
              <th className="sum-col sticky-right col-penalty">{t('penalty')}</th>
              <th className="sum-col sticky-right col-due">{t('penaltyDue')}</th>
              <th className="sum-col sticky-right col-progress">{t('progress')}</th>
              <th className="sum-col sticky-right col-km">{t('sumKm')}</th>
              <th className="sum-col sticky-right col-days">Σ Days</th>
              <th className="sum-col sticky-right col-time">Σ Time</th>
              <th className="sum-col sticky-right col-all-time">Σ All-km</th>
            </tr>
          </thead>
          <tbody>
            {challengeData.map((row, index) => {
              const userKey = `${row.matchKey}_${year}_${month}`;
              const userTarget = parseFloat(userData[userKey]?.target !== undefined ? userData[userKey]?.target : (userData[row.matchKey]?.target || 0));
              const hasPenalty = Boolean(userData[userKey]?.penalty !== undefined ? userData[userKey]?.penalty : userData[row.matchKey]?.penalty);
              const showTrackBar = userTarget > 0;
              const progressPct = showTrackBar ? Math.min(100, Math.round((row.totalDistance / userTarget) * 100)) : 0;
              const isCompleted = progressPct >= 100;

              // Check if this row is the logged in athlete
              // Check if this row is the logged in athlete (Chỉ 1 dòng duy nhất được gán isMe)
              const isMe = Boolean(myRow && myRow.matchKey === row.matchKey);

              // Admin can edit all; normal user can edit their own row, unless allowEditOthers is true
              const canEdit = Boolean(isAdmin || isMe || allowEditOthers);

              // Tính tiền phạt phải nộp: Chỉ áp dụng khi có tick checkbox penalty và target > 0
              // max 200k, tỷ lệ theo số km chưa hoàn thành, làm tròn lên mốc 10k (ví dụ: 64k -> 70k, 86k -> 90k, 106k -> 110k)
              let penaltyAmount = null;
              if (hasPenalty && userTarget > 0) {
                const remainingKm = Math.max(0, userTarget - row.totalDistance);
                if (remainingKm <= 0) {
                  penaltyAmount = 0;
                } else {
                  const rawK = 200 * (remainingKm / userTarget);
                  penaltyAmount = Math.min(200, Math.ceil(rawK / 10) * 10);
                }
              }

              return (
                <tr key={index} className={`runner-row rank-${index + 1} ${isMe ? 'runner-row--me' : ''}`}>
                  <td className="sticky-col first-col">
                    <div className="runner-info">
                      <span className="runner-rank">{index + 1}.</span>
                      <span className="runner-name">
                        {row.member.firstname} {row.member.lastname}
                        {isMe && <span className="runner-me-badge" title="Tài khoản của bạn">{t('you')}</span>}
                        {row.rank === 1 && <span title="Top 1" style={{ marginLeft: 4 }}>🥇</span>}
                        {row.rank === 2 && <span title="Top 2" style={{ marginLeft: 4 }}>🥈</span>}
                        {row.rank === 3 && <span title="Top 3" style={{ marginLeft: 4 }}>🥉</span>}
                        {row.maxStreak >= 3 && <span title={`Streak ${row.maxStreak}!`} style={{ marginLeft: 4 }}>🔥</span>}
                        {row.isTurtle && <span title="Turtle" style={{ marginLeft: 4 }}>🐢</span>}
                      </span>
                    </div>
                  </td>
                  
                  {daysArray.map(day => {
                    const dist = row.dailyDistances[day];
                    const hasRun = dist > 0;
                    const displayDist = hasRun ? (Math.round(dist * 10) / 10).toFixed(1) : '';
                    const bgColor = hasRun ? getHeatmapColor(dist) : '';
                    return (
                      <td 
                        key={day} 
                        className={`day-cell ${hasRun ? 'has-run' : ''}`}
                        title={hasRun ? `${displayDist} km` : ''}
                        style={{ backgroundColor: bgColor }}
                      >
                        {displayDist}
                      </td>
                    );
                  })}

                  <td className="sum-cell sticky-right col-target">
                    {(() => {
                      const rawTarget = userData[userKey]?.target !== undefined 
                        ? userData[userKey]?.target 
                        : userData[row.matchKey]?.target;
                      const displayTarget = (rawTarget !== undefined && rawTarget !== '') 
                        ? (isNaN(Number(rawTarget)) ? '' : Number(rawTarget)) 
                        : '';
                      const isZeroVal = displayTarget === 0;

                      return (
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={displayTarget}
                          onChange={(e) => handleTargetChange(row.matchKey, e.target.value)}
                          onBlur={(e) => handleTargetBlur(row.matchKey, e.target.value)}
                          onKeyDown={handleTargetKeyDown}
                          disabled={!canEdit}
                          title={!canEdit ? 'Chỉ vận động viên hoặc Admin mới có quyền sửa' : 'Nhập mục tiêu km'}
                          className={`target-input ${isZeroVal ? 'is-zero-target' : ''} ${!canEdit ? 'target-input--readonly' : ''} ${isMe ? 'target-input--me' : ''}`}
                        />
                      );
                    })()}
                  </td>
                  <td className="sum-cell sticky-right col-penalty">
                    <input 
                      type="checkbox" 
                      checked={hasPenalty}
                      onChange={(e) => handlePenaltyChange(row.matchKey, e.target.checked)}
                      disabled={!canEdit}
                      title={!canEdit ? 'Chỉ vận động viên hoặc Admin mới có quyền sửa' : 'Tick tham gia cam kết nộp phạt'}
                      style={{ cursor: canEdit ? 'pointer' : 'default', opacity: canEdit ? 1 : 0.8 }} 
                      className={isMe ? 'penalty-checkbox--me' : ''}
                    />
                  </td>
                  <td className="sum-cell sticky-right col-due">
                    {penaltyAmount !== null ? (
                      <span className={`penalty-due-badge ${penaltyAmount === 0 ? 'is-free' : 'is-owing'}`}>
                        {penaltyAmount === 0 ? '0k' : `${penaltyAmount}k`}
                      </span>
                    ) : (
                      <span className="text-muted" style={{ opacity: 0.4 }}>-</span>
                    )}
                  </td>
                  <td className="sum-cell sticky-right col-progress">
                    {showTrackBar ? (
                      <div 
                        className="runner-track-bar-container" 
                        title={`${row.totalDistance.toFixed(1)} / ${userTarget} km (${progressPct}%)`}
                      >
                        <div className="runner-track-bar-bg">
                          <div 
                            className={`runner-track-bar-fill ${isCompleted ? 'completed' : ''}`}
                            style={{ width: `${Math.max(progressPct, 2)}%` }}
                          />
                        </div>
                        <span className={`runner-track-bar-label ${isCompleted ? 'completed-label' : ''}`}>
                          {progressPct}% {isCompleted ? '🎯' : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted" style={{ opacity: 0.4 }}>-</span>
                    )}
                  </td>
                  <td className="sum-cell sticky-right col-km highlight-total">{row.totalDistance.toFixed(1)}</td>
                  <td className="sum-cell sticky-right col-days">{row.totalDays}</td>
                  <td className="sum-cell sticky-right col-time">{formatTime(row.totalMovingTime)}</td>
                  <td className="sum-cell sticky-right col-all-time">{row.allTimeDistance ? row.allTimeDistance.toFixed(1) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
          
          {/* Footer with totals (optional, but good for summary) */}
          <tfoot>
            <tr className="totals-row">
              <td className="sticky-col first-col"><strong>{t('total')}</strong></td>
              {daysArray.map(day => {
                const dayTotal = challengeData.reduce((sum, row) => sum + row.dailyDistances[day], 0);
                return (
                  <td key={day} className="day-cell">
                    {dayTotal > 0 ? (Math.round(dayTotal * 10) / 10).toFixed(1) : ''}
                  </td>
                );
              })}
              <td className="sum-cell sticky-right col-target">-</td>
              <td className="sum-cell sticky-right col-penalty">-</td>
              {(() => {
                let totalPenaltyDue = 0;
                let hasAnyPenaltyRunner = false;
                challengeData.forEach(r => {
                  const k = `${r.matchKey}_${year}_${month}`;
                  const tgt = parseFloat(userData[k]?.target || 0);
                  const pen = Boolean(userData[k]?.penalty);
                  if (pen && tgt > 0) {
                    hasAnyPenaltyRunner = true;
                    const rem = Math.max(0, tgt - r.totalDistance);
                    if (rem > 0) {
                      const rawK = 200 * (rem / tgt);
                      totalPenaltyDue += Math.min(200, Math.ceil(rawK / 10) * 10);
                    }
                  }
                });
                return (
                  <td className="sum-cell sticky-right col-due">
                    <strong>
                      {hasAnyPenaltyRunner ? `${totalPenaltyDue}k` : '-'}
                    </strong>
                  </td>
                );
              })()}
              <td className="sum-cell sticky-right col-progress">-</td>
              <td className="sum-cell sticky-right col-km">
                <strong>
                  {challengeData.reduce((sum, row) => sum + row.totalDistance, 0).toFixed(1)}
                </strong>
              </td>
              <td className="sum-cell sticky-right col-days">
                {challengeData.reduce((sum, row) => sum + row.totalDays, 0)}
              </td>
              <td className="sum-cell sticky-right col-time">-</td>
              <td className="sum-cell sticky-right col-all-time">
                <strong>
                  {challengeData.some(row => row.allTimeDistance) 
                    ? challengeData.reduce((sum, row) => sum + (row.allTimeDistance || 0), 0).toFixed(1)
                    : '-'}
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

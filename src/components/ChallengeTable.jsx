import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';

export default function ChallengeTable({ challengeData, year, month, apiFetch }) {
  const { t } = useLang();
  
  const [userData, setUserData] = useState({});

  useEffect(() => {
    if (apiFetch) {
      apiFetch('/challenge/targets', { cache: 'no-store' })
        .then(data => setUserData(data || {}))
        .catch(e => console.error("Error loading user data from API", e));
    }
  }, [apiFetch]);

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
              const userTarget = parseFloat(userData[userKey]?.target || 0);
              const hasPenalty = Boolean(userData[userKey]?.penalty);
              const showTrackBar = userTarget > 0;
              const progressPct = showTrackBar ? Math.min(100, Math.round((row.totalDistance / userTarget) * 100)) : 0;
              const isCompleted = progressPct >= 100;

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
                <tr key={index} className={`runner-row rank-${index + 1}`}>
                  <td className="sticky-col first-col">
                    <div className="runner-info">
                      <span className="runner-rank">{index + 1}.</span>
                      <span className="runner-name">
                        {row.member.firstname} {row.member.lastname}
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
                      const rawTarget = userData[userKey]?.target;
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
                          className={`target-input ${isZeroVal ? 'is-zero-target' : ''}`}
                        />
                      );
                    })()}
                  </td>
                  <td className="sum-cell sticky-right col-penalty">
                    <input 
                      type="checkbox" 
                      checked={hasPenalty}
                      onChange={(e) => handlePenaltyChange(row.matchKey, e.target.checked)}
                      style={{ cursor: 'pointer' }} 
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

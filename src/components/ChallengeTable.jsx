import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';

export default function ChallengeTable({ challengeData, year, month }) {
  const { t } = useLang();
  
  const [userData, setUserData] = useState({});

  useEffect(() => {
    fetch('/api/challenge/targets')
      .then(res => res.json())
      .then(data => setUserData(data))
      .catch(e => console.error("Error loading user data from API", e));
  }, []);

  const saveToApi = (updates) => {
    fetch('/api/challenge/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }).catch(e => console.error("Error saving data", e));
  };

  const handleTargetChange = (matchKey, value) => {
    setUserData(prev => {
      const newData = { ...prev, [matchKey]: { ...prev[matchKey], target: value } };
      return newData;
    });
    // For a real app, maybe debounce this. For now, just save on change/blur
  };

  const handleTargetBlur = (matchKey, value) => {
    saveToApi({ matchKey, target: value });
  };

  const handlePenaltyChange = (matchKey, checked) => {
    setUserData(prev => {
      const newData = { ...prev, [matchKey]: { ...prev[matchKey], penalty: checked } };
      return newData;
    });
    saveToApi({ matchKey, penalty: checked });
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
              <th className="sticky-col first-col">Runner</th>
              {daysArray.map(day => (
                <th key={day} className="day-col">{day}</th>
              ))}
              <th className="sum-col sticky-right col-target">Target</th>
              <th className="sum-col sticky-right col-penalty">Penalty</th>
              <th className="sum-col sticky-right col-km">Σ km</th>
              <th className="sum-col sticky-right col-days">Σ Days</th>
              <th className="sum-col sticky-right col-time">Σ Time</th>
              <th className="sum-col sticky-right col-all-time">Σ All-km</th>
            </tr>
          </thead>
          <tbody>
            {challengeData.map((row, index) => (
              <tr key={index}>
                <td className="sticky-col first-col">
                  <div className="runner-info">
                    <span className="runner-rank">{index + 1}.</span>
                    <span className="runner-name">
                      {row.member.firstname} {row.member.lastname}
                      {row.rank === 1 && <span title="Hạng 1" style={{ marginLeft: 4 }}>🥇</span>}
                      {row.rank === 2 && <span title="Hạng 2" style={{ marginLeft: 4 }}>🥈</span>}
                      {row.rank === 3 && <span title="Hạng 3" style={{ marginLeft: 4 }}>🥉</span>}
                      {row.maxStreak >= 3 && <span title={`Chuỗi ${row.maxStreak} ngày!`} style={{ marginLeft: 4 }}>🔥</span>}
                      {row.isTurtle && <span title="Rùa chăm chỉ" style={{ marginLeft: 4 }}>🐢</span>}
                    </span>
                  </div>
                </td>
                
                {daysArray.map(day => {
                  const dist = row.dailyDistances[day];
                  const hasRun = dist > 0;
                  const displayDist = hasRun ? (Math.round(dist * 10) / 10).toFixed(1) : '';
                  return (
                    <td 
                      key={day} 
                      className={`day-cell ${hasRun ? 'has-run' : ''}`}
                      title={hasRun ? `${displayDist} km` : ''}
                    >
                      {displayDist}
                    </td>
                  );
                })}

                <td className="sum-cell sticky-right col-target">
                  <input 
                    type="number" 
                    placeholder="100" 
                    value={userData[row.matchKey]?.target || ''}
                    onChange={(e) => handleTargetChange(row.matchKey, e.target.value)}
                    onBlur={(e) => handleTargetBlur(row.matchKey, e.target.value)}
                    style={{ width: '50px', background: 'transparent', color: 'inherit', border: '1px solid var(--border-color, #333)', borderRadius: '4px', textAlign: 'center', padding: '2px' }} 
                  />
                </td>
                <td className="sum-cell sticky-right col-penalty">
                  <input 
                    type="checkbox" 
                    checked={userData[row.matchKey]?.penalty || false}
                    onChange={(e) => handlePenaltyChange(row.matchKey, e.target.checked)}
                    style={{ cursor: 'pointer' }} 
                  />
                </td>
                <td className="sum-cell sticky-right col-km highlight-total">{row.totalDistance.toFixed(1)}</td>
                <td className="sum-cell sticky-right col-days">{row.totalDays}</td>
                <td className="sum-cell sticky-right col-time">{formatTime(row.totalMovingTime)}</td>
                <td className="sum-cell sticky-right col-all-time">{row.allTimeDistance ? row.allTimeDistance.toFixed(1) : '-'}</td>
              </tr>
            ))}
          </tbody>
          
          {/* Footer with totals (optional, but good for summary) */}
          <tfoot>
            <tr className="totals-row">
              <td className="sticky-col first-col"><strong>TOTAL</strong></td>
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
                {challengeData.some(row => row.allTimeDistance) 
                  ? challengeData.reduce((sum, row) => sum + (row.allTimeDistance || 0), 0).toFixed(1)
                  : '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

import React from 'react';
import { useLang } from '../i18n/LangContext';

export default function ChallengeTable({ challengeData, year, month }) {
  const { t } = useLang();
  
  // Calculate days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  if (!challengeData || challengeData.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📊</div>
        <div className="empty-state__title">Không có dữ liệu Challenge</div>
        <p>Vui lòng chọn thành viên bên Sidebar và lưu Challenge để bắt đầu.</p>
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
      <div className="challenge-header">
        <h2 className="section__title">
          CHALLENGE THÁNG {month}/{year}
        </h2>
      </div>

      <div className="challenge-table-wrapper">
        <table className="challenge-table">
          <thead>
            <tr>
              <th className="sticky-col first-col">Runner</th>
              {daysArray.map(day => (
                <th key={day} className="day-col">{day}</th>
              ))}
              <th className="sum-col">Σ km</th>
              <th className="sum-col">Σ Days</th>
              <th className="sum-col">Σ Time</th>
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

                <td className="sum-cell highlight-total">{row.totalDistance.toFixed(1)}</td>
                <td className="sum-cell">{row.totalDays}</td>
                <td className="sum-cell">{formatTime(row.totalMovingTime)}</td>
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
              <td className="sum-cell">
                <strong>
                  {challengeData.reduce((sum, row) => sum + row.totalDistance, 0).toFixed(1)}
                </strong>
              </td>
              <td className="sum-cell">
                {challengeData.reduce((sum, row) => sum + row.totalDays, 0)}
              </td>
              <td className="sum-cell">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

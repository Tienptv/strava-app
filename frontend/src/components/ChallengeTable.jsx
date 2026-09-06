import React, { useState, useEffect, useCallback } from 'react';
import { useLang } from '../i18n/LangContext';
import { normalize } from '../utils/challengeStats';
import { Save, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { getAthleteAvatar } from '../utils/avatar';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Dải màu trải dài từ ô ngày 1 đến ô ngày cuối tháng
 * Theo đúng các màu trên ngôi sao của logo Royal HaskoningDHV:
 * - Đầu tháng: Xanh Ocean Teal (#008CA5)
 * - Giữa tháng: Xanh Lá Tươi (#2FB069)
 * - Cuối tháng: Xanh Vàng Chanh Lime (#A6CE39)
 */
/**
 * Dải màu trải dài từ ô ngày 1 đến ô ngày cuối tháng
 * Theo đúng các màu trên ngôi sao của logo Royal HaskoningDHV:
 * - Đầu tháng: Xanh Ocean Teal (rgb(0, 140, 170) / #008CAA)
 * - Giữa tháng: Xanh Lá Tươi (rgb(74, 180, 84) / #4AB454)
 * - Cuối tháng: Xanh Vàng Chanh Lime (rgb(148, 204, 52) / #94CC34)
 */
function getDayHeaderStarColor(day, totalDays) {
  if (totalDays <= 1) return 'rgb(0, 140, 170)';
  const ratio = Math.max(0, Math.min(1, (day - 1) / (totalDays - 1)));
  if (ratio <= 0.5) {
    const t = ratio / 0.5;
    const r = Math.round(0 + (74 - 0) * t);
    const g = Math.round(140 + (180 - 140) * t);
    const b = Math.round(170 + (84 - 170) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (ratio - 0.5) / 0.5;
    const r = Math.round(74 + (148 - 74) * t);
    const g = Math.round(180 + (204 - 180) * t);
    const b = Math.round(84 + (52 - 84) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export default function ChallengeTable({ challengeData, year, month, apiFetch, athlete, isAdmin = false, allowEditOthers = false, nameMapping = {} }) {
  const { lang, t } = useLang();
  
  const [userData, setUserData] = useState({});

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

  const [penaltiesLedger, setPenaltiesLedger] = useState([]);

  const loadTargets = useCallback(() => {
    if (apiFetch) {
      apiFetch('/challenge/targets', { cache: 'no-store' })
        .then(data => setUserData(data || {}))
        .catch(e => console.error("Error loading user data from API", e));
    }
  }, [apiFetch]);

  const loadPenaltiesLedger = useCallback(() => {
    if (apiFetch && year && month) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      apiFetch(`/penalties/ledger?month=${monthStr}`, { cache: 'no-store' })
        .then(res => {
          if (res && Array.isArray(res.members)) {
            setPenaltiesLedger(res.members);
          }
        })
        .catch(() => {});
    }
  }, [apiFetch, year, month]);

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

  useEffect(() => {
    loadPenaltiesLedger();
    const handlePenaltiesUpdated = () => loadPenaltiesLedger();
    window.addEventListener('penaltiesUpdated', handlePenaltiesUpdated);
    return () => window.removeEventListener('penaltiesUpdated', handlePenaltiesUpdated);
  }, [loadPenaltiesLedger]);



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

  const getAvatar = (member, size = 32) => {
    return getAthleteAvatar(member, size);
  };

  return (
    <div className="challenge-container">
      <div className="challenge-header">
        <div className="challenge-title-group">
          <h2 className="challenge-title-main">
            <span className="challenge-title-text">{t('challengeMonth')}</span>
            <span className="challenge-title-dot">•</span>
            <span className="challenge-title-date">
              {lang === 'en' ? `${MONTH_NAMES_EN[month - 1]} ${year}` : `Tháng ${month}, ${year}`}
            </span>
          </h2>
        </div>
        
        {challengeData.length > 0 && challengeData[0].totalDistance > 0 && (
          <div className="runner-of-the-month" title="Runner of the Month">
             <span className="rotm-icon">🏆</span>
             <img 
                src={getAvatar(challengeData[0].member, 24)} 
                alt="avatar" 
                className="runner-avatar" 
              />
             <span className="rotm-name">
                {nameMapping[`${challengeData[0].member.firstname} ${challengeData[0].member.lastname}`]?.fullName || `${challengeData[0].member.firstname} ${challengeData[0].member.lastname}`}
             </span>
             <span className="rotm-dist">{challengeData[0].totalDistance.toFixed(1)} km</span>
          </div>
        )}
      </div>



      <div className="challenge-table-wrapper">
        <table className="challenge-table">
          <thead>
            <tr>
              <th className="sticky-col first-col runner-header" style={{ width: '240px', minWidth: '240px', maxWidth: '240px', textAlign: 'center' }}>RUNNER</th>
              {daysArray.map(day => (
                <th 
                  key={day} 
                  className="day-col" 
                  style={{ background: getDayHeaderStarColor(day, daysArray.length) }}
                >
                  {day}
                </th>
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
                  <td className="sticky-col first-col" style={{ width: '240px', minWidth: '240px', maxWidth: '240px' }}>
                  <div className="runner-info">
                    <span className="runner-rank">{index + 1}</span>
                    <img 
                      src={getAvatar(row.member, 20)} 
                      alt="avatar" 
                      className="runner-avatar" 
                    />
                    <div className="runner-name-container">
                        <span className="runner-name-text" title={nameMapping[`${row.member.firstname} ${row.member.lastname}`]?.fullName || `${row.member.firstname} ${row.member.lastname}`}>
                          {nameMapping[`${row.member.firstname} ${row.member.lastname}`]?.fullName || `${row.member.firstname} ${row.member.lastname}`}
                        </span>
                        {isMe && <span className="runner-me-badge" title={t('yourAccount')}>{t('you')}</span>}
                        <span className="runner-achievements">
                          {row.rank === 1 && <span title="Top 1">🥇</span>}
                          {row.rank === 2 && <span title="Top 2">🥈</span>}
                          {row.rank === 3 && <span title="Top 3">🥉</span>}
                          {row.maxStreak >= 3 && <span title={`Streak ${row.maxStreak}!`} className={row.maxStreak >= 5 ? 'streak-fire-blue' : ''}>🔥</span>}
                          {row.isTurtle && <span title="Turtle">🐌</span>}
                        </span>
                    </div>
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
                          title={!canEdit ? t('noEditPermission') : t('enterTargetKm')}
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
                      title={!canEdit ? t('noEditPermission') : t('checkPenaltyCommitment')}
                      style={{ cursor: canEdit ? 'pointer' : 'default', opacity: canEdit ? 1 : 0.8 }} 
                      className={isMe ? 'penalty-checkbox--me' : ''}
                    />
                  </td>
                  <td className="sum-cell sticky-right col-due" style={{ textAlign: 'center' }}>
                    {penaltyAmount !== null ? (
                      <div style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span className={`penalty-due-badge ${penaltyAmount === 0 ? 'is-free' : 'is-owing'}`}>
                          {penaltyAmount === 0 ? '0k' : `${penaltyAmount}k`}
                        </span>
                        {penaltyAmount > 0 && (() => {
                          const athId = row.member?.id ? String(row.member.id) : null;
                          const normRowName = (row.name || `${row.member?.firstname || ''} ${row.member?.lastname || ''}`).trim().toLowerCase();
                          const matchedMember = penaltiesLedger.find(m => 
                            (athId && m.athleteId && String(m.athleteId) === athId) ||
                            (m.rawName && m.rawName.trim().toLowerCase() === normRowName) ||
                            (m.fullName && m.fullName.trim().toLowerCase() === normRowName)
                          );
                          const isPaid = matchedMember?.currentMonthPaymentStatus === 'paid';
                          if (!isPaid) return null; // Bỏ unpaid không thể hiện trên bảng này
                          return (
                            <span 
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 5px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                background: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #86efac',
                                whiteSpace: 'nowrap'
                              }}
                              title={lang === 'en' ? 'Paid to Club Treasury' : 'Đã nộp vào quỹ CLB'}
                            >
                              {lang === 'en' ? '✓ Paid' : '✓ Đã nộp'}
                            </span>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-muted" style={{ opacity: 0.4 }}>-</span>
                    )}
                  </td>
                  <td className="sum-cell sticky-right col-progress">
                    {showTrackBar ? (
                      <ProgressBar 
                        current={row.totalDistance}
                        target={userTarget}
                        isCompleted={isCompleted}
                        percent={progressPct}
                      />
                    ) : (
                      <span className="text-muted" style={{ opacity: 0.4 }}>-</span>
                    )}
                  </td>
                  <td className="sum-cell sticky-right col-km highlight-total">{row.totalDistance.toFixed(1)}</td>
                  <td className="sum-cell sticky-right col-days">{row.totalDays}</td>
                  <td className="sum-cell sticky-right col-time">{formatTime(row.totalMovingTime)}</td>
                  <td className="sum-cell sticky-right col-all-time">
                    {row.allTimeDistance !== null && row.allTimeDistance !== undefined && row.allTimeDistance > 0 
                      ? row.allTimeDistance.toFixed(1) 
                      : (row.allTimeDistance === 0 ? '0.0' : '-')}
                  </td>
                </tr>
              );
            })}
          </tbody>
          
          {/* Footer with totals (optional, but good for summary) */}
          <tfoot>
            <tr className="totals-row">
              <td className="sticky-col first-col total-footer" style={{ width: '240px', minWidth: '240px', maxWidth: '240px', textAlign: 'center' }}>TOTAL</td>
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
                  {challengeData.some(row => row.allTimeDistance !== null && row.allTimeDistance !== undefined && row.allTimeDistance > 0) 
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

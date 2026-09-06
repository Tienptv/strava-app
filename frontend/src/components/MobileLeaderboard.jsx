import React, { useState, useMemo, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import { getAthleteAvatar } from '../utils/avatar';
import { Search, Star, Flame, Trophy, ChevronDown, ChevronUp, Calendar, Clock, MapPin, Award, CheckCircle2, AlertTriangle, Table } from 'lucide-react';

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function MobileLeaderboard({
  challengeData = [],
  year,
  month,
  setMonth,
  apiFetch,
  athlete,
  nameMapping = {},
  onToggleFullTable
}) {
  const { lang, t } = useLang();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'top3' | 'completed' | 'penalty' | 'streak'
  const [expandedKey, setExpandedKey] = useState(null);
  const [pinnedRunners, setPinnedRunners] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pinnedRunners') || '[]');
    } catch {
      return [];
    }
  });

  const [userData, setUserData] = useState({});
  const [penaltiesLedger, setPenaltiesLedger] = useState([]);

  // Tải target / penalty
  useEffect(() => {
    if (apiFetch) {
      apiFetch('/challenge/targets', { cache: 'no-store' })
        .then(data => setUserData(data || {}))
        .catch(() => {});

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

  // Toggle Pin Runner
  const togglePin = (matchKey, e) => {
    e.stopPropagation();
    setPinnedRunners(prev => {
      const next = prev.includes(matchKey)
        ? prev.filter(k => k !== matchKey)
        : [...prev, matchKey];
      localStorage.setItem('pinnedRunners', JSON.stringify(next));
      return next;
    });
  };

  // Tính số ngày trong tháng
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Thống kê tổng hợp tháng
  const monthlyStats = useMemo(() => {
    let totalKm = 0;
    let completedCount = 0;
    let totalPenaltyDue = 0;

    challengeData.forEach(row => {
      totalKm += row.totalDistance || 0;
      const userKey = `${row.matchKey}_${year}_${month}`;
      const target = parseFloat(userData[userKey]?.target !== undefined ? userData[userKey]?.target : (userData[row.matchKey]?.target || 0));
      const hasPenalty = Boolean(userData[userKey]?.penalty !== undefined ? userData[userKey]?.penalty : userData[row.matchKey]?.penalty);

      if (target > 0 && row.totalDistance >= target) {
        completedCount++;
      }

      if (hasPenalty && target > 0 && row.totalDistance < target) {
        const remainingKm = Math.max(0, target - row.totalDistance);
        const rawK = 200 * (remainingKm / target);
        const pAmount = Math.min(200, Math.ceil(rawK / 10) * 10);
        totalPenaltyDue += pAmount * 1000;
      }
    });

    return {
      totalRunners: challengeData.length,
      totalKm: Math.round(totalKm * 10) / 10,
      completedCount,
      totalPenaltyDue
    };
  }, [challengeData, userData, year, month]);

  // Lọc và sắp xếp danh sách VĐV
  const processedRunners = useMemo(() => {
    return challengeData.map((row, index) => {
      const userKey = `${row.matchKey}_${year}_${month}`;
      const rawTarget = userData[userKey]?.target !== undefined ? userData[userKey]?.target : userData[row.matchKey]?.target;
      const target = parseFloat(rawTarget || 0);
      const hasPenalty = Boolean(userData[userKey]?.penalty !== undefined ? userData[userKey]?.penalty : userData[row.matchKey]?.penalty);

      const isCompleted = target > 0 && row.totalDistance >= target;
      const progressPct = target > 0 ? Math.min(100, Math.round((row.totalDistance / target) * 100)) : 0;

      let penaltyAmount = null;
      if (hasPenalty && target > 0) {
        const remainingKm = Math.max(0, target - row.totalDistance);
        if (remainingKm <= 0) {
          penaltyAmount = 0;
        } else {
          const rawK = 200 * (remainingKm / target);
          penaltyAmount = Math.min(200, Math.ceil(rawK / 10) * 10);
        }
      }

      // Check payment status from ledger
      const athId = row.member?.id ? String(row.member.id) : null;
      const normRowName = (row.name || `${row.member?.firstname || ''} ${row.member?.lastname || ''}`).trim().toLowerCase();
      const matchedMember = penaltiesLedger.find(m =>
        (athId && m.athleteId && String(m.athleteId) === athId) ||
        (m.rawName && m.rawName.trim().toLowerCase() === normRowName) ||
        (m.fullName && m.fullName.trim().toLowerCase() === normRowName)
      );
      const isPaid = matchedMember?.currentMonthPaymentStatus === 'paid';

      const displayName = nameMapping[`${row.member.firstname} ${row.member.lastname}`]?.fullName ||
        `${row.member.firstname} ${row.member.lastname}`;

      const isPinned = pinnedRunners.includes(row.matchKey);
      const isMe = athlete && !athlete.isGuest && (
        (athlete.id && String(row.member?.id) === String(athlete.id)) ||
        (row.matchKey === `${athlete.firstname}_${athlete.lastname ? athlete.lastname.trim().charAt(0) + '.' : ''}`)
      );

      return {
        ...row,
        originalRank: index + 1,
        displayName,
        target,
        hasPenalty,
        progressPct,
        isCompleted,
        penaltyAmount,
        isPaid,
        isPinned,
        isMe
      };
    });
  }, [challengeData, userData, penaltiesLedger, pinnedRunners, nameMapping, athlete, year, month]);

  // Bộ lọc
  const filteredRunners = useMemo(() => {
    let list = processedRunners;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => r.displayName.toLowerCase().includes(q));
    }

    if (filterType === 'top3') {
      list = list.filter(r => r.originalRank <= 3);
    } else if (filterType === 'completed') {
      list = list.filter(r => r.isCompleted);
    } else if (filterType === 'penalty') {
      list = list.filter(r => r.penaltyAmount !== null && r.penaltyAmount > 0);
    } else if (filterType === 'streak') {
      list = list.filter(r => r.maxStreak >= 3);
    }

    // Đưa các thẻ đã ghim (Pinned) hoặc IsMe lên đầu trang
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.originalRank - b.originalRank;
    });
  }, [processedRunners, searchQuery, filterType]);

  const top3 = processedRunners.slice(0, 3);

  return (
    <div className="mobile-leaderboard-container">
      {/* Month Scroll Pill Bar */}
      <div className="mobile-month-bar">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
          const isActive = month === m;
          return (
            <button
              key={m}
              className={`mobile-month-pill ${isActive ? 'active' : ''}`}
              onClick={() => setMonth && setMonth(m)}
            >
              {lang === 'en' ? `${MONTH_NAMES_EN[m - 1]} '${String(year).slice(2)}` : `Thg ${m}`}
            </button>
          );
        })}
      </div>

      {/* Summary KPI Cards Bar */}
      <div className="mobile-kpi-strip">
        <div className="mobile-kpi-card">
          <span className="mobile-kpi-label">🏃 {lang === 'en' ? 'Runners' : 'VĐV Tham Gia'}</span>
          <span className="mobile-kpi-value">{monthlyStats.totalRunners}</span>
        </div>
        <div className="mobile-kpi-card highlight-dist">
          <span className="mobile-kpi-label">🏁 {lang === 'en' ? 'Total Dist' : 'Tổng Km Tháng'}</span>
          <span className="mobile-kpi-value">{monthlyStats.totalKm} <small>km</small></span>
        </div>
        <div className="mobile-kpi-card highlight-fund">
          <span className="mobile-kpi-label">💰 {lang === 'en' ? 'Penalty Fund' : 'Quỹ Phạt Tháng'}</span>
          <span className="mobile-kpi-value">{(monthlyStats.totalPenaltyDue / 1000).toLocaleString('vi-VN')} <small>k</small></span>
        </div>
      </div>

      {/* View Toggle Bar (Cards vs Full Table) */}
      <div className="mobile-view-toggle-bar">
        <div className="mobile-toggle-group">
          <button className="mobile-toggle-btn active">
            📱 {lang === 'en' ? 'Card View' : 'Dạng Thẻ'}
          </button>
          {onToggleFullTable && (
            <button className="mobile-toggle-btn" onClick={onToggleFullTable}>
              <Table size={14} style={{ marginRight: 4 }} />
              {lang === 'en' ? 'Full Grid' : 'Bảng 31 Ngày'}
            </button>
          )}
        </div>
        <span className="mobile-toggle-hint">
          {lang === 'en' ? 'Rotate phone for full table' : 'Xoay ngang đt để xem bảng'}
        </span>
      </div>

      {/* Top 3 Podium Cards (Only if no search active) */}
      {!searchQuery && filterType === 'all' && top3.length > 0 && (
        <div className="mobile-podium-section">
          <div className="mobile-podium-title">
            <Trophy size={16} color="#eab308" />
            <span>{lang === 'en' ? 'TOP 3 LEADERBOARD' : 'TOP 3 VẬN ĐỘNG VIÊN DẪN ĐẦU'}</span>
          </div>
          <div className="mobile-podium-grid">
            {/* Rank 2 - Silver */}
            {top3[1] && (
              <div 
                className="podium-card rank-2"
                onClick={() => setExpandedKey(expandedKey === top3[1].matchKey ? null : top3[1].matchKey)}
              >
                <div className="podium-badge">🥈 2</div>
                <img 
                  src={getAthleteAvatar(top3[1].member, 44)} 
                  alt="avatar" 
                  className="podium-avatar" 
                />
                <div className="podium-name">{top3[1].displayName}</div>
                <div className="podium-km">{top3[1].totalDistance.toFixed(1)} km</div>
                <div className="podium-sub">{top3[1].target ? `${top3[1].target}km target` : 'Tự do'}</div>
              </div>
            )}

            {/* Rank 1 - Gold (Centered & Bigger) */}
            {top3[0] && (
              <div 
                className="podium-card rank-1"
                onClick={() => setExpandedKey(expandedKey === top3[0].matchKey ? null : top3[0].matchKey)}
              >
                <div className="podium-crown">👑</div>
                <div className="podium-badge">🥇 1</div>
                <img 
                  src={getAthleteAvatar(top3[0].member, 52)} 
                  alt="avatar" 
                  className="podium-avatar main" 
                />
                <div className="podium-name">{top3[0].displayName}</div>
                <div className="podium-km">{top3[0].totalDistance.toFixed(1)} km</div>
                <div className="podium-sub">{top3[0].target ? `${top3[0].target}km target` : 'Tự do'}</div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3[2] && (
              <div 
                className="podium-card rank-3"
                onClick={() => setExpandedKey(expandedKey === top3[2].matchKey ? null : top3[2].matchKey)}
              >
                <div className="podium-badge">🥉 3</div>
                <img 
                  src={getAthleteAvatar(top3[2].member, 44)} 
                  alt="avatar" 
                  className="podium-avatar" 
                />
                <div className="podium-name">{top3[2].displayName}</div>
                <div className="podium-km">{top3[2].totalDistance.toFixed(1)} km</div>
                <div className="podium-sub">{top3[2].target ? `${top3[2].target}km target` : 'Tự do'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="mobile-search-filter-box">
        <div className="mobile-search-input-wrap">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder={lang === 'en' ? 'Search athlete by name...' : 'Tìm kiếm VĐV theo tên...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        {/* Filter chips */}
        <div className="mobile-filter-chips">
          <button 
            className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            {lang === 'en' ? 'All' : 'Tất cả'} ({processedRunners.length})
          </button>
          <button 
            className={`filter-chip ${filterType === 'top3' ? 'active' : ''}`}
            onClick={() => setFilterType('top3')}
          >
            🏆 Top 3
          </button>
          <button 
            className={`filter-chip ${filterType === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterType('completed')}
          >
            ✅ {lang === 'en' ? 'Goal Met' : 'Đạt chuẩn'}
          </button>
          <button 
            className={`filter-chip ${filterType === 'penalty' ? 'active' : ''}`}
            onClick={() => setFilterType('penalty')}
          >
            ⚠️ {lang === 'en' ? 'Penalty' : 'Có phạt'}
          </button>
          <button 
            className={`filter-chip ${filterType === 'streak' ? 'active' : ''}`}
            onClick={() => setFilterType('streak')}
          >
            🔥 Streak (≥3d)
          </button>
        </div>
      </div>

      {/* Athletes List */}
      <div className="mobile-runners-list">
        {filteredRunners.length === 0 ? (
          <div className="mobile-empty-state">
            <div style={{ fontSize: '2rem' }}>🔍</div>
            <p>{lang === 'en' ? 'No athletes found matching criteria.' : 'Không tìm thấy VĐV phù hợp.'}</p>
          </div>
        ) : (
          filteredRunners.map(runner => {
            const isExpanded = expandedKey === runner.matchKey;

            return (
              <div 
                key={runner.matchKey} 
                className={`mobile-runner-card ${runner.isPinned ? 'is-pinned' : ''} ${runner.isMe ? 'is-me' : ''}`}
                onClick={() => setExpandedKey(isExpanded ? null : runner.matchKey)}
              >
                {/* Card Main Row */}
                <div className="runner-card-main">
                  {/* Left: Rank & Avatar */}
                  <div className="runner-card-left">
                    <div className={`runner-rank-chip rank-${runner.originalRank}`}>
                      {runner.originalRank === 1 ? '🥇' : 
                       runner.originalRank === 2 ? '🥈' : 
                       runner.originalRank === 3 ? '🥉' : 
                       `#${runner.originalRank}`}
                    </div>

                    <div className="avatar-wrapper">
                      <img 
                        src={getAthleteAvatar(runner.member, 40)} 
                        alt="avatar" 
                        className="runner-card-avatar"
                      />
                      {runner.maxStreak >= 3 && (
                        <span className={`streak-badge ${runner.maxStreak >= 5 ? 'streak-fire-blue' : ''}`} title={`Streak ${runner.maxStreak} ngày!`}>
                          🔥{runner.maxStreak}
                        </span>
                      )}
                    </div>

                    {/* Name & Target Info */}
                    <div className="runner-text-block">
                      <div className="runner-card-name-row">
                        <span className="runner-card-name">{runner.displayName}</span>
                        {runner.isMe && <span className="runner-tag-me">{t('you')}</span>}
                        {runner.isTurtle && <span title="Turtle">🐌</span>}
                      </div>

                      <div className="runner-card-target-text">
                        {runner.target > 0 ? (
                          <>
                            <span>Mục tiêu: <strong>{runner.target} km</strong></span>
                            <span className="dot-sep">•</span>
                            <span className={runner.isCompleted ? 'text-success' : 'text-muted'}>
                              {runner.progressPct}%
                            </span>
                          </>
                        ) : (
                          <span className="text-muted">{lang === 'en' ? 'Free running' : 'Chạy tự do'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Distance & Status */}
                  <div className="runner-card-right">
                    <div className="runner-dist-block">
                      <span className="runner-km-val">{runner.totalDistance.toFixed(1)}</span>
                      <span className="runner-km-unit">km</span>
                    </div>

                    {/* Penalty or Paid badge */}
                    {runner.penaltyAmount !== null && (
                      <div className="runner-penalty-box">
                        {runner.penaltyAmount === 0 ? (
                          <span className="badge-penalty-free">✅ 0k</span>
                        ) : (
                          <span className={`badge-penalty-owing ${runner.isPaid ? 'is-paid' : ''}`}>
                            {runner.isPaid ? '✓ Đã nộp' : `⚠️ ${runner.penaltyAmount}k`}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Pin button */}
                    <button 
                      className={`runner-pin-btn ${runner.isPinned ? 'active' : ''}`}
                      onClick={(e) => togglePin(runner.matchKey, e)}
                      title={runner.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                    >
                      <Star size={15} fill={runner.isPinned ? '#eab308' : 'none'} color={runner.isPinned ? '#eab308' : '#94a3b8'} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {runner.target > 0 && (
                  <div className="runner-card-progress-bar-wrap">
                    <div 
                      className={`runner-card-progress-bar ${runner.isCompleted ? 'completed' : runner.progressPct >= 50 ? 'halfway' : 'starting'}`}
                      style={{ width: `${Math.min(runner.progressPct, 100)}%` }}
                    />
                  </div>
                )}

                {/* Expand Accordion Indicator */}
                <div className="runner-card-expand-indicator">
                  <span>{isExpanded ? (lang === 'en' ? 'Hide daily details' : 'Thu gọn chi tiết') : (lang === 'en' ? 'Tap for 31-day activity breakdown' : 'Xem lịch chạy 31 ngày')}</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {/* Expanded Section: 31-Day Activity Grid & Metrics */}
                {isExpanded && (
                  <div className="runner-card-expanded-content" onClick={(e) => e.stopPropagation()}>
                    <div className="expanded-divider" />
                    
                    {/* Key Stats Row */}
                    <div className="expanded-metrics-row">
                      <div className="exp-metric-col">
                        <span className="exp-label"><Calendar size={12} /> {lang === 'en' ? 'Active Days' : 'Số ngày chạy'}</span>
                        <span className="exp-val">{runner.daysCount || Object.values(runner.dailyDistances || {}).filter(d => d > 0).length} / {daysInMonth} ngày</span>
                      </div>
                      <div className="exp-metric-col">
                        <span className="exp-label"><Clock size={12} /> {lang === 'en' ? 'Total Time' : 'Tổng giờ chạy'}</span>
                        <span className="exp-val">{runner.totalTimeFormatted || `${Math.floor((runner.totalTime || 0) / 3600)}h ${Math.floor(((runner.totalTime || 0) % 3600) / 60)}m`}</span>
                      </div>
                      <div className="exp-metric-col">
                        <span className="exp-label"><Award size={12} /> {lang === 'en' ? 'Best Day' : 'Kỷ lục ngày'}</span>
                        <span className="exp-val">{(Math.max(0, ...Object.values(runner.dailyDistances || {}))).toFixed(1)} km</span>
                      </div>
                    </div>

                    {/* 31-Day Heatmap Calendar Grid */}
                    <div className="expanded-days-calendar">
                      <div className="expanded-calendar-header">
                        <span>{lang === 'en' ? `Activity Heatmap (${month}/${year})` : `Nhật ký từng ngày (Tháng ${month}/${year})`}</span>
                      </div>
                      <div className="expanded-days-grid">
                        {daysArray.map(day => {
                          const dist = runner.dailyDistances ? runner.dailyDistances[day] : 0;
                          const hasRun = dist > 0;
                          return (
                            <div 
                              key={day} 
                              className={`exp-day-cell ${hasRun ? 'has-run' : 'rest-day'}`}
                              title={`Ngày ${day}: ${hasRun ? `${dist.toFixed(1)} km` : 'Nghỉ'}`}
                            >
                              <span className="exp-day-num">{day}</span>
                              <span className="exp-day-km">{hasRun ? (dist >= 10 ? Math.round(dist) : dist.toFixed(1)) : '·'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

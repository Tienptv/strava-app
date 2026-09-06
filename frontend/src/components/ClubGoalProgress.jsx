import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '../i18n/LangContext';
import { Edit2, X, Trophy, MapPin, Flag, Sparkles, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

const formatDayMonth = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10);
    return `${d < 10 ? '0' + d : d}/${m < 10 ? '0' + m : m}`;
  }
  return dateStr;
};

export default function ClubGoalProgress({ totalDistance = 0, apiFetch, isAdmin = false }) {
  const { lang, t } = useLang();
  
  const [goalData, setGoalData] = useState(null);
  const [targetKm, setTargetKm] = useState(8801);
  const [customTitle, setCustomTitle] = useState(null);
  const [customSubtitle, setCustomSubtitle] = useState(null);
  const [eventTiers, setEventTiers] = useState({});

  const labelRefs = useRef({});
  const trackRef = useRef(null);

  const loadGoal = () => {
    if (apiFetch) {
      apiFetch('/challenge/goal')
        .then(data => {
          if (data) {
            setGoalData(data);
            if (data.targetKm) setTargetKm(data.targetKm);
            if (data.customTitle !== undefined) setCustomTitle(data.customTitle);
            if (data.customSubtitle !== undefined) setCustomSubtitle(data.customSubtitle);
          }
        })
        .catch(err => console.error('Lỗi tải club goal:', err));
    }
  };

  useEffect(() => {
    loadGoal();
    const handleGoalUpdated = () => loadGoal();
    window.addEventListener('goalUpdated', handleGoalUpdated);
    return () => window.removeEventListener('goalUpdated', handleGoalUpdated);
  }, [apiFetch]);

  const currentYear = goalData?.year || new Date().getFullYear();
  const goalTitle = customTitle || `Haskoning Vietnam Running Journey ${currentYear}`;
  const goalSubtitle = customSubtitle || t('annualSubtitle');

  const [isEditing, setIsEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState(targetKm);
  const [tempTitle, setTempTitle] = useState('');
  const [tempSubtitle, setTempSubtitle] = useState('');
  const [tempShowAnnualGoal, setTempShowAnnualGoal] = useState(true);

  const handleOpenEdit = () => {
    if (!isAdmin) {
      Swal.fire({
        icon: 'warning',
        title: lang === 'en' ? 'Access Restricted' : 'Quyền Hạn Bị Giới Hạn',
        text: lang === 'en' 
          ? 'Only Admins can edit annual club goals and timeline events.' 
          : 'Chỉ có Quản trị viên (Admin) mới có quyền chỉnh sửa mục tiêu năm và hành trình giải chạy.',
        confirmButtonColor: '#002D54',
        confirmButtonText: lang === 'en' ? 'OK' : 'Đã hiểu'
      });
      return;
    }
    setTempTarget(targetKm);
    setTempTitle(goalTitle);
    setTempSubtitle(goalSubtitle);
    setTempShowAnnualGoal(goalData?.showAnnualGoal !== false);
    setIsEditing(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setIsEditing(false);
      return;
    }
    const val = parseInt(tempTarget);
    const newTarget = (val > 0) ? val : targetKm;
    const newTitle = tempTitle || null;
    const newSubtitle = tempSubtitle || null;

    setTargetKm(newTarget);
    setCustomTitle(newTitle);
    setCustomSubtitle(newSubtitle);
    setIsEditing(false);

    if (apiFetch) {
      try {
        const payload = {
          ...(goalData || {}),
          targetKm: newTarget,
          customTitle: newTitle,
          customSubtitle: newSubtitle,
          showAnnualGoal: tempShowAnnualGoal
        };
        setGoalData(payload);
        await apiFetch('/challenge/goal', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        window.dispatchEvent(new Event('goalUpdated'));
      } catch (err) {
        console.error('Lỗi lưu club goal lên server:', err);
      }
    }
  };

  // -------------------------------------------------------------
  // CALCULATION: DAY OF YEAR & PERCENTAGES
  // -------------------------------------------------------------
  const now = new Date();
  const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0;
  const totalDaysInYear = isLeapYear ? 366 : 365;

  const startOfYear = new Date(currentYear, 0, 1);
  const diffDays = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
  const dayOfYear = Math.max(1, Math.min(totalDaysInYear, diffDays));
  const percentTime = Math.min(Math.max(Math.round((dayOfYear / totalDaysInYear) * 1000) / 10, 0), 100);

  const percentDistance = Math.min(Math.round((totalDistance / targetKm) * 100) || 0, 100);

  // User rules for progress mode:
  // "Runner di chuyển theo Cách B nếu cách A bị ẩn, và theo cách A nếu Cách B bị ẩn. Nếu cả 2 cách không bị ẩn thì ưu tiên theo cách B"
  const isShowDist = goalData?.showDistanceProgress !== false;
  const isShowTime = goalData?.showTimeProgress !== false;
  const showTodayMarker = goalData?.showTodayMarker !== false;

  let activeRunnerPercent = percentTime;
  if (isShowTime && isShowDist) {
    activeRunnerPercent = percentTime; // Priority to B
  } else if (!isShowTime && isShowDist) {
    activeRunnerPercent = percentDistance; // Follows A
  } else if (isShowTime && !isShowDist) {
    activeRunnerPercent = percentTime; // Follows B
  } else {
    activeRunnerPercent = percentTime;
  }

  const vehiclePos = Math.min(Math.max(activeRunnerPercent, 2), 96);

  // -------------------------------------------------------------
  // 12 MONTH MILESTONES (Tính theo ngày đầu tiên của mỗi tháng)
  // -------------------------------------------------------------
  const startDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  if (isLeapYear) {
    for (let k = 2; k < 12; k++) startDays[k] += 1;
  }

  const monthNamesEnShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNamesEnFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const monthMilestones = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    // Mốc % chính xác tại ngày 1 của từng tháng trên 365/366 ngày
    const rawPercent = (startDays[i] / totalDaysInYear) * 100;
    // Tháng đầu tiên đặt tại 2.2% để trọn vẹn nằm trên thanh track
    const percent = i === 0 ? 2.2 : Math.round(rawPercent * 10) / 10;
    const isPast = (now.getFullYear() > currentYear) || (now.getFullYear() === currentYear && now.getMonth() > i);
    const isCurrent = (now.getFullYear() === currentYear && now.getMonth() === i);
    return {
      monthNum,
      label: lang === 'en' ? monthNamesEnShort[i] : `T${monthNum}`,
      fullName: lang === 'en' ? monthNamesEnFull[i] : `Tháng ${monthNum}`,
      percent,
      isPast,
      isCurrent
    };
  });

  // -------------------------------------------------------------
  // RACES & HIGHLIGHT EVENTS
  // -------------------------------------------------------------
  const rawEvents = Array.isArray(goalData?.events) ? goalData.events : [];
  const events = rawEvents.map((ev, idx) => {
    let evPercent = 50;
    let daysDiff = null;
    let isPastEvent = false;

    if (ev.date) {
      const evDate = new Date(ev.date);
      const evYear = evDate.getFullYear() || currentYear;
      const evStartOfYear = new Date(evYear, 0, 1);
      const evDayOfYear = Math.floor((evDate - evStartOfYear) / (1000 * 60 * 60 * 24)) + 1;
      evPercent = Math.min(Math.max(Math.round((evDayOfYear / totalDaysInYear) * 1000) / 10, 2), 98);

      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const evMidnight = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate()).getTime();
      daysDiff = Math.ceil((evMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      isPastEvent = daysDiff < 0;
    }

    return {
      ...ev,
      percent: evPercent,
      daysDiff,
      isPastEvent,
      pos: 'top' // Luôn đặt trên đỉnh track để không chắn hàng ngang các mốc tháng
    };
  }).sort((a, b) => a.percent - b.percent);

  // Phát hiện va chạm (collision detection) thực tế giữa các nhãn tên giải:
  // Nếu không bị đè lên nhau thì tất cả hiển thị cùng trên 1 hàng ngang (Tier 1).
  // Chỉ khi 2 nhãn thực sự chạm/chồng lấn nhau trên màn hình thì nhãn sau mới nhảy lên Tier 2.
  useEffect(() => {
    const checkCollisions = () => {
      if (!events || events.length === 0) return;
      const sorted = [...events].sort((a, b) => a.percent - b.percent);
      const newTiers = {};
      sorted.forEach((ev, i) => {
        newTiers[ev.id || i] = 1;
      });

      for (let i = 1; i < sorted.length; i++) {
        const prevEv = sorted[i - 1];
        const currEv = sorted[i];
        const prevEl = labelRefs.current[prevEv.id || (i - 1)];
        const currEl = labelRefs.current[currEv.id || i];

        if (prevEl && currEl) {
          const prevRect = prevEl.getBoundingClientRect();
          const currRect = currEl.getBoundingClientRect();

          // Kiểm tra xem nhãn hiện tại có bị lấn vào vùng nhãn trước không
          if (currRect.left < prevRect.right + 4) {
            const prevTier = newTiers[prevEv.id || (i - 1)] || 1;
            newTiers[currEv.id || i] = prevTier === 1 ? 2 : 1;
          }
        }
      }

      setEventTiers(newTiers);
    };

    const timer = setTimeout(checkCollisions, 60);
    window.addEventListener('resize', checkCollisions);

    let ro;
    if (trackRef.current && window.ResizeObserver) {
      ro = new ResizeObserver(checkCollisions);
      ro.observe(trackRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkCollisions);
      if (ro) ro.disconnect();
    };
  }, [goalData?.events]);

  // Next upcoming race
  const upcomingEvents = events
    .filter(ev => ev.daysDiff !== null && ev.daysDiff >= 0)
    .sort((a, b) => a.daysDiff - b.daysDiff);
  const nextEvent = upcomingEvents[0];

  const isGoalVisible = goalData?.showAnnualGoal !== false;

  const renderEditModal = () => (
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
            <label>{lang === 'en' ? 'Challenge Title' : 'Tiêu đề Timeline (Challenge Title)'}</label>
            <input 
              type="text" 
              value={tempTitle} 
              onChange={(e) => setTempTitle(e.target.value)}
              className="modal-input"
              placeholder="Haskoning Vietnam Running Journey"
            />
          </div>
          <div className="form-group">
            <label>{lang === 'en' ? 'Subtitle / Annual Message' : 'Phụ đề / Thông điệp năm'}</label>
            <input 
              type="text" 
              value={tempSubtitle} 
              onChange={(e) => setTempSubtitle(e.target.value)}
              className="modal-input"
              placeholder={lang === 'en' ? 'Journey to conquer annual goals' : 'Hành trình chinh phục mục tiêu năm'}
            />
          </div>
          <div className="form-group">
            <label>{lang === 'en' ? 'Annual Target (km)' : 'Mục tiêu Cả Năm (km)'}</label>
            <input 
              type="number" 
              value={tempTarget} 
              onChange={(e) => setTempTarget(e.target.value)}
              className="modal-input"
              min="1"
            />
          </div>
          <div className="modal-actions">
            <button 
              type="button" 
              className={`btn-toggle-goal-vis ${tempShowAnnualGoal ? 'is-visible' : 'is-hidden'}`}
              onClick={async () => {
                const nextVal = !tempShowAnnualGoal;
                setTempShowAnnualGoal(nextVal);
                if (apiFetch) {
                  try {
                    const payload = {
                      ...(goalData || {}),
                      targetKm: parseInt(tempTarget) || targetKm,
                      customTitle: tempTitle || null,
                      customSubtitle: tempSubtitle || null,
                      showAnnualGoal: nextVal
                    };
                    setGoalData(payload);
                    await apiFetch('/challenge/goal', {
                      method: 'POST',
                      body: JSON.stringify(payload)
                    });
                    window.dispatchEvent(new Event('goalUpdated'));
                  } catch (err) {
                    console.error('Lỗi sync showAnnualGoal:', err);
                  }
                }
              }}
              title={tempShowAnnualGoal ? t('hideAnnualGoal') : t('showAnnualGoal')}
            >
              {tempShowAnnualGoal ? (
                <>
                  <EyeOff size={15} />
                  <span>{t('hideAnnualGoal')}</span>
                </>
              ) : (
                <>
                  <Eye size={15} />
                  <span>{t('showAnnualGoal')}</span>
                </>
              )}
            </button>
            <div className="modal-actions-right">
              <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>{t('cancel')}</button>
              <button type="submit" className="btn-save">{t('saveChanges')}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="club-goal-card annual-timeline-card">
      {/* Header Bar */}
      <div className="club-goal__header">
        <div className="club-goal__title-group">
          <div className="club-goal__title">
            <img 
              src="/haskoning-star-transparent.png" 
              alt="HaskoningDHV" 
              className="club-goal__haskoning-logo"
              style={{ 
                height: '28px', 
                width: 'auto', 
                objectFit: 'contain',
                display: 'inline-block',
                verticalAlign: 'middle'
              }} 
            />
            <span>{goalTitle}</span>
          </div>
          {nextEvent && (
            <div className="upcoming-race-badge" title={lang === 'en' ? `Next race: ${nextEvent.name}` : `Giải chạy sắp tới: ${nextEvent.name}`}>
              <Sparkles size={14} color="#ea580c" />
              <span className="upcoming-race-badge__label">{t('upcoming')}</span>
              <strong className="upcoming-race-badge__name">{nextEvent.name}</strong>
              <span className="upcoming-race-badge__countdown">
                {nextEvent.daysDiff === 0 
                  ? `🔥 ${t('todayExclamation')}` 
                  : (lang === 'en' ? `(${nextEvent.daysDiff} days left)` : `(còn ${nextEvent.daysDiff} ngày)`)}
              </span>
            </div>
          )}
        </div>

        <div className="club-goal__stats">
          <div className="timeline-indicators-summary">
            {isShowDist && (
              <span className="indicator-pill indicator-pill--km" title={lang === 'en' ? 'Actual distance progress' : 'Tiến độ cự ly km thực tế'}>
                🏃 {t('distanceIndicator')}: <strong>{percentDistance}%</strong>
              </span>
            )}
            {isShowTime && (
              <span className="indicator-pill indicator-pill--time" title={lang === 'en' ? 'Time elapsed in year' : 'Tiến độ thời gian trong năm'}>
                ⏳ {t('timeIndicator')}: <strong>{percentTime}%</strong> ({lang === 'en' ? `Day ${dayOfYear}/${totalDaysInYear}` : `Ngày ${dayOfYear}/${totalDaysInYear}`})
              </span>
            )}
          </div>

          {isGoalVisible ? (
            <div className="club-goal__km-display">
              <span className="current-dist">{totalDistance.toFixed(1)}</span>
              <div className="target-display">
                <span className="total-goal">/ {targetKm} km</span>
                {isAdmin && (
                  <button 
                    className="btn-icon btn-edit" 
                    onClick={handleOpenEdit} 
                    title={t('editGoal')}
                    style={{ cursor: 'pointer' }}
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            isAdmin && (
              <button 
                className="btn-icon btn-edit" 
                onClick={handleOpenEdit} 
                title={t('editGoal')}
                style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '6px', 
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Edit2 size={14} />
              </button>
            )
          )}
        </div>
      </div>
      
      {/* Subtitle with Progress Info */}
      <div className="club-goal__subinfo">
        <p className="club-goal__subtitle">{goalSubtitle}</p>
      </div>

      {/* Main Annual Timeline Track */}
      <div className="vietnam-map-progress annual-timeline-track" ref={trackRef}>
        <div className="map-track timeline-track-container">
          {/* Background road texture */}
          <div className="map-track-bg"></div>
          
          {/* Time Progress Fill (Cách B) - Dải fill thời gian thực trong năm */}
          {isShowTime && (
            <div 
              className={`map-track-fill timeline-time-fill ${isShowDist ? 'timeline-time-fill--dual' : ''}`}
              style={{ width: `${percentTime}%` }}
              title={lang === 'en' 
                ? `Time progress: ${percentTime}% (Day ${dayOfYear}/${totalDaysInYear})` 
                : `Tiến độ thời gian: ${percentTime}% (Ngày ${dayOfYear}/${totalDaysInYear})`}
            >
              <div className="timeline-shimmer-wave"></div>
            </div>
          )}

          {/* Distance Progress Fill (Cách A) - Dải fill cự ly */}
          {isShowDist && (
            <div 
              className={`map-track-fill timeline-distance-fill ${isShowTime ? 'timeline-distance-fill--dual' : ''}`} 
              style={{ width: `${percentDistance}%` }}
              title={lang === 'en' 
                ? `Completed distance: ${totalDistance.toFixed(1)} km (${percentDistance}%)` 
                : `Cự ly đã hoàn thành: ${totalDistance.toFixed(1)} km (${percentDistance}%)`}
            >
              <div className="timeline-shimmer-wave"></div>
            </div>
          )}

          {/* 12 Month Milestones (Thay chấm tròn bằng tên tháng trực tiếp trên thanh ray) */}
          {monthMilestones.map((m) => (
            <div 
              key={m.monthNum} 
              className={`timeline-month-node ${m.isPast ? 'is-past' : ''} ${m.isCurrent ? 'is-current' : ''}`}
              style={{ left: `${m.percent}%` }}
              title={`${m.fullName} - ${m.isCurrent ? (lang === 'en' ? 'In progress' : 'Đang diễn ra') : m.isPast ? (lang === 'en' ? 'Passed' : 'Đã qua') : (lang === 'en' ? 'Upcoming' : 'Sắp tới')}`}
            >
              <span className="month-node-label">{m.label}</span>
            </div>
          ))}

          {/* Race & Highlight Event Milestones */}
          {events.map((ev, i) => {
            const hasLogo = !!ev.logoUrl && ev.logoUrl.trim().length > 0;
            const alignClass = ev.percent > 78 ? 'tooltip-align-right' : (ev.percent < 22 ? 'tooltip-align-left' : 'tooltip-align-center');

            return (
              <div 
                key={ev.id || i} 
                className={`timeline-race-milestone race-pos-${ev.pos} ${ev.isPastEvent ? 'race-passed' : 'race-upcoming'}`}
                style={{ left: `${ev.percent}%` }}
              >
                <div className="race-badge-wrapper">
                  <div 
                    className="race-badge-node"
                    title={`${ev.name} (${ev.date})`}
                  >
                    {hasLogo ? (
                      <img 
                        src={ev.logoUrl} 
                        alt={ev.name} 
                        className="race-badge-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }} 
                      />
                    ) : null}
                    <span 
                      className="race-badge-icon" 
                      style={{ display: hasLogo ? 'none' : 'flex' }}
                    >
                      {ev.icon || (ev.type === 'race' ? '🏅' : '🏆')}
                    </span>
                  </div>

                  {/* High-end Glassmorphic Tooltip Card */}
                  <div className={`race-glass-tooltip tooltip-${ev.pos} ${alignClass}`}>
                    <div className="race-tooltip-header">
                      <span className="race-tooltip-emoji">{ev.icon || '🏅'}</span>
                      <div className="race-tooltip-title-box">
                        <strong className="race-tooltip-title">{ev.name}</strong>
                        <span className={`race-badge-status ${ev.isPastEvent ? 'status-past' : 'status-upcoming'}`}>
                          {ev.isPastEvent 
                            ? t('completed') 
                            : ev.daysDiff === 0 
                              ? t('todayExclamation') 
                              : (lang === 'en' ? `${ev.daysDiff} days left` : `Còn ${ev.daysDiff} ngày`)}
                        </span>
                      </div>
                    </div>
                    <div className="race-tooltip-body">
                      {ev.date && (
                        <div className="race-tooltip-row">
                          <span className="row-icon">📅</span>
                          <span>{ev.date}</span>
                        </div>
                      )}
                      {ev.location && (
                        <div className="race-tooltip-row">
                          <span className="row-icon">📍</span>
                          <span>{ev.location}</span>
                        </div>
                      )}
                      {ev.note && (
                        <div className="race-tooltip-row race-tooltip-note">
                          <span className="row-icon">🎯</span>
                          <span>{ev.note}</span>
                        </div>
                      )}
                      {ev.registrationUrl && (
                        <div className="race-tooltip-row" style={{ marginTop: '8px' }}>
                          <a 
                            href={ev.registrationUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn btn--primary"
                            style={{ 
                              padding: '6px 14px', 
                              fontSize: '0.8rem', 
                              textDecoration: 'none',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                          >
                            {lang === 'en' ? 'Register Now' : 'Đăng Ký Ngay'}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <span 
                  ref={(el) => { if (el) labelRefs.current[ev.id || i] = el; }}
                  className={`race-label-text label-${ev.pos} tier-${eventTiers[ev.id || i] || 1}`}
                >
                  {ev.name}
                </span>
              </div>
            );
          })}

          {/* Upcoming Race Date Badges (Hiển thị ngày & tháng ở vị trí dưới thanh ray cho các giải sắp diễn ra) */}
          {events.map((ev, i) => {
            if (ev.isPastEvent || !ev.date) return null;
            const isNext = nextEvent && (
              ev === nextEvent ||
              (nextEvent.id && ev.id ? String(nextEvent.id) === String(ev.id) : (nextEvent.name === ev.name && nextEvent.date === ev.date))
            );
            return (
              <div 
                key={`upcoming-date-${ev.id || i}`}
                className={`timeline-upcoming-date-badge ${isNext ? 'is-next' : 'is-future'}`}
                style={{ left: `${ev.percent}%` }}
                title={`${ev.name} (${ev.date})`}
              >
                <span>{formatDayMonth(ev.date)}</span>
              </div>
            );
          })}

          {/* Today Marker (Vạch Ngày Hôm Nay) */}
          {showTodayMarker && (
            <div 
              className="timeline-today-marker"
              style={{ left: `${percentTime}%` }}
              title={lang === 'en' ? `Today: ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : `Hôm nay: Ngày ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`}
            >
              <div className="today-radar-pulse"></div>
              <div className="today-line"></div>
              <div className="today-pin-flag">
                <span>{lang === 'en' ? 'Today' : 'Hôm nay'}</span>
              </div>
            </div>
          )}

          {/* Moving Animated Runner Character */}
          <div 
            className="timeline-runner-avatar"
            style={{ 
              left: `calc(${vehiclePos}% - 96px)`
            }}
            title={lang === 'en' ? `Runner progress: ${activeRunnerPercent}%` : `Tiến độ Runner: ${activeRunnerPercent}%`}
          >
            <img 
              src="/icegif-449-transparent.gif" 
              alt="Runners" 
              style={{ 
                width: '192px', 
                height: '192px', 
                objectFit: 'contain'
              }} 
            />
          </div>
          
          {/* Destination Pin - Dec 31st */}
          <div className="map-pin-end timeline-end-pin" title={lang === 'en' ? `Finish line for ${currentYear} (Dec 31)` : `Về đích năm ${currentYear} (31/12)`}>
            <div className="destination-badge timeline-endpoint-badge">
              <span>🏁</span>
            </div>
          </div>
        </div>
      </div>
      
      {percentDistance >= 100 && (
        <p className="goal-congrats" style={{ marginTop: '16px' }}>
          {lang === 'en' 
            ? `🎉 Congratulations! The club has successfully achieved the distance goal for ${currentYear}!` 
            : `🎉 Chúc mừng! Câu lạc bộ đã hoàn thành xuất sắc mục tiêu cự ly của năm ${currentYear}!`}
        </p>
      )}

      {/* Quick Edit Goal Modal rendered via Portal to prevent parent transform flickering */}
      {isEditing && typeof document !== 'undefined' ? createPortal(renderEditModal(), document.body) : null}
    </div>
  );
}

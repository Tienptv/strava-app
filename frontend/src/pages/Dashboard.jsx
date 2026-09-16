import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Clock, TrendingUp, Flame, Users, ChevronRight, RefreshCw, 
  LayoutDashboard, Target, Activity, Search, X, LayoutGrid, List 
} from 'lucide-react';
import ActivityCard from '../components/ActivityCard';
import ActivityDetailModal from '../components/ActivityDetailModal';
import StatsChart from '../components/StatsChart';
import ChallengeTable from '../components/ChallengeTable';
import ChallengeCharts from '../components/ChallengeCharts';
import PersonalGoal from '../components/PersonalGoal';
import ClubGoalProgress from '../components/ClubGoalProgress';
import { processChallengeData, getCombinedDistance } from '../utils/challengeStats';
import { useLang } from '../i18n/LangContext';
import { loadChallengeData } from '../utils/challengeDataLoader';
import { APP_VERSION } from '../config/version';
import MobileLeaderboard from '../components/MobileLeaderboard';
import MobileBottomNav from '../components/MobileBottomNav';
import TreasuryTransparencyModal from '../components/TreasuryTransparencyModal';

export default function Dashboard({ 
  athlete, 
  apiFetch, 
  isAdmin,
  challengeMonth: propMonth, 
  challengeYear: propYear, 
  setChallengeMonth: propSetMonth, 
  setChallengeYear: propSetYear 
}) {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activities');
  const navigate = useNavigate();
  const { lang, t } = useLang();

  // Mobile responsiveness & Navigation
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [isForcedLandscape, setIsForcedLandscape] = useState(false);
  const [mobileViewType, setMobileViewType] = useState('card'); // 'card' | 'table'
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [mobileActiveNavTab, setMobileActiveNavTab] = useState('leaderboard');

  // Desktop Activities View States
  const [activityViewMode, setActivityViewMode] = useState(() => {
    try {
      return localStorage.getItem('strava_activity_view_mode') || 'grid';
    } catch (e) {
      return 'grid';
    }
  });
  const [activitySearch, setActivitySearch] = useState('');
  const [activitySportFilter, setActivitySportFilter] = useState('all');
  const [activitySortBy, setActivitySortBy] = useState('newest');
  const [selectedActivityDetail, setSelectedActivityDetail] = useState(null);

  const filteredActivities = useMemo(() => {
    let list = [...activities];

    // 1. Search by title
    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase();
      list = list.filter((act) => (act.name || '').toLowerCase().includes(q));
    }

    // 2. Filter by sport type
    if (activitySportFilter !== 'all') {
      list = list.filter((act) => {
        const t = (act.type || act.sport_type || '').toLowerCase();
        if (activitySportFilter === 'run') {
          return ['run', 'trailrun', 'virtualrun', 'trail run'].includes(t) || t.includes('run') || t.includes('trail');
        }
        if (activitySportFilter === 'ride') {
          return ['ride', 'virtualride', 'ebikeride', 'cycling'].includes(t) || t.includes('ride') || t.includes('bike');
        }
        if (activitySportFilter === 'walk') {
          return ['walk', 'hike'].includes(t) || t.includes('walk') || t.includes('hike');
        }
        return true;
      });
    }

    // 3. Sort
    if (activitySortBy === 'longest') {
      list.sort((a, b) => (b.distance || 0) - (a.distance || 0));
    } else if (activitySortBy === 'fastest') {
      list.sort((a, b) => {
        const paceA = (a.distance > 0 && a.moving_time > 0) ? a.moving_time / (a.distance / 1000) : 999999;
        const paceB = (b.distance > 0 && b.moving_time > 0) ? b.moving_time / (b.distance / 1000) : 999999;
        return paceA - paceB;
      });
    } else {
      // 'newest'
      list.sort((a, b) => {
        const dateA = new Date(a.start_date_local || a.start_date || 0);
        const dateB = new Date(b.start_date_local || b.start_date || 0);
        return dateB - dateA;
      });
    }

    return list;
  }, [activities, activitySearch, activitySportFilter, activitySortBy]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsForcedLandscape(false);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Challenge States
  const [viewMode, setViewMode] = useState(isMobile || athlete?.isGuest ? 'challenge' : 'overview'); // 'overview' | 'challenge'
  const [internalMonth, setInternalMonth] = useState(new Date().getMonth() + 1);
  const [internalYear, setInternalYear] = useState(new Date().getFullYear());

  const challengeMonth = propMonth !== undefined ? propMonth : internalMonth;
  const challengeYear = propYear !== undefined ? propYear : internalYear;
  const setChallengeMonth = propSetMonth || setInternalMonth;
  const setChallengeYear = propSetYear || setInternalYear;
  const [allChallengeActivities, setAllChallengeActivities] = useState([]);
  const [challengeData, setChallengeData] = useState([]);
  const [combinedTotalDistance, setCombinedTotalDistance] = useState(0);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [challengeParticipants, setChallengeParticipants] = useState({});
  const [challengeConfig, setChallengeConfig] = useState(null);
  const [totalKmBase, setTotalKmBase] = useState(null);
  const [nameMapping, setNameMapping] = useState({});
  const [treasurySummary, setTreasurySummary] = useState(null);

  useEffect(() => {
    const loadTreasury = () => {
      if (apiFetch) {
        apiFetch('/penalties/summary')
          .then(data => {
            if (data) setTreasurySummary(data);
          })
          .catch(() => {});
      }
    };
    loadTreasury();
    window.addEventListener('penaltiesUpdated', loadTreasury);
    return () => window.removeEventListener('penaltiesUpdated', loadTreasury);
  }, [apiFetch]);

  useEffect(() => {
    if (viewMode === 'challenge' && !loadingChallenge) {
      const processed = processChallengeData(allChallengeActivities, challengeParticipants, challengeYear, challengeMonth, totalKmBase);
      setChallengeData(processed);
      
      const allYearParticipants = challengeConfig?.participants || challengeParticipants;
      const combined = getCombinedDistance(allChallengeActivities, allYearParticipants, challengeYear);
      setCombinedTotalDistance(combined);
    }
  }, [allChallengeActivities, challengeParticipants, challengeMonth, challengeYear, viewMode, loadingChallenge, totalKmBase, challengeConfig]);

  // Cập nhật danh sách thành viên khi đổi tháng/năm
  useEffect(() => {
    if (challengeConfig) {
      const monthKey = `${challengeYear}_${challengeMonth}`;
      const currentParts = (challengeConfig.monthlyParticipants && challengeConfig.monthlyParticipants[monthKey]) || challengeConfig.participants || {};
      setChallengeParticipants(currentParts);
    }
  }, [challengeMonth, challengeYear, challengeConfig]);

  useEffect(() => {
    loadData();
    checkChallengeData();

    const handleChallengeUpdated = () => {
      checkChallengeData();
    };

    window.addEventListener('challengeUpdated', handleChallengeUpdated);
    return () => window.removeEventListener('challengeUpdated', handleChallengeUpdated);
  }, []);

  const loadData = async () => {
    if (athlete?.isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [activitiesData, statsData, clubsData] = await Promise.all([
        apiFetch('/activities?per_page=30').catch(() => []),
        apiFetch('/athlete/stats').catch(() => null),
        apiFetch('/clubs').catch(() => []),
      ]);
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      setStats(statsData);
      setClubs(Array.isArray(clubsData) ? clubsData : []);
    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkChallengeData = async () => {
    try {
      const config = await apiFetch('/challenge/config').catch(() => null);
      if (config && ((config.participants && Object.keys(config.participants).length > 0) || (config.monthlyParticipants && Object.keys(config.monthlyParticipants).length > 0))) {
        setChallengeConfig(config);
        const monthKey = `${challengeYear}_${challengeMonth}`;
        const currentParts = (config.monthlyParticipants && config.monthlyParticipants[monthKey]) || config.participants || {};
        setChallengeParticipants(currentParts);
        setViewMode('challenge');
        loadChallengeActivities(config.clubId, config.participants || currentParts);
      } else {
        setViewMode(athlete?.isGuest ? 'challenge' : 'overview');
      }
    } catch (e) {
      console.error('Lỗi checkChallengeData', e);
      setViewMode(athlete?.isGuest ? 'challenge' : 'overview');
    }
  };

  const loadChallengeActivities = async (clubId, participants) => {
    setLoadingChallenge(true);
    try {
      // Load Total-km baseline from backend
      try {
        const totalKmData = await apiFetch('/challenge/total-km').catch(() => null);
        if (totalKmData && Array.isArray(totalKmData.items)) {
          setTotalKmBase(totalKmData);
        }
        
        const mappingData = await apiFetch('/challenge/name-mapping').catch(() => ({}));
        setNameMapping(mappingData || {});

      } catch (e) {
        console.error('Lỗi khi đọc Total-km base', e);
      }

      // Load activities strictly from CSV sources (historical and imported) via module
      const allActivities = await loadChallengeData(apiFetch, athlete, participants);
      
      setAllChallengeActivities(allActivities);
    } catch (err) {
      console.error('Lỗi tải challenge:', err);
    } finally {
      setLoadingChallenge(false);
    }
  };

  // Helper functions
  const formatDistance = (meters) => {
    if (!meters) return '0';
    return (meters / 1000).toFixed(1);
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatElevation = (meters) => {
    if (!meters) return '0';
    return Math.round(meters);
  };

  const totalDistance = stats?.all_ride_totals?.distance
    ? formatDistance(
        (stats.all_ride_totals.distance || 0) +
        (stats.all_run_totals.distance || 0) +
        (stats.all_swim_totals.distance || 0)
      )
    : formatDistance(activities.reduce((sum, a) => sum + (a.distance || 0), 0));

  const totalTime = stats?.all_ride_totals?.moving_time
    ? formatTime(
        (stats.all_ride_totals.moving_time || 0) +
        (stats.all_run_totals.moving_time || 0) +
        (stats.all_swim_totals.moving_time || 0)
      )
    : formatTime(activities.reduce((sum, a) => sum + (a.moving_time || 0), 0));

  const totalElevation = stats?.all_ride_totals?.elevation_gain
    ? formatElevation(
        (stats.all_ride_totals.elevation_gain || 0) +
        (stats.all_run_totals.elevation_gain || 0)
      )
    : formatElevation(activities.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0));

  const recentCount = stats?.recent_ride_totals?.count
    ? (stats.recent_ride_totals.count || 0) +
      (stats.recent_run_totals.count || 0) +
      (stats.recent_swim_totals.count || 0)
    : activities.length;

  const today = new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh'
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="loading__spinner"></div>
        <div className="loading__text">{t('loadingData')}</div>
      </div>
    );
  }

  const currentHour = new Date().getHours();
  let greetingKey = 'greetingMorning';
  if (currentHour >= 18 || currentHour < 5) {
    greetingKey = 'greetingEvening';
  } else if (currentHour >= 11 && currentHour <= 13) {
    greetingKey = 'greetingNoon';
  } else if (currentHour > 13 && currentHour < 18) {
    greetingKey = 'greetingAfternoon';
  }

  return (
    <div 
      className={`dashboard ${isForcedLandscape ? 'forced-landscape-container' : ''}`} 
      style={{ paddingBottom: (isMobile && !isForcedLandscape) ? '88px' : '24px' }}
    >
      <div className="dashboard__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="dashboard__greeting">
            {athlete?.isGuest ? (
              <span>{lang === 'en' ? 'Welcome Club Runners' : 'Chào mừng VĐV CLB'}</span>
            ) : (
              <>{t(greetingKey)} <span>{athlete.firstname || 'Athlete'}</span></>
            )}
          </h1>
          <p className="dashboard__date">{today}</p>
        </div>
        {(!isMobile || isForcedLandscape) && !athlete?.isGuest && (
          <div className="view-mode-toggle">
            <button 
              className={`btn ${viewMode === 'overview' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setViewMode('overview')}
            >
              <LayoutDashboard size={16} style={{marginRight: 6}} />
              {t('overview')}
            </button>
            <button 
              className={`btn ${viewMode === 'challenge' ? 'btn--primary' : 'btn--secondary btn-challenge-tab'}`}
              onClick={() => setViewMode('challenge')}
            >
              <img src="/haskoning-star-transparent.png" alt="Challenge" style={{ width: 24, height: 24, marginRight: 6, objectFit: 'contain', filter: 'drop-shadow(1px 0px 0px rgba(255,255,255,0.2)) drop-shadow(0px 1px 0px rgba(255,255,255,0.2)) drop-shadow(-1px 0px 0px rgba(255,255,255,0.2)) drop-shadow(0px -1px 0px rgba(255,255,255,0.2))' }} />
              {t('challengeTab')}
            </button>
          </div>
        )}
      </div>

      {viewMode === 'challenge' ? (
        <div className="challenge-view">
          {/* Trên Mobile: Chỉ hiển thị Hành trình năm khi chọn tab 'journey' */}
          {(!isMobile || mobileActiveNavTab === 'journey') && (
            <div className="mobile-journey-section">
              <ClubGoalProgress totalDistance={combinedTotalDistance} apiFetch={apiFetch} isAdmin={isAdmin} />
            </div>
          )}

          {/* Trên Mobile: Hiển thị Mục Tiêu Cá Nhân & AI Coach khi chọn tab 'mygoal' */}
          {isMobile && mobileActiveNavTab === 'mygoal' && (
            <div className="mobile-mygoal-section">
              {athlete?.isGuest ? (
                <div className="card" style={{ padding: '24px 20px', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--border)', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎯</div>
                  <h3 style={{ margin: '0 0 8px', color: 'var(--primary-navy)', fontWeight: 800 }}>
                    {t('guestGoalPromptTitle')}
                  </h3>
                  <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {t('guestGoalPromptDesc')}
                  </p>
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      localStorage.removeItem('isGuest');
                      localStorage.removeItem('athleteId');
                      window.location.href = '/';
                    }}
                    className="btn btn--primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 700 }}
                  >
                    🚀 {t('guestLoginNow')}
                  </a>
                </div>
              ) : (
                <>
                  <PersonalGoal 
                    activities={activities} 
                    athlete={athlete}
                    apiFetch={apiFetch}
                    challengeMonth={challengeMonth}
                    challengeYear={challengeYear}
                    challengeParticipants={challengeParticipants}
                    challengeData={challengeData}
                    isAdmin={isAdmin !== undefined ? isAdmin : Boolean(athlete && import.meta.env.VITE_ADMIN_STRAVA_ID && athlete.id.toString() === import.meta.env.VITE_ADMIN_STRAVA_ID)}
                    lockTargetsAfterDate={challengeConfig?.lockTargetsAfterDate}
                  />

                  {/* Thống kê cá nhân & Hoạt động gần đây trên Mobile */}
                  <div className="dashboard-section-header" style={{ marginTop: '24px' }}>
                    <h3 className="dashboard-section-title">
                      <Activity size={18} className="dashboard-section-icon" />
                      {t('careerOverview')}
                    </h3>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card stat-card--distance">
                      <div className="stat-card__header">
                        <span className="stat-card__label">{t('totalDistance')}</span>
                        <div className="stat-card__icon"><MapPin size={16} /></div>
                      </div>
                      <div className="stat-card__value">{totalDistance} km</div>
                      <div className="stat-card__sub">{t('allActivities')}</div>
                    </div>
                    <div className="stat-card stat-card--time">
                      <div className="stat-card__header">
                        <span className="stat-card__label">{t('totalTime')}</span>
                        <div className="stat-card__icon"><Clock size={16} /></div>
                      </div>
                      <div className="stat-card__value">{totalTime}</div>
                      <div className="stat-card__sub">{t('movingTime')}</div>
                    </div>
                    <div className="stat-card stat-card--elevation">
                      <div className="stat-card__header">
                        <span className="stat-card__label">{t('totalElevation')}</span>
                        <div className="stat-card__icon"><TrendingUp size={16} /></div>
                      </div>
                      <div className="stat-card__value">{totalElevation} m</div>
                      <div className="stat-card__sub">{t('elevationGain')}</div>
                    </div>
                    <div className="stat-card stat-card--recent">
                      <div className="stat-card__header">
                        <span className="stat-card__label">{t('recentActivities')}</span>
                        <div className="stat-card__icon"><Flame size={16} /></div>
                      </div>
                      <div className="stat-card__value">{recentCount}</div>
                      <div className="stat-card__sub">{t('last4Weeks')}</div>
                    </div>
                  </div>

                  {activities.length > 0 && (
                    <div className="section" style={{ marginTop: '24px' }}>
                      <div className="section__header">
                        <h2 className="section__title">{t('recentActivities')}</h2>
                        <button className="btn btn--secondary" onClick={loadData} style={{padding: '6px 14px', fontSize: '0.8rem'}}>
                          <RefreshCw size={14} /> {t('refresh')}
                        </button>
                      </div>
                      <div className="activities-list">
                        {activities.slice(0, 8).map((activity) => (
                          <ActivityCard 
                            key={activity.id} 
                            activity={activity} 
                            viewMode="list"
                            onSelectActivity={(act) => setSelectedActivityDetail(act)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {(!isMobile || mobileActiveNavTab === 'leaderboard') && (
            <div className="challenge-section-wrapper">
              
              {/* Mini-Widget: Quỹ Hoạt Động & Phát Triển CLB */}
              <div className="card club-treasury-banner" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(0, 45, 84, 0.96) 0%, rgba(0, 75, 135, 0.94) 50%, rgba(0, 163, 166, 0.92) 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 16px rgba(0, 45, 84, 0.15)',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.18)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    💰
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.85, fontWeight: 700 }}>
                      {lang === 'en' ? 'Club Treasury & Activities Fund' : 'Quỹ Hoạt Động & Phát Triển CLB'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fef08a' }}>
                        {(treasurySummary?.currentClubFundBalance || 11097000).toLocaleString('vi-VN')} VNĐ
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                        ({lang === 'en' ? 'All-Time Collected' : 'Tổng phạt đã thu'}: {(treasurySummary?.totalPenaltyFundCollected || 16900000).toLocaleString('vi-VN')} VNĐ)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="treasury-actions-row">
                  <span className="treasury-badge-transparency">
                    {lang === 'en' ? '🛡 100% Financial Transparency' : '🛡 Minh bạch tài chính 100%'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isAdmin && !isMobile) {
                        navigate('/administer?tab=penalties', { state: { tab: 'penalties' } });
                      } else {
                        setShowTreasuryModal(true);
                      }
                    }}
                    className="btn treasury-btn-view"
                  >
                    {lang === 'en' ? 'View Treasury →' : 'Chi Tiết Quỹ →'}
                  </button>
                </div>
              </div>

            {/* Trên điện thoại luôn hiển thị MobileLeaderboard trong tab Rankings trừ khi bật xoay ngang cưỡng bức */}
            {(isMobile && !isForcedLandscape) ? (
              loadingChallenge ? (
                <div className="loading">
                  <div className="loading__spinner"></div>
                  <div className="loading__text">{t('loadingChallengeData')}</div>
                </div>
              ) : (
                <MobileLeaderboard 
                  challengeData={challengeData}
                  year={challengeYear}
                  month={challengeMonth}
                  setMonth={setChallengeMonth}
                  apiFetch={apiFetch}
                  athlete={athlete}
                  nameMapping={nameMapping}
                  isAdmin={isAdmin !== undefined ? isAdmin : Boolean(athlete && import.meta.env.VITE_ADMIN_STRAVA_ID && athlete.id.toString() === import.meta.env.VITE_ADMIN_STRAVA_ID)}
                  allowEditOthers={challengeConfig?.allowEditOthers}
                  lockTargetsAfterDate={challengeConfig?.lockTargetsAfterDate}
                  onYearChange={setChallengeYear}
                  isForcedLandscape={isForcedLandscape}
                  onToggleForcedLandscape={(val) => setIsForcedLandscape(val)}
                />
              )
            ) : (
              <>
                {loadingChallenge ? (
                  <div className="loading">
                    <div className="loading__spinner"></div>
                    <div className="loading__text">{t('loadingChallengeData')}</div>
                  </div>
                ) : (
                  <>
                    <ChallengeCharts 
                      challengeData={challengeData} 
                      year={challengeYear} 
                      month={challengeMonth} 
                      athlete={athlete}
                      isAdmin={isAdmin !== undefined ? isAdmin : Boolean(athlete && import.meta.env.VITE_ADMIN_STRAVA_ID && athlete.id.toString() === import.meta.env.VITE_ADMIN_STRAVA_ID)}
                      apiFetch={apiFetch}
                      challengeConfig={challengeConfig}
                      onConfigUpdate={(newCfg) => setChallengeConfig(newCfg)}
                      nameMapping={nameMapping}
                    />
                    <ChallengeTable 
                      challengeData={challengeData} 
                      year={challengeYear} 
                      month={challengeMonth} 
                      apiFetch={apiFetch}
                      athlete={athlete}
                      isAdmin={isAdmin !== undefined ? isAdmin : Boolean(athlete && import.meta.env.VITE_ADMIN_STRAVA_ID && athlete.id.toString() === import.meta.env.VITE_ADMIN_STRAVA_ID)}
                      allowEditOthers={challengeConfig?.allowEditOthers}
                      lockTargetsAfterDate={challengeConfig?.lockTargetsAfterDate}
                      nameMapping={nameMapping}
                      onMonthChange={setChallengeMonth}
                      onYearChange={setChallengeYear}
                    />
                  </>
                )}
              </>
            )}
          </div>
          )}
        </div>
      ) : (
        <>
          <PersonalGoal 
            activities={activities} 
            athlete={athlete}
            apiFetch={apiFetch}
            challengeMonth={challengeMonth}
            challengeYear={challengeYear}
            challengeParticipants={challengeParticipants}
            challengeData={challengeData}
            isAdmin={isAdmin !== undefined ? isAdmin : Boolean(athlete && import.meta.env.VITE_ADMIN_STRAVA_ID && athlete.id.toString() === import.meta.env.VITE_ADMIN_STRAVA_ID)}
            lockTargetsAfterDate={challengeConfig?.lockTargetsAfterDate}
          />

          <div className="dashboard-section-header">
            <h3 className="dashboard-section-title">
              <Activity size={18} className="dashboard-section-icon" />
              {t('careerOverview')}
            </h3>
          </div>

          <div className="stats-grid">
            <div className="stat-card stat-card--distance">
              <div className="stat-card__header">
                <span className="stat-card__label">{t('totalDistance')}</span>
                <div className="stat-card__icon"><MapPin size={16} /></div>
              </div>
              <div className="stat-card__value">{totalDistance} km</div>
              <div className="stat-card__sub">{t('allActivities')}</div>
            </div>
            <div className="stat-card stat-card--time">
              <div className="stat-card__header">
                <span className="stat-card__label">{t('totalTime')}</span>
                <div className="stat-card__icon"><Clock size={16} /></div>
              </div>
              <div className="stat-card__value">{totalTime}</div>
              <div className="stat-card__sub">{t('movingTime')}</div>
            </div>
            <div className="stat-card stat-card--elevation">
              <div className="stat-card__header">
                <span className="stat-card__label">{t('totalElevation')}</span>
                <div className="stat-card__icon"><TrendingUp size={16} /></div>
              </div>
              <div className="stat-card__value">{totalElevation} m</div>
              <div className="stat-card__sub">{t('elevationGain')}</div>
            </div>
            <div className="stat-card stat-card--recent">
              <div className="stat-card__header">
                <span className="stat-card__label">{t('recentActivities')}</span>
                <div className="stat-card__icon"><Flame size={16} /></div>
              </div>
              <div className="stat-card__value">{recentCount}</div>
              <div className="stat-card__sub">{t('last4Weeks')}</div>
            </div>
          </div>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'activities' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('activities')}
            >
              {t('tabActivities')}
            </button>
            <button
              className={`tab ${activeTab === 'charts' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('charts')}
            >
              {t('tabCharts')}
            </button>
            <button
              className={`tab ${activeTab === 'clubs' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('clubs')}
            >
              {t('tabClubs')} ({clubs.length})
            </button>
          </div>

          {activeTab === 'activities' && (
            <div className="section">
              <div className="section__header section__header--activities">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 className="section__title" style={{ margin: 0 }}>{t('recentActivities')}</h2>
                  <span className="activity-count-badge">
                    {filteredActivities.length}{filteredActivities.length !== activities.length ? ` / ${activities.length}` : ''}
                  </span>
                </div>

                <div className="activity-toolbar">
                  {/* Search Input */}
                  <div className="activity-search-box">
                    <Search size={14} className="activity-search-icon" />
                    <input 
                      type="text"
                      placeholder={t('searchActivities')}
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className="activity-search-input"
                    />
                    {activitySearch && (
                      <button 
                        type="button"
                        className="activity-search-clear"
                        onClick={() => setActivitySearch('')}
                        title={t('clearFilters')}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Sport Filter */}
                  <select
                    value={activitySportFilter}
                    onChange={(e) => setActivitySportFilter(e.target.value)}
                    className="activity-select"
                  >
                    <option value="all">{t('filterAll')}</option>
                    <option value="run">{t('filterRun')}</option>
                    <option value="ride">{t('filterRide')}</option>
                    <option value="walk">{t('filterWalk')}</option>
                  </select>

                  {/* Sort by */}
                  <select
                    value={activitySortBy}
                    onChange={(e) => setActivitySortBy(e.target.value)}
                    className="activity-select"
                  >
                    <option value="newest">{t('sortNewest')}</option>
                    <option value="longest">{t('sortLongest')}</option>
                    <option value="fastest">{t('sortFastest')}</option>
                  </select>

                  {/* View Mode Toggle: Grid vs List (Desktop) */}
                  <div className="activity-view-toggle">
                    <button
                      type="button"
                      className={`activity-view-btn ${activityViewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => {
                        setActivityViewMode('grid');
                        try { localStorage.setItem('strava_activity_view_mode', 'grid'); } catch(e){}
                      }}
                      title={t('viewGrid')}
                    >
                      <LayoutGrid size={15} />
                    </button>
                    <button
                      type="button"
                      className={`activity-view-btn ${activityViewMode === 'list' ? 'active' : ''}`}
                      onClick={() => {
                        setActivityViewMode('list');
                        try { localStorage.setItem('strava_activity_view_mode', 'list'); } catch(e){}
                      }}
                      title={t('viewList')}
                    >
                      <List size={15} />
                    </button>
                  </div>

                  {/* Refresh Button */}
                  <button className="btn btn--secondary" onClick={loadData} style={{padding: '6px 14px', fontSize: '0.8rem'}}>
                    <RefreshCw size={14} /> {t('refresh')}
                  </button>
                </div>
              </div>

              {filteredActivities.length > 0 ? (
                <div className={activityViewMode === 'grid' ? 'activities-grid' : 'activities-list'}>
                  {filteredActivities.map((activity) => (
                    <ActivityCard 
                      key={activity.id} 
                      activity={activity} 
                      viewMode={activityViewMode}
                      onSelectActivity={(act) => setSelectedActivityDetail(act)}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '14px', fontSize: '0.95rem' }}>
                    {t('noActivitiesFound')}
                  </p>
                  {(activitySearch || activitySportFilter !== 'all') && (
                    <button 
                      className="btn btn--secondary"
                      onClick={() => {
                        setActivitySearch('');
                        setActivitySportFilter('all');
                      }}
                      style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                    >
                      {t('clearFilters')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="section">
              <h2 className="section__title">{t('activityChart')}</h2>
              <StatsChart activities={activities} />
            </div>
          )}

          {activeTab === 'clubs' && (
            <div className="section">
              <h2 className="section__title">{t('yourClubs')}</h2>
              <div className="clubs-grid">
                {clubs.map((club) => (
                  <div key={club.id} className="club-card" onClick={() => navigate(`/clubs/${club.id}`)}>
                    <div className="club-card__header">
                      {club.profile_medium ? (
                        <img src={club.profile_medium} alt={club.name} className="club-card__avatar" />
                      ) : (
                        <div className="club-card__avatar" style={{background: 'var(--primary)'}}></div>
                      )}
                      <div className="club-card__info">
                        <div className="club-card__name">{club.name}</div>
                        <div className="club-card__type">{club.sport_type || 'Club'}</div>
                      </div>
                    </div>
                    <div className="club-card__stats">
                      <div className="club-card__stat">
                        <Users size={14} /> {club.member_count} {t('members').toLowerCase()}
                      </div>
                      <ChevronRight size={16} color="var(--text-secondary)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Version Tag */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingBottom: '8px' }}>
        <span className="app-version-tag">
          Version {APP_VERSION}
        </span>
      </div>

      {/* Read-only Treasury Transparency Modal */}
      <TreasuryTransparencyModal 
        isOpen={showTreasuryModal}
        onClose={() => setShowTreasuryModal(false)}
        apiFetch={apiFetch}
        currentMonth={challengeMonth}
        currentYear={challengeYear}
      />

      {/* Nút thoát Xoay Ngang khi đang ở chế độ xoay cưỡng bức (Portrait Orientation Lock ON) */}
      {isForcedLandscape && (
        <button
          type="button"
          className="floating-portrait-return-btn"
          onClick={() => {
            setIsForcedLandscape(false);
            try {
              if (window.screen?.orientation?.unlock) window.screen.orientation.unlock();
              if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
            } catch (_) {}
          }}
          aria-label={t('portraitRotateBtn')}
        >
          📱 {t('portraitRotateBtn')}
        </button>
      )}

      {/* Mobile Bottom Navigation */}
      {(isMobile && !isForcedLandscape) && (
        <MobileBottomNav 
          activeTab={mobileActiveNavTab}
          onTabSelect={(tab) => {
            setViewMode('challenge');
            setMobileActiveNavTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenTreasury={() => setShowTreasuryModal(true)}
          onFindMe={() => {
            setViewMode('challenge');
            setMobileActiveNavTab('leaderboard');
            setMobileViewType('card');
            setTimeout(() => {
              const searchInput = document.querySelector('.mobile-search-input-wrap input');
              if (searchInput) {
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }}
        />
      )}

      {/* Activity Detail Modal */}
      {selectedActivityDetail && (
        <ActivityDetailModal 
          activity={selectedActivityDetail} 
          onClose={() => setSelectedActivityDetail(null)} 
        />
      )}
    </div>
  );
}

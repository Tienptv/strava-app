import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, TrendingUp, Flame, Users, ChevronRight, RefreshCw, LayoutDashboard, Target } from 'lucide-react';
import ActivityCard from '../components/ActivityCard';
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
  const [mobileViewType, setMobileViewType] = useState('card'); // 'card' | 'table'
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [mobileActiveNavTab, setMobileActiveNavTab] = useState('leaderboard');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Challenge States
  const [viewMode, setViewMode] = useState(athlete?.isGuest ? 'challenge' : 'overview'); // 'overview' | 'challenge'
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
    <div className="dashboard" style={{ paddingBottom: isMobile ? '88px' : '24px' }}>
      <div className="dashboard__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="dashboard__greeting">
            {athlete?.isGuest ? (
              <span>{lang === 'en' ? 'Welcome Club Runners 👋' : 'Chào mừng VĐV CLB 👋'}</span>
            ) : (
              <>{t(greetingKey)} <span>{athlete.firstname || 'Athlete'}</span> 👋</>
            )}
          </h1>
          <p className="dashboard__date">{today}</p>
        </div>
        {!athlete?.isGuest && (
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
            <ClubGoalProgress totalDistance={combinedTotalDistance} apiFetch={apiFetch} isAdmin={isAdmin} />
          )}
          
          {/* Mini-Widget: Quỹ Hoạt Động & Phát Triển CLB */}
          <div className="card club-treasury-banner" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '14px 20px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(0, 45, 84, 0.96) 0%, rgba(0, 75, 135, 0.94) 50%, rgba(0, 163, 166, 0.92) 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(0, 45, 84, 0.15)',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}>
                💰
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.85, fontWeight: 700 }}>
                  {lang === 'en' ? 'Club Treasury & Activities Fund' : 'Quỹ Hoạt Động & Phát Triển CLB'}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fef08a' }}>
                    {(treasurySummary?.currentClubFundBalance || 11097000).toLocaleString('vi-VN')} VNĐ
                  </span>
                  <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                    ({lang === 'en' ? 'All-Time Collected' : 'Tổng phạt đã thu'}: {(treasurySummary?.totalPenaltyFundCollected || 16900000).toLocaleString('vi-VN')} VNĐ)
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.15)', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.25)', fontWeight: 600 }}>
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
                className="btn"
                style={{
                  background: '#ffffff',
                  color: 'var(--primary-navy)',
                  padding: '7px 16px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {lang === 'en' ? 'View Treasury →' : 'Chi Tiết Quỹ →'}
              </button>
            </div>
          </div>
          
          {(!isMobile || mobileActiveNavTab === 'leaderboard') && (
            <div className="challenge-section-wrapper">
            {/* Nếu trên điện thoại và đang xem Card View thì render MobileLeaderboard */}
            {isMobile && mobileViewType === 'card' ? (
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
                  onToggleFullTable={() => setMobileViewType('table')}
                />
              )
            ) : (
              <>
                {/* Thanh chọn tháng desktop hoặc khi xem dạng table trên mobile */}
                <div className="challenge-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', overflowX: 'auto', gap: '6px', maxWidth: '100%', paddingBottom: '4px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                      const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const monthLabel = lang === 'en' 
                        ? `${monthNamesEn[m - 1]}/${new Date().getFullYear()}`
                        : `${t('month')} ${m}/${new Date().getFullYear()}`;
                      return (
                        <button
                          key={m}
                          className={`tab month-pill ${challengeMonth === m ? 'tab--active' : ''}`}
                          data-month={m}
                          onClick={() => { setChallengeMonth(m); setChallengeYear(new Date().getFullYear()); }}
                        >
                          {monthLabel}
                        </button>
                      );
                    })}
                  </div>

                  {isMobile && (
                    <button 
                      className="btn btn--secondary" 
                      style={{ fontSize: '0.8rem', padding: '5px 12px', background: '#ffffff', border: '1px solid var(--border)' }}
                      onClick={() => setMobileViewType('card')}
                    >
                      📱 Xem Dạng Thẻ
                    </button>
                  )}
                </div>

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
                      nameMapping={nameMapping}
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
          />
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">{t('totalDistance')}</span>
                <div className="stat-card__icon"><MapPin size={18} /></div>
              </div>
              <div className="stat-card__value">{totalDistance} km</div>
              <div className="stat-card__sub">{t('allActivities')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">{t('totalTime')}</span>
                <div className="stat-card__icon"><Clock size={18} /></div>
              </div>
              <div className="stat-card__value">{totalTime}</div>
              <div className="stat-card__sub">{t('movingTime')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">{t('totalElevation')}</span>
                <div className="stat-card__icon"><TrendingUp size={18} /></div>
              </div>
              <div className="stat-card__value">{totalElevation} m</div>
              <div className="stat-card__sub">{t('elevationGain')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">{t('recentActivities')}</span>
                <div className="stat-card__icon"><Flame size={18} /></div>
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
              <div className="section__header">
                <h2 className="section__title">{t('recentActivities')}</h2>
                <button className="btn btn--secondary" onClick={loadData} style={{padding: '6px 14px', fontSize: '0.8rem'}}>
                  <RefreshCw size={14} /> {t('refresh')}
                </button>
              </div>
              <div className="activities-list">
                {activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
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

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav 
          activeTab={mobileActiveNavTab}
          onTabSelect={(tab) => {
            setMobileActiveNavTab(tab);
            if (tab === 'journey') {
              const journeyEl = document.querySelector('.club-goal-progress-card') || document.querySelector('.club-goal-progress-container');
              if (journeyEl) journeyEl.scrollIntoView({ behavior: 'smooth' });
            } else if (tab === 'leaderboard') {
              const bxhEl = document.querySelector('.mobile-leaderboard-container') || document.querySelector('.challenge-section-wrapper');
              if (bxhEl) bxhEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onOpenTreasury={() => setShowTreasuryModal(true)}
          onFindMe={() => {
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
    </div>
  );
}

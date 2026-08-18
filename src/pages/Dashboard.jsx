import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, TrendingUp, Flame, Users, ChevronRight, RefreshCw, LayoutDashboard, Target } from 'lucide-react';
import ActivityCard from '../components/ActivityCard';
import StatsChart from '../components/StatsChart';
import ChallengeTable from '../components/ChallengeTable';
import PersonalGoal from '../components/PersonalGoal';
import ClubGoalProgress from '../components/ClubGoalProgress';
import { processChallengeData, getCombinedDistance } from '../utils/challengeStats';
import { useLang } from '../i18n/LangContext';
import { loadChallengeData } from '../utils/challengeDataLoader';

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

  // Challenge States
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'challenge'
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
        setViewMode('overview');
      }
    } catch (e) {
      console.error('Lỗi checkChallengeData', e);
      setViewMode('overview');
    }
  };

  const loadChallengeActivities = async (clubId, participants) => {
    setLoadingChallenge(true);
    try {
      // Load Total-km baseline from backend
      try {
        const totalKmData = await apiFetch('/challenge/total-km').catch(() => null);
        if (totalKmData) {
          setTotalKmBase(totalKmData);
        }
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
    day: 'numeric'
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="loading__spinner"></div>
        <div className="loading__text">{t('loadingData')}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="dashboard__greeting">
            {t('greeting')} <span>{athlete.firstname || 'Athlete'}</span> 👋
          </h1>
          <p className="dashboard__date">{today}</p>
        </div>
        <div className="view-mode-toggle">
          <button 
            className={`btn ${viewMode === 'overview' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setViewMode('overview')}
            style={{ marginRight: '10px' }}
          >
            <LayoutDashboard size={16} style={{marginRight: 6}} />
            {t('overview')}
          </button>
          <button 
            className={`btn ${viewMode === 'challenge' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setViewMode('challenge')}
          >
            <Target size={16} style={{marginRight: 6}} />
            {t('challengeTab')}
          </button>
        </div>
      </div>

      {viewMode === 'challenge' ? (
        <div className="challenge-view">
          <ClubGoalProgress totalDistance={combinedTotalDistance} apiFetch={apiFetch} />
          
          <div className="tabs" style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(m => (
              <button
                key={m}
                className={`tab ${challengeMonth === m ? 'tab--active' : ''}`}
                onClick={() => { setChallengeMonth(m); setChallengeYear(new Date().getFullYear()); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: challengeMonth === m ? 'rgba(0, 163, 166, 0.1)' : 'var(--bg-card)',
                  color: challengeMonth === m ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('month')} {m}/{new Date().getFullYear()}
              </button>
            ))}
          </div>
          {loadingChallenge ? (
            <div className="loading">
              <div className="loading__spinner"></div>
              <div className="loading__text">{t('loadingChallengeData')}</div>
            </div>
          ) : (
            <ChallengeTable 
              challengeData={challengeData} 
              year={challengeYear} 
              month={challengeMonth} 
              apiFetch={apiFetch}
              athlete={athlete}
              isAdmin={isAdmin !== undefined ? isAdmin : Boolean(athlete && import.meta.env.VITE_ADMIN_STRAVA_ID && athlete.id.toString() === import.meta.env.VITE_ADMIN_STRAVA_ID)}
              allowEditOthers={challengeConfig?.allowEditOthers}
            />
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
    </div>
  );
}

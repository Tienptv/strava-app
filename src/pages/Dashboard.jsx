import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, TrendingUp, Flame, Users, ChevronRight, RefreshCw, LayoutDashboard, Target } from 'lucide-react';
import ActivityCard from '../components/ActivityCard';
import StatsChart from '../components/StatsChart';
import ChallengeTable from '../components/ChallengeTable';
import PersonalGoal from '../components/PersonalGoal';
import ClubGoalProgress from '../components/ClubGoalProgress';
import { processChallengeData } from '../utils/challengeStats';
import { useLang } from '../i18n/LangContext';

export default function Dashboard({ athlete, apiFetch }) {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activities');
  const navigate = useNavigate();
  const { lang, t } = useLang();

  // Challenge States
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'challenge'
  const [challengeMonth, setChallengeMonth] = useState(new Date().getMonth() + 1);
  const [challengeYear, setChallengeYear] = useState(new Date().getFullYear());
  const [allChallengeActivities, setAllChallengeActivities] = useState([]);
  const [challengeData, setChallengeData] = useState([]);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [challengeParticipants, setChallengeParticipants] = useState({});

  useEffect(() => {
    if (viewMode === 'challenge' && !loadingChallenge) {
      const processed = processChallengeData(allChallengeActivities, challengeParticipants, challengeYear, challengeMonth);
      setChallengeData(processed);
    }
  }, [allChallengeActivities, challengeParticipants, challengeMonth, challengeYear, viewMode, loadingChallenge]);

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
      setActivities(activitiesData);
      setStats(statsData);
      setClubs(clubsData);
    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkChallengeData = async () => {
    const savedParts = localStorage.getItem('challengeParticipants');
    const savedClubId = localStorage.getItem('challengeClubId');
    if (savedParts && savedClubId) {
      const parsedParts = JSON.parse(savedParts);
      setChallengeParticipants(parsedParts);
      if (Object.keys(parsedParts).length > 0) {
        setViewMode('challenge');
        loadChallengeActivities(savedClubId, parsedParts);
      } else {
        setViewMode('overview');
      }
    }
  };

  const loadChallengeActivities = async (clubId, participants) => {
    setLoadingChallenge(true);
    try {
      // Strava API: /clubs/{id}/activities không trả về ngày tháng
      // Lấy thêm hoạt động của bản thân để có chi tiết ngày tháng
      const [rawClubActivities, rawMyActivities] = await Promise.all([
        apiFetch(`/clubs/${clubId}/activities?per_page=200`).catch(() => []),
        apiFetch('/activities?per_page=200').catch(() => [])
      ]);
      console.log('Sample club activity:', rawClubActivities[0]);
      
      const myFname = athlete?.firstname || '';
      const myLname = athlete?.lastname || '';
      
      // Lọc các hoạt động (Chỉ lấy Run, VirtualRun, TrailRun)
      const validTypes = ['Run', 'VirtualRun', 'TrailRun'];
      
      // Loại bỏ các hoạt động của user hiện tại khỏi clubActivities để tránh tính đúp
      const clubActivities = rawClubActivities.filter(act => {
        if (!validTypes.includes(act.type)) return false;
        const fname = act.athlete?.firstname || '';
        const lname = act.athlete?.lastname || '';
        if (fname === myFname && (lname === myLname || lname === (myLname ? myLname.charAt(0) + '.' : ''))) {
          return false; // Bỏ qua vì đã lấy ở myActivities
        }
        return true;
      });

      const myActivities = rawMyActivities.filter(act => {
        if (!validTypes.includes(act.type)) return false;
        // Loại bỏ các hoạt động không public (bao gồm only_me, followers_only)
        if (act.private === true || act.visibility !== 'everyone' || act.hide_from_home === true) {
          return false;
        }
        return true;
      });
      
      // Load imported activities from localStorage (Strava Clubs Reports CSV)
      let importedActivities = [];
      try {
        const saved = localStorage.getItem('importedActivities');
        if (saved) {
          importedActivities = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Lỗi khi đọc importedActivities', e);
      }

      const normalize = (n) => (n || '').trim().toLowerCase().replace(/[\.\s]/g, '');

      // Loại bỏ các hoạt động của chính mình trong importedActivities vì đã có myActivities (đầy đủ hơn)
      const myFnameNorm = normalize(myFname);
      const myLnameNorm = normalize(myLname);
      const filteredImportedActivities = importedActivities.filter(impAct => {
        if (athlete && athlete.id && impAct.athlete?.id === athlete.id) return false;
        const impFnameNorm = normalize(impAct.athlete?.firstname);
        const impLnameNorm = normalize(impAct.athlete?.lastname);
        const isMe = impFnameNorm === myFnameNorm && (impLnameNorm === myLnameNorm || impLnameNorm.startsWith(myLnameNorm) || myLnameNorm.startsWith(impLnameNorm));
        return !isMe;
      });

      // Deduplicate clubActivities against importedActivities and myActivities
      const isDuplicate = (clubAct) => {
         const match = (act) => {
            const sameDistTime = act.distance === clubAct.distance && act.moving_time === clubAct.moving_time;
            const sameFname = normalize(act.athlete?.firstname) === normalize(clubAct.athlete?.firstname);
            const lnameA = normalize(act.athlete?.lastname);
            const lnameB = normalize(clubAct.athlete?.lastname);
            const sameLname = lnameA === lnameB || lnameA.startsWith(lnameB) || lnameB.startsWith(lnameA);
            return sameDistTime && sameFname && sameLname;
         };
         return filteredImportedActivities.some(match) || myActivities.some(match);
      };
      
      // Merge all activities together
      // Nếu có CSV import, ta bỏ qua clubActivities (vì API không có ngày tháng dễ sinh trùng lặp/ảo)
      const allActivities = importedActivities.length > 0 
         ? [...myActivities, ...filteredImportedActivities] 
         : [...filteredClubActivities, ...myActivities];
      
      // Inject authenticated athlete ID into participants to map personal activities
      if (athlete && athlete.id) {
        const myFnameNorm = normalize(myFname);
        const myLnameNorm = normalize(myLname);
        
        const meKey = Object.keys(participants).find(k => {
          const p = participants[k];
          const pFnameNorm = normalize(p.firstname);
          const pLnameNorm = normalize(p.lastname);
          return pFnameNorm === myFnameNorm && (pLnameNorm === myLnameNorm || pLnameNorm.startsWith(myLnameNorm) || myLnameNorm.startsWith(pLnameNorm));
        });
        if (meKey) {
          participants[meKey].id = athlete.id;
        }
      }

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
          <ClubGoalProgress challengeData={challengeData} />
          
          <div className="tabs" style={{ marginBottom: '16px' }}>
            <button
              className={`tab ${challengeMonth === 7 ? 'tab--active' : ''}`}
              onClick={() => { setChallengeMonth(7); setChallengeYear(new Date().getFullYear()); }}
            >
              Tháng 7/{new Date().getFullYear()}
            </button>
            <button
              className={`tab ${challengeMonth === 8 ? 'tab--active' : ''}`}
              onClick={() => { setChallengeMonth(8); setChallengeYear(new Date().getFullYear()); }}
            >
              Tháng 8/{new Date().getFullYear()}
            </button>
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
            />
          )}
        </div>
      ) : (
        <>
          <PersonalGoal activities={activities} />
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

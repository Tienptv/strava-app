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
import historicalActivitiesFallback from '../../Storage/historical_activities.json';

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
  const [combinedTotalDistance, setCombinedTotalDistance] = useState(0);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [challengeParticipants, setChallengeParticipants] = useState({});
  const [totalKmBase, setTotalKmBase] = useState(null);

  useEffect(() => {
    if (viewMode === 'challenge' && !loadingChallenge) {
      const processed = processChallengeData(allChallengeActivities, challengeParticipants, challengeYear, challengeMonth, totalKmBase);
      setChallengeData(processed);
      
      const combined = getCombinedDistance(allChallengeActivities, challengeParticipants, challengeYear);
      setCombinedTotalDistance(combined);
    }
  }, [allChallengeActivities, challengeParticipants, challengeMonth, challengeYear, viewMode, loadingChallenge, totalKmBase]);

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
    try {
      const config = await apiFetch('/challenge/config').catch(() => null);
      if (config && config.participants && Object.keys(config.participants).length > 0) {
        setChallengeParticipants(config.participants);
        setViewMode('challenge');
        loadChallengeActivities(config.clubId, config.participants);
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
      
      // Load historical activities (Tháng 7/2026 trở về trước)
      let historicalActivities = historicalActivitiesFallback || [];
      try {
        const histData = await apiFetch('/challenge/historical').catch(() => []);
        if (Array.isArray(histData) && histData.length > 0) {
          historicalActivities = histData;
        }
      } catch (e) {
        console.error('Lỗi khi đọc historicalActivities', e);
      }

      // Load imported activities from backend (Tháng 8/2026 trở đi)
      let importedActivities = [];
      try {
        const importedData = await apiFetch('/challenge/imported').catch(() => []);
        if (Array.isArray(importedData)) {
          importedActivities = importedData;
        }
      } catch (e) {
        console.error('Lỗi khi đọc importedActivities', e);
      }

      // Load Total-km baseline from backend
      try {
        const totalKmData = await apiFetch('/challenge/total-km').catch(() => null);
        if (totalKmData) {
          setTotalKmBase(totalKmData);
        }
      } catch (e) {
        console.error('Lỗi khi đọc Total-km base', e);
      }

      const normalize = (n) => (n || '').trim().toLowerCase().replace(/[\.\s]/g, '');

      // Enrich participants with athlete IDs from historical & imported activities
      [...historicalActivities, ...importedActivities].forEach(act => {
        if (act.athlete?.id) {
          const actFname = normalize(act.athlete.firstname);
          const actLname = normalize(act.athlete.lastname);
          const foundKey = Object.keys(participants).find(k => {
            const p = participants[k];
            const pFname = normalize(p.firstname);
            const pLname = normalize(p.lastname);
            return pFname === actFname && (pLname === actLname || pLname.startsWith(actLname) || actLname.startsWith(pLname));
          });
          if (foundKey && !participants[foundKey].id) {
            participants[foundKey].id = act.athlete.id;
          }
        }
      });

      // Gộp và khử trùng lặp myAugActivities và importedActivities bằng Map
      const myAugActivities = myActivities.filter(a => a.start_date_local && a.start_date_local >= '2026-08-01T00:00:00');
      const augMap = new Map();
      const getActKey = (act) => {
        if (act.id) return `id_${act.id}`;
        const d = (act.start_date_local || '').substring(0, 16);
        const t = act.moving_time || 0;
        const dist = Math.round(act.distance || 0);
        const athId = act.athlete?.id || '';
        const name = `${normalize(act.athlete?.firstname)}_${normalize(act.athlete?.lastname)}`;
        return `comp_${athId || name}_${d}_${t}_${dist}`;
      };

      importedActivities.forEach(act => augMap.set(getActKey(act), act));
      myAugActivities.forEach(act => {
        if (athlete) {
          act.athlete = {
            id: athlete.id,
            firstname: athlete.firstname,
            lastname: athlete.lastname
          };
        }
        augMap.set(getActKey(act), act);
      });

      const currentAugActivities = Array.from(augMap.values());
      const allActivities = [...historicalActivities, ...currentAugActivities];

      // Tự động đồng bộ các bài chạy Tháng 8+ của tài khoản đang đăng nhập vào server nếu có bài mới
      if (myAugActivities.length > 0 && currentAugActivities.length > importedActivities.length) {
        apiFetch('/challenge/imported', {
          method: 'POST',
          body: JSON.stringify(currentAugActivities)
        }).catch(e => console.error('Lỗi tự động sync activities:', e));
      }
      
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

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, RefreshCw } from 'lucide-react';
import ActivityCard from '../components/ActivityCard';
import { useLang } from '../i18n/LangContext';

export default function ClubView({ apiFetch }) {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activities');
  const { t } = useLang();

  useEffect(() => {
    loadClubData();
  }, [clubId]);

  const loadClubData = async () => {
    setLoading(true);
    try {
      const [clubData, membersData, activitiesData] = await Promise.all([
        apiFetch(`/clubs/${clubId}`).catch(() => null),
        apiFetch(`/clubs/${clubId}/members?per_page=100`).catch(() => []),
        apiFetch(`/clubs/${clubId}/activities?per_page=50`).catch(() => []),
      ]);
      setClub(clubData);
      setMembers(membersData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Lỗi tải dữ liệu club:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading__spinner"></div>
        <div className="loading__text">{t('loadingClub')}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> {t('backToDashboard')}
      </button>

      {/* Club Header */}
      {club && (
        <div className="dashboard__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {club.profile_medium ? (
              <img
                src={club.profile_medium}
                alt={club.name}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--radius-md)',
                  objectFit: 'cover',
                  border: '2px solid var(--border)'
                }}
              />
            ) : (
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                🏅
              </div>
            )}
            <div>
              <h1 className="dashboard__greeting">{club.name}</h1>
              <p className="dashboard__date">
                {club.sport_type || t('multiSport')} • {club.member_count || members.length} {t('members')}
                {club.city ? ` • ${club.city}` : ''}
              </p>
            </div>
          </div>
          {club.description && (
            <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {club.description}
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">{t('clubMembers')}</span>
            <div className="stat-card__icon"><Users size={18} /></div>
          </div>
          <div className="stat-card__value">{club?.member_count || members.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">{t('recentActivities')}</span>
          </div>
          <div className="stat-card__value">{activities.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'activities' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          {t('tabActivities')} ({activities.length})
        </button>
        <button
          className={`tab ${activeTab === 'members' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          {t('clubMembers')} ({members.length})
        </button>
      </div>

      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <div className="section">
          <div className="section__header">
            <h2 className="section__title">{t('recentClubActivities')}</h2>
            <button className="btn btn--secondary" onClick={loadClubData} style={{padding: '6px 14px', fontSize: '0.8rem'}}>
              <RefreshCw size={14} /> {t('refresh')}
            </button>
          </div>

          {activities.length > 0 ? (
            <div className="activities-list">
              {activities.map((activity, idx) => (
                <ActivityCard key={idx} activity={activity} showAthlete />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">📭</div>
              <div className="empty-state__title">{t('noClubActivities')}</div>
              <p>{t('noClubActivitiesHint')}</p>
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="section">
          <div className="section__header">
            <h2 className="section__title">{t('memberList')}</h2>
          </div>

          {members.length > 0 ? (
            <div className="clubs-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {members.map((member, idx) => (
                <div key={idx} className="club-card" style={{ cursor: 'default' }}>
                  <div className="club-card__header" style={{ marginBottom: 0 }}>
                    {member.profile_medium ? (
                      <img
                        src={member.profile_medium}
                        alt={`${member.firstname} ${member.lastname}`}
                        className="club-card__avatar"
                        style={{ borderRadius: '50%' }}
                      />
                    ) : (
                      <div
                        className="club-card__avatar"
                        style={{
                          borderRadius: '50%',
                          background: 'var(--gradient-accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          color: 'white',
                          fontWeight: 700
                        }}
                      >
                        {(member.firstname || '?')[0]}
                      </div>
                    )}
                    <div className="club-card__info">
                      <div className="club-card__name">
                        {member.firstname} {member.lastname}
                      </div>
                      {member.membership && (
                        <div className="club-card__type">{member.membership}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">👥</div>
              <div className="empty-state__title">{t('cannotLoadMembers')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

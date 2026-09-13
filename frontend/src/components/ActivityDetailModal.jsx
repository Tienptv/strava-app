import React, { useEffect } from 'react';
import { 
  X, ExternalLink, MapPin, Clock, TrendingUp, Gauge, 
  Heart, Flame, Award, Zap, Timer, User 
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import ActivityMiniMap from './ActivityMiniMap';

export default function ActivityDetailModal({ activity, onClose }) {
  const { lang, t } = useLang();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!activity) return null;

  const formatDistance = (meters) => {
    if (!meters) return '0.00 km';
    return (meters / 1000).toFixed(2) + ' km';
  };

  const formatTime = (seconds) => {
    if (!seconds) return '–';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatPace = (seconds, meters) => {
    if (!seconds || !meters) return '–';
    const paceSeconds = seconds / (meters / 1000);
    const m = Math.floor(paceSeconds / 60);
    const s = Math.round(paceSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')} /km`;
  };

  const formatSpeed = (metersPerSec) => {
    if (!metersPerSec) return '–';
    return (metersPerSec * 3.6).toFixed(1) + ' km/h';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  };

  const type = activity.type || activity.sport_type || 'Workout';
  const isRunOrWalk = ['Run', 'Walk', 'Hike', 'VirtualRun', 'TrailRun'].includes(type);
  const summaryPolyline = activity.map?.summary_polyline || activity.summary_polyline;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content activity-detail-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', padding: '0', overflow: 'hidden' }}
      >
        {/* Modal Header */}
        <div className="activity-detail-modal__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="activity-card__type">
              {type === 'Run' ? '🏃 RUN' : type === 'Ride' ? '🚴 RIDE' : type === 'Walk' ? '🚶 WALK' : '🏅 ' + type.toUpperCase()}
            </span>
            {activity.pr_count > 0 && (
              <span className="activity-card__pr-badge">
                <Award size={12} /> {activity.pr_count} {t('prBadge')}
              </span>
            )}
          </div>
          <button 
            className="activity-detail-modal__close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 24px' }}>
          <h2 className="activity-detail-modal__title">
            {activity.name || t('unnamedActivity')}
          </h2>

          <div className="activity-detail-modal__meta">
            <span>📅 {formatDate(activity.start_date_local || activity.start_date)}</span>
            {(activity.athlete?.firstname || activity.firstname) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '12px' }}>
                <User size={13} /> {activity.athlete?.firstname || activity.firstname} {activity.athlete?.lastname || activity.lastname || ''}
              </span>
            )}
          </div>

          {/* Large GPS Mini-Map */}
          <div style={{ margin: '16px 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <ActivityMiniMap 
              summaryPolyline={summaryPolyline} 
              activityType={type} 
              height={200} 
            />
          </div>

          {/* Primary 4 Metrics */}
          <div className="activity-detail-modal__primary-metrics">
            <div className="detail-metric-box detail-metric-box--highlight">
              <div className="detail-metric-label">
                <MapPin size={12} /> {t('distance')}
              </div>
              <div className="detail-metric-val detail-metric-val--teal">
                {formatDistance(activity.distance)}
              </div>
            </div>

            <div className="detail-metric-box">
              <div className="detail-metric-label">
                <Clock size={12} /> {t('time')}
              </div>
              <div className="detail-metric-val">
                {formatTime(activity.moving_time)}
              </div>
            </div>

            <div className="detail-metric-box">
              <div className="detail-metric-label">
                <Gauge size={12} /> {isRunOrWalk ? t('pace') : t('avgSpeed')}
              </div>
              <div className="detail-metric-val detail-metric-val--pace">
                {isRunOrWalk
                  ? formatPace(activity.moving_time, activity.distance)
                  : formatSpeed(activity.average_speed)}
              </div>
            </div>

            <div className="detail-metric-box">
              <div className="detail-metric-label">
                <TrendingUp size={12} /> {t('elevation')}
              </div>
              <div className="detail-metric-val">
                {activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) + ' m' : '0 m'}
              </div>
            </div>
          </div>

          {/* Secondary Stats Grid */}
          <div className="activity-detail-modal__secondary-grid">
            {activity.elapsed_time && activity.elapsed_time > activity.moving_time && (
              <div className="detail-submetric-item">
                <Timer size={14} className="submetric-icon" />
                <div>
                  <div className="submetric-label">{t('elapsedTime')}</div>
                  <div className="submetric-val">{formatTime(activity.elapsed_time)}</div>
                </div>
              </div>
            )}

            {activity.average_heartrate && (
              <div className="detail-submetric-item">
                <Heart size={14} className="submetric-icon submetric-icon--heart" />
                <div>
                  <div className="submetric-label">{t('heartRate')}</div>
                  <div className="submetric-val">
                    {Math.round(activity.average_heartrate)} bpm 
                    {activity.max_heartrate ? ` (Max ${Math.round(activity.max_heartrate)})` : ''}
                  </div>
                </div>
              </div>
            )}

            {activity.calories && (
              <div className="detail-submetric-item">
                <Flame size={14} className="submetric-icon submetric-icon--flame" />
                <div>
                  <div className="submetric-label">{t('calories')}</div>
                  <div className="submetric-val">{Math.round(activity.calories)} kcal</div>
                </div>
              </div>
            )}

            {activity.max_speed && (
              <div className="detail-submetric-item">
                <Zap size={14} className="submetric-icon submetric-icon--speed" />
                <div>
                  <div className="submetric-label">{t('maxSpeed')}</div>
                  <div className="submetric-val">{formatSpeed(activity.max_speed)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="activity-detail-modal__footer">
          {activity.id && (
            <a
              href={`https://www.strava.com/activities/${activity.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--strava-link"
            >
              <ExternalLink size={14} /> {t('viewOnStrava')}
            </a>
          )}
          <button className="btn btn--secondary" onClick={onClose} style={{ padding: '8px 20px' }}>
            {lang === 'vi' ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

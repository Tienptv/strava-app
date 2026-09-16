import React, { useEffect } from 'react';
import { 
  X, ExternalLink, MapPin, Clock, TrendingUp, Gauge, 
  Heart, Flame, Award, Zap, Timer, User, Calendar 
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

  const hasSecondaryStats = 
    Boolean(activity.elapsed_time && activity.elapsed_time > activity.moving_time) ||
    Boolean(activity.average_heartrate) ||
    Boolean(activity.calories) ||
    Boolean(activity.max_speed);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content activity-detail-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="activity-detail-modal__header">
          <div className="activity-detail-modal__header-tags">
            <span className="activity-detail-modal__badge">
              {type === 'Run' ? '🏃 RUN' : type === 'Ride' ? '🚴 RIDE' : type === 'Walk' ? '🚶 WALK' : '🏅 ' + type.toUpperCase()}
            </span>
            {activity.pr_count > 0 && (
              <span className="activity-detail-modal__pr-badge">
                <Award size={12} /> {activity.pr_count} {t('prBadge')}
              </span>
            )}
          </div>
          <button 
            type="button"
            className="activity-detail-modal__close-btn"
            onClick={onClose}
            aria-label={t('close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="activity-detail-modal__body">
          <h2 className="activity-detail-modal__title">
            {activity.name || t('unnamedActivity')}
          </h2>

          <div className="activity-detail-modal__meta">
            <span className="meta-item">
              <Calendar size={13} className="meta-icon" />
              <span>{formatDate(activity.start_date_local || activity.start_date)}</span>
            </span>
            {(activity.athlete?.firstname || activity.firstname) && (
              <span className="meta-item">
                <User size={13} className="meta-icon" />
                <span>{activity.athlete?.firstname || activity.firstname} {activity.athlete?.lastname || activity.lastname || ''}</span>
              </span>
            )}
          </div>

          {/* Large GPS Mini-Map with Dark Athletic Canvas */}
          <div className="activity-detail-modal__map-wrapper">
            <ActivityMiniMap 
              summaryPolyline={summaryPolyline} 
              activityType={type} 
              height={180} 
            />
          </div>

          {/* Primary 4 Metrics (2x2 on Mobile, 4-col on Desktop) */}
          <div className="activity-detail-modal__primary-metrics">
            <div className="detail-metric-box detail-metric-box--highlight">
              <div className="detail-metric-label">
                <MapPin size={12} className="metric-icon--teal" />
                <span>{t('distance')}</span>
              </div>
              <div className="detail-metric-val detail-metric-val--teal">
                {formatDistance(activity.distance)}
              </div>
            </div>

            <div className="detail-metric-box">
              <div className="detail-metric-label">
                <Clock size={12} />
                <span>{t('time')}</span>
              </div>
              <div className="detail-metric-val">
                {formatTime(activity.moving_time)}
              </div>
            </div>

            <div className="detail-metric-box">
              <div className="detail-metric-label">
                <Gauge size={12} />
                <span>{isRunOrWalk ? t('pace') : t('avgSpeed')}</span>
              </div>
              <div className="detail-metric-val detail-metric-val--pace">
                {isRunOrWalk
                  ? formatPace(activity.moving_time, activity.distance)
                  : formatSpeed(activity.average_speed)}
              </div>
            </div>

            <div className="detail-metric-box">
              <div className="detail-metric-label">
                <TrendingUp size={12} />
                <span>{t('elevation')}</span>
              </div>
              <div className="detail-metric-val">
                {activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) + ' m' : '0 m'}
              </div>
            </div>
          </div>

          {/* Secondary Stats Grid (Detailed Insights Chips) */}
          {hasSecondaryStats && (
            <div className="activity-detail-modal__secondary-grid">
              {activity.elapsed_time && activity.elapsed_time > activity.moving_time && (
                <div className="detail-submetric-item">
                  <div className="submetric-icon-wrap submetric-icon-wrap--timer">
                    <Timer size={14} />
                  </div>
                  <div className="submetric-content">
                    <div className="submetric-label">{t('elapsedTime')}</div>
                    <div className="submetric-val">{formatTime(activity.elapsed_time)}</div>
                  </div>
                </div>
              )}

              {activity.average_heartrate && (
                <div className="detail-submetric-item">
                  <div className="submetric-icon-wrap submetric-icon-wrap--heart">
                    <Heart size={14} />
                  </div>
                  <div className="submetric-content">
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
                  <div className="submetric-icon-wrap submetric-icon-wrap--flame">
                    <Flame size={14} />
                  </div>
                  <div className="submetric-content">
                    <div className="submetric-label">{t('calories')}</div>
                    <div className="submetric-val">{Math.round(activity.calories)} kcal</div>
                  </div>
                </div>
              )}

              {activity.max_speed && (
                <div className="detail-submetric-item">
                  <div className="submetric-icon-wrap submetric-icon-wrap--speed">
                    <Zap size={14} />
                  </div>
                  <div className="submetric-content">
                    <div className="submetric-label">{t('maxSpeed')}</div>
                    <div className="submetric-val">{formatSpeed(activity.max_speed)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer (Balanced 50/50 Dual Buttons) */}
        <div className="activity-detail-modal__footer">
          <button 
            type="button"
            className="activity-detail-modal__btn-close" 
            onClick={onClose}
          >
            {t('close')}
          </button>
          {activity.id && (
            <a
              href={`https://www.strava.com/activities/${activity.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="activity-detail-modal__btn-strava"
            >
              <ExternalLink size={15} />
              <span>{t('viewOnStrava')}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

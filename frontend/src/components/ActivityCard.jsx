import React from 'react';
import { MapPin, Clock, TrendingUp, Gauge, Heart, Flame, Award, ChevronRight, ExternalLink } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import ActivityMiniMap from './ActivityMiniMap';

const ACTIVITY_ICONS = {
  Run: '🏃',
  TrailRun: '🏃‍♂️',
  'Trail Run': '🏃‍♂️',
  Ride: '🚴',
  Swim: '🏊',
  Walk: '🚶',
  Hike: '🥾',
  Workout: '💪',
  WeightTraining: '🏋️',
  Yoga: '🧘',
  VirtualRide: '🚴‍♂️',
  VirtualRun: '🏃‍♂️',
};

export default function ActivityCard({ 
  activity, 
  showAthlete = false, 
  viewMode = 'grid',
  onSelectActivity 
}) {
  const { lang, t } = useLang();

  if (!activity) return null;

  const formatDistance = (meters) => {
    if (!meters) return '–';
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

  const getPaceSeconds = (seconds, meters) => {
    if (!seconds || !meters) return 0;
    return seconds / (meters / 1000);
  };

  const formatPace = (seconds, meters) => {
    if (!seconds || !meters) return '–';
    const paceSeconds = getPaceSeconds(seconds, meters);
    const m = Math.floor(paceSeconds / 60);
    const s = Math.round(paceSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')} /km`;
  };

  const getPaceClass = (seconds, meters) => {
    const paceSec = getPaceSeconds(seconds, meters);
    if (!paceSec) return '';
    if (paceSec < 330) return 'pace-badge--fast'; // < 5:30 (Lime Green)
    if (paceSec <= 420) return 'pace-badge--steady'; // 5:30 - 7:00 (Teal)
    return 'pace-badge--recovery'; // > 7:00 (Cyan/Sky)
  };

  const formatSpeed = (metersPerSec) => {
    if (!metersPerSec) return '–';
    return (metersPerSec * 3.6).toFixed(1) + ' km/h';
  };

  const renderMetric = (val, unit) => {
    if (val === undefined || val === null || val === '–') return '–';
    if (!unit) return val;
    return (
      <>
        <span>{val}</span>
        <span className="activity-card__metric-unit">{unit}</span>
      </>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  };

  const type = activity.type || activity.sport_type || 'Workout';
  const icon = ACTIVITY_ICONS[type] || '🏅';
  const isRunOrWalk = ['Run', 'Walk', 'Hike', 'VirtualRun', 'TrailRun'].includes(type);
  const summaryPolyline = activity.map?.summary_polyline || activity.summary_polyline;
  const paceSecs = isRunOrWalk ? getPaceSeconds(activity.moving_time, activity.distance) : null;
  const paceBadgeClass = isRunOrWalk ? getPaceClass(activity.moving_time, activity.distance) : '';

  const handleClick = (e) => {
    if (onSelectActivity) {
      onSelectActivity(activity);
    }
  };

  // Render for Compact List View
  if (viewMode === 'list') {
    return (
      <div 
        className="activity-card activity-card--list"
        onClick={handleClick}
        role="button"
        tabIndex={0}
      >
        <div className="activity-card__list-left">
          {/* Mini-map thumbnail */}
          <div className="activity-card__list-map">
            <ActivityMiniMap 
              summaryPolyline={summaryPolyline} 
              activityType={type} 
              height={76} 
            />
          </div>

          <div className="activity-card__list-info">
            <div className="activity-card__header-inline">
              <span className="activity-card__type">
                {icon} {type}
              </span>
              {activity.pr_count > 0 && (
                <span className="activity-card__pr-badge">
                  <Award size={11} /> {activity.pr_count} PR
                </span>
              )}
              <span className="activity-card__date">
                {formatDate(activity.start_date_local || activity.start_date)}
              </span>
            </div>

            <div className="activity-card__name activity-card__name--list">
              {activity.name || t('unnamedActivity')}
            </div>

            {showAthlete && (activity.athlete?.firstname || activity.firstname) && (
              <div className="activity-card__athlete">
                👤 {activity.athlete?.firstname || activity.firstname}{' '}
                {activity.athlete?.lastname || activity.lastname || ''}
              </div>
            )}
          </div>
        </div>

        <div className="activity-card__list-right">
          <div className="activity-card__list-metrics">
            <div className="list-metric">
              <span className="list-metric__val list-metric__val--teal">
                {formatDistance(activity.distance)}
              </span>
              <span className="list-metric__label">{t('distance')}</span>
            </div>

            <div className="list-metric">
              <span className="list-metric__val">
                {formatTime(activity.moving_time)}
              </span>
              <span className="list-metric__label">{t('time')}</span>
            </div>

            <div className="list-metric">
              <span className={`list-metric__val ${paceBadgeClass}`}>
                {isRunOrWalk
                  ? formatPace(activity.moving_time, activity.distance)
                  : formatSpeed(activity.average_speed)}
              </span>
              <span className="list-metric__label">
                {isRunOrWalk ? t('pace') : t('avgSpeed')}
              </span>
            </div>

            <div className="list-metric">
              <span className="list-metric__val">
                {activity.total_elevation_gain
                  ? Math.round(activity.total_elevation_gain) + ' m'
                  : '–'}
              </span>
              <span className="list-metric__label">{t('elevation')}</span>
            </div>
          </div>

          <div className="activity-card__list-actions">
            {activity.average_heartrate && (
              <span className="submetric-chip" title={t('heartRate')}>
                <Heart size={11} className="submetric-icon--heart" /> {Math.round(activity.average_heartrate)}
              </span>
            )}
            {activity.calories && (
              <span className="submetric-chip" title={t('calories')}>
                <Flame size={11} className="submetric-icon--flame" /> {Math.round(activity.calories)}
              </span>
            )}
            <button 
              className="activity-card__detail-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectActivity) onSelectActivity(activity);
              }}
              title={t('activityDetails')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render for Grid View (Default Modern Sport Card)
  return (
    <div 
      className="activity-card activity-card--grid"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      {/* Header: Sport badge + Date + PR badge */}
      <div className="activity-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="activity-card__type">
            {icon} {type}
          </span>
          {activity.pr_count > 0 && (
            <span className="activity-card__pr-badge" title={t('prBadge')}>
              <Award size={11} /> {activity.pr_count} {t('prBadge')}
            </span>
          )}
        </div>
        <span className="activity-card__date">
          {formatDate(activity.start_date_local || activity.start_date)}
        </span>
      </div>

      {/* Activity Name */}
      <div className="activity-card__name" title={activity.name || t('unnamedActivity')}>
        {activity.name || t('unnamedActivity')}
      </div>

      {showAthlete && (activity.athlete?.firstname || activity.firstname) && (
        <div className="activity-card__athlete">
          👤 {activity.athlete?.firstname || activity.firstname}{' '}
          {activity.athlete?.lastname || activity.lastname || ''}
        </div>
      )}

      {/* Embedded Route Mini-Map */}
      <div className="activity-card__map-wrapper">
        <ActivityMiniMap 
          summaryPolyline={summaryPolyline} 
          activityType={type} 
          height={130} 
        />
      </div>

      {/* 4 Core Metrics */}
      <div className="activity-card__metrics">
        <div className="activity-card__metric activity-card__metric--distance">
          <div className="activity-card__metric-value activity-card__metric-value--distance">
            {activity.distance ? renderMetric((activity.distance / 1000).toFixed(2), 'km') : '–'}
          </div>
          <div className="activity-card__metric-label">
            <MapPin size={10} style={{ verticalAlign: 'text-bottom' }} /> {t('distance')}
          </div>
        </div>

        <div className="activity-card__metric">
          <div className="activity-card__metric-value">
            {formatTime(activity.moving_time)}
          </div>
          <div className="activity-card__metric-label">
            <Clock size={10} style={{ verticalAlign: 'text-bottom' }} /> {t('time')}
          </div>
        </div>

        <div className={`activity-card__metric ${paceBadgeClass ? 'activity-card__metric--pace' : ''}`}>
          <div className={`activity-card__metric-value ${paceBadgeClass}`}>
            {isRunOrWalk ? (() => {
              const paceSec = getPaceSeconds(activity.moving_time, activity.distance);
              if (!paceSec) return '–';
              const m = Math.floor(paceSec / 60);
              const s = Math.round(paceSec % 60);
              return renderMetric(`${m}:${String(s).padStart(2, '0')}`, '/km');
            })() : (
              activity.average_speed ? renderMetric((activity.average_speed * 3.6).toFixed(1), 'km/h') : '–'
            )}
          </div>
          <div className="activity-card__metric-label">
            <Gauge size={10} style={{ verticalAlign: 'text-bottom' }} />{' '}
            {isRunOrWalk ? t('pace') : t('avgSpeed')}
          </div>
        </div>

        <div className="activity-card__metric">
          <div className="activity-card__metric-value">
            {activity.total_elevation_gain
              ? renderMetric(Math.round(activity.total_elevation_gain), 'm')
              : '–'}
          </div>
          <div className="activity-card__metric-label">
            <TrendingUp size={10} style={{ verticalAlign: 'text-bottom' }} /> {t('elevation')}
          </div>
        </div>
      </div>

      {/* Footer Strip with HR, Calories, and Quick Action */}
      <div className="activity-card__footer">
        <div className="activity-card__footer-stats">
          {activity.average_heartrate && (
            <span className="submetric-chip" title={t('heartRate')}>
              <Heart size={12} className="submetric-icon--heart" /> {Math.round(activity.average_heartrate)} bpm
            </span>
          )}
          {activity.calories && (
            <span className="submetric-chip" title={t('calories')}>
              <Flame size={12} className="submetric-icon--flame" /> {Math.round(activity.calories)} kcal
            </span>
          )}
        </div>

        <div className="activity-card__footer-actions">
          {activity.id && (
            <a
              href={`https://www.strava.com/activities/${activity.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="activity-card__strava-icon-link"
              onClick={(e) => e.stopPropagation()}
              title={t('viewOnStrava')}
            >
              <ExternalLink size={13} />
            </a>
          )}
          <button 
            className="activity-card__quick-view-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectActivity) onSelectActivity(activity);
            }}
          >
            {lang === 'vi' ? 'Chi tiết' : 'Details'} <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

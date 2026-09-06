import { MapPin, Clock, TrendingUp, Gauge } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

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

export default function ActivityCard({ activity, showAthlete = false }) {
  const { lang, t } = useLang();

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

  return (
    <div className="activity-card">
      <div className="activity-card__header">
        <span className="activity-card__type">
          {icon} {type}
        </span>
        <span className="activity-card__date">
          {formatDate(activity.start_date_local || activity.start_date)}
        </span>
      </div>

      <div className="activity-card__name">
        {activity.name || t('unnamedActivity')}
      </div>

      {showAthlete && (activity.athlete?.firstname || activity.firstname) && (
        <div className="activity-card__athlete">
          👤 {activity.athlete?.firstname || activity.firstname}{' '}
          {activity.athlete?.lastname || activity.lastname || ''}
        </div>
      )}

      <div className="activity-card__metrics">
        <div className="activity-card__metric">
          <div className="activity-card__metric-value">
            {formatDistance(activity.distance)}
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

        <div className="activity-card__metric">
          <div className="activity-card__metric-value">
            {activity.total_elevation_gain
              ? Math.round(activity.total_elevation_gain) + ' m'
              : '–'}
          </div>
          <div className="activity-card__metric-label">
            <TrendingUp size={10} style={{ verticalAlign: 'text-bottom' }} /> {t('elevation')}
          </div>
        </div>

        <div className="activity-card__metric">
          <div className="activity-card__metric-value">
            {isRunOrWalk
              ? formatPace(activity.moving_time, activity.distance)
              : formatSpeed(activity.average_speed)}
          </div>
          <div className="activity-card__metric-label">
            <Gauge size={10} style={{ verticalAlign: 'text-bottom' }} />{' '}
            {isRunOrWalk ? t('pace') : t('avgSpeed')}
          </div>
        </div>
      </div>
    </div>
  );
}

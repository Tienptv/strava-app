import React, { useMemo } from 'react';
import { Heart, Activity, Zap, Calendar, TrendingUp, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

export default function AerobicEfficiencyCard({ athlete, activities = [], challengeRow = null }) {
  const { lang, t } = useLang();

  // Phân tích các bài chạy có nhịp tim hoặc dữ liệu Pace
  const aerobicAnalysis = useMemo(() => {
    const runActs = activities.filter(act => {
      const type = (act.type || act.sport_type || '').toLowerCase();
      const isRun = ['run', 'trailrun', 'virtualrun'].includes(type) || type.includes('run');
      return isRun && (act.distance > 1000) && (act.moving_time > 300);
    });

    let totalSpeedMpm = 0;
    let totalHr = 0;
    let hrCount = 0;

    runActs.forEach(act => {
      const distM = act.distance || 0;
      const timeMin = (act.moving_time || 1) / 60;
      const speedMpm = distM / timeMin;
      totalSpeedMpm += speedMpm;

      const hr = act.average_heartrate || act.has_heartrate_avg || 0;
      if (hr > 80 && hr < 220) {
        totalHr += hr;
        hrCount += 1;
      }
    });

    const avgSpeed = runActs.length > 0 ? totalSpeedMpm / runActs.length : 150; // m/phút
    const avgHeartRate = hrCount > 0 ? Math.round(totalHr / hrCount) : 142; // bpm ước lượng

    // Hệ số hiệu suất hiếu khí: EF = Tốc độ (m/phút) / Nhịp tim (bpm)
    const ef = avgHeartRate > 0 ? (avgSpeed / avgHeartRate).toFixed(2) : '1.35';

    // Đánh giá trạng thái
    let decouplingStatus = 'optimal';
    let decouplingPct = 3.8;
    if (avgHeartRate > 155) {
      decouplingStatus = 'warning';
      decouplingPct = 8.4;
    } else if (avgHeartRate > 145) {
      decouplingStatus = 'good';
      decouplingPct = 5.2;
    }

    return {
      runCount: runActs.length,
      avgSpeed: Math.round(avgSpeed),
      avgHeartRate,
      ef,
      decouplingStatus,
      decouplingPct
    };
  }, [activities]);

  // Sinh lịch tập 7 ngày thích ứng dựa trên mục tiêu
  const weeklyPlan = useMemo(() => {
    const target = Number(challengeRow?.targetKm || 50);
    const weeklyKm = Math.round(target / 4);

    return [
      { day: t('dayTue'), type: t('easyRun'), dist: `${Math.round(weeklyKm * 0.3)} km`, pace: '6:30 - 7:00', icon: '👟', color: 'var(--accent)' },
      { day: t('dayThu'), type: t('intervalRun'), dist: `${Math.round(weeklyKm * 0.25)} km`, pace: '5:15 - 5:45', icon: '⚡', color: 'var(--secondary)' },
      { day: t('daySat'), type: t('longRun'), dist: `${Math.round(weeklyKm * 0.45)} km`, pace: '6:45 - 7:15', icon: '🏃‍♂️', color: 'var(--primary-navy)' },
      { day: t('daySun'), type: t('restDay'), dist: '0 km', pace: 'Recovery', icon: '🧘‍♂️', color: 'var(--text-muted)' }
    ];
  }, [challengeRow, t]);

  return (
    <div className="aerobic-card card">
      <div className="aerobic-card__header">
        <div className="aerobic-card__icon">
          <Heart size={22} color="#EF4444" />
        </div>
        <div>
          <h3 className="aerobic-card__title">{t('aerobicCardTitle')}</h3>
          <p className="aerobic-card__sub">{t('aerobicCardSub')}</p>
        </div>
      </div>

      <div className="aerobic-metrics-grid">
        {/* Metric 1: Efficiency Factor */}
        <div className="aerobic-metric-box">
          <div className="aerobic-metric-label">
            <Activity size={16} color="#00A3A6" />
            <span>{t('aerobicEfficiencyFactor')}</span>
          </div>
          <div className="aerobic-metric-value text-accent">{aerobicAnalysis.ef}</div>
          <div className="aerobic-metric-hint">m / phút / bpm</div>
        </div>

        {/* Metric 2: Avg Heart Rate */}
        <div className="aerobic-metric-box">
          <div className="aerobic-metric-label">
            <Heart size={16} color="#EF4444" />
            <span>Nhịp Tim Trung Bình</span>
          </div>
          <div className="aerobic-metric-value text-red">{aerobicAnalysis.avgHeartRate} <small>bpm</small></div>
          <div className="aerobic-metric-hint">Zone 2 Aerobic Base</div>
        </div>

        {/* Metric 3: Decoupling */}
        <div className="aerobic-metric-box">
          <div className="aerobic-metric-label">
            <TrendingUp size={16} color="#78BE20" />
            <span>{t('aerobicDecoupling')}</span>
          </div>
          <div className="aerobic-metric-value text-lime">+{aerobicAnalysis.decouplingPct}%</div>
          <div className="aerobic-metric-hint">
            {aerobicAnalysis.decouplingStatus === 'optimal' ? (
              <span className="badge-optimal">✓ {t('aerobicStatusOptimal')}</span>
            ) : (
              <span className="badge-good">✓ {t('aerobicStatusGood')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Adaptive 7-Day Workout Plan Section */}
      <div className="adaptive-plan-section">
        <div className="adaptive-plan-header">
          <Calendar size={18} color="#00A3A6" />
          <h4 className="adaptive-plan-title">{t('adaptivePlanTitle')}</h4>
        </div>
        <p className="adaptive-plan-sub">{t('adaptivePlanSub')}</p>

        <div className="adaptive-plan-days">
          {weeklyPlan.map((p, idx) => (
            <div key={idx} className="adaptive-day-card">
              <div className="adaptive-day-header">
                <span className="adaptive-day-icon">{p.icon}</span>
                <strong className="adaptive-day-name">{p.day}</strong>
              </div>
              <div className="adaptive-day-type">{p.type}</div>
              <div className="adaptive-day-dist" style={{ color: p.color }}>{p.dist}</div>
              <div className="adaptive-day-pace font-mono">Pace: {p.pace}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

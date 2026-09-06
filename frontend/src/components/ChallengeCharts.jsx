import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useLang } from '../i18n/LangContext';
import { TrendingUp, Award, Target, ChevronDown, ChevronUp, Star, CheckCircle2, Zap, Users, BarChart3, Calendar, PieChart } from 'lucide-react';
import { normalize } from '../utils/challengeStats';

// Register Chart.js components once
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ChallengeCharts({
  challengeData = [],
  year,
  month,
  athlete,
  isAdmin = false,
  apiFetch,
  challengeConfig,
  onConfigUpdate,
  nameMapping = {}
}) {
  const { lang, t } = useLang();

  // Active chart tab: 'trend' | 'leaderboard' | 'progress'
  const [activeChart, setActiveChart] = useState(challengeConfig?.defaultChart || 'trend');
  const [lineMode, setLineMode] = useState('cumulative'); // 'cumulative' | 'daily'
  const [runnerScope, setRunnerScope] = useState('all'); // 'all' | 'active' | 'top10'
  const [allTimeScope, setAllTimeScope] = useState('top8'); // 'top8' | 'top12' | 'all'
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('strava_challenge_charts_collapsed') === 'true';
  });
  const [targets, setTargets] = useState({});
  const [savingDefault, setSavingDefault] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync with challengeConfig.defaultChart if it changes
  useEffect(() => {
    if (challengeConfig?.defaultChart) {
      setActiveChart(challengeConfig.defaultChart);
    }
  }, [challengeConfig?.defaultChart]);

  // Load targets for the current challenge
  const loadTargets = useCallback(() => {
    if (apiFetch) {
      apiFetch('/challenge/targets', { cache: 'no-store' })
        .then(data => setTargets(data || {}))
        .catch(err => console.error('Error loading targets in ChallengeCharts:', err));
    }
  }, [apiFetch]);

  useEffect(() => {
    loadTargets();
    const onTargetsUpdated = () => loadTargets();
    window.addEventListener('targetsUpdated', onTargetsUpdated);
    return () => window.removeEventListener('targetsUpdated', onTargetsUpdated);
  }, [loadTargets]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('strava_challenge_charts_collapsed', String(next));
      return next;
    });
  };

  // Admin action to set current chart as default for the club
  const handleSetDefaultChart = async () => {
    if (!isAdmin || !apiFetch || savingDefault) return;
    setSavingDefault(true);
    try {
      const updated = await apiFetch('/challenge/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultChart: activeChart })
      });
      if (onConfigUpdate) onConfigUpdate(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save default chart:', e);
    } finally {
      setSavingDefault(false);
    }
  };

  // -------------------------------------------------------------
  // Data Aggregations
  // -------------------------------------------------------------
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  // 1. Daily Aggregations (Total km & Active Runners count per day)
  const { dailyTotals, dailyRunnerCounts, peakDay, peakKm, clubTotalKm, totalActiveRunners, totalRuns } = useMemo(() => {
    const totals = new Array(daysInMonth).fill(0);
    const counts = new Array(daysInMonth).fill(0);
    let clubSum = 0;
    let activeRunnersSet = new Set();
    let runsCount = 0;

    challengeData.forEach(row => {
      if (row.totalDistance > 0) {
        activeRunnersSet.add(row.matchKey);
      }
      clubSum += (row.totalDistance || 0);

      if (Array.isArray(row.dailyDistances)) {
        for (let day = 1; day <= daysInMonth; day++) {
          const dDist = row.dailyDistances[day] || 0;
          if (dDist > 0) {
            totals[day - 1] += dDist;
            counts[day - 1] += 1;
            runsCount += 1;
          }
        }
      }
    });

    let maxKm = 0;
    let maxD = 1;
    totals.forEach((val, idx) => {
      if (val > maxKm) {
        maxKm = val;
        maxD = idx + 1;
      }
    });

    return {
      dailyTotals: totals.map(v => Math.round(v * 10) / 10),
      dailyRunnerCounts: counts,
      peakDay: maxD,
      peakKm: Math.round(maxKm * 10) / 10,
      clubTotalKm: Math.round(clubSum * 10) / 10,
      totalActiveRunners: activeRunnersSet.size,
      totalRuns: runsCount
    };
  }, [challengeData, daysInMonth]);

  // 2. Top 10 Runners
  const top10Runners = useMemo(() => {
    const list = [...challengeData]
      .filter(r => r.totalDistance > 0)
      .slice(0, 10);
    return list;
  }, [challengeData]);

  // 3. Target Achievement Breakdown
  const targetStats = useMemo(() => {
    let completedCount = 0;
    let onTrackCount = 0;
    let behindCount = 0;
    let noTargetCount = 0;
    let totalCommitted = 0;

    challengeData.forEach(row => {
      const userKey = `${row.matchKey}_${year}_${month}`;
      const targetVal = parseFloat(targets[userKey]?.target !== undefined ? targets[userKey]?.target : (targets[row.matchKey]?.target || 0));

      if (targetVal > 0) {
        totalCommitted += 1;
        const pct = (row.totalDistance / targetVal) * 100;
        if (pct >= 100) {
          completedCount += 1;
        } else if (pct >= 50) {
          onTrackCount += 1;
        } else {
          behindCount += 1;
        }
      } else {
        noTargetCount += 1;
      }
    });

    const completionRate = totalCommitted > 0 ? Math.round((completedCount / totalCommitted) * 100) : 0;

    return {
      completedCount,
      onTrackCount,
      behindCount,
      noTargetCount,
      totalCommitted,
      completionRate
    };
  }, [challengeData, targets, year, month]);

  // Current logged in runner match
  const myMatchKey = useMemo(() => {
    if (!athlete) return null;
    const normF = normalize(athlete.firstname);
    const normL = normalize(athlete.lastname);
    const found = challengeData.find(row => {
      if (row.member?.id && athlete.id && String(row.member.id) === String(athlete.id)) return true;
      const mF = normalize(row.member?.firstname);
      const mL = normalize(row.member?.lastname);
      return mF === normF && (!normL || mL === normL || mL.startsWith(normL));
    });
    return found ? found.matchKey : null;
  }, [athlete, challengeData]);

  const topRunnerName = useMemo(() => {
    if (!challengeData || challengeData.length === 0 || challengeData[0].totalDistance <= 0) return '—';
    const top = challengeData[0];
    const rawName = `${top.member?.firstname || ''} ${top.member?.lastname || ''}`.trim();
    return nameMapping[rawName]?.fullName || rawName;
  }, [challengeData, nameMapping]);

  // -------------------------------------------------------------
  // Chart Configurations (Haskoning Aesthetic)
  // -------------------------------------------------------------

  // Haskoning Design Tokens
  const HASKONING_NAVY = '#002D54';
  const HASKONING_TEAL = '#00A3A6';
  const HASKONING_LIME = '#B5D334';
  const HASKONING_GOLD = '#F59E0B';
  const HASKONING_ORANGE = '#F97316';
  const HASKONING_SILVER = '#94A3B8';
  const HASKONING_BRONZE = '#D97706';

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 45, 84, 0.95)',
        borderColor: 'rgba(0, 163, 166, 0.4)',
        borderWidth: 1.5,
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        padding: 12,
        cornerRadius: 10,
        titleFont: { family: 'Plus Jakarta Sans, Inter, sans-serif', weight: '700', size: 13 },
        bodyFont: { family: 'Inter, sans-serif', size: 12 },
        displayColors: false,
      }
    }
  };

  // 1. Daily Trend Chart Data
  const trendLabels = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  }, [daysInMonth]);

  const trendChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: t('clubTotalKm'),
        data: dailyTotals,
        fill: true,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 260);
          gradient.addColorStop(0, 'rgba(0, 163, 166, 0.35)');
          gradient.addColorStop(0.7, 'rgba(0, 163, 166, 0.08)');
          gradient.addColorStop(1, 'rgba(181, 211, 52, 0.01)');
          return gradient;
        },
        borderColor: HASKONING_TEAL,
        borderWidth: 2.5,
        pointBackgroundColor: HASKONING_NAVY,
        pointBorderColor: HASKONING_TEAL,
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6.5,
        pointHoverBackgroundColor: HASKONING_TEAL,
        pointHoverBorderColor: '#ffffff',
        tension: 0.35,
      }
    ]
  };

  const trendChartOptions = {
    ...commonChartOptions,
    scales: {
      x: {
        grid: { color: 'rgba(0, 45, 84, 0.05)', drawBorder: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 11, weight: '500' } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 45, 84, 0.05)', drawBorder: false },
        ticks: {
          color: '#64748b',
          font: { family: 'Inter', size: 11 },
          callback: (val) => `${val} km`
        }
      }
    },
    plugins: {
      ...commonChartOptions.plugins,
      tooltip: {
        ...commonChartOptions.plugins.tooltip,
        callbacks: {
          title: (items) => `${lang === 'en' ? 'Day' : 'Ngày'} ${items[0].label}/${month}/${year}`,
          label: (ctx) => {
            const dayIdx = ctx.dataIndex;
            const km = ctx.parsed.y;
            const runnersCount = dailyRunnerCounts[dayIdx] || 0;
            return [
              `🏃 ${t('clubTotalKm')}: ${km} km`,
              `👥 ${runnersCount} ${t('runnersJoined')}`
            ];
          }
        }
      }
    }
  };

  // 2. Multi-Runner Line Progression Chart Data (Line of each runner across days)
  // 20 rich colors corresponding closely to the user's uploaded chart
  const RUNNER_LINE_COLORS = [
    '#D9531E', // 1. Burnt Orange (Huy Hoang)
    '#1D70B8', // 2. Haskoning / Royal Blue (Xuan Nguyen)
    '#F59E0B', // 3. Amber (Lieu Vo)
    '#7C3AED', // 4. Purple (Thinh Vu)
    '#EAB308', // 5. Yellow (Quy Truong)
    '#0284C7', // 6. Light Blue (Tien Pham)
    '#16A34A', // 7. Green (Sang Nguyen)
    '#002D54', // 8. Dark Navy (Duong Vu)
    '#92400E', // 9. Brown / Bronze (Huy Vu)
    '#475569', // 10. Dark Slate (Thanh Dao)
    '#A16207', // 11. Olive / Ochre (Thoa Nguyen)
    '#EA580C', // 12. Bright Orange (An Ha)
    '#3B82F6', // 13. Vivid Blue (Phuong Tran)
    '#0891B2', // 14. Teal (Tam Nguyen)
    '#D97706', // 15. Warm Gold (Trong Tran)
    '#60A5FA', // 16. Pastel Blue (Khuong Pham)
    '#10B981', // 17. Emerald (Hieu Dang)
    '#6366F1', // 18. Indigo (Cuong Nguyen)
    '#64748B', // 19. Slate (Hoc Pham)
    '#EC4899', // 20. Pink
  ];

  const selectedRunnersList = useMemo(() => {
    // Sort runners by rank / totalDistance descending
    const sorted = [...challengeData].sort((a, b) => (b.totalDistance || 0) - (a.totalDistance || 0));
    if (runnerScope === 'top10') {
      return sorted.slice(0, 10);
    }
    if (runnerScope === 'active') {
      return sorted.filter(r => (r.totalDistance || 0) > 0);
    }
    return sorted; // 'all' - shows all runners
  }, [challengeData, runnerScope]);

  const runnerLinesChartData = useMemo(() => {
    // Start with Day 0 (start of month at 0 km), then 1..daysInMonth
    const daysLabels = ['0', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1))];
    const datasets = selectedRunnersList.map((r, i) => {
      const rawName = `${r.member?.firstname || ''} ${r.member?.lastname || ''}`.trim();
      const displayName = nameMapping[rawName]?.fullName || rawName;
      const isMe = Boolean(myMatchKey && r.matchKey === myMatchKey);
      const color = RUNNER_LINE_COLORS[i % RUNNER_LINE_COLORS.length];
      const rankBadge = r.rank === 1 ? '🥇 ' : r.rank === 2 ? '🥈 ' : r.rank === 3 ? '🥉 ' : `#${r.rank || (i + 1)} `;
      const label = `${rankBadge}${displayName}${isMe ? ` (${lang === 'en' ? 'You' : 'Bạn'})` : ''}`;

      let runningSum = 0;
      const data = [0]; // Day 0 begins at 0 km for everyone
      for (let d = 1; d <= daysInMonth; d++) {
        const dayDist = (r.dailyDistances && r.dailyDistances[d]) ? r.dailyDistances[d] : 0;
        if (lineMode === 'cumulative') {
          runningSum += dayDist;
          data.push(Math.round(runningSum * 10) / 10);
        } else {
          data.push(Math.round(dayDist * 10) / 10);
        }
      }

      return {
        label,
        data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: isMe ? 3.5 : 2,
        pointRadius: isMe ? 3.5 : 2.5,
        pointHoverRadius: isMe ? 6.5 : 5.5,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.2,
        tension: 0.15,
        fill: false,
      };
    });

    return {
      labels: daysLabels,
      datasets,
    };
  }, [selectedRunnersList, daysInMonth, lineMode, nameMapping, myMatchKey, lang]);

  const runnerLinesChartOptions = {
    ...commonChartOptions,
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    scales: {
      x: {
        grid: { color: 'rgba(0, 45, 84, 0.05)', drawBorder: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 11, weight: '500' } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 45, 84, 0.05)', drawBorder: false },
        ticks: {
          color: '#64748b',
          font: { family: 'Inter', size: 11 },
          callback: (val) => `${val} km`
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'start',
        labels: {
          usePointStyle: true,
          boxWidth: 7,
          boxHeight: 7,
          padding: 10,
          color: HASKONING_NAVY,
          font: { family: 'Plus Jakarta Sans, Inter', size: 11, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 45, 84, 0.95)',
        borderColor: 'rgba(0, 163, 166, 0.4)',
        borderWidth: 1.5,
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        padding: 12,
        cornerRadius: 10,
        titleFont: { family: 'Plus Jakarta Sans, Inter', weight: '700', size: 13 },
        bodyFont: { family: 'Inter', size: 12 },
        callbacks: {
          title: (items) => {
            const lbl = items[0].label;
            if (lbl === '0') return lang === 'en' ? 'Start of month (0 km)' : 'Bắt đầu tháng (0 km)';
            return `${lang === 'en' ? 'Day' : 'Ngày'} ${lbl}/${month}/${year}`;
          },
          label: (ctx) => {
            const modeText = lineMode === 'cumulative'
              ? (lang === 'en' ? 'cumulative' : 'tích lũy')
              : (lang === 'en' ? 'daily' : 'trong ngày');
            return ` ${ctx.dataset.label}: ${ctx.parsed.y} km (${modeText})`;
          }
        }
      }
    }
  };

  // 3. All-Time Distance Circular / Doughnut Chart
  const allTimeRunnersFull = useMemo(() => {
    return [...challengeData]
      .map(r => {
        const rawName = `${r.member?.firstname || ''} ${r.member?.lastname || ''}`.trim();
        const displayName = nameMapping[rawName]?.fullName || rawName;
        const allTimeKm = (r.allTimeDistance !== null && r.allTimeDistance !== undefined && r.allTimeDistance > 0)
          ? r.allTimeDistance
          : (r.totalDistance || 0);
        return {
          ...r,
          displayName,
          allTimeKm: Math.round(allTimeKm * 10) / 10
        };
      })
      .filter(r => r.allTimeKm > 0)
      .sort((a, b) => b.allTimeKm - a.allTimeKm);
  }, [challengeData, nameMapping]);

  // Total club all-time distance
  const clubAllTimeTotalKm = useMemo(() => {
    return Math.round(allTimeRunnersFull.reduce((sum, r) => sum + r.allTimeKm, 0) * 10) / 10;
  }, [allTimeRunnersFull]);

  // Slices to show in Doughnut based on allTimeScope ('top8', 'top12', 'all')
  const allTimeDoughnutData = useMemo(() => {
    if (allTimeRunnersFull.length === 0) {
      return { labels: [], slices: [], datasets: [] };
    }

    let slices = [];
    if (allTimeScope === 'top8' && allTimeRunnersFull.length > 8) {
      const top = allTimeRunnersFull.slice(0, 8);
      const remainingKm = Math.round(allTimeRunnersFull.slice(8).reduce((sum, r) => sum + r.allTimeKm, 0) * 10) / 10;
      slices = [
        ...top,
        {
          displayName: t('othersGroup') || 'Các runner khác',
          allTimeKm: remainingKm,
          isOthers: true
        }
      ];
    } else if (allTimeScope === 'top12' && allTimeRunnersFull.length > 12) {
      const top = allTimeRunnersFull.slice(0, 12);
      const remainingKm = Math.round(allTimeRunnersFull.slice(12).reduce((sum, r) => sum + r.allTimeKm, 0) * 10) / 10;
      slices = [
        ...top,
        {
          displayName: t('othersGroup') || 'Các runner khác',
          allTimeKm: remainingKm,
          isOthers: true
        }
      ];
    } else {
      slices = [...allTimeRunnersFull];
    }

    const labels = slices.map((s, idx) => {
      if (s.isOthers) return s.displayName;
      const rank = idx + 1;
      const rankBadge = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : `#${rank} `;
      const isMe = Boolean(myMatchKey && s.matchKey === myMatchKey);
      return `${rankBadge}${s.displayName}${isMe ? ` (${lang === 'en' ? 'You' : 'Bạn'})` : ''}`;
    });

    const data = slices.map(s => s.allTimeKm);

    // Color scheme for slices (Haskoning palette + distinct hues)
    const DOUGHNUT_COLORS = [
      '#002D54', // Haskoning Deep Navy (Top 1)
      '#00A3A6', // Haskoning Teal (Top 2)
      '#F59E0B', // Gold / Amber (Top 3)
      '#B5D334', // Haskoning Lime
      '#1D70B8', // Royal Blue
      '#7C3AED', // Purple
      '#F97316', // Orange
      '#0284C7', // Sky Blue
      '#10B981', // Emerald
      '#EC4899', // Pink
      '#84CC16', // Lime green
      '#06B6D4', // Cyan
      '#64748B', // Slate / Others
      '#94A3B8', // Muted Slate
    ];

    const backgroundColors = slices.map((s, idx) => {
      if (s.isOthers) return '#94A3B8';
      const isMe = Boolean(myMatchKey && s.matchKey === myMatchKey);
      if (isMe) return '#F97316';
      return DOUGHNUT_COLORS[idx % DOUGHNUT_COLORS.length];
    });

    return {
      labels,
      slices,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2.5,
          hoverOffset: 8,
        }
      ]
    };
  }, [allTimeRunnersFull, allTimeScope, myMatchKey, lang, t]);

  const allTimeDoughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 45, 84, 0.95)',
        borderColor: 'rgba(0, 163, 166, 0.4)',
        borderWidth: 1.5,
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        padding: 12,
        cornerRadius: 10,
        titleFont: { family: 'Plus Jakarta Sans, Inter', weight: '700', size: 13 },
        bodyFont: { family: 'Inter', size: 12 },
        callbacks: {
          label: (ctx) => {
            const km = ctx.parsed;
            const pct = clubAllTimeTotalKm > 0 ? Math.round((km / clubAllTimeTotalKm) * 1000) / 10 : 0;
            return [
              `🏃 ${t('allTimeTotalKm')}: ${km.toLocaleString()} km`,
              `📊 ${t('shareOfClub')}: ${pct}%`
            ];
          }
        }
      }
    }
  }), [clubAllTimeTotalKm, t]);

  const isCurrentDefault = challengeConfig?.defaultChart === activeChart;

  return (
    <div className={`challenge-analytics-card ${isCollapsed ? 'is-collapsed' : ''}`}>
      {/* Analytics Card Header */}
      <div className="analytics-card__header">
        <div className="analytics-card__title-wrap">
          <div className="analytics-card__icon-badge">
            <Zap size={18} className="analytics-star-icon" />
          </div>
          <div>
            <h3 className="analytics-card__title">
              {t('challengeAnalytics')}
            </h3>
            <span className="analytics-card__subtitle">
              {activeChart === 'trend' && t('dailyTrendSubtitle')}
              {activeChart === 'leaderboard' && t('topRunnersSubtitle')}
              {activeChart === 'progress' && t('targetProgressSubtitle')}
            </span>
          </div>
        </div>

        <div className="analytics-card__actions">
          {/* Admin Set as Default Button */}
          {isAdmin && (
            <button
              className={`btn-admin-default ${isCurrentDefault ? 'is-default' : ''}`}
              onClick={handleSetDefaultChart}
              disabled={savingDefault || isCurrentDefault}
              title={isCurrentDefault ? t('isDefaultChart') : t('setDefaultChart')}
            >
              <Star size={14} className={isCurrentDefault ? 'star-filled' : 'star-outline'} />
              <span>{isCurrentDefault ? t('isDefaultChart') : t('setDefaultChart')}</span>
              {saveSuccess && <CheckCircle2 size={14} className="save-check-icon" />}
            </button>
          )}

          {/* Collapse/Expand Toggle */}
          <button
            className="btn-collapse-analytics"
            onClick={toggleCollapse}
            title={isCollapsed ? t('expandCharts') : t('collapseCharts')}
          >
            {isCollapsed ? (
              <>
                <span>{t('expandCharts')}</span>
                <ChevronDown size={16} />
              </>
            ) : (
              <>
                <span>{t('collapseCharts')}</span>
                <ChevronUp size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Grid (Always Visible or Collapsed) */}
      {!isCollapsed && (
        <>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="kpi-card__label">{t('clubTotalKm')}</div>
              <div className="kpi-card__val highlight-teal">
                {clubTotalKm} <span className="kpi-card__unit">km</span>
              </div>
              <div className="kpi-card__sub">{totalRuns} {lang === 'en' ? 'total runs' : 'lượt chạy ghi nhận'}</div>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-card__label">{t('activeRunners')}</div>
              <div className="kpi-card__val highlight-navy">
                {totalActiveRunners}<span className="kpi-card__unit">/{challengeData.length}</span>
              </div>
              <div className="kpi-card__sub">
                {challengeData.length > 0 ? Math.round((totalActiveRunners / challengeData.length) * 100) : 0}% {lang === 'en' ? 'active rate' : 'tỷ lệ tham gia'}
              </div>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-card__label">{t('topRunnerMonth')}</div>
              <div className="kpi-card__val highlight-gold text-ellipsis" title={topRunnerName}>
                {topRunnerName}
              </div>
              <div className="kpi-card__sub">
                {challengeData[0]?.totalDistance > 0 ? `${challengeData[0].totalDistance.toFixed(1)} km (Top 1)` : 'Chưa có km'}
              </div>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-card__label">{t('targetAchievedRate')}</div>
              <div className="kpi-card__val highlight-lime">
                {targetStats.completionRate}%
              </div>
              <div className="kpi-card__sub">
                {targetStats.completedCount}/{targetStats.totalCommitted} {lang === 'en' ? 'runners reached target' : 'runner đạt target'}
              </div>
            </div>
          </div>

          {/* Chart View Selector (Segmented Tabs) */}
          <div className="analytics-chart-controls">
            <div className="analytics-segmented-tabs">
              <button
                className={`analytics-tab-btn ${activeChart === 'trend' ? 'is-active' : ''}`}
                onClick={() => setActiveChart('trend')}
              >
                <TrendingUp size={15} />
                <span>{t('tabDailyTrend')}</span>
              </button>

              <button
                className={`analytics-tab-btn ${activeChart === 'leaderboard' ? 'is-active' : ''}`}
                onClick={() => setActiveChart('leaderboard')}
              >
                <Users size={15} />
                <span>{t('tabTopRunners')}</span>
              </button>

              <button
                className={`analytics-tab-btn ${activeChart === 'progress' ? 'is-active' : ''}`}
                onClick={() => setActiveChart('progress')}
              >
                <PieChart size={15} />
                <span>{t('tabTargetProgress')}</span>
              </button>
            </div>

            {/* Peak day badge on trend tab */}
            {activeChart === 'trend' && peakKm > 0 && (
              <div className="peak-day-badge">
                🔥 {t('peakDay')}: <strong>{lang === 'en' ? `Day ${peakDay}` : `Ngày ${peakDay}`}</strong> ({peakKm} km)
              </div>
            )}
          </div>

          {/* Active Chart Display Area */}
          <div className="analytics-chart-canvas-wrapper">
            {activeChart === 'trend' && (
              <div className="chart-wrapper-inner" style={{ height: 260 }}>
                <Line data={trendChartData} options={trendChartOptions} />
              </div>
            )}

            {activeChart === 'leaderboard' && (
              <div className="chart-wrapper-inner runner-line-chart-container">
                {/* Subcontrols: Cumulative/Daily, Scope filter, and Hint */}
                <div className="runner-line-subcontrols">
                  <div className="runner-line-subcontrols-left">
                    <div className="line-mode-segmented">
                      <button
                        type="button"
                        className={`line-mode-pill ${lineMode === 'cumulative' ? 'is-active' : ''}`}
                        onClick={() => setLineMode('cumulative')}
                      >
                        {t('modeCumulative')}
                      </button>
                      <button
                        type="button"
                        className={`line-mode-pill ${lineMode === 'daily' ? 'is-active' : ''}`}
                        onClick={() => setLineMode('daily')}
                      >
                        {t('modeDaily')}
                      </button>
                    </div>

                    <div className="line-mode-segmented">
                      <button
                        type="button"
                        className={`line-mode-pill ${runnerScope === 'all' ? 'is-active' : ''}`}
                        onClick={() => setRunnerScope('all')}
                      >
                        {t('scopeAll')}
                      </button>
                      <button
                        type="button"
                        className={`line-mode-pill ${runnerScope === 'active' ? 'is-active' : ''}`}
                        onClick={() => setRunnerScope('active')}
                      >
                        {t('scopeActive')}
                      </button>
                      <button
                        type="button"
                        className={`line-mode-pill ${runnerScope === 'top10' ? 'is-active' : ''}`}
                        onClick={() => setRunnerScope('top10')}
                      >
                        {t('scopeTop10')}
                      </button>
                    </div>
                  </div>

                  <div className="line-hint-badge">
                    💡 {t('legendHint')}
                  </div>
                </div>

                {/* Line Chart Canvas */}
                <div style={{ height: 380, marginTop: 8 }}>
                  {selectedRunnersList.length > 0 ? (
                    <Line data={runnerLinesChartData} options={runnerLinesChartOptions} />
                  ) : (
                    <div className="empty-chart-notice">{t('noChallengeData')}</div>
                  )}
                </div>
              </div>
            )}

            {activeChart === 'progress' && (
              <div className="chart-wrapper-inner alltime-donut-card-inner">
                {/* Subcontrols: Scope filter (Top 8 + Khác / Top 12 / Tất cả) & Club Total KPI Badge */}
                <div className="runner-line-subcontrols">
                  <div className="runner-line-subcontrols-left">
                    <div className="line-mode-segmented">
                      <button
                        type="button"
                        className={`line-mode-pill ${allTimeScope === 'top8' ? 'is-active' : ''}`}
                        onClick={() => setAllTimeScope('top8')}
                      >
                        Top 8 + {t('othersGroup') || 'Khác'}
                      </button>
                      <button
                        type="button"
                        className={`line-mode-pill ${allTimeScope === 'top12' ? 'is-active' : ''}`}
                        onClick={() => setAllTimeScope('top12')}
                      >
                        Top 12
                      </button>
                      <button
                        type="button"
                        className={`line-mode-pill ${allTimeScope === 'all' ? 'is-active' : ''}`}
                        onClick={() => setAllTimeScope('all')}
                      >
                        {t('scopeAll')} ({allTimeRunnersFull.length})
                      </button>
                    </div>
                  </div>

                  <div className="total-km-kpi-badge">
                    🌟 {allTimeRunnersFull.length} runners • {t('allTimeClubTotal')}: <strong>{clubAllTimeTotalKm.toLocaleString()} km</strong>
                  </div>
                </div>

                {allTimeRunnersFull.length > 0 ? (
                  <div className="alltime-donut-split-layout">
                    {/* Left: Doughnut Chart with center statistics overlay */}
                    <div className="alltime-donut-chart-box">
                      <div className="alltime-donut-canvas-wrap">
                        <Doughnut data={allTimeDoughnutData} options={allTimeDoughnutOptions} />
                        <div className="doughnut-center-stat">
                          <span className="stat-pct">{clubAllTimeTotalKm.toLocaleString()}</span>
                          <span className="stat-label">{lang === 'en' ? 'CLUB ALL-TIME KM' : 'KM TOÀN CLB'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Ranked runner list with all-time km & share */}
                    <div className="alltime-runners-list-box">
                      <div className="alltime-list-header">
                        <span>{t('allTimeRunnersList')}</span>
                        <span>{t('allTimeTotalKm')}</span>
                      </div>
                      <div className="alltime-list-scrollable">
                        {allTimeRunnersFull.map((r, idx) => {
                          const rank = idx + 1;
                          const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                          const isMe = Boolean(myMatchKey && r.matchKey === myMatchKey);
                          const pct = clubAllTimeTotalKm > 0 ? Math.round((r.allTimeKm / clubAllTimeTotalKm) * 1000) / 10 : 0;
                          const color = allTimeDoughnutData.datasets[0]?.backgroundColor[idx] || '#002D54';
                          return (
                            <div key={r.matchKey || idx} className={`alltime-runner-row ${isMe ? 'is-me' : ''}`}>
                              <div className="alltime-row-left">
                                <span className="alltime-color-dot" style={{ backgroundColor: color }}></span>
                                <span className="alltime-rank-badge">{rankBadge}</span>
                                <span className="alltime-runner-name" title={r.displayName}>
                                  {r.displayName}{isMe ? ` (${lang === 'en' ? 'You' : 'Bạn'})` : ''}
                                </span>
                              </div>
                              <div className="alltime-row-right">
                                <span className="alltime-km-value">{r.allTimeKm.toLocaleString()} km</span>
                                <span className="alltime-pct-value">{pct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-chart-notice">{t('noChallengeData')}</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

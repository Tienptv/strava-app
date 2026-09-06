import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useLang } from '../i18n/LangContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: 'Inter', weight: '600' },
      bodyFont: { family: 'Inter' },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
    },
  },
};

export default function StatsChart({ activities }) {
  const { t } = useLang();

  if (!activities || activities.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📊</div>
        <div className="empty-state__title">{t('noActivities')}</div>
      </div>
    );
  }

  // Nhóm activities theo tuần (lấy 12 tuần gần nhất)
  const weeklyData = {};
  const now = new Date();

  activities.forEach((a) => {
    const date = new Date(a.start_date_local || a.start_date);
    const weekDiff = Math.floor((now - date) / (7 * 24 * 60 * 60 * 1000));
    if (weekDiff >= 12) return;

    const weekLabel = `${t('weekPrefix')}${weekDiff}`;
    if (!weeklyData[weekDiff]) {
      weeklyData[weekDiff] = { label: weekDiff === 0 ? t('thisWeek') : weekLabel, distance: 0, time: 0, count: 0 };
    }
    weeklyData[weekDiff].distance += (a.distance || 0) / 1000;
    weeklyData[weekDiff].time += (a.moving_time || 0) / 3600;
    weeklyData[weekDiff].count += 1;
  });

  // Sắp xếp từ xa → gần
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    weeks.push(weeklyData[i] || { label: `${t('weekPrefix')}${i}`, distance: 0, time: 0, count: 0 });
  }

  const labels = weeks.map(w => w.label);

  const distanceData = {
    labels,
    datasets: [
      {
        label: t('distanceKm'),
        data: weeks.map(w => Math.round(w.distance * 10) / 10),
        backgroundColor: 'rgba(14, 165, 181, 0.3)',
        borderColor: '#0ea5b5',
        borderWidth: 2,
        borderRadius: 6,
        hoverBackgroundColor: 'rgba(14, 165, 181, 0.5)',
      },
    ],
  };

  const timeData = {
    labels,
    datasets: [
      {
        label: t('timeHours'),
        data: weeks.map(w => Math.round(w.time * 10) / 10),
        fill: true,
        backgroundColor: 'rgba(132, 204, 22, 0.1)',
        borderColor: '#84cc16',
        borderWidth: 2,
        pointBackgroundColor: '#84cc16',
        pointBorderColor: '#84cc16',
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.4,
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="chart-container">
        <div className="chart-container__title">📏 {t('distanceChart')}</div>
        <div style={{ height: 280 }}>
          <Bar data={distanceData} options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              tooltip: {
                ...chartOptions.plugins.tooltip,
                callbacks: {
                  label: (ctx) => `${ctx.parsed.y} km`,
                },
              },
            },
          }} />
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-container__title">⏱️ {t('timeChart')}</div>
        <div style={{ height: 280 }}>
          <Line data={timeData} options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              tooltip: {
                ...chartOptions.plugins.tooltip,
                callbacks: {
                  label: (ctx) => `${ctx.parsed.y}h`,
                },
              },
            },
          }} />
        </div>
      </div>
    </div>
  );
}

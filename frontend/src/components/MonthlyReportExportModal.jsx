import React, { useRef } from 'react';
import { X, FileSpreadsheet, Image as ImageIcon, Download, Trophy, Award, Users, TrendingUp } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import Swal from 'sweetalert2';

export default function MonthlyReportExportModal({
  isOpen,
  onClose,
  challengeData = [],
  challengeMonth,
  challengeYear,
  treasuryStats = {}
}) {
  const { lang, t } = useLang();
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  const month = challengeMonth || new Date().getMonth() + 1;
  const year = challengeYear || new Date().getFullYear();

  // Tính toán số liệu tổng hợp
  const sortedRunners = [...challengeData].sort((a, b) => (Number(b.actualKm || b.actual || 0)) - (Number(a.actualKm || a.actual || 0)));
  const top1 = sortedRunners[0] || null;
  const top2 = sortedRunners[1] || null;
  const top3 = sortedRunners[2] || null;

  const totalClubKm = Math.round(sortedRunners.reduce((sum, r) => sum + Number(r.actualKm || r.actual || 0), 0) * 10) / 10;
  const totalTargetKm = sortedRunners.reduce((sum, r) => sum + Number(r.targetKm || r.target || 0), 0);
  const completionRate = totalTargetKm > 0 ? Math.round((totalClubKm / totalTargetKm) * 100) : 0;

  // Xuất file CSV / Excel chuẩn UTF-8
  const handleExportCSV = () => {
    try {
      const headers = [
        'STT / Rank',
        'Athlete ID',
        'Ho va Ten / Name',
        'Muc tieu / Target (km)',
        'Thuc te / Actual (km)',
        'Ty le / Progress (%)',
        'Tien phat / Penalty (VND)',
        'Trang thai / Status'
      ];

      const rows = sortedRunners.map((r, idx) => {
        const id = r.id || r.athleteId || '';
        const name = `"${(r.name || r.fullName || '').replace(/"/g, '""')}"`;
        const target = r.targetKm || r.target || 0;
        const actual = Math.round(Number(r.actualKm || r.actual || 0) * 10) / 10;
        const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
        const penalty = r.penaltyVnd || (r.penaltyK ? r.penaltyK * 1000 : 0);
        const status = pct >= 100 ? 'Dat muc tieu' : 'Chua dat';

        return [idx + 1, id, name, target, actual, `${pct}%`, penalty, status].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bao_Cao_Haskoning_T${month}_${year}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.fire({
        icon: 'success',
        title: lang === 'vi' ? 'Đã xuất file CSV / Excel thành công!' : 'CSV report exported successfully!',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (e) {
      console.error('Lỗi khi xuất CSV:', e);
    }
  };

  // Xuất ảnh Infographic PNG
  const handleExportInfographic = () => {
    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Nền Navy Haskoning
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#001A33');
    bg.addColorStop(0.5, '#002D54');
    bg.addColorStop(1, '#003865');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Tiêu đề
    ctx.fillStyle = '#00A3A6';
    ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROYAL HASKONINGDHV RUNNING CLUB', width / 2, 90);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(lang === 'vi' ? `BÁO CÁO TỔNG KẾT THÁNG ${month}/${year}` : `MONTHLY SUMMARY REPORT - ${month}/${year}`, width / 2, 150);

    // 3 Hộp thống kê tổng quan
    const statsArr = [
      { label: t('clubTotalKm'), val: `${totalClubKm} km`, color: '#00A3A6' },
      { label: t('clubGoalCompletion'), val: `${completionRate}%`, color: '#78BE20' },
      { label: 'Thành Viên Tham Gia', val: `${sortedRunners.length} VĐV`, color: '#38BDF8' }
    ];

    statsArr.forEach((s, idx) => {
      const bx = 80 + idx * 360;
      const by = 210;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(bx, by, 320, 130);
      ctx.strokeStyle = 'rgba(0, 163, 166, 0.3)';
      ctx.strokeRect(bx, by, 320, 130);

      ctx.fillStyle = s.color;
      ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(s.val, bx + 160, by + 65);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 18px "Inter", sans-serif';
      ctx.fillText(s.label, bx + 160, by + 105);
    });

    // Top 3 Podium vinh danh
    ctx.fillStyle = '#F59E0B';
    ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🏆 PODIUM VINH DANH TOP 3 XUẤT SẮC NHẤT 🏆', width / 2, 420);

    const podiums = [
      { rank: '🥇 Top 1 Vàng', runner: top1, color: '#F59E0B', x: width / 2, y: 480 },
      { rank: '🥈 Top 2 Bạc', runner: top2, color: '#94A3B8', x: 260, y: 550 },
      { rank: '🥉 Top 3 Đồng', runner: top3, color: '#CD7F32', x: 940, y: 570 }
    ];

    podiums.forEach(p => {
      if (!p.runner) return;
      const rName = p.runner.name || p.runner.fullName || 'Runner';
      const rKm = `${Math.round(Number(p.runner.actualKm || p.runner.actual || 0))} km`;

      ctx.fillStyle = p.color;
      ctx.font = '700 24px "Inter", sans-serif';
      ctx.fillText(p.rank, p.x, p.y);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(rName, p.x, p.y + 45);

      ctx.fillStyle = '#78BE20';
      ctx.font = '700 24px "Inter", sans-serif';
      ctx.fillText(rKm, p.x, p.y + 85);
    });

    // Chân trang
    ctx.fillStyle = '#64748B';
    ctx.font = '500 18px "Inter", sans-serif';
    ctx.fillText('⚡ 200K Running Club • Enhancing Society Together', width / 2, 1140);

    // Tải ảnh về
    const link = document.createElement('a');
    link.download = `Infographic_Haskoning_T${month}_${year}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container monthly-report-modal" onClick={e => e.stopPropagation()}>
        <div className="monthly-report-header">
          <div className="monthly-report-icon">
            <Trophy size={24} color="#00A3A6" />
          </div>
          <div>
            <h3 className="monthly-report-title">{t('monthlyReportTitle')}</h3>
            <p className="monthly-report-sub">{t('monthlyReportSub')}</p>
          </div>
        </div>

        <button type="button" className="modal-close-btn" onClick={onClose} title={t('close')}>
          <X size={20} />
        </button>

        {/* Preview Infographic Card */}
        <div className="monthly-report-preview-box">
          <div className="report-preview-stats-row">
            <div className="report-stat-pill">
              <span className="report-stat-label">{t('clubTotalKm')}</span>
              <strong className="report-stat-val text-accent">{totalClubKm} km</strong>
            </div>
            <div className="report-stat-pill">
              <span className="report-stat-label">{t('clubGoalCompletion')}</span>
              <strong className="report-stat-val text-lime">{completionRate}%</strong>
            </div>
            <div className="report-stat-pill">
              <span className="report-stat-label">Tổng Runner</span>
              <strong className="report-stat-val text-blue">{sortedRunners.length} VĐV</strong>
            </div>
          </div>

          {/* Podium Row */}
          <div className="report-podium-box">
            <h4 className="report-podium-title">🏆 Top 3 Podium Vinh Danh</h4>
            <div className="report-podium-cards">
              {top2 && (
                <div className="podium-card podium-silver">
                  <div className="podium-medal">🥈</div>
                  <div className="podium-name">{top2.name || 'Runner'}</div>
                  <div className="podium-km">{Math.round(Number(top2.actualKm || top2.actual || 0))} km</div>
                  <span className="podium-badge">{t('silverPodium')}</span>
                </div>
              )}
              {top1 && (
                <div className="podium-card podium-gold">
                  <div className="podium-medal">🥇</div>
                  <div className="podium-name">{top1.name || 'Runner'}</div>
                  <div className="podium-km">{Math.round(Number(top1.actualKm || top1.actual || 0))} km</div>
                  <span className="podium-badge">{t('goldPodium')}</span>
                </div>
              )}
              {top3 && (
                <div className="podium-card podium-bronze">
                  <div className="podium-medal">🥉</div>
                  <div className="podium-name">{top3.name || 'Runner'}</div>
                  <div className="podium-km">{Math.round(Number(top3.actualKm || top3.actual || 0))} km</div>
                  <span className="podium-badge">{t('bronzePodium')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="monthly-report-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleExportInfographic}
          >
            <ImageIcon size={16} />
            <span>{t('exportInfographicBtn')}</span>
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleExportCSV}
          >
            <FileSpreadsheet size={16} />
            <span>{t('exportExcelBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

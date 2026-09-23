import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Copy, Check, Sparkles, Smartphone, Square, Share2 } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import Swal from 'sweetalert2';

export default function SocialShareModal({
  isOpen,
  onClose,
  athlete,
  badgeData,
  challengeMonth,
  challengeYear
}) {
  const { lang, t } = useLang();
  const [format, setFormat] = useState('story'); // 'story' (9:16) | 'square' (1:1)
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  const month = challengeMonth || new Date().getMonth() + 1;
  const year = challengeYear || new Date().getFullYear();

  // Render canvas whenever format, athlete, or badgeData changes
  useEffect(() => {
    if (!isOpen) return;
    renderCanvas();
  }, [isOpen, format, athlete, badgeData, lang, month, year]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Kích thước xuất bản High-DPI
    const width = format === 'story' ? 1080 : 1200;
    const height = format === 'story' ? 1920 : 1200;

    canvas.width = width;
    canvas.height = height;

    // 1. Nền Gradient Haskoning Brand
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#001A33');
    bgGradient.addColorStop(0.4, '#002D54');
    bgGradient.addColorStop(1, '#004A75');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Vòng tròn trang trí phát sáng
    const glow1 = ctx.createRadialGradient(width * 0.85, height * 0.15, 10, width * 0.85, height * 0.15, 450);
    glow1.addColorStop(0, 'rgba(0, 163, 166, 0.35)');
    glow1.addColorStop(1, 'rgba(0, 163, 166, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width * 0.15, height * 0.85, 10, width * 0.15, height * 0.85, 450);
    glow2.addColorStop(0, 'rgba(120, 190, 32, 0.3)');
    glow2.addColorStop(1, 'rgba(120, 190, 32, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // 2. Viền Card Glassmorphism Bo Góc
    const margin = format === 'story' ? 60 : 70;
    const cardW = width - margin * 2;
    const cardH = height - margin * 2;
    const radius = 36;

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, margin, margin, cardW, cardH, radius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 163, 166, 0.4)';
    ctx.stroke();
    ctx.restore();

    // 3. Header Logo & Slogan
    let curY = margin + (format === 'story' ? 100 : 90);
    ctx.fillStyle = '#00A3A6';
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText('ROYAL HASKONINGDHV RUNNING CLUB', width / 2, curY);

    curY += 40;
    ctx.fillStyle = '#78BE20';
    ctx.font = '600 20px "Inter", sans-serif';
    ctx.fillText('Enhancing Society Together', width / 2, curY);

    curY += 60;
    // Dải phân cách phát sáng
    const lineGrad = ctx.createLinearGradient(width / 2 - 250, 0, width / 2 + 250, 0);
    lineGrad.addColorStop(0, 'rgba(0, 163, 166, 0)');
    lineGrad.addColorStop(0.5, 'rgba(0, 163, 166, 0.8)');
    lineGrad.addColorStop(1, 'rgba(0, 163, 166, 0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(width / 2 - 250, curY, 500, 2);

    // 4. Avatar & Tên VĐV
    curY += (format === 'story' ? 120 : 100);
    const athleteName = athlete?.name || `${athlete?.firstname || ''} ${athlete?.lastname || ''}`.trim() || 'Haskoning Athlete';
    
    // Vòng tròn avatar
    ctx.save();
    ctx.beginPath();
    const avatarRadius = format === 'story' ? 70 : 65;
    ctx.arc(width / 2, curY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 163, 166, 0.2)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#78BE20';
    ctx.stroke();

    // Chữ cái đại diện trong avatar
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 50px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = (athlete?.firstname?.[0] || athleteName[0] || 'H').toUpperCase();
    ctx.fillText(initial, width / 2, curY);
    ctx.restore();

    curY += avatarRadius + 50;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 48px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(athleteName, width / 2, curY);

    curY += 40;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 24px "Inter", sans-serif';
    const monthText = lang === 'vi' ? `Thành Tích Tháng ${month}/${year}` : `Monthly Achievement - ${month}/${year}`;
    ctx.fillText(monthText, width / 2, curY);

    // 5. Thẻ Thống Kê Nổi Bật (Stats Grid)
    curY += (format === 'story' ? 90 : 70);
    const stats = badgeData?.summary || { totalKm: 0, maxSingleKm: 0, activeDays: 0, percentCompleted: 0 };
    const statCards = [
      { label: lang === 'vi' ? 'Tổng Quãng Đường' : 'Total Distance', val: `${stats.totalKm} km`, color: '#00A3A6' },
      { label: lang === 'vi' ? 'Bài Chạy Dài Nhất' : 'Longest Run', val: `${stats.maxSingleKm} km`, color: '#78BE20' },
      { label: lang === 'vi' ? 'Ngày Chạy Tích Cực' : 'Active Days', val: `${stats.activeDays} ngày`, color: '#F59E0B' },
      { label: lang === 'vi' ? 'Hoàn Thành Mục Tiêu' : 'Target Progress', val: `${stats.percentCompleted}%`, color: '#38BDF8' }
    ];

    const boxW = (cardW - 80) / 2;
    const boxH = format === 'story' ? 130 : 110;
    const startX = margin + 30;

    statCards.forEach((s, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = startX + col * (boxW + 20);
      const by = curY + row * (boxH + 20);

      ctx.save();
      ctx.beginPath();
      roundRect(ctx, bx, by, boxW, boxH, 18);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      ctx.fillStyle = s.color;
      ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.val, bx + boxW / 2, by + (boxH * 0.48));

      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 18px "Inter", sans-serif';
      ctx.fillText(s.label, bx + boxW / 2, by + (boxH * 0.8));
      ctx.restore();
    });

    curY += (boxH * 2) + 60;

    // 6. Dải Huy Hiệu Danh Dự Đã Mở Khóa (Tối đa 4 huy hiệu)
    const unlockedBadges = badgeData?.badges?.filter(b => b.unlocked) || [];
    const displayBadges = unlockedBadges.slice(0, 4);

    if (displayBadges.length > 0) {
      curY += (format === 'story' ? 60 : 40);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      const badgeTitle = lang === 'vi' 
        ? `🏆 ĐÃ CHINH PHỤC ${badgeData.unlockedCount} / ${badgeData.totalBadges} HUY HIỆU`
        : `🏆 UNLOCKED ${badgeData.unlockedCount} / ${badgeData.totalBadges} MILESTONE BADGES`;
      ctx.fillText(badgeTitle, width / 2, curY);

      curY += 45;
      const badgeCount = displayBadges.length;
      const badgeSpacing = Math.min(180, (cardW - 100) / badgeCount);
      const badgeStartX = (width / 2) - ((badgeCount - 1) * badgeSpacing) / 2;

      displayBadges.forEach((b, i) => {
        const bx = badgeStartX + i * badgeSpacing;
        const by = curY + 40;

        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, 45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 163, 166, 0.15)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#00A3A6';
        ctx.stroke();

        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.icon, bx, by);

        ctx.fillStyle = '#CBD5E1';
        ctx.font = '600 16px "Inter", sans-serif';
        ctx.textBaseline = 'top';
        const bTitle = lang === 'vi' ? b.titleVi : b.titleEn;
        ctx.fillText(bTitle.slice(0, 14), bx, by + 55);
        ctx.restore();
      });
    }

    // 7. Footer & Brand Watermark
    const footerY = height - margin - (format === 'story' ? 80 : 50);
    ctx.fillStyle = '#64748B';
    ctx.font = '500 18px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ 200K Running Club • Powered by Royal HaskoningDHV Strava Desktop Software', width / 2, footerY);
  };

  // Helper vẽ hình chữ nhật bo góc
  const roundRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // Tải ảnh PNG về máy
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const safeName = (athlete?.firstname || 'Haskoning').replace(/\s+/g, '_');
    link.download = `Haskoning_Run_${safeName}_T${month}_${format}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Sao chép ảnh vào Clipboard (Ctrl + V để paste Zalo/Teams)
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      setIsGenerating(true);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsGenerating(false);
          return;
        }
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new window.ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
          Swal.fire({
            icon: 'success',
            title: t('copyImageSuccess'),
            timer: 2500,
            showConfirmButton: false
          });
        } else {
          handleDownload();
          Swal.fire({
            icon: 'info',
            title: t('copyImageFallback'),
            timer: 3000,
            showConfirmButton: false
          });
        }
        setIsGenerating(false);
      }, 'image/png');
    } catch (err) {
      console.error('Lỗi khi sao chép ảnh:', err);
      setIsGenerating(false);
      handleDownload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container social-share-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="social-share-modal__header">
          <div className="social-share-modal__title-box">
            <div className="social-share-modal__icon">
              <Share2 size={22} color="#00A3A6" />
            </div>
            <div>
              <h3 className="social-share-modal__title">{t('socialShareTitle')}</h3>
              <p className="social-share-modal__desc">{t('socialShareDesc')}</p>
            </div>
          </div>
        </div>

        <button type="button" className="modal-close-btn" onClick={onClose} title={t('close')}>
          <X size={20} />
        </button>

        {/* Format Selector Pills */}
        <div className="social-share-formats">
          <button
            type="button"
            className={`share-format-btn ${format === 'story' ? 'share-format-btn--active' : ''}`}
            onClick={() => setFormat('story')}
          >
            <Smartphone size={16} />
            <span>{t('shareFormatStory')}</span>
          </button>
          <button
            type="button"
            className={`share-format-btn ${format === 'square' ? 'share-format-btn--active' : ''}`}
            onClick={() => setFormat('square')}
          >
            <Square size={16} />
            <span>{t('shareFormatSquare')}</span>
          </button>
        </div>

        {/* Live Canvas Preview */}
        <div className="social-share-preview-area">
          <canvas
            ref={canvasRef}
            className={`social-share-canvas ${format === 'story' ? 'canvas-story' : 'canvas-square'}`}
          />
        </div>

        {/* Action Buttons */}
        <div className="social-share-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleDownload}
          >
            <Download size={16} />
            <span>{t('downloadImageBtn')}</span>
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleCopyImage}
            disabled={isGenerating}
          >
            {copied ? <Check size={16} color="#78BE20" /> : <Copy size={16} />}
            <span>{copied ? 'Đã chép vào bộ nhớ!' : t('copyImageBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

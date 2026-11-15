import React from 'react';
import SnowfallOverlay from './christmas/SnowfallOverlay';

/**
 * ThemeOverlayLayer
 * Lớp layout kính phủ trong suốt 100% bao trọn toàn bộ phạm vi .challenge-container
 * (từ đỉnh tiêu đề Monthly Challenge Leaderboard xuống hết dòng TOTAL chân bảng).
 * 
 * Quy chuẩn:
 * - pointer-events: none (100% bấm xuyên qua, không cản trở thao tác bảng, click-through 100%)
 * - position: absolute; inset: 0 (khớp nối chính xác với khung đỏ)
 * - Tuyết rơi lất phất kích thước không đều (chấm tròn + bông tuyết tinh thể 6 cánh) khi theme === 'christmas'
 */
export default function ThemeOverlayLayer({ theme, children }) {
  const isChristmas = theme === 'christmas';

  return (
    <div 
      className={`theme-overlay-layer ${theme ? `theme-overlay-layer--${theme}` : ''}`}
      aria-hidden="true"
    >
      {isChristmas && <SnowfallOverlay />}
      {children}
    </div>
  );
}

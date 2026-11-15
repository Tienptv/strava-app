import React from 'react';
import './snowCap.css';

/**
 * SnowCapBar: Hiệu ứng tuyết phủ bồng bềnh & nhũ băng (icicles) pha lê rủ xuống
 * Tự động ôm sát và co giãn theo bề ngang của các thanh bar/pill
 * Đảm bảo 100% pointer-events: none không ảnh hưởng đến tương tác click.
 */
export default function SnowCapBar({ variant = 'default', style = {} }) {
  return (
    <div 
      className={`snow-cap-bar-wrapper snow-cap-bar--${variant}`}
      style={style}
      aria-hidden="true"
    >
      {/* 1. SVG LỚP TUYẾT PHỦ VÀ CÁC NHÁNH NHŨ BĂNG RỦ XUỐNG */}
      <svg
        className="snow-cap-svg"
        viewBox="0 0 100 26"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient màu tuyết & băng pha lê đa tầng */}
          <linearGradient id="snowCapGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="30%" stopColor="#F0F9FF" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#BAE6FD" stopOpacity="0.82" />
            <stop offset="85%" stopColor="#7DD3FC" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.9" />
          </linearGradient>

          {/* Gradient viền ánh sáng đỉnh tuyết */}
          <linearGradient id="snowTopHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.7" />
            <stop offset="25%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="50%" stopColor="#BAE6FD" stopOpacity="0.85" />
            <stop offset="75%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.7" />
          </linearGradient>

          {/* Bộ lọc bóng đổ băng tuyết phản quang */}
          <filter id="iceGlow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#38bdf8" floodOpacity="0.45" />
            <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodColor="#ffffff" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Khối tuyết phủ đỉnh bồng bềnh + 5 nhánh nhũ tuyết so le rủ xuống */}
        <path
          d="
            M -1, 10
            C 6, 2, 14, 2, 22, 6
            C 29, 0.5, 38, 1, 46, 5
            C 55, 0, 65, 0.8, 74, 5
            C 82, 1.5, 91, 2, 101, 10
            L 101, 11
            C 97, 12, 95, 14, 94.5, 18
            C 94, 20, 93, 20, 92.5, 18
            C 92, 14, 89, 12, 86, 12
            C 83, 12, 81.5, 16, 80.5, 24
            C 80, 26.5, 79, 26.5, 78.5, 24
            C 77.5, 16, 75, 11, 71, 11
            C 67, 11, 65, 14, 64, 18
            C 63.5, 20, 62.5, 20, 62, 18
            C 61, 13, 58, 11.5, 54, 11.5
            C 50, 11.5, 48.5, 15, 47.5, 22
            C 47, 24.5, 46, 24.5, 45.5, 22
            C 44.5, 14, 42, 11, 38, 11
            C 34, 11, 32.5, 13.5, 31.5, 16
            C 31, 17.5, 30, 17.5, 29.5, 16
            C 28.5, 12, 25, 11, 21, 11
            C 17, 11, 15.5, 15, 14.5, 21
            C 14, 23.5, 13, 23.5, 12.5, 21
            C 11.5, 14, 9, 11.5, 5, 11.5
            C 2, 11.5, 0.5, 12.5, -1, 14
            Z
          "
          fill="url(#snowCapGradient)"
          filter="url(#iceGlow)"
        />

        {/* Viền sáng trắng bạc phản quang trên đỉnh các ụ tuyết */}
        <path
          d="
            M -1, 10
            C 6, 2, 14, 2, 22, 6
            C 29, 0.5, 38, 1, 46, 5
            C 55, 0, 65, 0.8, 74, 5
            C 82, 1.5, 91, 2, 101, 10
          "
          stroke="url(#snowTopHighlight)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Chấm tròn giọt sương băng lấp lánh ở đầu nhọn của các nhũ dài */}
        <circle cx="13.5" cy="22" r="0.9" fill="#FFFFFF" opacity="0.9" />
        <circle cx="46.5" cy="23" r="1.1" fill="#FFFFFF" opacity="0.95" />
        <circle cx="79.5" cy="25" r="1.1" fill="#FFFFFF" opacity="0.95" />
      </svg>

      {/* 2. ÁNH SAO PHA LÊ LẤP LÁNH Ở VỊ TRÍ Ụ TUYẾT CAO NHẤT */}
      <div className="snow-cap-sparkle snow-cap-sparkle--left">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M 8,0 Q 8,8 16,8 Q 8,8 8,16 Q 8,8 0,8 Q 8,8 8,0 Z" fill="#ffffff" />
          <circle cx="8" cy="8" r="2" fill="#BAE6FD" />
        </svg>
      </div>

      <div className="snow-cap-sparkle snow-cap-sparkle--right">
        <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
          <path d="M 8,0 Q 8,8 16,8 Q 8,8 8,16 Q 8,8 0,8 Q 8,8 8,0 Z" fill="#ffffff" />
          <circle cx="8" cy="8" r="1.5" fill="#38BDF8" />
        </svg>
      </div>
    </div>
  );
}

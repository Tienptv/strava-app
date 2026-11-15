import React from 'react';
import './snowCap.css';

/**
 * SnowCapBar: Hiệu ứng tuyết phủ bồng bềnh & nhũ băng (icicles) pha lê rủ xuống
 * Tự động ôm sát và co giãn theo bề ngang của các thanh bar/pill
 * Đảm bảo 100% pointer-events: none không ảnh hưởng đến tương tác click.
 */
export default function SnowCapBar({ variant = 'default', style = {} }) {
  const gradId = `snowCapGrad_${variant}`;
  const highlightId = `snowTopHighlight_${variant}`;

  return (
    <div 
      className={`snow-cap-bar-wrapper snow-cap-bar--${variant}`}
      style={style}
      aria-hidden="true"
    >
      {/* 1. SVG LỚP TUYẾT PHỦ VÀ CÁC NHÁNH NHŨ BĂNG RỦ XUỐNG */}
      <svg
        className="snow-cap-svg"
        viewBox="0 0 100 28"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient màu tuyết & băng pha lê đa tầng */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="65%" stopColor="#E0F2FE" stopOpacity="0.92" />
            <stop offset="88%" stopColor="#BAE6FD" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.7" />
          </linearGradient>

          {/* Gradient viền ánh sáng đỉnh tuyết */}
          <linearGradient id={highlightId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.8" />
            <stop offset="25%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="50%" stopColor="#E0F2FE" stopOpacity="0.9" />
            <stop offset="75%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Khối tuyết phủ đỉnh bồng bềnh + 5 nhánh nhũ tuyết so le rủ xuống */}
        <path
          d="
            M -1, 10
            C 6, 1, 14, 1, 22, 5
            C 29, 0, 38, 0.5, 46, 4
            C 55, 0, 65, 0.5, 74, 4.5
            C 82, 1, 91, 1.5, 101, 10
            L 101, 11
            C 97, 12, 95.5, 15, 95, 19
            C 94.5, 21, 93.5, 21, 93, 19
            C 92, 14.5, 89, 12.5, 86, 12.5
            C 83, 12.5, 81.5, 17, 80.5, 25
            C 80, 27.5, 79, 27.5, 78.5, 25
            C 77.5, 17, 75, 12, 71, 12
            C 67, 12, 65, 15, 64, 19
            C 63.5, 21, 62.5, 21, 62, 19
            C 61, 14, 58, 12, 54, 12
            C 50, 12, 48.5, 16, 47.5, 23
            C 47, 25.5, 46, 25.5, 45.5, 23
            C 44.5, 15, 42, 12, 38, 12
            C 34, 12, 32.5, 14.5, 31.5, 17
            C 31, 18.5, 30, 18.5, 29.5, 17
            C 28.5, 13, 25, 12, 21, 12
            C 17, 12, 15.5, 16, 14.5, 22
            C 14, 24.5, 13, 24.5, 12.5, 22
            C 11.5, 15, 9, 12, 5, 12
            C 2, 12, 0.5, 13, -1, 14.5
            Z
          "
          fill={`url(#${gradId})`}
        />

        {/* Viền sáng trắng bạc phản quang trên đỉnh các ụ tuyết */}
        <path
          d="
            M -1, 10
            C 6, 1, 14, 1, 22, 5
            C 29, 0, 38, 0.5, 46, 4
            C 55, 0, 65, 0.5, 74, 4.5
            C 82, 1, 91, 1.5, 101, 10
          "
          stroke={`url(#${highlightId})`}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Chấm tròn giọt sương băng lấp lánh ở đầu nhọn của các nhũ dài */}
        <circle cx="13.5" cy="23" r="1.0" fill="#FFFFFF" opacity="0.95" />
        <circle cx="46.5" cy="24" r="1.2" fill="#FFFFFF" opacity="1" />
        <circle cx="79.5" cy="26" r="1.2" fill="#FFFFFF" opacity="1" />
      </svg>

      {/* 2. ÁNH SAO PHA LÊ LẤP LÁNH Ở VỊ TRÍ Ụ TUYẾT CAO NHẤT */}
      <div className="snow-cap-sparkle snow-cap-sparkle--left">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M 8,0 Q 8,8 16,8 Q 8,8 8,16 Q 8,8 0,8 Q 8,8 8,0 Z" fill="#ffffff" />
          <circle cx="8" cy="8" r="2" fill="#BAE6FD" />
        </svg>
      </div>

      <div className="snow-cap-sparkle snow-cap-sparkle--right">
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
          <path d="M 8,0 Q 8,8 16,8 Q 8,8 8,16 Q 8,8 0,8 Q 8,8 8,0 Z" fill="#ffffff" />
          <circle cx="8" cy="8" r="1.5" fill="#38BDF8" />
        </svg>
      </div>
    </div>
  );
}

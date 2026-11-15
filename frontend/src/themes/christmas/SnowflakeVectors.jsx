import React from 'react';

/**
 * Bảng màu & Hiệu ứng Băng Đá Tinh Thể (Glacial Ice Palette & Glow)
 * - Thân bông tuyết: Màu xám trong suốt mờ băng (Translucent Frosty Grey)
 * - Viền: Ánh xanh băng nhẹ sắc nét (Soft Polar Cyan / Ice Blue Edge)
 * - Hiệu ứng: Quang sai khúc xạ băng đá đa tầng (Dual Specular Ice Glow)
 */
const DEFAULT_ICE_CORE = 'rgba(215, 228, 240, 0.82)'; // Xám trong ánh băng
const DEFAULT_ICE_EDGE = 'rgba(56, 189, 248, 0.85)';  // Viền xanh băng nhẹ
const DEFAULT_ICE_CENTER = 'rgba(226, 232, 240, 0.65)'; // Tâm xám trong

const DEFAULT_ICE_GLOW = 'drop-shadow(0 0 1.2px rgba(56, 189, 248, 0.95)) drop-shadow(0 0 4.5px rgba(14, 165, 233, 0.45))';

/**
 * 1. Bông tuyết hoa băng cổ điển 6 cánh (Classic 6-Point Hexagonal Snowflake)
 */
export function ClassicHexSnowflake({
  size = 16,
  color = DEFAULT_ICE_CORE,
  edgeColor = DEFAULT_ICE_EDGE,
  style = {},
  className = ''
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', filter: DEFAULT_ICE_GLOW, ...style }}
      className={`snowflake-vector snowflake-vector--ice ${className}`}
    >
      {/* 3 trục chính giao nhau tại tâm (màu xám trong viền ánh băng) */}
      <line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3.34" y1="7" x2="20.66" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3.34" y1="17" x2="20.66" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />

      {/* Các nhánh chữ V trên từng cánh (nhánh trên & dưới) */}
      <path d="M 9.5,5 L 12,7.5 L 14.5,5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 9.5,19 L 12,16.5 L 14.5,19" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Các nhánh chữ V cánh chéo trên phải & dưới trái */}
      <path d="M 18.5,8 L 16.5,10.5 L 19,12.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 5.5,16 L 7.5,13.5 L 5,11.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Các nhánh chữ V cánh chéo trên trái & dưới phải */}
      <path d="M 5.5,8 L 7.5,10.5 L 5,12.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 18.5,16 L 16.5,13.5 L 19,11.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Tâm lục giác nhỏ xám trong viền xanh băng */}
      <circle cx="12" cy="12" r="1.6" fill={DEFAULT_ICE_CENTER} stroke={edgeColor} strokeWidth="0.8" />
    </svg>
  );
}

/**
 * 2. Bông tuyết Ngôi Sao Lấp Lánh (Starlight Snowflake)
 */
export function StarlightSnowflake({
  size = 18,
  color = DEFAULT_ICE_CORE,
  edgeColor = DEFAULT_ICE_EDGE,
  style = {},
  className = ''
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', filter: DEFAULT_ICE_GLOW, ...style }}
      className={`snowflake-vector snowflake-vector--ice ${className}`}
    >
      {/* 6 cánh sao chính */}
      <line x1="12" y1="1.5" x2="12" y2="22.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.9" y1="6.75" x2="21.1" y2="17.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.9" y1="17.25" x2="21.1" y2="6.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" />

      {/* Mũi tên sao băng ở đầu mỗi cánh */}
      <path d="M 10,4.5 L 12,2 L 14,4.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 10,19.5 L 12,22 L 14,19.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Vòng đan sao ở giữa viền xanh nhẹ */}
      <circle cx="12" cy="12" r="3.2" stroke={edgeColor} strokeWidth="0.9" strokeDasharray="1.5 1.5" />
      <circle cx="12" cy="12" r="1.3" fill={DEFAULT_ICE_CENTER} stroke={edgeColor} strokeWidth="0.6" />
    </svg>
  );
}

/**
 * 3. Bông tuyết Pha Lê Băng Nhũ (Crystal Ice Flake)
 */
export function CrystalIceFlake({
  size = 14,
  color = DEFAULT_ICE_CORE,
  edgeColor = DEFAULT_ICE_EDGE,
  style = {},
  className = ''
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', filter: DEFAULT_ICE_GLOW, ...style }}
      className={`snowflake-vector snowflake-vector--ice ${className}`}
    >
      <line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="3.34" y1="7" x2="20.66" y2="17" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="3.34" y1="17" x2="20.66" y2="7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />

      {/* Hạt kim cương băng ở các đầu ngọn có viền xanh */}
      <circle cx="12" cy="2" r="1.2" fill={DEFAULT_ICE_CENTER} stroke={edgeColor} strokeWidth="0.6" />
      <circle cx="12" cy="22" r="1.2" fill={DEFAULT_ICE_CENTER} stroke={edgeColor} strokeWidth="0.6" />
      <circle cx="3.34" cy="7" r="1.2" fill={DEFAULT_ICE_CENTER} stroke={edgeColor} strokeWidth="0.6" />
      <circle cx="20.66" cy="17" r="1.2" fill={DEFAULT_ICE_CENTER} stroke={edgeColor} strokeWidth="0.6" />
      <circle cx="3.34" cy="17" r="1.2" fill={DEFAULT_ICE_CENTER} stroke={edgeColor} strokeWidth="0.6" />
      <circle cx="20.66" cy="7" r="1.2" fill={DEFAULT_ICE_CENTER} stroke={edgeColor} strokeWidth="0.6" />

      {/* Hình lục giác trung tâm xám trong viền xanh băng */}
      <polygon
        points="12,8 15.5,10 15.5,14 12,16 8.5,14 8.5,10"
        stroke={edgeColor}
        strokeWidth="0.9"
        fill={DEFAULT_ICE_CENTER}
      />
      <circle cx="12" cy="12" r="1" fill={DEFAULT_ICE_CORE} />
    </svg>
  );
}

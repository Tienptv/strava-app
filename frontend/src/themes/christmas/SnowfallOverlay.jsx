import React, { useMemo } from 'react';
import './snowfall.css';
import { ClassicHexSnowflake, StarlightSnowflake, CrystalIceFlake } from './SnowflakeVectors';

/**
 * Danh sách hạt tuyết với kích thước không đều (irregular),
 * kết hợp giữa chấm tròn mờ xốp (soft grains) và bông tuyết 6 cánh pha lê (crystal snowflakes).
 * 
 * Áp dụng negative animation-delay để hạt tuyết đã đang rơi lất phất ngay khi vừa nạp trang.
 */
const RAW_SNOWFLAKE_DATA = [
  // 1. Chấm tròn nhỏ li ti (Tiny Soft Grains) - lớp sâu nền (background depth)
  { type: 'dot', size: 2.5, left: 3, duration: 8.5, delay: -1.2, opacity: 0.5, anim: 'snow-anim-dot' },
  { type: 'dot', size: 3.0, left: 11, duration: 9.8, delay: -4.5, opacity: 0.6, anim: 'snow-anim-dot' },
  { type: 'dot', size: 2.0, left: 19, duration: 11.2, delay: -6.8, opacity: 0.45, anim: 'snow-anim-dot' },
  { type: 'dot', size: 3.5, left: 27, duration: 8.2, delay: -2.7, opacity: 0.65, anim: 'snow-anim-dot' },
  { type: 'dot', size: 2.5, left: 35, duration: 10.5, delay: -5.1, opacity: 0.5, anim: 'snow-anim-dot' },
  { type: 'dot', size: 3.0, left: 43, duration: 9.1, delay: -8.0, opacity: 0.55, anim: 'snow-anim-dot' },
  { type: 'dot', size: 2.2, left: 51, duration: 11.5, delay: -3.4, opacity: 0.45, anim: 'snow-anim-dot' },
  { type: 'dot', size: 3.2, left: 59, duration: 8.8, delay: -7.2, opacity: 0.6, anim: 'snow-anim-dot' },
  { type: 'dot', size: 2.8, left: 67, duration: 10.2, delay: -1.9, opacity: 0.5, anim: 'snow-anim-dot' },
  { type: 'dot', size: 3.5, left: 75, duration: 9.4, delay: -4.8, opacity: 0.65, anim: 'snow-anim-dot' },
  { type: 'dot', size: 2.0, left: 83, duration: 12.0, delay: -9.1, opacity: 0.4, anim: 'snow-anim-dot' },
  { type: 'dot', size: 3.0, left: 91, duration: 9.0, delay: -5.7, opacity: 0.55, anim: 'snow-anim-dot' },
  { type: 'dot', size: 2.5, left: 97, duration: 10.8, delay: -2.3, opacity: 0.5, anim: 'snow-anim-dot' },

  // 2. Chấm tròn kích thước vừa & lớn (Medium to Large Soft Grains) - lớp trung & tiền cảnh
  { type: 'dot', size: 5.0, left: 7, duration: 7.8, delay: -3.1, opacity: 0.75, anim: 'snow-anim-dot' },
  { type: 'dot', size: 6.5, left: 16, duration: 8.6, delay: -6.2, opacity: 0.8, anim: 'snow-anim-dot' },
  { type: 'dot', size: 4.5, left: 24, duration: 9.5, delay: -0.8, opacity: 0.7, anim: 'snow-anim-dot' },
  { type: 'dot', size: 7.5, left: 39, duration: 7.2, delay: -4.9, opacity: 0.85, anim: 'snow-anim-dot' },
  { type: 'dot', size: 5.5, left: 48, duration: 8.9, delay: -7.6, opacity: 0.75, anim: 'snow-anim-dot' },
  { type: 'dot', size: 8.0, left: 63, duration: 7.5, delay: -2.1, opacity: 0.85, anim: 'snow-anim-dot' },
  { type: 'dot', size: 4.8, left: 71, duration: 9.2, delay: -5.4, opacity: 0.7, anim: 'snow-anim-dot' },
  { type: 'dot', size: 6.0, left: 86, duration: 8.1, delay: -8.3, opacity: 0.8, anim: 'snow-anim-dot' },
  { type: 'dot', size: 5.2, left: 94, duration: 8.7, delay: -1.6, opacity: 0.75, anim: 'snow-anim-dot' },

  // 3. Bông tuyết tinh thể pha lê 6 cánh (Crystalline Snowflakes with Irregular Sizes)
  // Biến thể A: Classic Hexagonal Snowflake
  { type: 'crystal', variant: 'classic', size: 13, left: 5, duration: 10.2, delay: -2.0, opacity: 0.8, anim: 'snow-anim-a' },
  { type: 'crystal', variant: 'classic', size: 16, left: 31, duration: 11.5, delay: -6.5, opacity: 0.85, anim: 'snow-anim-b' },
  { type: 'crystal', variant: 'classic', size: 11, left: 55, duration: 12.8, delay: -1.5, opacity: 0.75, anim: 'snow-anim-a' },
  { type: 'crystal', variant: 'classic', size: 18, left: 79, duration: 9.8, delay: -7.0, opacity: 0.9, anim: 'snow-anim-b' },

  // Biến thể B: Starlight Snowflake
  { type: 'crystal', variant: 'starlight', size: 15, left: 14, duration: 11.0, delay: -5.3, opacity: 0.85, anim: 'snow-anim-b' },
  { type: 'crystal', variant: 'starlight', size: 12, left: 45, duration: 12.2, delay: -8.7, opacity: 0.75, anim: 'snow-anim-a' },
  { type: 'crystal', variant: 'starlight', size: 17, left: 68, duration: 10.5, delay: -3.8, opacity: 0.88, anim: 'snow-anim-b' },
  { type: 'crystal', variant: 'starlight', size: 14, left: 92, duration: 11.8, delay: -0.9, opacity: 0.8, anim: 'snow-anim-a' },

  // Biến thể C: Crystal Ice Flake
  { type: 'crystal', variant: 'crystal', size: 12, left: 22, duration: 12.5, delay: -4.1, opacity: 0.75, anim: 'snow-anim-a' },
  { type: 'crystal', variant: 'crystal', size: 15, left: 37, duration: 10.8, delay: -7.9, opacity: 0.85, anim: 'snow-anim-b' },
  { type: 'crystal', variant: 'crystal', size: 17, left: 60, duration: 9.9, delay: -2.4, opacity: 0.88, anim: 'snow-anim-a' },
  { type: 'crystal', variant: 'crystal', size: 13, left: 84, duration: 11.4, delay: -6.0, opacity: 0.8, anim: 'snow-anim-b' }
];

export default function SnowfallOverlay() {
  const particles = useMemo(() => RAW_SNOWFLAKE_DATA, []);

  return (
    <div className="snowfall-canvas-wrapper" aria-hidden="true">
      {particles.map((flake, idx) => {
        const particleStyle = {
          left: `${flake.left}%`,
          '--drift-duration': `${flake.duration}s`,
          '--drift-delay': `${flake.delay}s`,
          '--flake-opacity': flake.opacity
        };

        if (flake.type === 'dot') {
          return (
            <div
              key={`snow-dot-${idx}`}
              className={`snow-particle snow-grain-dot ${flake.anim}`}
              style={{
                ...particleStyle,
                width: `${flake.size}px`,
                height: `${flake.size}px`
              }}
            />
          );
        }

        // Bông tuyết tinh thể
        return (
          <div
            key={`snow-crystal-${idx}`}
            className={`snow-particle snowflake-crystal ${flake.anim}`}
            style={{
              ...particleStyle,
              width: `${flake.size}px`,
              height: `${flake.size}px`
            }}
          >
            {flake.variant === 'classic' && (
              <ClassicHexSnowflake size={flake.size} />
            )}
            {flake.variant === 'starlight' && (
              <StarlightSnowflake size={flake.size} />
            )}
            {flake.variant === 'crystal' && (
              <CrystalIceFlake size={flake.size} />
            )}
          </div>
        );
      })}
    </div>
  );
}


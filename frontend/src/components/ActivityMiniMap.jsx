import React, { useMemo } from 'react';
import { useLang } from '../i18n/LangContext';

/**
 * Decode Google/Strava encoded polyline string into [[lat, lng], ...]
 */
function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  try {
    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push([lat / 1e5, lng / 1e5]);
    }
  } catch (err) {
    console.warn('[ActivityMiniMap] Error decoding polyline:', err);
    return [];
  }

  return poly;
}

export default function ActivityMiniMap({
  summaryPolyline,
  activityType = 'Run',
  height = 140,
  className = '',
  onClick,
}) {
  const { t } = useLang();

  const svgData = useMemo(() => {
    if (!summaryPolyline) return null;
    const points = decodePolyline(summaryPolyline);
    if (!points || points.length < 2) return null;

    const width = 320;
    const h = 150;
    const padding = 20;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (let i = 0; i < points.length; i++) {
      const [lat, lng] = points[i];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    const deltaLng = maxLng - minLng;
    const deltaLat = maxLat - minLat;

    if (deltaLng <= 0.00001 && deltaLat <= 0.00001) return null;

    // Approximate aspect ratio correction for latitude
    const midLat = (minLat + maxLat) / 2;
    const latFactor = Math.cos((midLat * Math.PI) / 180) || 1;
    const adjustedDeltaLng = deltaLng * latFactor;

    const innerW = width - padding * 2;
    const innerH = h - padding * 2;

    const scale = Math.min(
      innerW / (adjustedDeltaLng || 0.0001),
      innerH / (deltaLat || 0.0001)
    );

    const totalW = adjustedDeltaLng * scale;
    const totalH = deltaLat * scale;

    const offsetX = (width - totalW) / 2;
    const offsetY = (h - totalH) / 2;

    const toSvgX = (lng) => offsetX + (lng - minLng) * latFactor * scale;
    const toSvgY = (lat) => h - (offsetY + (lat - minLat) * scale);

    let pathD = '';
    for (let i = 0; i < points.length; i++) {
      const x = toSvgX(points[i][1]).toFixed(1);
      const y = toSvgY(points[i][0]).toFixed(1);
      pathD += (i === 0 ? `M ${x},${y}` : ` L ${x},${y}`);
    }

    const start = {
      x: Number(toSvgX(points[0][1]).toFixed(1)),
      y: Number(toSvgY(points[0][0]).toFixed(1)),
    };
    const end = {
      x: Number(toSvgX(points[points.length - 1][1]).toFixed(1)),
      y: Number(toSvgY(points[points.length - 1][0]).toFixed(1)),
    };

    return { pathD, start, end, pointCount: points.length };
  }, [summaryPolyline]);

  const uniqueId = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  return (
    <div
      className={`activity-mini-map ${className}`}
      style={{ height: `${height}px` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {svgData ? (
        <svg
          viewBox="0 0 320 150"
          preserveAspectRatio="xMidYMid meet"
          className="activity-mini-map__svg"
        >
          <defs>
            {/* Haskoning Neon Cyan & Lime Gradient */}
            <linearGradient id={`routeGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78BE20" />
              <stop offset="60%" stopColor="#00A3A6" />
              <stop offset="100%" stopColor="#00E5FF" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter id={`neonGlow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00A3A6" floodOpacity="0.8" />
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#00A3A6" floodOpacity="0.4" />
            </filter>

            {/* Subtle Tech Grid Pattern */}
            <pattern id={`gridPattern-${uniqueId}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.75" />
            </pattern>
          </defs>

          {/* Map Base Background */}
          <rect width="100%" height="100%" fill={`url(#gridPattern-${uniqueId})`} />

          {/* Underlay glow path */}
          <path
            d={svgData.pathD}
            fill="none"
            stroke="#00A3A6"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
            filter={`url(#neonGlow-${uniqueId})`}
          />

          {/* Main Route Polyline Path */}
          <path
            d={svgData.pathD}
            fill="none"
            stroke={`url(#routeGrad-${uniqueId})`}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Start Point Marker (Lime Green Dot) */}
          <circle
            cx={svgData.start.x}
            cy={svgData.start.y}
            r="4.5"
            fill="#78BE20"
            stroke="#ffffff"
            strokeWidth="2"
          />

          {/* End Point Marker (Accent Ring) */}
          <circle
            cx={svgData.end.x}
            cy={svgData.end.y}
            r="4.5"
            fill="#FF4D4D"
            stroke="#ffffff"
            strokeWidth="2"
          />
        </svg>
      ) : (
        /* Fallback for Indoor, Treadmill, or No GPS */
        <div className="activity-mini-map__fallback">
          <div className="activity-mini-map__fallback-wave">
            <svg viewBox="0 0 320 80" preserveAspectRatio="none" className="fallback-wave-svg">
              <path
                d="M 0,50 Q 80,20 160,45 T 320,35 L 320,80 L 0,80 Z"
                fill="rgba(0, 163, 166, 0.08)"
              />
              <path
                d="M 0,50 Q 80,20 160,45 T 320,35"
                fill="none"
                stroke="rgba(0, 163, 166, 0.35)"
                strokeWidth="2"
                strokeDasharray="4,4"
              />
            </svg>
          </div>
          <div className="activity-mini-map__fallback-badge">
            <span className="fallback-icon">⚡</span>
            <span>{t('indoorWorkout')}</span>
          </div>
        </div>
      )}

      {/* Subtle GPS Track Overlay Badge */}
      {svgData && (
        <div className="activity-mini-map__badge">
          <span className="gps-live-dot" />
          <span>GPS ROUTE</span>
        </div>
      )}
    </div>
  );
}

/**
 * Generates an ultra-crisp, high-performance inline SVG avatar data URL
 * Eliminates all external HTTP dependencies (e.g. ui-avatars.com) and avoids CORS issues during screenshot capture.
 */
export function generateLocalAvatar(name, size = 32) {
  const cleanName = (name || '?').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  
  // Extract 1-2 letter uppercase initials
  let initials = '?';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  // Curated modern sports palette
  const palette = [
    { bg: '#00A3A6', text: '#ffffff' },
    { bg: '#002D54', text: '#ffffff' },
    { bg: '#10b981', text: '#ffffff' },
    { bg: '#f59e0b', text: '#ffffff' },
    { bg: '#6366f1', text: '#ffffff' },
    { bg: '#ec4899', text: '#ffffff' },
    { bg: '#8b5cf6', text: '#ffffff' },
    { bg: '#0ea5e9', text: '#ffffff' },
    { bg: '#14b8a6', text: '#ffffff' },
    { bg: '#B5D334', text: '#002D54' }
  ];

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const theme = palette[Math.abs(hash) % palette.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${theme.bg}"/>
  <text x="${size / 2}" y="${size * 0.64}" font-size="${Math.round(size * 0.44)}" font-weight="700" fill="${theme.text}" text-anchor="middle" font-family="Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif">${initials}</text>
</svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function getAthleteAvatar(member, size = 32) {
  if (!member) return generateLocalAvatar('Runner', size);
  const fullName = `${member.firstname || ''} ${member.lastname || ''}`.trim() || 'Runner';
  const p = member.profile_medium || member.profile;
  if (!p || p.includes('avatar/athlete') || p.includes('logo-strava-lg.png')) {
    return generateLocalAvatar(fullName, size);
  }
  return p;
}

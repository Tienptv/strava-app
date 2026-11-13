/**
 * Theme Registry & Resolver
 * Haskoning 200K Running Club
 */

export const AVAILABLE_THEMES = [
  {
    id: 'default',
    name: 'Default Corporate',
    nameVi: 'Chuẩn Doanh Nghiệp',
    icon: '🏢',
    month: null
  },
  {
    id: 'halloween',
    name: 'Halloween Spooky',
    nameVi: 'Halloween Ma Mị',
    icon: '🎃',
    month: 10
  },
  {
    id: 'christmas',
    name: 'Christmas Frost & Glow',
    nameVi: 'Giáng Sinh & Tuyết Rơi 3D',
    icon: '🎄',
    month: 12
  },
  {
    id: 'tet',
    name: 'Tet Lunar New Year',
    nameVi: 'Tết Cổ Truyền & Hoa Mai',
    icon: '🧧',
    month: 1,
    comingSoon: true
  }
];

export function getThemeById(themeId) {
  return AVAILABLE_THEMES.find(t => t.id === themeId) || AVAILABLE_THEMES[0];
}


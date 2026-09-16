/**
 * User Feature Access Control Service
 * Quản lý các phần và tính năng mà User (thành viên thường) và Khách vãng lai (Guests) được phép truy cập.
 * Lưu trữ tại Storage/user_access_control.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.join(__dirname, '..', 'Storage');
const USER_ACCESS_FILE = path.join(STORAGE_DIR, 'user_access_control.json');

// Đảm bảo thư mục Storage tồn tại
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export const DEFAULT_USER_ACCESS_CONFIG = {
  version: 1,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
  modules: {
    // 1. Nhóm AI & Nâng Cao
    aiCoach: {
      key: 'aiCoach',
      group: 'ai_advanced',
      enabledForMembers: true,
      enabledForGuests: false
    },
    runnaRoadmap: {
      key: 'runnaRoadmap',
      group: 'ai_advanced',
      enabledForMembers: true,
      enabledForGuests: false
    },
    garminSync: {
      key: 'garminSync',
      group: 'ai_advanced',
      enabledForMembers: true,
      enabledForGuests: false
    },

    // 2. Nhóm Bảng Xếp Hạng & Bài Tập
    leaderboardPodium: {
      key: 'leaderboardPodium',
      group: 'dashboard_activities',
      enabledForMembers: true,
      enabledForGuests: true
    },
    recentActivities: {
      key: 'recentActivities',
      group: 'dashboard_activities',
      enabledForMembers: true,
      enabledForGuests: true
    },
    shareCard: {
      key: 'shareCard',
      group: 'dashboard_activities',
      enabledForMembers: true,
      enabledForGuests: true
    },

    // 3. Nhóm Tài Chính & Mục Tiêu
    clubTreasury: {
      key: 'clubTreasury',
      group: 'finance_goals',
      enabledForMembers: true,
      enabledForGuests: false
    },
    editPersonalGoal: {
      key: 'editPersonalGoal',
      group: 'finance_goals',
      enabledForMembers: true,
      enabledForGuests: false
    },
    exportData: {
      key: 'exportData',
      group: 'finance_goals',
      enabledForMembers: true,
      enabledForGuests: false
    },

    // 4. Nhóm Chế Độ Khách
    guestAccess: {
      key: 'guestAccess',
      group: 'guest_mode',
      enabledForMembers: true,
      enabledForGuests: true
    }
  }
};

/**
 * Đọc cấu hình quyền truy cập của User từ storage
 */
export function getUserAccessConfig() {
  try {
    if (fs.existsSync(USER_ACCESS_FILE)) {
      const raw = fs.readFileSync(USER_ACCESS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.modules) {
        // Merge với default để đảm bảo nếu có module mới thì luôn có key fallback
        return {
          ...DEFAULT_USER_ACCESS_CONFIG,
          ...parsed,
          modules: {
            ...DEFAULT_USER_ACCESS_CONFIG.modules,
            ...parsed.modules
          }
        };
      }
    }
  } catch (err) {
    console.error('[UserAccessService] Lỗi đọc file cấu hình:', err);
  }

  // Khởi tạo file mặc định nếu chưa tồn tại
  saveUserAccessConfig(DEFAULT_USER_ACCESS_CONFIG, 'system_init');
  return { ...DEFAULT_USER_ACCESS_CONFIG };
}

/**
 * Lưu cấu hình quyền truy cập User vào Storage/user_access_control.json
 */
export function saveUserAccessConfig(configData, updatedBy = 'Admin') {
  try {
    const current = getUserAccessConfig();
    const updatedModules = {
      ...current.modules,
      ...(configData.modules || {})
    };

    const payload = {
      version: (current.version || 1) + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Admin',
      modules: updatedModules
    };

    fs.writeFileSync(USER_ACCESS_FILE, JSON.stringify(payload, null, 2), 'utf8');
    return { success: true, config: payload };
  } catch (err) {
    console.error('[UserAccessService] Lỗi lưu cấu hình:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Kiểm tra xem một tính năng cụ thể có được phép truy cập cho vai trò tương ứng không
 * @param {string} moduleKey - Tên tính năng (vd: 'aiCoach', 'runnaRoadmap')
 * @param {string} role - 'member' | 'guest' | 'admin' | 'superadmin'
 */
export function isFeatureAccessible(moduleKey, role = 'guest') {
  // Super Admin và Admin luôn luôn có toàn quyền
  if (role === 'admin' || role === 'superadmin') {
    return true;
  }

  const config = getUserAccessConfig();
  const mod = config.modules?.[moduleKey];
  if (!mod) {
    return true; // Mặc định mở nếu không nằm trong danh sách giới hạn
  }

  if (role === 'member') {
    return mod.enabledForMembers !== false;
  }

  // Khách vãng lai (guest)
  return mod.enabledForGuests === true;
}

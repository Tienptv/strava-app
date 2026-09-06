import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { StravaAPI } from './strava.js';
import { scrapeClubActivities, loginAndGetCookie, getSavedCookie, extractCookiesFromActiveBrowser, clearCookiesFromActiveBrowser, getBrowserExecutable } from './scraper.js';
import https from 'https';
import { ZipArchive } from 'archiver';
import { execSync } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RENDER_CLOUD_URL = process.env.RENDER_CLOUD_URL || 'https://strava-app-86t5.onrender.com';
const SYNC_SECRET_TOKEN = process.env.SYNC_SECRET_TOKEN || 'STRAVA_SUBADMIN_SYNC_2026';
const TARGETS_FILE = path.join(__dirname, '../Storage/targets.json');
const CONFIG_FILE = path.join(__dirname, '../Storage/challenge_config.json');
const IMPORTED_FILE = path.join(__dirname, '../Storage/imported_activities.json');
const HISTORICAL_FILE = path.join(__dirname, '../Storage/historical_activities.json');
const TOTAL_KM_FILE = path.join(__dirname, '../Storage/Tong km To 02092026.csv');
const ALL_TIME_DETAILED_CSV = path.join(__dirname, '../Storage/All_Time_KM_02092026.csv');
const GOAL_FILE = path.join(__dirname, '../Storage/club_goal.json');
const TOKENS_FILE = path.join(__dirname, '../Storage/tokens.json');
const NAME_MAPPING_FILE = path.join(__dirname, '../Storage/name_mapping.json');
const ADMINS_FILE = path.join(__dirname, '../Storage/admins.json');
const AUDIT_LOGS_FILE = path.join(__dirname, '../Storage/audit_logs.json');
const PENALTIES_FILE = path.join(__dirname, '../Storage/member_penalties_mapping.json');
const SUPER_ADMIN_ID = (process.env.VITE_ADMIN_STRAVA_ID || '133066813').toString();

// ==========================================
// TỰ ĐỘNG ĐỒNG BỘ 2 CHIỀU GIỮA GIT ROOT & DESKTOP APP STORAGE
// ==========================================
const STORAGE_DIR = path.join(__dirname, '../Storage');
let MIRROR_STORAGE_DIR = null;
const possibleGitRootStorage = path.resolve(__dirname, '../../../Storage');
const possibleDesktopStorage = path.resolve(__dirname, '../desktop_release/Strava_App_Desktop/Storage');

if (fs.existsSync(possibleGitRootStorage) && path.resolve(STORAGE_DIR) !== possibleGitRootStorage) {
  MIRROR_STORAGE_DIR = possibleGitRootStorage;
} else if (fs.existsSync(possibleDesktopStorage) && path.resolve(STORAGE_DIR) !== possibleDesktopStorage) {
  MIRROR_STORAGE_DIR = possibleDesktopStorage;
}

function writeStorageFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');

    if (MIRROR_STORAGE_DIR) {
      const fileName = path.basename(filePath);
      const mirrorFilePath = path.join(MIRROR_STORAGE_DIR, fileName);
      if (!fs.existsSync(MIRROR_STORAGE_DIR)) fs.mkdirSync(MIRROR_STORAGE_DIR, { recursive: true });
      fs.writeFileSync(mirrorFilePath, content, 'utf8');
    }
  } catch (err) {
    console.warn(`Lỗi ghi Storage file (${path.basename(filePath)}):`, err.message);
  }
}

function writeStorageJson(filePath, data) {
  writeStorageFile(filePath, JSON.stringify(data, null, 2));
}

function readStorageJson(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn(`Lỗi đọc Storage JSON (${path.basename(filePath)}):`, err.message);
  }
  return defaultValue;
}

const DEFAULT_SUB_ADMIN_PERMISSIONS = {
  generalSettings: true,    // Cấu hình Thử thách & Giải chạy (Tab 1)
  manageRoles: false,       // Quản lý Phân quyền Admin (Tab 2)
  activityLogs: true,       // Xem & Quản lý Nhật ký (Tab 3)
  dataManagement: false,    // Quản trị Dữ liệu Nâng cao (Tab 4)
  penaltiesTargets: true,   // Chỉnh sửa Mục tiêu & Tiền phạt (Tab 5)
  syncStrava: true,         // Chạy Đồng bộ Strava tự động (Sidebar)
  importActivities: true    // Tải lên Tệp dữ liệu Hoạt động (Sidebar)
};

function loadAdminsData() {
  try {
    if (fs.existsSync(ADMINS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        return {
          adminIds: data,
          defaultPermissions: { ...DEFAULT_SUB_ADMIN_PERMISSIONS },
          customPermissions: {}
        };
      }
      if (data && typeof data === 'object') {
        const adminIds = Array.isArray(data.adminIds) ? data.adminIds : (Array.isArray(data.admins) ? data.admins : []);
        return {
          adminIds,
          defaultPermissions: data.defaultPermissions ? { ...DEFAULT_SUB_ADMIN_PERMISSIONS, ...data.defaultPermissions } : { ...DEFAULT_SUB_ADMIN_PERMISSIONS },
          customPermissions: data.customPermissions || {}
        };
      }
    }
  } catch (err) {
    console.error('Lỗi nạp admins data:', err.message);
  }
  return { adminIds: [], defaultPermissions: { ...DEFAULT_SUB_ADMIN_PERMISSIONS }, customPermissions: {} };
}

function saveAdminsData(fullData) {
  writeStorageJson(ADMINS_FILE, fullData);
}

function loadAdminsList() {
  return loadAdminsData().adminIds;
}

function saveAdminsList(adminIds) {
  const data = loadAdminsData();
  data.adminIds = adminIds;
  saveAdminsData(data);
}

function loadAuditLogs() {
  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8'));
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error('Lỗi nạp audit logs:', err.message);
  }
  return [];
}

function addAuditLog(action, user = 'System', details = '') {
  try {
    const logs = loadAuditLogs();
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action,
      user,
      details
    };
    logs.unshift(newEntry);
    const trimmed = logs.slice(0, 200);
    writeStorageJson(AUDIT_LOGS_FILE, trimmed);
  } catch (err) {
    console.error('Lỗi ghi audit log:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Quản lý token xác thực Strava (lưu trữ cố định trong Storage/tokens.json)
const tokenStore = new Map();

function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
      Object.keys(data).forEach(id => tokenStore.set(id, data[id]));
    }
  } catch (err) {
    console.error('Lỗi nạp tokens:', err.message);
  }
}

function saveTokens() {
  try {
    const dir = path.dirname(TOKENS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = {};
    for (const [k, v] of tokenStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('Lỗi lưu tokens:', err.message);
  }
}

// Nạp token khi khởi động server
loadTokens();

const strava = new StravaAPI(
  process.env.STRAVA_CLIENT_ID,
  process.env.STRAVA_CLIENT_SECRET
);

// ==========================================
// CSV PARSING & STORAGE AUTO-SYNC HELPERS
// ==========================================
const normalize = (n) => (n || '').trim().toLowerCase().replace(/[\.\s]/g, '');

function parseCSVLine(text) {
  let row = [''], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') { row[row.length-1] += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else {
      row[row.length-1] += c;
    }
  }
  return row.map(s => s.trim().replace(/^["']|["']$/g, ''));
}

function parseStorageCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(h => h.replace(/["']/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
    rows.push(obj);
  }
  
  const activities = [];
  rows.forEach(row => {
    // Bỏ qua các hoạt động ẩn
    const isPrivate = String(row.private || row.Private || 'false').toLowerCase() === 'true';
    const hideFromHome = String(row.hide_from_home || row.Hide_from_home || 'false').toLowerCase() === 'true';
    const visibility = row.visibility || row.Visibility;
    if (isPrivate || hideFromHome || (visibility && String(visibility).toLowerCase() !== 'everyone')) {
      return;
    }

    const rawDistStr = String(row.Distance || 0).toLowerCase();
    const isMiles = rawDistStr.includes('mi') || rawDistStr.includes('mile') || rawDistStr.includes('dặm');
    let distNum = parseFloat(rawDistStr.replace(',', '.').replace(/[^\d.-]/g, ''));
    if (!isNaN(distNum) && isMiles) {
      distNum = distNum * 1.609344;
    }
    let dist = isNaN(distNum) ? 0 : Math.round(distNum * 1000);
    
    let movingTimeStr = row['Duration'] || row['Moving Time'] || row['Time'] || '00:00:00';
    let timeParts = movingTimeStr.split(':').map(Number);
    let movingTimeSec = 0;
    if (timeParts.length === 3) movingTimeSec = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
    else if (timeParts.length === 2) movingTimeSec = timeParts[0] * 60 + timeParts[1];

    let athleteId = null;
    let athleteName = row.Name || row.Athlete || '';
    if (row.Athlete && String(row.Athlete).includes('/athletes/')) {
      athleteId = parseInt(String(row.Athlete).replace('/athletes/', ''), 10);
      athleteName = row.Name || '';
    }

    let activityId = null;
    if (row.Activity) {
      const match = String(row.Activity).match(/\d+/);
      if (match) activityId = match[0];
    } else if (row['Activity ID'] || row.id || row.Id) {
      activityId = String(row['Activity ID'] || row.id || row.Id);
    }

    let nameParts = athleteName.trim().split(' ');
    let lastname = nameParts.length > 1 ? nameParts.pop() : '';
    let firstname = nameParts.join(' ');

    let dateStr = row.Date || '';
    let localIsoStr = null;
    if (dateStr.includes('T')) {
      localIsoStr = dateStr.substring(0, 19) + 'Z';
    } else if (dateStr) {
      if (dateStr.includes('/')) {
        let dParts = dateStr.split(' ')[0].split('/');
        let tPart = dateStr.split(' ')[1] || '00:00:00';
        if (dParts.length === 3) {
          if (dParts[0].length === 4) {
            dateStr = `${dParts[0]}-${String(dParts[1]).padStart(2, '0')}-${String(dParts[2]).padStart(2, '0')}T${tPart}Z`;
          } else {
            dateStr = `${dParts[2]}-${String(dParts[1]).padStart(2, '0')}-${String(dParts[0]).padStart(2, '0')}T${tPart}Z`;
          }
          localIsoStr = dateStr;
        }
      } else if (dateStr.includes('-')) {
        let parts = dateStr.split(' ');
        let dPart = parts[0];
        let tPart = parts[1] || '00:00:00';
        localIsoStr = `${dPart}T${tPart}Z`;
      }
    }

    if (dist > 0 && localIsoStr) {
      activities.push({
        id: activityId,
        type: row.Type || row['Activity Type'] || 'Run',
        distance: dist,
        moving_time: movingTimeSec,
        start_date_local: localIsoStr,
        athlete: {
          id: athleteId,
          firstname: firstname,
          lastname: lastname
        }
      });
    }
  });
  return activities;
}

function getCompKey(act) {
  const d = (act.start_date_local || '').substring(0, 16);
  const t = act.moving_time || 0;
  const dist = Math.round(act.distance || 0);
  const athId = act.athlete?.id || '';
  const name = `${normalize(act.athlete?.firstname)}_${normalize(act.athlete?.lastname)}`;
  return `comp_${athId || name}_${d}_${t}_${dist}`;
}

function isBetterRecord(a, b) {
  if (!b) return true;
  if (a.start_date_local && !b.start_date_local) return true;
  if (!a.start_date_local && b.start_date_local) return false;
  
  if (a.start_date_local && b.start_date_local) {
    const dateA = new Date(a.start_date_local);
    const dateB = new Date(b.start_date_local);
    // Prefer the later date for the same activity (the one with +7 hours timezone fix)
    if (dateA.getTime() > dateB.getTime()) return true;
    // Don't return false here yet, let it check lastname below if dates are exactly equal
  }
  
  // Giữ lại bản có tên họ đầy đủ hơn
  const aLastname = a.athlete?.lastname || '';
  const bLastname = b.athlete?.lastname || '';
  if (aLastname.length > 2 && bLastname.length <= 2) return true;
  
  return false;
}

function mergeActivitiesList(existingList, newList) {
  const uniqueMap = new Map();

  const addRecord = (act) => {
    if (!act) return;
    const idKey = act.id ? `id_${act.id}` : null;
    const cKey = getCompKey(act);

    if (idKey) {
      const existing = uniqueMap.get(idKey);
      if (!existing || isBetterRecord(act, existing)) {
        uniqueMap.set(idKey, act);
      }
    }
    
    const existingComp = uniqueMap.get(cKey);
    if (!existingComp || isBetterRecord(act, existingComp)) {
      uniqueMap.set(cKey, act);
    }
  };

  (existingList || []).forEach(addRecord);
  (newList || []).forEach(addRecord);

  const finalSet = new Set(uniqueMap.values());
  return Array.from(finalSet).filter(a => !a.start_date_local || a.start_date_local >= '2026-08-01T00:00:00');
}

function syncAllStorageCsv() {
  try {
    const storageDir = path.join(__dirname, '../Storage');
    if (!fs.existsSync(storageDir)) return [];

    let existingActivities = [];
    if (fs.existsSync(IMPORTED_FILE)) {
      try {
        existingActivities = JSON.parse(fs.readFileSync(IMPORTED_FILE, 'utf8'));
        if (!Array.isArray(existingActivities)) existingActivities = [];
      } catch (e) {
        existingActivities = [];
      }
    }

    let csvFiles = fs.readdirSync(storageDir).filter(f => f.startsWith('data-') && f.endsWith('.csv'));
    csvFiles.sort(); // Sắp xếp theo tên (tên chứa thời gian nên sẽ tăng dần)
    
    let isUpdated = false;

    for (const f of csvFiles) {
      try {
        const content = fs.readFileSync(path.join(storageDir, f), 'utf8');
        let fileActivities = parseStorageCSV(content);
        
        if (fileActivities.length > 0) {
          fileActivities = mapAthleteNamesUsingCSV(fileActivities);
          
          existingActivities = mergeActivitiesList(existingActivities, fileActivities);
          isUpdated = true;
        }
      } catch (err) {
        console.error(`Lỗi đọc file CSV ${f}:`, err.message);
      }
    }

    if (isUpdated) {
      fs.writeFileSync(IMPORTED_FILE, JSON.stringify(existingActivities, null, 2), 'utf8');
    }
    return existingActivities;
  } catch (err) {
    console.error('Lỗi syncAllStorageCsv:', err.message);
    return [];
  }
}

// Không tự động đồng bộ CSV khi khởi động server nữa
// syncAllStorageCsv();

// ==========================================
// AUTH ROUTES
// ==========================================

// Helper xác định dynamic redirect_uri cho Strava OAuth (tương thích cả Desktop .exe, Render Cloud, và Vite dev)
function getRedirectUri(req) {
  let origin = (req.query && req.query.origin) || (req.body && req.body.origin);

  if (!origin) {
    const ref = req.get('origin') || req.get('referer');
    if (ref) {
      try {
        origin = new URL(ref).origin;
      } catch (e) {}
    }
  }

  if (!origin) {
    const host = req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    if (host) {
      origin = `${proto}://${host}`;
    }
  }

  if (origin && origin.includes('127.0.0.1')) {
    origin = origin.replace('127.0.0.1', 'localhost');
  }

  const distPath = path.join(__dirname, '../dist');
  const isServingDist = fs.existsSync(distPath);

  if (!origin) {
    if (isServingDist) {
      origin = `http://localhost:${PORT || 3001}`;
    } else {
      origin = process.env.FRONTEND_URL || 'http://localhost:5173';
    }
  }

  // Safety fallback: Khi phục vụ từ bản build dist (Desktop app hoặc Production),
  // luôn luôn dùng localhost:3001, tuyệt đối không trỏ về 5173 (vốn chỉ tồn tại ở Vite dev)
  if (isServingDist && origin && origin.includes('5173')) {
    origin = `http://localhost:${PORT || 3001}`;
  }

  origin = origin.replace(/\/+$/, '');
  return `${origin}/callback`;
}

// Lấy URL đăng nhập Strava
app.get('/api/auth/url', (req, res) => {
  const redirectUri = getRedirectUri(req);
  const scope = 'read,read_all,activity:read,activity:read_all';
  // Mặc định luôn dùng approval_prompt=force để Strava hiển thị màn hình cấp quyền/cho phép bấm "Log in as someone else"
  const prompt = req.query.prompt === 'auto' ? 'auto' : 'force';
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&approval_prompt=${prompt}`;
  res.json({ url: authUrl, redirectUri });
});

// Đổi authorization code lấy access token
app.post('/api/auth/token', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Thiếu authorization code' });
    }

    const redirectUri = getRedirectUri(req);
    const tokenData = await strava.exchangeToken(code, redirectUri);

    // Lưu token với athlete ID làm key
    const athleteId = tokenData.athlete.id;
    tokenStore.set(athleteId.toString(), {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
    });
    saveTokens();

    // Tự động ghi nhận thành viên vào AthleteID_Name.csv và name_mapping.json
    try {
      const ath = tokenData.athlete;
      if (ath && ath.id) {
        const fn = (ath.firstname || '').trim();
        const ln = (ath.lastname || '').trim();
        const fullName = `${fn} ${ln}`.trim();
        if (fullName && !ln.endsWith('.')) {
          registerAthleteToCsvAndMapping({
            athleteId: ath.id,
            fullName: fullName,
            avatarUrl: ath.profile_medium || ath.profile || ''
          });
        }
      }
    } catch (regErr) {
      console.warn('Lỗi tự động đăng ký athlete khi login:', regErr.message);
    }

    // Tự động bắt luôn Cookie từ Chrome App Window (qua port 9222)
    let autoCookie = null;
    try {
      autoCookie = await extractCookiesFromActiveBrowser();
    } catch (_) {}

    res.json({
      athlete: tokenData.athlete,
      athleteId: athleteId,
      expires_at: tokenData.expires_at,
      cookie: autoCookie || getSavedCookie() || '',
    });
  } catch (error) {
    console.error('Lỗi đổi token:', error.message);
    res.status(500).json({ error: 'Không thể xác thực với Strava' });
  }
});

// ==========================================
// ADMIN & ROLES ROUTES
// ==========================================

function removeDiacritics(str) {
  if (!str) return '';
  return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

// Hàm hỗ trợ tra cứu chéo giữa Athlete ID và MatchKey
function getAthleteMatchKeyAndId(identifier) {
  if (!identifier) return { id: null, matchKey: null, name: null };
  const rawStr = identifier.toString().trim();
  const idStr = rawStr.toLowerCase();
  const idStrNoUnder = idStr.replace(/_/g, ' ');
  const idStrSlug = idStr.replace(/\s+/g, '_');
  const idStrClean = removeDiacritics(idStr);
  const idStrCleanNoUnder = removeDiacritics(idStrNoUnder);
  const idStrCleanSlug = removeDiacritics(idStrSlug);

  const athleteNamesFile = path.join(__dirname, '../Storage/AthleteID_Name.csv');
  if (fs.existsSync(athleteNamesFile)) {
    const lines = fs.readFileSync(athleteNamesFile, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const id = parts[0].trim();
        const name = parts.slice(1).join(',').trim();
        if (id && name && name !== 'Name') {
          const nameParts = name.trim().split(/\s+/);
          const fn = nameParts[0] || '';
          const ln = nameParts.slice(1).join(' ') || '';
          const initial = ln ? ln.charAt(0).toUpperCase() + '.' : '';
          const matchKey = initial ? `${fn}_${initial}` : fn;
          const fullSlug = `${fn}_${ln}`.toLowerCase();
          const nameLower = name.toLowerCase();
          const nameClean = removeDiacritics(nameLower);
          const fullSlugClean = removeDiacritics(fullSlug);
          const matchKeyLower = matchKey.toLowerCase();
          const matchKeyClean = removeDiacritics(matchKeyLower);

          const isMatch = (
            id === rawStr ||
            id === idStr ||
            matchKeyLower === idStr ||
            matchKeyLower.replace('.', '') === idStr.replace('.', '') ||
            matchKeyClean === idStrClean ||
            nameLower === idStr ||
            nameLower === idStrNoUnder ||
            fullSlug === idStr ||
            fullSlug === idStrSlug ||
            nameClean === idStrClean ||
            nameClean === idStrCleanNoUnder ||
            fullSlugClean === idStrClean ||
            fullSlugClean === idStrCleanSlug
          );
          
          if (isMatch) {
            return { id, matchKey, name };
          }
        }
      }
    }
  }

  // Dự phòng tra cứu qua file Tong km To 02092026.csv
  const tongKmFile = path.join(__dirname, '../Storage/Tong km To 02092026.csv');
  if (fs.existsSync(tongKmFile)) {
    try {
      const lines = fs.readFileSync(tongKmFile, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const id = parts[0].trim();
          const name = parts[1].trim();
          if (id && name && name !== 'Name' && name !== 'Athlete ID') {
            const nameLower = name.toLowerCase();
            const nameClean = removeDiacritics(nameLower);
            const slug = nameLower.replace(/\s+/g, '_');
            const slugClean = removeDiacritics(slug);

            if (
              id === rawStr ||
              nameLower === idStr ||
              nameLower === idStrNoUnder ||
              slug === idStr ||
              slug === idStrSlug ||
              nameClean === idStrClean ||
              nameClean === idStrCleanNoUnder ||
              slugClean === idStrCleanSlug
            ) {
              const nameParts = name.trim().split(/\s+/);
              const fn = nameParts[0] || '';
              const ln = nameParts.slice(1).join(' ') || '';
              const initial = ln ? ln.charAt(0).toUpperCase() + '.' : '';
              const matchKey = initial ? `${fn}_${initial}` : fn;
              return { id, matchKey, name };
            }
          }
        }
      }
    } catch (e) {}
  }

  return { id: rawStr, matchKey: rawStr, name: null };
}

// Kiểm tra xem một Athlete ID hoặc định danh bất kỳ có nằm trong danh sách Sub-Admin không
function isAthleteInSubAdmins(athleteIdentifier, subAdmins) {
  if (!athleteIdentifier || !Array.isArray(subAdmins) || subAdmins.length === 0) return false;
  const userStr = athleteIdentifier.toString().trim().toLowerCase();
  const userInfo = getAthleteMatchKeyAndId(athleteIdentifier);

  const userCandidates = new Set([
    userStr,
    userStr.replace(/_/g, ' '),
    userStr.replace(/\s+/g, '_'),
    removeDiacritics(userStr),
    removeDiacritics(userStr.replace(/_/g, ' '))
  ]);
  if (userInfo.id) {
    userCandidates.add(userInfo.id.toString().toLowerCase());
  }
  if (userInfo.matchKey) {
    userCandidates.add(userInfo.matchKey.toLowerCase());
    userCandidates.add(userInfo.matchKey.replace('.', '').toLowerCase());
  }
  if (userInfo.name) {
    userCandidates.add(userInfo.name.toLowerCase());
    userCandidates.add(userInfo.name.replace(/\s+/g, '_').toLowerCase());
    userCandidates.add(removeDiacritics(userInfo.name.toLowerCase()));
  }

  return subAdmins.some(admin => {
    if (!admin) return false;
    const adminStr = admin.toString().trim().toLowerCase();
    if (userCandidates.has(adminStr)) return true;
    if (userCandidates.has(adminStr.replace(/_/g, ' '))) return true;
    if (userCandidates.has(adminStr.replace(/\s+/g, '_'))) return true;
    if (userCandidates.has(removeDiacritics(adminStr))) return true;

    const adminInfo = getAthleteMatchKeyAndId(admin);
    if (adminInfo.id && userInfo.id && adminInfo.id.toString() === userInfo.id.toString()) return true;
    if (adminInfo.matchKey && userInfo.matchKey && adminInfo.matchKey.toLowerCase() === userInfo.matchKey.toLowerCase()) return true;
    if (adminInfo.name && userInfo.name && adminInfo.name.toLowerCase() === userInfo.name.toLowerCase()) return true;
    return false;
  });
}

// Lấy danh sách quyền hạn cụ thể của một Sub-Admin
function getPermissionsForAthlete(athleteId) {
  if (!athleteId) return { ...DEFAULT_SUB_ADMIN_PERMISSIONS };
  const rawId = athleteId.toString().trim();
  const info = getAthleteMatchKeyAndId(rawId);
  if (rawId === SUPER_ADMIN_ID || info.id === SUPER_ADMIN_ID) {
    return {
      generalSettings: true,
      manageRoles: true,
      activityLogs: true,
      dataManagement: true,
      penaltiesTargets: true,
      syncStrava: true,
      importActivities: true
    };
  }

  const { defaultPermissions, customPermissions } = loadAdminsData();
  const base = { ...DEFAULT_SUB_ADMIN_PERMISSIONS, ...(defaultPermissions || {}) };

  if (customPermissions && typeof customPermissions === 'object') {
    if (customPermissions[rawId]) return { ...base, ...customPermissions[rawId] };
    if (info.id && customPermissions[info.id]) return { ...base, ...customPermissions[info.id] };
    if (info.matchKey && customPermissions[info.matchKey]) return { ...base, ...customPermissions[info.matchKey] };
    const slug = (info.name || '').replace(/\s+/g, '_');
    if (slug && customPermissions[slug]) return { ...base, ...customPermissions[slug] };
  }
  return base;
}

// Kiểm tra vai trò của người dùng hiện tại
app.get('/api/auth/roles', (req, res) => {
  const rawAthleteId = (req.headers['x-athlete-id'] || req.query.athleteId || '').toString();
  const subAdmins = loadAdminsList();
  const info = getAthleteMatchKeyAndId(rawAthleteId);
  
  const isSuperAdmin = !!rawAthleteId && (rawAthleteId === SUPER_ADMIN_ID || info.id === SUPER_ADMIN_ID);
  const isSubAdmin = !isSuperAdmin && !!rawAthleteId && isAthleteInSubAdmins(rawAthleteId, subAdmins);
  const isAdmin = isSuperAdmin || isSubAdmin;
  
  const permissions = isSuperAdmin ? {
    generalSettings: true,
    manageRoles: true,
    activityLogs: true,
    dataManagement: true,
    penaltiesTargets: true,
    syncStrava: true,
    importActivities: true
  } : (isSubAdmin ? getPermissionsForAthlete(rawAthleteId) : null);

  res.json({
    athleteId: rawAthleteId,
    superAdminId: SUPER_ADMIN_ID,
    isSuperAdmin,
    isSubAdmin,
    isAdmin,
    permissions
  });
});

// Hàm lấy danh sách Sub-Admins đã gộp định danh (gộp ID số và MatchKey thành 1 người)
function getEnrichedAdminsList() {
  const rawList = loadAdminsList();
  const map = new Map();

  rawList.forEach(item => {
    const s = (item || '').toString().trim();
    if (!s) return;
    const info = getAthleteMatchKeyAndId(s);
    const key = (info.id && info.id.match(/^\d+$/)) ? info.id : (info.matchKey || info.name || s);

    if (!map.has(key)) {
      map.set(key, {
        id: (info.id && info.id.match(/^\d+$/)) ? info.id : s,
        athleteId: (info.id && info.id.match(/^\d+$/)) ? info.id : (s.match(/^\d+$/) ? s : ''),
        matchKey: info.matchKey || (!s.match(/^\d+$/) ? s : ''),
        name: info.name || (info.matchKey ? info.matchKey.replace('_', ' ') : s.replace(/_/g, ' ')),
        raw: s
      });
    } else {
      const existing = map.get(key);
      if (!existing.athleteId && info.id && info.id.match(/^\d+$/)) {
        existing.id = info.id;
        existing.athleteId = info.id;
      }
      if (!existing.matchKey && info.matchKey) existing.matchKey = info.matchKey;
      if ((!existing.name || existing.name === existing.matchKey || existing.name === existing.id) && info.name) {
        existing.name = info.name;
      }
    }
  });

  return Array.from(map.values()).map(a => ({
    id: a.athleteId || a.id || a.matchKey || a.raw,
    athleteId: a.athleteId || '',
    matchKey: a.matchKey || '',
    name: a.name || a.matchKey || a.id || a.raw
  }));
}

// Lấy danh sách Sub-Admins (đã gộp chung ID và Tên thành 1 người)
app.get('/api/admins', (req, res) => {
  res.json(getEnrichedAdminsList());
});

// Cấp quyền Sub-Admin mới (chỉ Super Admin)
app.post('/api/admins', (req, res) => {
  const currentAthleteId = (req.headers['x-athlete-id'] || '').toString();
  const info = getAthleteMatchKeyAndId(currentAthleteId);
  const isSuperAdmin = !!currentAthleteId && (currentAthleteId === SUPER_ADMIN_ID || info.id === SUPER_ADMIN_ID || (info.matchKey && info.matchKey.toLowerCase() === 'tien_p.'));
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Chỉ Super Admin mới có quyền cấp quyền Admin' });
  }

  const { adminId, name } = req.body;
  if (!adminId) {
    return res.status(400).json({ error: 'Thiếu ID thành viên' });
  }

  const subAdmins = loadAdminsList();
  const idStr = adminId.toString();
  let targetInfo = getAthleteMatchKeyAndId(idStr);
  if ((!targetInfo.id || !targetInfo.id.match(/^\d+$/)) && name) {
    const nameInfo = getAthleteMatchKeyAndId(name);
    if (nameInfo.id && nameInfo.id.match(/^\d+$/)) targetInfo = nameInfo;
  }

  if (!subAdmins.includes(idStr)) subAdmins.push(idStr);
  if (targetInfo.id && !subAdmins.includes(targetInfo.id)) subAdmins.push(targetInfo.id);
  if (targetInfo.matchKey && !subAdmins.includes(targetInfo.matchKey)) subAdmins.push(targetInfo.matchKey);
  if (name) {
    const slug = name.trim().replace(/\s+/g, '_');
    if (!subAdmins.includes(slug)) subAdmins.push(slug);
  }

  saveAdminsList(subAdmins);
  addAuditLog('Cấp quyền Admin', `Super Admin (${currentAthleteId})`, `Cấp quyền admin cho: ${targetInfo.name || name || idStr} (ID: ${targetInfo.id || idStr}, Key: ${targetInfo.matchKey || idStr})`);

  res.json({ success: true, admins: getEnrichedAdminsList() });
});

// Thu hồi quyền Sub-Admin (chỉ Super Admin)
app.delete('/api/admins/:id', (req, res) => {
  const currentAthleteId = (req.headers['x-athlete-id'] || '').toString();
  const info = getAthleteMatchKeyAndId(currentAthleteId);
  const isSuperAdmin = !!currentAthleteId && (currentAthleteId === SUPER_ADMIN_ID || info.id === SUPER_ADMIN_ID || (info.matchKey && info.matchKey.toLowerCase() === 'tien_p.'));
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Chỉ Super Admin mới có quyền thu hồi quyền Admin' });
  }

  const targetId = req.params.id.toString();
  const targetInfo = getAthleteMatchKeyAndId(targetId);
  const targetLower = targetId.toLowerCase();
  const targetNoUnder = targetLower.replace(/_/g, ' ');
  const targetSlug = targetLower.replace(/\s+/g, '_');

  let subAdmins = loadAdminsList();
  subAdmins = subAdmins.filter(id => {
    const s = id.toString().trim();
    const sLower = s.toLowerCase();
    if (s === targetId || sLower === targetLower) return false;
    if (sLower === targetNoUnder || sLower === targetSlug) return false;
    if (info.id && (s === info.id || sLower === info.id.toLowerCase())) return false;
    if (info.matchKey && (sLower === info.matchKey.toLowerCase() || sLower.replace('.', '') === info.matchKey.toLowerCase().replace('.', ''))) return false;
    if (info.name && (sLower === info.name.toLowerCase() || sLower === info.name.replace(/\s+/g, '_').toLowerCase())) return false;
    
    const itemInfo = getAthleteMatchKeyAndId(s);
    if (itemInfo.id && info.id && itemInfo.id.toString() === info.id.toString()) return false;
    return true;
  });

  // Xóa quyền tùy chỉnh nếu có khi thu hồi quyền admin
  const adminsData = loadAdminsData();
  adminsData.adminIds = subAdmins;
  if (adminsData.customPermissions) {
    delete adminsData.customPermissions[targetId];
    if (info.id) delete adminsData.customPermissions[info.id];
    if (info.matchKey) delete adminsData.customPermissions[info.matchKey];
    if (info.name) delete adminsData.customPermissions[info.name.replace(/\s+/g, '_')];
  }
  saveAdminsData(adminsData);

  addAuditLog('Thu hồi quyền Admin', `Super Admin (${currentAthleteId})`, `Thu hồi quyền admin của: ${info.name || targetId} (ID: ${targetId})`);

  res.json({ success: true, admins: getEnrichedAdminsList() });
});

// Lấy cấu hình phân quyền Sub-Admin
app.get('/api/admin/permissions', (req, res) => {
  const data = loadAdminsData();
  res.json({
    defaultPermissions: data.defaultPermissions || { ...DEFAULT_SUB_ADMIN_PERMISSIONS },
    customPermissions: data.customPermissions || {}
  });
});

// Lưu cấu hình phân quyền Sub-Admin (chỉ Super Admin)
app.post('/api/admin/permissions', (req, res) => {
  const currentAthleteId = (req.headers['x-athlete-id'] || '').toString();
  const info = getAthleteMatchKeyAndId(currentAthleteId);
  const isSuperAdmin = !!currentAthleteId && (currentAthleteId === SUPER_ADMIN_ID || info.id === SUPER_ADMIN_ID || (info.matchKey && info.matchKey.toLowerCase() === 'tien_p.'));
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Chỉ Super Admin mới có quyền cấu hình phân quyền' });
  }

  const { defaultPermissions, customPermissions } = req.body;
  const current = loadAdminsData();
  if (defaultPermissions && typeof defaultPermissions === 'object') {
    current.defaultPermissions = { ...current.defaultPermissions, ...defaultPermissions };
  }
  if (customPermissions && typeof customPermissions === 'object') {
    current.customPermissions = customPermissions;
  }
  saveAdminsData(current);
  addAuditLog('Cập nhật phân quyền Sub-Admin', `Super Admin (${currentAthleteId})`, 'Đã cập nhật bảng giới hạn tính năng cho Sub-Admin');
  res.json({ success: true, message: 'Đã lưu phân quyền Sub-Admin thành công!' });
});

// Lấy nhật ký hoạt động (Audit Logs)
app.get('/api/admin/audit-logs', (req, res) => {
  const logs = loadAuditLogs();
  res.json(logs);
});

// Xóa nhật ký hoạt động
app.delete('/api/admin/audit-logs', (req, res) => {
  const currentAthleteId = (req.headers['x-athlete-id'] || '').toString();
  const subAdmins = loadAdminsList();
  if (currentAthleteId !== SUPER_ADMIN_ID && !isAthleteInSubAdmins(currentAthleteId, subAdmins)) {
    return res.status(403).json({ error: 'Không có quyền thực hiện thao tác này' });
  }
  
  try {
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify([], null, 2), 'utf8');
  } catch (e) {}
  addAuditLog('Dọn dẹp nhật ký', currentAthleteId || 'Admin', 'Đã xóa toàn bộ bản ghi audit log cũ');
  res.json({ success: true, logs: [] });
});

// Lấy thống kê các tệp dữ liệu trong Storage
app.get('/api/admin/storage-stats', (req, res) => {
  const storageDir = path.join(__dirname, '../Storage');
  const fileKeys = [
    { key: 'imported_activities.json', name: 'Hoạt động đã nhập (Imported Activities)', file: IMPORTED_FILE, desc: 'Chứa toàn bộ hoạt động của câu lạc bộ đã đồng bộ' },
    { key: 'targets.json', name: 'Mục tiêu & Phạt (Targets & Penalties)', file: TARGETS_FILE, desc: 'Mục tiêu km và trạng thái phạt theo tháng của VĐV' },
    { key: 'challenge_config.json', name: 'Cấu hình thử thách (Challenge Config)', file: CONFIG_FILE, desc: 'Danh sách người tham gia và cấu hình tháng' },
    { key: 'club_goal.json', name: 'Mục tiêu nhóm & Điểm đến (Club Goal)', file: GOAL_FILE, desc: 'Quãng đường mục tiêu toàn nhóm và hành trình bản đồ' },
    { key: 'name_mapping.json', name: 'Bảng quy đổi tên (Name Mapping)', file: NAME_MAPPING_FILE, desc: 'Từ điển mapping tên rút gọn Strava sang tên đầy đủ' },
    { key: 'admins.json', name: 'Danh sách Admin (Admins List)', file: ADMINS_FILE, desc: 'Danh sách ID các Sub-Admin được phân quyền' },
    { key: 'audit_logs.json', name: 'Nhật ký hoạt động (Audit Logs)', file: AUDIT_LOGS_FILE, desc: 'Lịch sử thao tác hệ thống và đồng bộ' },
    { key: 'AthleteID_Name.csv', name: 'Danh bạ Vận Động Viên (Athlete ID & Name CSV)', file: path.join(storageDir, 'AthleteID_Name.csv'), desc: 'Bảng ánh xạ ID số và Họ tên đầy đủ' },
    { key: 'tokens.json', name: 'Phiên đăng nhập Strava (Tokens)', file: TOKENS_FILE, desc: 'Token OAuth Strava của các người dùng' }
  ];

  // Bổ sung các file CSV autosync mới nhất nếu có trong Storage
  if (fs.existsSync(storageDir)) {
    try {
      const allFiles = fs.readdirSync(storageDir);
      const autosyncCsvs = allFiles
        .filter(f => f.startsWith('data-autosync') && f.endsWith('.csv'))
        .sort()
        .reverse()
        .slice(0, 5); // 5 file đồng bộ gần nhất

      autosyncCsvs.forEach(f => {
        fileKeys.push({
          key: f,
          name: `File CSV Đồng Bộ (${f})`,
          file: path.join(storageDir, f),
          desc: 'File CSV được sinh tự động khi bấm Đồng bộ Strava'
        });
      });
    } catch (e) {
      console.warn('Lỗi đọc thư mục storage:', e.message);
    }
  }

  const stats = fileKeys.map(f => {
    let exists = false;
    let size = 0;
    let count = 0;
    let lastModified = null;

    if (fs.existsSync(f.file)) {
      exists = true;
      const stat = fs.statSync(f.file);
      size = stat.size;
      lastModified = stat.mtime;
      try {
        if (f.file.endsWith('.json')) {
          const content = JSON.parse(fs.readFileSync(f.file, 'utf8'));
          if (Array.isArray(content)) count = content.length;
          else if (typeof content === 'object' && content !== null) {
            if (content.adminIds) count = content.adminIds.length;
            else if (content.participants) count = Object.keys(content.participants).length;
            else count = Object.keys(content).length;
          }
        } else if (f.file.endsWith('.csv')) {
          const lines = fs.readFileSync(f.file, 'utf8').split('\n').filter(l => l.trim().length > 0);
          count = Math.max(0, lines.length - 1); // Trừ dòng header
        }
      } catch (e) {}
    }

    return {
      key: f.key,
      name: f.name,
      desc: f.desc,
      exists,
      size,
      count,
      lastModified
    };
  });

  res.json({ success: true, files: stats });
});

// Tải 1 file cụ thể từ Storage về máy
app.get('/api/storage/download/:filename', (req, res) => {
  try {
    const rawName = req.params.filename;
    const safeName = path.basename(rawName);
    const filePath = path.join(__dirname, '../Storage', safeName);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }
    res.download(filePath, safeName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GIẢI PHÁP 1] Nén toàn bộ Storage thành file ZIP tải về máy
app.get('/api/storage/export-zip', (req, res) => {
  try {
    const storageDir = path.join(__dirname, '../Storage');
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const zipName = `strava-app-storage-${timestamp}.zip`;

    res.attachment(zipName);

    const archive = new ZipArchive({
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      console.error('Lỗi tạo zip:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

    archive.pipe(res);

    if (fs.existsSync(storageDir)) {
      const files = fs.readdirSync(storageDir);
      for (const f of files) {
        if (f.startsWith('.') || f.endsWith('.zip')) continue;
        const fullPath = path.join(storageDir, f);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            archive.file(fullPath, { name: f });
          }
        } catch (e) {}
      }
    }

    archive.finalize();
  } catch (err) {
    console.error('Lỗi export zip:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// [GIẢI PHÁP 2] Kéo dữ liệu mới nhất từ Cloud Render về lưu vào máy local
app.post('/api/storage/pull-from-cloud', async (req, res) => {
  const currentAthleteId = (req.headers['x-athlete-id'] || '').toString();
  try {
    const cloudUrl = (req.body?.cloudUrl || process.env.VITE_RENDER_API_URL || 'https://strava-app-86t5.onrender.com').replace(/\/$/, '');
    const results = [];

    const fetchJson = async (endpoint) => {
      const resp = await fetch(`${cloudUrl}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} từ ${endpoint}`);
      return await resp.json();
    };

    // 1. Tải imported activities
    try {
      const imported = await fetchJson('/api/challenge/imported');
      if (Array.isArray(imported)) {
        fs.writeFileSync(IMPORTED_FILE, JSON.stringify(imported, null, 2), 'utf8');
        results.push(`imported_activities.json (${imported.length} mục)`);
      }
    } catch (e) {
      console.warn('Lỗi kéo imported:', e.message);
    }

    // 2. Tải targets
    try {
      const targets = await fetchJson('/api/challenge/targets');
      if (targets && typeof targets === 'object') {
        fs.writeFileSync(TARGETS_FILE, JSON.stringify(targets, null, 2), 'utf8');
        results.push(`targets.json (${Object.keys(targets).length} mục tiêu/phạt)`);
      }
    } catch (e) {
      console.warn('Lỗi kéo targets:', e.message);
    }

    // 3. Tải challenge config
    try {
      const config = await fetchJson('/api/challenge/config');
      if (config && typeof config === 'object') {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        results.push(`challenge_config.json`);
      }
    } catch (e) {
      console.warn('Lỗi kéo config:', e.message);
    }

    // 4. Tải admins
    try {
      const admins = await fetchJson('/api/admins');
      if (Array.isArray(admins)) {
        const adminKeys = admins.map(a => a.athleteId || a.matchKey || a.id).filter(Boolean);
        fs.writeFileSync(ADMINS_FILE, JSON.stringify(adminKeys, null, 2), 'utf8');
        results.push(`admins.json (${adminKeys.length} sub-admins)`);
      }
    } catch (e) {
      console.warn('Lỗi kéo admins:', e.message);
    }

    addAuditLog('Kéo dữ liệu Cloud', currentAthleteId || 'Super Admin', `Đã kéo từ ${cloudUrl}: ${results.join(', ')}`);

    res.json({
      success: true,
      source: cloudUrl,
      updated: results,
      message: `Đã kéo thành công ${results.length} tệp dữ liệu từ Cloud về máy!`
    });
  } catch (err) {
    console.error('Lỗi pull from cloud:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint nhận gói dữ liệu bundle đồng bộ (chạy trên Cloud hoặc khi nhận push)
app.post('/api/storage/sync-bundle', (req, res) => {
  try {
    const { imported, targets, config, admins, nameMapping, clubGoal } = req.body;
    const updated = [];

    if (Array.isArray(imported)) {
      writeStorageJson(IMPORTED_FILE, imported);
      updated.push(`imported_activities.json (${imported.length} mục)`);
    }

    if (targets && typeof targets === 'object') {
      writeStorageJson(TARGETS_FILE, targets);
      updated.push(`targets.json (${Object.keys(targets).length} mục)`);
    }

    if (config && typeof config === 'object') {
      writeStorageJson(CONFIG_FILE, config);
      updated.push(`challenge_config.json`);
    }

    if (admins) {
      writeStorageJson(ADMINS_FILE, admins);
      const count = Array.isArray(admins) ? admins.length : (Array.isArray(admins.adminIds) ? admins.adminIds.length : (Array.isArray(admins.admins) ? admins.admins.length : 0));
      updated.push(`admins.json (${count} sub-admins)`);
    }

    if (nameMapping && typeof nameMapping === 'object') {
      writeStorageJson(NAME_MAPPING_FILE, nameMapping);
      updated.push(`name_mapping.json`);
    }

    if (clubGoal && typeof clubGoal === 'object') {
      writeStorageJson(GOAL_FILE, clubGoal);
      updated.push(`club_goal.json`);
    }

    addAuditLog('Nhận dữ liệu đồng bộ', 'Hệ thống', `Cập nhật bundle: ${updated.join(', ')}`);

    res.json({ success: true, updated, message: `Đã cập nhật ${updated.length} tệp dữ liệu thành công!` });
  } catch (err) {
    console.error('Lỗi sync-bundle:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// [GIẢI PHÁP 3] Đẩy toàn bộ dữ liệu từ máy Local lên Cloud Render
app.post('/api/storage/push-to-cloud', async (req, res) => {
  const currentAthleteId = (req.headers['x-athlete-id'] || '').toString();
  try {
    const cloudUrl = (req.body?.cloudUrl || process.env.VITE_RENDER_API_URL || 'https://strava-app-86t5.onrender.com').replace(/\/$/, '');

    const bundle = {};
    if (fs.existsSync(IMPORTED_FILE)) {
      try { bundle.imported = JSON.parse(fs.readFileSync(IMPORTED_FILE, 'utf8')); } catch(e){}
    }
    if (fs.existsSync(TARGETS_FILE)) {
      try { bundle.targets = JSON.parse(fs.readFileSync(TARGETS_FILE, 'utf8')); } catch(e){}
    }
    if (fs.existsSync(CONFIG_FILE)) {
      try { bundle.config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch(e){}
    }
    if (fs.existsSync(ADMINS_FILE)) {
      try { bundle.admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8')); } catch(e){}
    }
    if (fs.existsSync(NAME_MAPPING_FILE)) {
      try { bundle.nameMapping = JSON.parse(fs.readFileSync(NAME_MAPPING_FILE, 'utf8')); } catch(e){}
    }
    if (fs.existsSync(GOAL_FILE)) {
      try { bundle.clubGoal = JSON.parse(fs.readFileSync(GOAL_FILE, 'utf8')); } catch(e){}
    }

    const targetEndpoint = `${cloudUrl}/api/storage/sync-bundle`;
    const resp = await fetch(targetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Cloud phản hồi lỗi HTTP ${resp.status}: ${errText}`);
    }

    const cloudRes = await resp.json();
    addAuditLog('Đẩy dữ liệu lên Cloud', currentAthleteId || 'Super Admin', `Đã đẩy dữ liệu lên ${cloudUrl}: ${cloudRes.updated?.join(', ') || 'Thành công'}`);

    res.json({
      success: true,
      target: cloudUrl,
      updated: cloudRes.updated || [],
      message: `Đã đẩy thành công toàn bộ dữ liệu từ máy lên Cloud Render!`
    });
  } catch (err) {
    console.error('Lỗi push to cloud:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// [GIT PUSH] Chạy lệnh git push từ giao diện Quản trị
app.post('/api/admin/git-push', async (req, res) => {
  const currentAthleteId = (req.headers['x-athlete-id'] || '').toString();
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    let projectRoot = path.join(__dirname, '..');
    let gitRoot = projectRoot;
    if (!fs.existsSync(path.join(gitRoot, '.git')) && fs.existsSync(path.join(gitRoot, '../../.git'))) {
      gitRoot = path.resolve(gitRoot, '../..');
    }

    // Đồng bộ Storage từ Desktop App về git root nếu đang chạy trong desktop_release
    const localDesktopStorage = path.join(projectRoot, 'Storage');
    const rootRepoStorage = path.join(gitRoot, 'Storage');
    if (gitRoot !== projectRoot && fs.existsSync(localDesktopStorage) && fs.existsSync(rootRepoStorage)) {
      try {
        const filesToSync = ['admins.json', 'targets.json', 'challenge_config.json', 'imported_activities.json', 'name_mapping.json', 'club_goal.json', 'audit_logs.json'];
        filesToSync.forEach(f => {
          const src = path.join(localDesktopStorage, f);
          const dest = path.join(rootRepoStorage, f);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
          }
        });
      } catch (copyErr) {
        console.warn('Lỗi đồng bộ Storage về git root:', copyErr.message);
      }
    }

    // 1. Tự động kiểm tra và commit các file trong Storage nếu có thay đổi mới
    let commitMessage = '';
    try {
      await execAsync('git add Storage/', { cwd: gitRoot });
      const statusRes = await execAsync('git status --porcelain Storage/', { cwd: gitRoot });
      if (statusRes.stdout && statusRes.stdout.trim()) {
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        await execAsync(`git commit -m "chore: Sync and backup Strava Storage data [${timeStr}]"`, { cwd: gitRoot });
        commitMessage = `Đã tự động commit các tệp thay đổi trong Storage/ (${timeStr})`;
      }
    } catch (cErr) {
      console.log('Thông tin git commit Storage/:', cErr.message);
    }

    // 2. Thực thi lệnh git push
    const pushRes = await execAsync('git push origin main', { cwd: gitRoot });
    const output = ((pushRes.stdout || '') + (pushRes.stderr || '')).trim();

    addAuditLog('Git Push', currentAthleteId || 'Super Admin', `Đã đẩy dữ liệu & mã nguồn lên GitHub (origin/main)`);

    res.json({
      success: true,
      commitMessage,
      output: output || 'Everything up-to-date',
      message: 'Đã thực hiện git push thành công lên GitHub (origin/main)!'
    });
  } catch (err) {
    console.error('Lỗi thực hiện git push:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      output: ((err.stdout || '') + (err.stderr || '')).trim()
    });
  }
});

// Tạo backup ngay tức thì
app.post('/api/admin/backup', (req, res) => {
  const currentAthleteId = (req.headers['x-athlete-id'] || '').toString();
  try {
    const now = new Date();
    const timestamp = now.getFullYear().toString() + 
      (now.getMonth() + 1).toString().padStart(2, '0') + 
      now.getDate().toString().padStart(2, '0') + '_' + 
      now.getHours().toString().padStart(2, '0') + 
      now.getMinutes().toString().padStart(2, '0') + 
      now.getSeconds().toString().padStart(2, '0');
    
    const backupFileName = `strava-app-backup-${timestamp}.zip`;
    const backupFilePath = path.join(__dirname, '..', backupFileName);
    const output = fs.createWriteStream(backupFilePath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.pipe(output);

    const rootDir = path.join(__dirname, '..');
    const storageDir = path.join(rootDir, 'Storage');

    if (fs.existsSync(storageDir)) {
      const storageFiles = fs.readdirSync(storageDir);
      storageFiles.forEach(f => {
        const p = path.join(storageDir, f);
        if (fs.statSync(p).isFile() && !f.endsWith('.zip')) {
          archive.file(p, { name: `Storage/${f}` });
        }
      });
    }

    archive.finalize().then(() => {
      addAuditLog('Tạo bản sao lưu', currentAthleteId || 'Admin', `Đã tạo file backup: ${backupFileName}`);
      res.json({ success: true, filename: backupFileName });
    });
  } catch (err) {
    console.error('Lỗi tạo backup:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// MIDDLEWARE: Lấy token từ header
// ==========================================
async function getToken(req, res, next) {
  const athleteId = req.headers['x-athlete-id'];
  if (!athleteId) {
    return res.status(401).json({ error: 'Thiếu athlete ID' });
  }
  let tokenData = tokenStore.get(athleteId);
  if (!tokenData) {
    loadTokens();
    tokenData = tokenStore.get(athleteId);
  }
  if (!tokenData) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  // Tự động refresh token nếu token hết hạn hoặc sắp hết hạn trong 5 phút
  const nowSec = Math.floor(Date.now() / 1000);
  if (tokenData.expires_at && tokenData.expires_at - nowSec < 300 && tokenData.refresh_token) {
    try {
      console.log(`🔄 Tự động refresh token cho athlete ${athleteId}...`);
      const refreshed = await strava.refreshToken(tokenData.refresh_token);
      tokenData = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || tokenData.refresh_token,
        expires_at: refreshed.expires_at,
      };
      tokenStore.set(athleteId, tokenData);
      saveTokens();
    } catch (err) {
      console.error('Lỗi refresh token:', err.message);
    }
  }

  req.accessToken = tokenData.access_token;
  req.athleteId = athleteId;
  next();
}

// Middleware tuỳ chọn lấy token (nếu không có token vẫn cho tiếp tục, không chặn 401)
async function optionalGetToken(req, res, next) {
  const athleteId = req.headers['x-athlete-id'] || req.query.athleteId;
  if (!athleteId) {
    req.accessToken = null;
    return next();
  }
  let tokenData = tokenStore.get(athleteId);
  if (!tokenData) {
    loadTokens();
    tokenData = tokenStore.get(athleteId);
  }
  if (!tokenData) {
    req.accessToken = null;
    return next();
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (tokenData.expires_at && tokenData.expires_at - nowSec < 300 && tokenData.refresh_token) {
    try {
      const refreshed = await strava.refreshToken(tokenData.refresh_token);
      tokenData = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || tokenData.refresh_token,
        expires_at: refreshed.expires_at,
      };
      tokenStore.set(athleteId, tokenData);
      saveTokens();
    } catch (err) {
      console.error('Lỗi refresh token:', err.message);
    }
  }

  req.accessToken = tokenData.access_token;
  req.athleteId = athleteId;
  next();
}

// ==========================================
// ATHLETE ROUTES
// ==========================================

// Lấy thông tin athlete hiện tại
app.get('/api/athlete', getToken, async (req, res) => {
  try {
    const athlete = await strava.getAthlete(req.accessToken);
    res.json(athlete);
  } catch (error) {
    console.error('Lỗi lấy athlete:', error.message);
    res.status(500).json({ error: 'Không thể lấy thông tin athlete' });
  }
});

// Lấy thống kê của athlete
app.get('/api/athlete/stats', getToken, async (req, res) => {
  try {
    const stats = await strava.getAthleteStats(req.accessToken, req.athleteId);
    res.json(stats);
  } catch (error) {
    console.error('Lỗi lấy stats:', error.message);
    res.status(500).json({ error: 'Không thể lấy thống kê' });
  }
});

// ==========================================
// ACTIVITY ROUTES
// ==========================================

// Lấy danh sách activities
app.get('/api/activities', getToken, async (req, res) => {
  try {
    const { page = 1, per_page = 30, after, before } = req.query;
    const activities = await strava.getActivities(req.accessToken, {
      page: parseInt(page),
      per_page: parseInt(per_page),
      after: after ? parseInt(after) : undefined,
      before: before ? parseInt(before) : undefined,
    });
    res.json(activities);
  } catch (error) {
    console.error('Lỗi lấy activities:', error.message);
    res.status(500).json({ error: 'Không thể lấy danh sách hoạt động' });
  }
});

// Lấy chi tiết một activity
app.get('/api/activities/:id', getToken, async (req, res) => {
  try {
    const activity = await strava.getActivity(req.accessToken, req.params.id);
    res.json(activity);
  } catch (error) {
    console.error('Lỗi lấy activity:', error.message);
    res.status(500).json({ error: 'Không thể lấy chi tiết hoạt động' });
  }
});

// ==========================================
// CLUB ROUTES
// ==========================================

// Lấy danh sách clubs mà athlete tham gia
app.get('/api/clubs', getToken, async (req, res) => {
  try {
    const clubs = await strava.getAthleteClubs(req.accessToken);
    res.json(clubs);
  } catch (error) {
    console.error('Lỗi lấy clubs:', error.message);
    res.status(500).json({ error: 'Không thể lấy danh sách câu lạc bộ' });
  }
});

// Lấy thông tin chi tiết club
app.get('/api/clubs/:id', getToken, async (req, res) => {
  try {
    const club = await strava.getClub(req.accessToken, req.params.id);
    res.json(club);
  } catch (error) {
    console.error('Lỗi lấy club:', error.message);
    res.status(500).json({ error: 'Không thể lấy thông tin câu lạc bộ' });
  }
});

// ==========================================
// AUTO-SYNC ATHLETE HELPERS (CSV & MAPPING)
// ==========================================

// Hàm tra cứu Public Profile của Strava (không cần token OAuth, lấy Full Name và Avatar gốc)
function fetchStravaPublicProfile(athleteId) {
  return new Promise((resolve) => {
    if (!athleteId) return resolve(null);
    const cleanId = athleteId.toString().trim();
    if (!/^\d+$/.test(cleanId)) return resolve(null);

    const url = `https://www.strava.com/athletes/${cleanId}`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    }, (res) => {
      let html = '';
      res.on('data', chunk => { html += chunk; });
      res.on('end', () => {
        let fullName = null;
        let avatarUrl = null;

        const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        if (ogTitleMatch) {
          fullName = ogTitleMatch[1].replace(/\s*\|\s*Strava Athlete Profile.*$/i, '').trim();
        } else {
          const twitterTitleMatch = html.match(/<meta name="twitter:title" content="([^"]+)"/i);
          if (twitterTitleMatch) {
            fullName = twitterTitleMatch[1].replace(/\s*\|\s*Strava Athlete Profile.*$/i, '').trim();
          }
        }

        const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        if (ogImageMatch) {
          avatarUrl = ogImageMatch[1].trim();
        }

        if (fullName && fullName !== 'Strava' && !fullName.includes('Log In') && !fullName.endsWith('.')) {
          resolve({ athleteId: cleanId, fullName, avatarUrl });
        } else {
          resolve(null);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => {
      resolve(null);
    });
  });
}

// Hàm dùng chung: Tự động ghi nhận Athlete vào AthleteID_Name.csv, name_mapping.json và challenge_config.json
function registerAthleteToCsvAndMapping({ athleteId, fullName, avatarUrl }) {
  if (!athleteId || !fullName) return false;
  const cleanId = athleteId.toString().trim();
  const cleanName = fullName.trim();
  if (!cleanId || !cleanName || cleanName === 'Name' || cleanName.endsWith('.')) return false;

  let csvUpdated = false;
  const athleteNamesFile = path.join(__dirname, '../Storage/AthleteID_Name.csv');
  try {
    let existingCsv = '';
    if (fs.existsSync(athleteNamesFile)) {
      existingCsv = fs.readFileSync(athleteNamesFile, 'utf8');
    }
    const existingIds = new Set(
      existingCsv.split(/\r?\n/).map(l => l.split(',')[0].trim()).filter(Boolean)
    );

    if (!existingIds.has(cleanId)) {
      const newLine = existingCsv.endsWith('\n') ? `${cleanId},${cleanName}\n` : `\n${cleanId},${cleanName}\n`;
      fs.appendFileSync(athleteNamesFile, newLine, 'utf8');
      csvUpdated = true;
      console.log(`📝 [Auto-Sync] Added to AthleteID_Name.csv: ${cleanId} -> ${cleanName}`);
    }
  } catch (err) {
    console.warn('Lỗi ghi AthleteID_Name.csv:', err.message);
  }

  const nameParts = cleanName.split(' ');
  const fn = nameParts[0];
  const ln = nameParts.slice(1).join(' ');
  const initial = ln ? ln.charAt(0).toUpperCase() + '.' : '';
  const matchKey = `${fn}_${initial}`;
  const abbrevName = `${fn} ${initial}`.trim();

  // Cập nhật name_mapping.json
  try {
    let nameMappingJson = {};
    if (fs.existsSync(NAME_MAPPING_FILE)) {
      nameMappingJson = JSON.parse(fs.readFileSync(NAME_MAPPING_FILE, 'utf8'));
    }

    let mappingChanged = false;
    if (!nameMappingJson[cleanName] || nameMappingJson[cleanName].fullName !== cleanName) {
      nameMappingJson[cleanName] = { key: matchKey, fullName: cleanName, athleteId: cleanId };
      mappingChanged = true;
    }
    if (matchKey && (!nameMappingJson[matchKey] || nameMappingJson[matchKey].fullName !== cleanName)) {
      nameMappingJson[matchKey] = { abbreviatedName: abbrevName, fullName: cleanName, athleteId: cleanId };
      mappingChanged = true;
    }
    if (abbrevName && (!nameMappingJson[abbrevName] || nameMappingJson[abbrevName].fullName !== cleanName)) {
      nameMappingJson[abbrevName] = { key: matchKey, fullName: cleanName, athleteId: cleanId };
      mappingChanged = true;
    }

    if (mappingChanged) {
      fs.writeFileSync(NAME_MAPPING_FILE, JSON.stringify(nameMappingJson, null, 2), 'utf8');
    }
  } catch (mErr) {
    console.warn('Lỗi cập nhật name_mapping.json:', mErr.message);
  }

  // Cập nhật challenge_config.json nếu participant đang có tên viết tắt hoặc thiếu avatar
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      let configChanged = false;

      const updateParticipantObj = (p) => {
        if (!p) return;
        if ((!p.lastname || p.lastname.endsWith('.') || !p.name || p.name.endsWith('.')) && ln) {
          p.firstname = fn;
          p.lastname = ln;
          p.name = cleanName;
          configChanged = true;
        }
        if (!p.athleteId) {
          p.athleteId = cleanId;
          p.id = cleanId;
          configChanged = true;
        }
        const isBadAvatar = !p.profile_medium || p.profile_medium.includes('avatar/athlete') || p.profile_medium.includes('logo-strava');
        if (avatarUrl && isBadAvatar) {
          p.profile_medium = avatarUrl;
          p.profile = avatarUrl;
          configChanged = true;
        }
      };

      if (config.participants) {
        if (config.participants[matchKey]) {
          updateParticipantObj(config.participants[matchKey]);
        }
        Object.values(config.participants).forEach(p => {
          if (p.athleteId === cleanId || p.id === cleanId) {
            updateParticipantObj(p);
          }
        });
      }

      if (config.monthlyParticipants) {
        Object.values(config.monthlyParticipants).forEach(monthMap => {
          if (monthMap[matchKey]) {
            updateParticipantObj(monthMap[matchKey]);
          }
          Object.values(monthMap).forEach(p => {
            if (p.athleteId === cleanId || p.id === cleanId) {
              updateParticipantObj(p);
            }
          });
        });
      }

      if (configChanged) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
      }
    }
  } catch (cErr) {
    console.warn('Lỗi cập nhật challenge_config.json:', cErr.message);
  }

  return csvUpdated;
}

// Hàm hỗ trợ lấy Full Name từ Storage/AthleteID_Name.csv
function getFullNameMapping() {
  const athleteNamesFile = path.join(__dirname, '../Storage/AthleteID_Name.csv');
  const mapping = {};
  if (fs.existsSync(athleteNamesFile)) {
    const lines = fs.readFileSync(athleteNamesFile, 'utf8').split('\n');
    lines.forEach(line => {
      const parts = line.trim().split(',');
      if (parts.length >= 2) {
        const id = parts[0].trim();
        const fullName = parts.slice(1).join(',').trim();
        if (fullName && fullName !== 'Name') {
          const nameParts = fullName.split(' ');
          const fn = nameParts[0];
          const ln = nameParts.slice(1).join(' ');
          
          if (ln) {
            const initial = ln.charAt(0).toUpperCase() + '.';
            const matchKey = `${fn}_${initial}`.toLowerCase();
            mapping[matchKey] = { firstname: fn, lastname: ln };
          } else {
            mapping[fn.toLowerCase()] = { firstname: fn, lastname: '' };
          }
        }
      }
    });
  }
  return mapping;
}

// Hàm khử trùng lặp thành viên câu lạc bộ triệt để theo ID, Họ Tên, và MatchKey
function deduplicateMembers(list) {
  const deduplicated = [];
  const seenIds = new Set();
  const seenNames = new Set();
  const seenKeys = new Set();

  for (const member of list) {
    if (!member) continue;
    const id = (member.id || member.athleteId || '').toString().trim();
    const fn = (member.firstname || '').trim();
    const ln = (member.lastname || '').trim();
    const fullName = (member.name || (fn ? (fn + ' ' + ln).trim() : '')).trim().toLowerCase();
    const rawKey = (member.matchKey || '').replace(/\s+_/g, '_').replace(/_\s+/g, '_').trim();
    const normKey = rawKey.replace(/\.$/, '').toLowerCase();

    let prev = null;
    if (id && seenIds.has(id)) {
      prev = deduplicated.find(m => (m.id || m.athleteId || '').toString().trim() === id);
    } else if (fullName && seenNames.has(fullName)) {
      prev = deduplicated.find(m => {
        const mfn = (m.firstname || '').trim();
        const mln = (m.lastname || '').trim();
        const f = (m.name || (mfn ? (mfn + ' ' + mln).trim() : '')).trim().toLowerCase();
        return f === fullName;
      });
    } else if (normKey && seenKeys.has(normKey)) {
      prev = deduplicated.find(m => {
        const k = (m.matchKey || '').replace(/\s+_/g, '_').replace(/_\s+/g, '_').replace(/\.$/, '').trim().toLowerCase();
        return k === normKey;
      });
    }

    if (prev) {
      if (!prev.profile_medium && member.profile_medium) prev.profile_medium = member.profile_medium;
      if (!prev.profile && member.profile) prev.profile = member.profile;
      if ((!prev.id || prev.id === null) && (member.id || member.athleteId)) {
        prev.id = member.id || member.athleteId;
        prev.athleteId = prev.id;
      }
      if ((!prev.name || prev.name === prev.matchKey) && member.name) prev.name = member.name;
      if (!prev.firstname && member.firstname) prev.firstname = member.firstname;
      if (!prev.lastname && member.lastname) prev.lastname = member.lastname;
      continue;
    }

    if (id) seenIds.add(id);
    if (fullName) seenNames.add(fullName);
    if (normKey) seenKeys.add(normKey);
    deduplicated.push({ ...member });
  }

  return deduplicated.sort((a, b) => {
    const na = (a.name || (a.firstname ? a.firstname + ' ' + (a.lastname || '') : '')).trim();
    const nb = (b.name || (b.firstname ? b.firstname + ' ' + (b.lastname || '') : '')).trim();
    return na.localeCompare(nb, 'vi');
  });
}

// Hàm tập hợp toàn bộ 46+ thành viên của câu lạc bộ từ các nguồn đầy đủ nhất
function getAllClubMembersRoster() {
  const map = new Map();

  // 1. Nạp từ monthlyParticipants của challenge_config.json
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (cfg.monthlyParticipants) {
        const sortedMonths = Object.keys(cfg.monthlyParticipants).sort((a, b) => {
          return Object.keys(cfg.monthlyParticipants[b] || {}).length - Object.keys(cfg.monthlyParticipants[a] || {}).length;
        });
        sortedMonths.forEach(m => {
          const parts = cfg.monthlyParticipants[m];
          if (parts && typeof parts === 'object') {
            Object.entries(parts).forEach(([rawK, data]) => {
              const k = rawK.replace(/\s+_/g, '_').replace(/_\s+/g, '_').trim();
              if (!map.has(k)) {
                map.set(k, {
                  matchKey: k,
                  id: data.athleteId || data.id || null,
                  athleteId: data.athleteId || data.id || null,
                  firstname: (data.firstname || k.split('_')[0] || '').trim(),
                  lastname: (data.lastname || '').trim(),
                  name: data.name || (data.firstname ? `${data.firstname} ${data.lastname || ''}`.trim() : k),
                  profile_medium: data.profile_medium || data.profile || data.avatar || '',
                  profile: data.profile || data.profile_medium || '',
                  membership: data.membership || 'member',
                  admin: data.admin || false,
                  owner: data.owner || false,
                  resource_state: 2,
                  _fromConfig: true
                });
              }
            });
          }
        });
      }
      if (cfg.participants) {
        Object.entries(cfg.participants).forEach(([rawK, data]) => {
          const k = rawK.replace(/\s+_/g, '_').replace(/_\s+/g, '_').trim();
          if (!map.has(k)) {
            map.set(k, {
              matchKey: k,
              id: data.athleteId || data.id || null,
              athleteId: data.athleteId || data.id || null,
              firstname: (data.firstname || k.split('_')[0] || '').trim(),
              lastname: (data.lastname || '').trim(),
              name: data.name || (data.firstname ? `${data.firstname} ${data.lastname || ''}`.trim() : k),
              profile_medium: data.profile_medium || data.profile || data.avatar || '',
              profile: data.profile || data.profile_medium || '',
              membership: data.membership || 'member',
              admin: data.admin || false,
              owner: data.owner || false,
              resource_state: 2,
              _fromConfig: true
            });
          } else {
            const ex = map.get(k);
            if (!ex.id && (data.athleteId || data.id)) { ex.id = data.athleteId || data.id; ex.athleteId = ex.id; }
            if (!ex.profile_medium && data.profile_medium) ex.profile_medium = data.profile_medium;
            if (!ex.profile && data.profile) ex.profile = data.profile;
          }
        });
      }
    } catch(e){}
  }

  // 2. Nạp từ Storage/AthleteID_Name.csv
  const athleteNamesFile = path.join(__dirname, '../Storage/AthleteID_Name.csv');
  if (fs.existsSync(athleteNamesFile)) {
    try {
      const lines = fs.readFileSync(athleteNamesFile, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const id = parts[0].trim();
          const name = parts.slice(1).join(',').trim();
          if (id && name && name !== 'Name' && name !== 'Athlete ID') {
            const nameParts = name.trim().split(/\s+/);
            const fn = nameParts[0] || '';
            const ln = nameParts.slice(1).join(' ') || '';
            const initial = ln ? ln.charAt(0).toUpperCase() + '.' : '';
            const matchKey = initial ? `${fn}_${initial}` : fn;
            const matchKeyNoDot = `${fn}_${ln}`;

            // Tìm xem đã có trong map chưa bằng matchKey, matchKeyNoDot, hoặc bằng id, hoặc bằng fullName
            let existingKey = null;
            if (map.has(matchKey)) existingKey = matchKey;
            else if (map.has(matchKeyNoDot)) existingKey = matchKeyNoDot;
            else {
              for (const [k, v] of map.entries()) {
                if ((v.id && String(v.id) === String(id)) || 
                    (v.athleteId && String(v.athleteId) === String(id)) ||
                    (v.name && v.name.toLowerCase() === name.toLowerCase()) ||
                    (`${v.firstname} ${v.lastname}`.trim().toLowerCase() === name.toLowerCase())) {
                  existingKey = k;
                  break;
                }
              }
            }

            if (existingKey) {
              const ex = map.get(existingKey);
              if (!ex.id) ex.id = id;
              if (!ex.athleteId) ex.athleteId = id;
              if (!ex.name || ex.name === ex.matchKey) ex.name = name;
            } else {
              map.set(matchKey, {
                matchKey,
                id,
                athleteId: id,
                firstname: fn,
                lastname: ln,
                name,
                profile_medium: '',
                profile: '',
                membership: 'member',
                admin: false,
                owner: false,
                resource_state: 2,
                _fromConfig: true
              });
            }
          }
        }
      }
    } catch(e){}
  }

  // 3. Nạp avatar từ Storage/avatars.json
  const avatarsFile = path.join(__dirname, '../Storage/avatars.json');
  if (fs.existsSync(avatarsFile)) {
    try {
      const avatars = JSON.parse(fs.readFileSync(avatarsFile, 'utf8'));
      map.forEach((val, key) => {
        if (!val.profile_medium && avatars[key]) {
          val.profile_medium = avatars[key];
          val.profile = avatars[key];
        }
      });
    } catch(e){}
  }

  return deduplicateMembers(Array.from(map.values()));
}

// Lấy thành viên của club (luôn trả về full danh sách thành viên kể cả khi không có token Strava)
app.get('/api/clubs/:id/members', optionalGetToken, async (req, res) => {
  try {
    const { page = 1, per_page = 200 } = req.query;
    let members = [];
    let fromStrava = false;

    if (req.accessToken) {
      try {
        members = await strava.getClubMembers(req.accessToken, req.params.id, {
          page: parseInt(page),
          per_page: parseInt(per_page),
        });
        if (Array.isArray(members) && members.length > 0) {
          fromStrava = true;
        }
      } catch (stravaErr) {
        console.warn('Strava API lỗi, dùng fallback từ danh sách câu lạc bộ:', stravaErr.message);
      }
    }

    const fullRoster = getAllClubMembersRoster();

    if (!fromStrava || !Array.isArray(members) || members.length === 0) {
      members = fullRoster;
    } else {
      // Làm giàu dữ liệu và gộp full roster vào kết quả Strava
      const memberMap = new Map();
      fullRoster.forEach(r => {
        const key = (r.matchKey || '').toLowerCase();
        if (key) memberMap.set(key, { ...r });
      });

      members.forEach(member => {
        const fn = member.firstname || '';
        const ln = member.lastname || '';
        const initial = ln ? ln.charAt(0).toUpperCase() + '.' : '';
        const matchKey = `${fn}_${initial}`;
        const key = matchKey.toLowerCase();
        
        if (memberMap.has(key)) {
          const rosterItem = memberMap.get(key);
          memberMap.set(key, {
            ...rosterItem,
            ...member,
            id: member.id || rosterItem.id,
            athleteId: member.id || rosterItem.id,
            name: rosterItem.name || member.name,
            profile_medium: member.profile_medium && !member.profile_medium.includes('avatar/athlete') && !member.profile_medium.includes('logo-strava') ? member.profile_medium : rosterItem.profile_medium,
            profile: member.profile && !member.profile.includes('avatar/athlete') && !member.profile.includes('logo-strava') ? member.profile : rosterItem.profile
          });
        } else {
          memberMap.set(key, { ...member, matchKey });
        }
      });
      members = Array.from(memberMap.values());
    }

    res.json(deduplicateMembers(members));
  } catch (error) {
    console.error('Lỗi lấy members:', error.message);
    // Last resort fallback
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        const members = Object.entries(cfg.participants || {}).map(([key, data]) => ({
          id: data.athleteId || null,
          firstname: data.firstname || '',
          lastname: data.lastname || '',
          profile_medium: data.profile_medium || '',
          profile: data.profile || '',
          membership: data.membership || 'member',
          admin: data.admin || false,
          owner: data.owner || false,
        }));
        return res.json(members);
      }
    } catch (e2) { /* ignore */ }
    res.status(500).json({ error: 'Không thể lấy danh sách thành viên' });
  }
});

// Đồng bộ thông tin thành viên (Cập nhật Tên và Avatar)
app.post('/api/admin/sync-members', getToken, async (req, res) => {
  try {
    const configPath = CONFIG_FILE;
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Config not found' });
    }
    
    let configStr = fs.readFileSync(configPath, 'utf8');
    let config = JSON.parse(configStr);
    
    if (!config.clubId) {
      return res.status(400).json({ error: 'Chưa cấu hình Club ID' });
    }

    let members = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const pageMembers = await strava.getClubMembers(req.accessToken, config.clubId, {
        page: page,
        per_page: 200,
      });
      
      if (Array.isArray(pageMembers) && pageMembers.length > 0) {
        members = members.concat(pageMembers);
        if (pageMembers.length < 200) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    if (members.length === 0) {
      return res.status(500).json({ error: 'Không lấy được danh sách thành viên Strava' });
    }

    const mapping = getFullNameMapping(); // keys are lowercase e.g. "abba_v."
    
    // Load existing name_mapping.json to update athlete IDs for the scraper
    let nameMappingJson = {};
    try {
      if (fs.existsSync(NAME_MAPPING_FILE)) {
        nameMappingJson = JSON.parse(fs.readFileSync(NAME_MAPPING_FILE, 'utf8'));
      }
    } catch (e) { console.error('Error loading name_mapping.json:', e); }

    let mappingUpdated = false;
    const stravaMembersMap = {}; // keyed by matchKey e.g. "Abba_V."
    
    members.forEach(m => {
      let firstname = m.firstname || '';
      let lastname = m.lastname || '';
      
      const initial = lastname ? lastname.charAt(0).toUpperCase() + '.' : '';
      const matchKey = `${firstname}_${initial}`;
      const matchKeyLower = matchKey.toLowerCase();
      
      // FIX: Strava club members API returns athlete id as m.id (not m.athlete.id)
      const athleteId = m.id ? m.id.toString() : null;
      
      // Update name_mapping.json for the fetch_avatars script
      if (athleteId) {
        if (!nameMappingJson[matchKey]) {
          nameMappingJson[matchKey] = {
            abbreviatedName: `${firstname} ${initial}`,
            fullName: `${firstname} ${lastname}`,
            athleteId: athleteId
          };
          mappingUpdated = true;
        } else if (nameMappingJson[matchKey].athleteId !== athleteId) {
          nameMappingJson[matchKey].athleteId = athleteId;
          mappingUpdated = true;
        }
      }
      
      // FIX: getFullNameMapping() returns lowercase keys - use matchKeyLower to lookup
      const fullNameEntry = mapping[matchKeyLower];
      if (fullNameEntry) {
        firstname = fullNameEntry.firstname || firstname;
        lastname = fullNameEntry.lastname || lastname;
      }
      
      stravaMembersMap[matchKey] = {
        resource_state: m.resource_state || 2,
        name: `${firstname} ${lastname}`.trim(),
        firstname: firstname,
        lastname: lastname,
        membership: m.membership || 'member',
        admin: m.admin || false,
        owner: m.owner || false,
        profile_medium: m.profile_medium || m.profile || '',
        profile: m.profile || m.profile_medium || '',
        athleteId: athleteId
      };
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Fetch club activities để lấy athlete ID + profile đầy đủ
    // Club activities API trả về athlete.id và profile_medium cho mỗi người
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Đang fetch club activities để lấy athlete IDs...');
    const activitiesAthleteMap = {}; // matchKey -> { id, profile_medium, profile, firstname, lastname }
    const athleteIdToMatchKey = {}; // athleteId -> matchKey (để reverse lookup)

    try {
      let actPage = 1;
      const MAX_ACTIVITY_PAGES = 10; // Fetch tối đa 10 trang (2000 activities)
      let keepFetching = true;

      while (keepFetching && actPage <= MAX_ACTIVITY_PAGES) {
        const activities = await strava.getClubActivities(req.accessToken, config.clubId, {
          page: actPage,
          per_page: 200,
        });

        if (!Array.isArray(activities) || activities.length === 0) break;

        activities.forEach(act => {
          const ath = act.athlete;
          if (!ath || !ath.id) return;

          const fn = ath.firstname || '';
          const ln = ath.lastname || '';
          const initial = ln ? ln.charAt(0).toUpperCase() + '.' : '';
          const matchKey = `${fn}_${initial}`;
          const athId = ath.id.toString();

          // Lưu mapping athleteId <-> matchKey
          athleteIdToMatchKey[athId] = matchKey;

          // Chỉ lưu nếu chưa có hoặc profile mới có URL đầy đủ hơn
          const existing = activitiesAthleteMap[matchKey];
          const hasGoodProfile = ath.profile_medium && 
            !ath.profile_medium.includes('avatar/athlete') && 
            !ath.profile_medium.includes('logo-strava');

          if (!existing || (hasGoodProfile && !existing.hasGoodProfile)) {
            activitiesAthleteMap[matchKey] = {
              athleteId: athId,
              profile_medium: ath.profile_medium || '',
              profile: ath.profile || ath.profile_medium || '',
              firstname: fn,
              lastname: ln,
              hasGoodProfile: hasGoodProfile
            };
          }
        });

        if (activities.length < 200) keepFetching = false;
        else actPage++;
      }

      console.log(`Đã quét ${actPage} trang activities, tìm thấy ${Object.keys(activitiesAthleteMap).length} athletes.`);

      // Merge dữ liệu từ activities vào stravaMembersMap
      Object.entries(activitiesAthleteMap).forEach(([matchKey, actData]) => {
        if (stravaMembersMap[matchKey]) {
          // Cập nhật athleteId nếu chưa có
          if (!stravaMembersMap[matchKey].athleteId) {
            stravaMembersMap[matchKey].athleteId = actData.athleteId;
          }
          // Cập nhật profile nếu activity có URL tốt hơn
          if (actData.hasGoodProfile && !stravaMembersMap[matchKey].profile_medium) {
            stravaMembersMap[matchKey].profile_medium = actData.profile_medium;
            stravaMembersMap[matchKey].profile = actData.profile;
          }
        } else {
          // Member xuất hiện trong activities nhưng chưa có trong members list
          // (ví dụ: đã rời group nhưng có activity cũ, bỏ qua)
        }

        // Cập nhật name_mapping.json với athleteId từ activities
        const athId = actData.athleteId;
        if (athId) {
          if (!nameMappingJson[matchKey]) {
            nameMappingJson[matchKey] = {
              abbreviatedName: `${actData.firstname} ${actData.firstname ? actData.lastname.charAt(0) + '.' : ''}`.trim(),
              fullName: `${actData.firstname} ${actData.lastname}`.trim(),
              athleteId: athId
            };
            mappingUpdated = true;
          } else if (!nameMappingJson[matchKey].athleteId) {
            nameMappingJson[matchKey].athleteId = athId;
            mappingUpdated = true;
          }
        }
      });

      // Cập nhật athleteId vào stravaMembersMap cho các member còn thiếu
      Object.entries(stravaMembersMap).forEach(([matchKey, data]) => {
        if (!data.athleteId && activitiesAthleteMap[matchKey]) {
          stravaMembersMap[matchKey].athleteId = activitiesAthleteMap[matchKey].athleteId;
          mappingUpdated = true;
        }
      });

    } catch (actErr) {
      console.warn('Không thể fetch club activities (vẫn tiếp tục):', actErr.message);
    }

    if (mappingUpdated) {
      fs.writeFileSync(NAME_MAPPING_FILE, JSON.stringify(nameMappingJson, null, 2), 'utf8');
    }

    // Cập nhật AthleteID_Name.csv với member mới (tự động tra cứu public profile nếu tên bị viết tắt)
    const athleteIdCsvPath = path.join(__dirname, '../Storage/AthleteID_Name.csv');
    try {
      let existingCsv = '';
      if (fs.existsSync(athleteIdCsvPath)) {
        existingCsv = fs.readFileSync(athleteIdCsvPath, 'utf8');
      }
      const existingIds = new Set(
        existingCsv.split(/\r?\n/).map(l => l.split(',')[0].trim()).filter(Boolean)
      );

      for (const data of Object.values(stravaMembersMap)) {
        // Nếu thiếu athleteId nhưng avatar có chứa ID dạng /athletes/{id}/, tự trích xuất
        if (!data.athleteId && data.profile_medium && data.profile_medium.includes('/athletes/')) {
          const idMatch = data.profile_medium.match(/\/athletes\/(\d+)\//);
          if (idMatch) {
            data.athleteId = idMatch[1];
          }
        }

        const athId = data.athleteId;
        const isAbbrev = !data.lastname || data.lastname.endsWith('.') || !data.name || data.name.endsWith('.');
        const isMissingFromCsv = athId && !existingIds.has(athId);

        if (athId && (isAbbrev || isMissingFromCsv)) {
          try {
            const profile = await fetchStravaPublicProfile(athId);
            if (profile && profile.fullName) {
              const nameParts = profile.fullName.trim().split(' ');
              const fn = nameParts[0];
              const ln = nameParts.slice(1).join(' ');
              data.firstname = fn;
              data.lastname = ln;
              data.name = profile.fullName;
              if (profile.avatarUrl && (!data.profile_medium || data.profile_medium.includes('avatar/athlete') || data.profile_medium.includes('logo-strava'))) {
                data.profile_medium = profile.avatarUrl;
                data.profile = profile.avatarUrl;
              }
              registerAthleteToCsvAndMapping({
                athleteId: athId,
                fullName: profile.fullName,
                avatarUrl: profile.avatarUrl
              });
              existingIds.add(athId);
            } else if (!isAbbrev && isMissingFromCsv) {
              const fullName = data.name || `${data.firstname} ${data.lastname}`.trim();
              registerAthleteToCsvAndMapping({
                athleteId: athId,
                fullName: fullName,
                avatarUrl: data.profile_medium || ''
              });
              existingIds.add(athId);
            }
          } catch (pErr) {
            console.warn(`Lỗi tra cứu public profile cho athlete ${athId}:`, pErr.message);
          }
        } else if (athId && !isAbbrev && isMissingFromCsv) {
          const fullName = data.name || `${data.firstname} ${data.lastname}`.trim();
          registerAthleteToCsvAndMapping({
            athleteId: athId,
            fullName: fullName,
            avatarUrl: data.profile_medium || ''
          });
          existingIds.add(athId);
        }
      }
    } catch (csvErr) {
      console.warn('Không thể cập nhật AthleteID_Name.csv:', csvErr.message);
    }

    // Determine current month key for auto-adding new members
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}_${now.getMonth() + 1}`;

    let updatedCount = 0;
    let newMemberCount = 0;
    const trackedIds = new Set();

    // Update existing participants AND add new members
    if (!config.participants) config.participants = {};
    
    Object.entries(stravaMembersMap).forEach(([matchKey, memberData]) => {
      if (config.participants[matchKey]) {
        // Update existing participant
        config.participants[matchKey].name = memberData.name;
        config.participants[matchKey].firstname = memberData.firstname;
        config.participants[matchKey].lastname = memberData.lastname;
        config.participants[matchKey].profile_medium = memberData.profile_medium;
        config.participants[matchKey].profile = memberData.profile;
        config.participants[matchKey].admin = memberData.admin;
        config.participants[matchKey].owner = memberData.owner;
        if (memberData.athleteId) config.participants[matchKey].athleteId = memberData.athleteId;
        trackedIds.add(matchKey);
      } else {
        // NEW MEMBER: Add to participants
        config.participants[matchKey] = {
          resource_state: memberData.resource_state,
          firstname: memberData.firstname,
          lastname: memberData.lastname,
          membership: memberData.membership,
          admin: memberData.admin,
          owner: memberData.owner,
          profile_medium: memberData.profile_medium,
          profile: memberData.profile,
          name: memberData.name,
          avatar: '',
          athleteId: memberData.athleteId || ''
        };
        trackedIds.add(matchKey);
        newMemberCount++;
        console.log(`✨ New member added: ${matchKey} (${memberData.name})`);
      }
    });

    // Update monthlyParticipants for all existing months
    if (config.monthlyParticipants) {
      Object.keys(config.monthlyParticipants).forEach(month => {
        Object.keys(config.monthlyParticipants[month]).forEach(id => {
          if (stravaMembersMap[id]) {
            config.monthlyParticipants[month][id].name = stravaMembersMap[id].name;
            config.monthlyParticipants[month][id].firstname = stravaMembersMap[id].firstname;
            config.monthlyParticipants[month][id].lastname = stravaMembersMap[id].lastname;
            config.monthlyParticipants[month][id].profile_medium = stravaMembersMap[id].profile_medium;
            config.monthlyParticipants[month][id].profile = stravaMembersMap[id].profile;
            trackedIds.add(id);
          }
        });
      });
    }

    // Auto-add new members to current month's monthlyParticipants
    if (newMemberCount > 0) {
      if (!config.monthlyParticipants) config.monthlyParticipants = {};
      if (!config.monthlyParticipants[currentMonthKey]) {
        config.monthlyParticipants[currentMonthKey] = {};
      }
      Object.entries(stravaMembersMap).forEach(([matchKey, memberData]) => {
        if (!config.monthlyParticipants[currentMonthKey][matchKey]) {
          config.monthlyParticipants[currentMonthKey][matchKey] = {
            resource_state: memberData.resource_state,
            firstname: memberData.firstname,
            lastname: memberData.lastname,
            membership: memberData.membership,
            admin: memberData.admin,
            owner: memberData.owner,
            profile_medium: memberData.profile_medium,
            profile: memberData.profile,
            name: memberData.name,
            avatar: ''
          };
        }
      });
    }
    
    updatedCount = trackedIds.size;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    // Tích hợp chạy 2 lệnh lấy avatar nâng cao
    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);
      
      console.log('Đang chạy fetch_avatars.cjs...');
      await execPromise('node server/fetch_avatars.cjs', { env: process.env, cwd: path.join(__dirname, '..') });
      
      console.log('Đang chạy update_config_avatars.cjs...');
      await execPromise('node server/update_config_avatars.cjs', { env: process.env, cwd: path.join(__dirname, '..') });
      console.log('Đã cập nhật avatar nâng cao thành công!');
    } catch (scriptErr) {
      console.error('Lỗi khi chạy script cập nhật avatar:', scriptErr.message);
      // Không ném lỗi ra ngoài để luồng chính vẫn thành công
    }
    
    const currentAthleteId = (req.headers['x-athlete-id'] || '').toString();
    addAuditLog('Đồng bộ Thành viên', currentAthleteId || 'Admin', 
      `Đã cập nhật Tên/Avatar cho ${updatedCount} thành viên (${newMemberCount} thành viên mới)`);

    res.json({ success: true, updatedCount, newMemberCount });
  } catch (err) {
    console.error('Lỗi đồng bộ thành viên:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Lấy activities gần đây của club
app.get('/api/clubs/:id/activities', getToken, async (req, res) => {
  try {
    const { page = 1, per_page = 30 } = req.query;
    const activities = await strava.getClubActivities(req.accessToken, req.params.id, {
      page: parseInt(page),
      per_page: parseInt(per_page),
    });
    res.json(activities);
  } catch (error) {
    console.error('Lỗi lấy club activities:', error.message);
    res.status(500).json({ error: 'Không thể lấy hoạt động câu lạc bộ' });
  }
});

// ==========================================
// TARGET & PENALTY ROUTES
// ==========================================

// Đọc dữ liệu target/penalty
app.get('/api/challenge/targets', (req, res) => {
  try {
    if (fs.existsSync(TARGETS_FILE)) {
      const data = fs.readFileSync(TARGETS_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json({});
    }
  } catch (error) {
    console.error('Lỗi đọc targets:', error.message);
    res.status(500).json({ error: 'Không thể đọc dữ liệu' });
  }
});

// Cập nhật dữ liệu target/penalty
app.post('/api/challenge/targets', (req, res) => {
  try {
    const payload = req.body;
    let data = {};
    if (fs.existsSync(TARGETS_FILE)) {
      try {
        data = JSON.parse(fs.readFileSync(TARGETS_FILE, 'utf8'));
      } catch (e) {
        data = {};
      }
    }
    
    if (Array.isArray(payload)) {
      payload.forEach(item => {
        if (item && item.matchKey) {
          if (!data[item.matchKey]) data[item.matchKey] = {};
          if (item.target !== undefined) data[item.matchKey].target = item.target;
          if (item.penalty !== undefined) data[item.matchKey].penalty = item.penalty;
        }
      });
    } else if (payload && payload.matchKey) {
      const { matchKey, target, penalty } = payload;
      if (!data[matchKey]) {
        data[matchKey] = {};
      }
      if (target !== undefined) data[matchKey].target = target;
      if (penalty !== undefined) data[matchKey].penalty = penalty;
    } else if (payload && typeof payload === 'object') {
      // Direct object map { [matchKey]: { target, penalty } }
      Object.keys(payload).forEach(key => {
        if (payload[key] && typeof payload[key] === 'object') {
          if (!data[key]) data[key] = {};
          if (payload[key].target !== undefined) data[key].target = payload[key].target;
          if (payload[key].penalty !== undefined) data[key].penalty = payload[key].penalty;
        }
      });
    } else {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }

    writeStorageJson(TARGETS_FILE, data);
    res.json(data);
  } catch (error) {
    console.error('Lỗi lưu targets:', error.message);
    res.status(500).json({ error: 'Không thể lưu dữ liệu targets' });
  }
});

// ==========================================
// CONFIG & IMPORTED ROUTES
// ==========================================

// Lấy file mapping tên
app.get('/api/challenge/name-mapping', (req, res) => {
  try {
    if (fs.existsSync(NAME_MAPPING_FILE)) {
      const data = fs.readFileSync(NAME_MAPPING_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json({});
    }
  } catch (error) {
    console.error('Error reading name mapping:', error);
    res.json({});
  }
});

// Đọc cấu hình (participants, clubId)
app.get('/api/challenge/config', (req, res) => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      
      // Gắn Full Name tự động cho config để UI luôn hiển thị đúng
      const mapping = getFullNameMapping();
      
      if (config.participants) {
        Object.keys(config.participants).forEach(key => {
          const mappingEntry = mapping[key.toLowerCase()];
          if (mappingEntry) {
            config.participants[key].firstname = mappingEntry.firstname;
            config.participants[key].lastname = mappingEntry.lastname;
            config.participants[key].name = `${mappingEntry.firstname} ${mappingEntry.lastname}`.trim();
          }
        });
      }
      
      if (config.monthlyParticipants) {
        Object.keys(config.monthlyParticipants).forEach(month => {
          const monthData = config.monthlyParticipants[month];
          Object.keys(monthData).forEach(key => {
            const mappingEntry = mapping[key.toLowerCase()];
            if (mappingEntry) {
              monthData[key].firstname = mappingEntry.firstname;
              monthData[key].lastname = mappingEntry.lastname;
              monthData[key].name = `${mappingEntry.firstname} ${mappingEntry.lastname}`.trim();
            }
          });
        });
      }
      
      res.json(config);
    } else {
      res.json({ participants: {}, clubId: '' });
    }
  } catch (error) {
    console.error('Lỗi đọc config:', error.message);
    res.status(500).json({ error: 'Không thể đọc cấu hình' });
  }
});

// Lưu cấu hình
app.post('/api/challenge/config', (req, res) => {
  try {
    const rawAthleteId = (req.headers['x-athlete-id'] || req.query.athleteId || '').toString();
    const subAdmins = loadAdminsList();
    const info = getAthleteMatchKeyAndId(rawAthleteId);
    const isSuperAdmin = !!rawAthleteId && (rawAthleteId === SUPER_ADMIN_ID || info.id === SUPER_ADMIN_ID || (info.matchKey && info.matchKey.toLowerCase() === 'tien_p.'));
    const isSubAdmin = !isSuperAdmin && !!rawAthleteId && isAthleteInSubAdmins(rawAthleteId, subAdmins);
    const isAdmin = isSuperAdmin || isSubAdmin;
    const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';

    if (!isAdmin && !(isLocalhost && !rawAthleteId)) {
      return res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền lưu cấu hình thử thách.' });
    }

    let existingConfig = { participants: {}, monthlyParticipants: {}, clubId: '' };
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        existingConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } catch (e) {}
    }

    const payload = req.body;
    const merged = {
      ...existingConfig,
      ...payload,
      monthlyParticipants: {
        ...(existingConfig.monthlyParticipants || {}),
        ...(payload.monthlyParticipants || {})
      }
    };

    if (payload.monthKey && payload.participants) {
      merged.monthlyParticipants[payload.monthKey] = payload.participants;
    }

    writeStorageJson(CONFIG_FILE, merged);
    if (rawAthleteId) {
      addAuditLog('Cập nhật Cấu hình thử thách', (info.name || rawAthleteId || 'Admin'), `Lưu cấu hình thử thách (${merged.title || 'Mặc định'})`);
    }
    res.json({ success: true, ...merged });
  } catch (error) {
    console.error('Lỗi lưu config:', error.message);
    res.status(500).json({ error: 'Không thể lưu cấu hình: ' + error.message });
  }
});

// Đọc mục tiêu câu lạc bộ (Club Goal)
app.get('/api/challenge/goal', (req, res) => {
  try {
    if (fs.existsSync(GOAL_FILE)) {
      const data = fs.readFileSync(GOAL_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json({ targetKm: 9000, customTitle: null, customSubtitle: null });
    }
  } catch (error) {
    console.error('Lỗi đọc goal:', error.message);
    res.status(500).json({ error: 'Không thể đọc mục tiêu câu lạc bộ' });
  }
});

// Lưu mục tiêu câu lạc bộ (Club Goal) - Chỉ Admin mới có quyền lưu
app.post('/api/challenge/goal', (req, res) => {
  try {
    const rawAthleteId = (req.headers['x-athlete-id'] || req.query.athleteId || '').toString();
    const subAdmins = loadAdminsList();
    const info = getAthleteMatchKeyAndId(rawAthleteId);
    const isSuperAdmin = !!rawAthleteId && (rawAthleteId === SUPER_ADMIN_ID || info.id === SUPER_ADMIN_ID || (info.matchKey && info.matchKey.toLowerCase() === 'tien_p.'));
    const isSubAdmin = !isSuperAdmin && !!rawAthleteId && isAthleteInSubAdmins(rawAthleteId, subAdmins);
    const isAdmin = isSuperAdmin || isSubAdmin;
    const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';

    if (!isAdmin && !(isLocalhost && !rawAthleteId)) {
      return res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa mục tiêu câu lạc bộ.' });
    }

    const existing = readStorageJson(GOAL_FILE, {});
    const data = {
      ...existing,
      ...req.body,
      events: (req.body && req.body.events !== undefined) ? req.body.events : (existing.events || [])
    };
    writeStorageJson(GOAL_FILE, data);
    addAuditLog('Cập nhật Mục tiêu nhóm & Giải chạy', (info.name || rawAthleteId || 'Admin'), `Đã cập nhật cấu hình Club Goal (${data.year || 2026})`);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Lỗi lưu goal:', error.message);
    res.status(500).json({ error: 'Không thể lưu mục tiêu câu lạc bộ: ' + error.message });
  }
});

// Proxy endpoint để tải hình ảnh logo tránh lỗi CORS / cross-origin-resource-policy (CORP) từ website ngoài
app.get('/api/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      return res.status(400).send('Invalid url');
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image');
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Lỗi proxy-image:', err.message);
    res.status(500).send('Proxy error');
  }
});

// Đọc historical activities (Tháng 7/2026 trở về trước)
app.get('/api/challenge/historical', (req, res) => {
  try {
    if (fs.existsSync(HISTORICAL_FILE)) {
      const data = fs.readFileSync(HISTORICAL_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Lỗi đọc historical:', error.message);
    res.status(500).json({ error: 'Không thể đọc dữ liệu historical' });
  }
});

// Lưu historical activities
app.post('/api/challenge/historical', (req, res) => {
  try {
    const data = req.body;
    const dir = path.dirname(HISTORICAL_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HISTORICAL_FILE, JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Lỗi lưu historical:', error.message);
    res.status(500).json({ error: 'Không thể lưu dữ liệu historical' });
  }
});

// Đọc imported activities (Tháng 8/2026 trở đi)
app.get('/api/challenge/imported', (req, res) => {
  try {
    if (fs.existsSync(IMPORTED_FILE)) {
      const data = fs.readFileSync(IMPORTED_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Lỗi đọc imported:', error.message);
    res.status(500).json({ error: 'Không thể đọc dữ liệu imported' });
  }
});

// Endpoint kích hoạt quét & đồng bộ toàn bộ file CSV trong Storage
app.post('/api/challenge/sync-storage', (req, res) => {
  try {
    const data = syncAllStorageCsv();
    res.json({ success: true, count: data.length, activities: data });
  } catch (error) {
    console.error('Lỗi sync-storage:', error.message);
    res.status(500).json({ error: 'Không thể đồng bộ file CSV trong Storage' });
  }
});

// Tự động lấy hoạt động của club từ Strava, tạo CSV và đồng bộ
app.post('/api/clubs/:id/auto-sync', getToken, async (req, res) => {
  try {
    const clubId = req.params.id;
    // 1. Get up to 50 activities from Strava
    const stravaActivities = await strava.getClubActivities(req.accessToken, clubId, { page: 1, per_page: 50 });
    
    // 2. Filter for 'Run', 'VirtualRun', 'TrailRun' activities
    const runActivities = stravaActivities.filter(act => {
      const t = (act.sport_type || act.type || '').toLowerCase();
      return ['run', 'virtualrun', 'trailrun', 'trail run'].includes(t) || t.includes('run') || t.includes('trail');
    });
    
    // 3. Format as CSV
    // Header: Name,Activity ID,Date,Title,Distance,Calories,Time,Activity Type
    let csvContent = "Name,Activity ID,Date,Title,Distance,Calories,Time,Activity Type\n";
    runActivities.forEach(act => {
      const name = act.athlete ? `${act.athlete.firstname || ''} ${act.athlete.lastname || ''}`.trim() : 'Unknown Athlete';
      const id = act.id || '';
      const date = act.start_date_local || act.start_date || '';
      const title = `"${(act.name || '').replace(/"/g, '""')}"`;
      const distance = ((act.distance || 0) / 1000).toFixed(2);
      const calories = 0;
      
      const totalSeconds = act.moving_time || 0;
      const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const s = (totalSeconds % 60).toString().padStart(2, '0');
      const time = `${h}:${m}:${s}`;
      
      let type = act.sport_type || act.type || 'Run';
      const lowerType = type.toLowerCase().replace(/[\s_-]/g, '');
      if (lowerType.includes('trail')) type = 'TrailRun';
      else if (lowerType.includes('virtual')) type = 'VirtualRun';
      else if (lowerType.includes('run')) type = 'Run';
      
      csvContent += `${name},${id},${date},${title},${distance},${calories},${time},${type}\n`;
    });
    
    // 4. Save to Storage
    const storageDir = path.join(__dirname, '../Storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const filename = `data-autosync-${timestamp}.csv`;
    const filepath = path.join(storageDir, filename);
    
    fs.writeFileSync(filepath, csvContent, 'utf8');
    
    // 5. Update imported_activities.json directly with smart wipe logic
    let fileActivities = parseStorageCSV(csvContent);
    if (fileActivities.length > 0) {
      fileActivities = mapAthleteNamesUsingCSV(fileActivities);
      
      let existing = [];
      if (fs.existsSync(IMPORTED_FILE)) {
        try {
          existing = JSON.parse(fs.readFileSync(IMPORTED_FILE, 'utf8'));
          if (!Array.isArray(existing)) existing = [];
        } catch (e) { existing = []; }
      }
      
      let minDate = null;
      let maxDate = null;
      fileActivities.forEach(act => {
        if (act.start_date_local) {
          const dateStr = act.start_date_local.substring(0, 10);
          if (!minDate || dateStr < minDate) minDate = dateStr;
          if (!maxDate || dateStr > maxDate) maxDate = dateStr;
        }
      });
      
      if (minDate && maxDate) {
        existing = existing.filter(act => {
          if (!act.start_date_local) return true;
          const dateStr = act.start_date_local.substring(0, 10);
          return dateStr < minDate || dateStr > maxDate;
        });
      }
      
      const mergedData = mergeActivitiesList(existing, fileActivities);
      fs.writeFileSync(IMPORTED_FILE, JSON.stringify(mergedData, null, 2), 'utf8');
      
      res.json({ success: true, count: mergedData.length, activities: mergedData, synced_from_strava: runActivities.length, filename });
    } else {
      res.json({ success: true, count: 0, activities: [], synced_from_strava: 0, filename });
    }
  } catch (error) {
    console.error('Lỗi auto-sync club activities:', error.message);
    res.json({ success: false, error: error.message, stack: error.stack });
  }
});

// Mở Chrome để user đăng nhập Strava, tự động lấy cookie
app.post('/api/strava/login', async (req, res) => {
  try {
    // 1. Kiểm tra nhanh xem cửa sổ Chrome Desktop chính đã có Cookie Strava chưa
    const quickCookie = await extractCookiesFromActiveBrowser();
    if (quickCookie && quickCookie.length > 10) {
      console.log('⚡ [QUICK_COOKIE] Đã tự động bắt được Cookie từ cửa sổ Chrome chính!');
      return res.json({ success: true, cookie: quickCookie, source: 'active_browser' });
    }

    // 2. Nếu chưa có thì mở cửa sổ Chrome riêng biệt để đăng nhập
    const cookie = await loginAndGetCookie();
    res.json({ success: true, cookie });
  } catch (error) {
    console.error('Lỗi login Strava:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Lấy cookie đã lưu
app.get('/api/strava/cookie', async (req, res) => {
  let cookie = getSavedCookie();
  if (!cookie) {
    try {
      cookie = await extractCookiesFromActiveBrowser();
    } catch (_) {}
  }
  res.json({ hasCookie: !!cookie, cookie: cookie || '' });
});

// Lưu cookie từ frontend vào file (dùng khi user nhập tay hoặc sau OAuth login)
app.post('/api/strava/cookie', (req, res) => {
  try {
    const { cookie } = req.body;
    if (!cookie || typeof cookie !== 'string' || cookie.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Cookie không hợp lệ' });
    }
    const cookieValue = cookie.trim();
    const cookieFile = path.join(__dirname, '../Storage/.strava-cookies.json');
    const cookieDir = path.dirname(cookieFile);
    if (!fs.existsSync(cookieDir)) fs.mkdirSync(cookieDir, { recursive: true });

    // Lưu dưới dạng cookie object đơn giản để getAllSavedCookies() có thể inject
    const cookieData = {
      cookies: [
        {
          name: '_strava4_session',
          value: cookieValue,
          domain: '.strava.com',
          path: '/',
          httpOnly: true,
          secure: true
        }
      ],
      savedAt: new Date().toISOString(),
      source: 'manual'
    };
    fs.writeFileSync(cookieFile, JSON.stringify(cookieData, null, 2));
    console.log(`💾 [COOKIE_SAVE] Đã lưu cookie thủ công vào ${cookieFile}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi lưu cookie:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ==========================================
// TỰ ĐỘNG ĐỒNG BỘ LÊN MÁY CHỦ CLOUD (RENDER)
// ==========================================
async function pushActivitiesToCloud(activities, subAdminName = 'Sub-Admin (Desktop App)') {
  if (!Array.isArray(activities) || activities.length === 0) return { success: true, count: 0 };
  
  // Không gửi nếu chính server này đang chạy trên Render (tránh tự gửi cho chính mình)
  if (process.env.RENDER) return { success: true, count: 0, isRender: true };

  const targetUrl = `${RENDER_CLOUD_URL.replace(/\/+$/, '')}/api/challenge/sync-client-activities`;
  console.log(`☁️ [HYBRID CLOUD SYNC] Đang tự động gửi ${activities.length} hoạt động lên Cloud Render (${RENDER_CLOUD_URL})...`);
  
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: SYNC_SECRET_TOKEN,
        subAdminName,
        activities
      }),
      signal: AbortSignal.timeout(30000)
    });
    
    if (res.ok) {
      const result = await res.json();
      console.log(`✅ [HYBRID CLOUD SYNC] Đã đồng bộ lên Render thành công! File: ${result.filename || 'OK'}`);
      return { success: true, result };
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`⚠️ [HYBRID CLOUD SYNC] Render trả về mã lỗi: ${res.status} - ${errText}`);
      return { success: false, error: `HTTP ${res.status}${errText ? `: ${errText}` : ''}` };
    }
  } catch (err) {
    console.warn(`⚠️ [HYBRID CLOUD SYNC] Không thể kết nối tới Render: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// Tự động cạo dữ liệu của club bằng Puppeteer
app.post('/api/clubs/:id/auto-sync-scrape', async (req, res) => {
  try {
    const clubId = req.params.id;
    let cookie = req.body.cookie;
    let limit = req.body.limit || 50;
    
    // Auto-use saved cookie if none provided
    if (!cookie) {
      cookie = getSavedCookie();
    }
    
    if (!cookie) {
      return res.status(400).json({ success: false, error: 'Thiếu Strava Session Cookie. Vui lòng đăng nhập trước.' });
    }

    // 1. Scrape activities using Puppeteer
    const scrapedActivities = await scrapeClubActivities(clubId, cookie, limit);
    
    // 2. Filter for 'Run', 'VirtualRun', 'TrailRun' activities and limit to the requested amount
    const runActivities = scrapedActivities.filter(act => {
      const t = (act.type || '').toLowerCase();
      return ['run', 'virtualrun', 'trailrun', 'trail run'].includes(t) || t.includes('run') || t.includes('trail');
    }).slice(0, limit);
    
    // 3. Format as CSV
    // Header: Name,Activity ID,Date,Title,Distance,Calories,Time,Activity Type
    let csvContent = "Name,Activity ID,Date,Title,Distance,Calories,Time,Activity Type\n";
    runActivities.forEach(act => {
      const name = `"${(act.athleteName || 'Unknown Athlete').replace(/"/g, '""')}"`;
      const id = act.id || '';
      const date = act.date || '';
      const title = `"${(act.title || '').replace(/"/g, '""')}"`;
      
      const distance = `"${act.distance}"`;
      const calories = 0;
      
      // Parse time like "1h 45m" or "45m 30s" to HH:mm:ss
      let rawTime = act.time.toLowerCase();
      let h = 0, m = 0, s = 0;
      const hMatch = rawTime.match(/(\d+)h/);
      const mMatch = rawTime.match(/(\d+)m/);
      const sMatch = rawTime.match(/(\d+)s/);
      if (hMatch) h = parseInt(hMatch[1]);
      if (mMatch) m = parseInt(mMatch[1]);
      if (sMatch) s = parseInt(sMatch[1]);
      const time = `"${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}"`;
      
      let type = act.type || 'Run';
      const lowerType = type.toLowerCase().replace(/[\s_-]/g, '');
      if (lowerType.includes('trail')) type = 'TrailRun';
      else if (lowerType.includes('virtual')) type = 'VirtualRun';
      else if (lowerType.includes('run')) type = 'Run';
      
      csvContent += `${name},${id},${date},${title},${distance},${calories},${time},${type}\n`;
    });
    
    // 4. Save to Storage
    const storageDir = path.join(__dirname, '../Storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const filename = `data-autosync-scrape-${timestamp}.csv`;
    const filepath = path.join(storageDir, filename);
    
    fs.writeFileSync(filepath, csvContent, 'utf8');
    
    // 5. Update imported_activities.json directly with smart wipe logic
    let fileActivities = parseStorageCSV(csvContent);
    if (fileActivities.length > 0) {
      fileActivities = mapAthleteNamesUsingCSV(fileActivities);
      
      let existing = [];
      if (fs.existsSync(IMPORTED_FILE)) {
        try {
          existing = JSON.parse(fs.readFileSync(IMPORTED_FILE, 'utf8'));
          if (!Array.isArray(existing)) existing = [];
        } catch (e) { existing = []; }
      }
      
      const dailyRanges = {};
      fileActivities.forEach(act => {
        if (act.start_date_local) {
          const dateStr = act.start_date_local.substring(0, 10);
          const actTime = new Date(act.start_date_local).getTime();
          if (!dailyRanges[dateStr]) {
            dailyRanges[dateStr] = { min: actTime, max: actTime };
          } else {
            if (actTime < dailyRanges[dateStr].min) dailyRanges[dateStr].min = actTime;
            if (actTime > dailyRanges[dateStr].max) dailyRanges[dateStr].max = actTime;
          }
        }
      });
      
      const intervals = Object.values(dailyRanges).map(range => ({
        min: range.min - 4000,
        max: range.max + 4000
      }));
      
      if (intervals.length > 0) {
        existing = existing.filter(act => {
          if (!act.start_date_local) return true;
          const actTime = new Date(act.start_date_local).getTime();
          const isWithinAnyInterval = intervals.some(interval => actTime >= interval.min && actTime <= interval.max);
          return !isWithinAnyInterval;
        });
      }
      
      const mergedData = mergeActivitiesList(existing, fileActivities);
      fs.writeFileSync(IMPORTED_FILE, JSON.stringify(mergedData, null, 2), 'utf8');
      
      // Tự động đẩy lên Render Cloud nếu đang chạy ở máy local/desktop
      let cloudSyncInfo = null;
      if (!process.env.RENDER) {
        try {
          const subAdminLabel = req.body.subAdminName || 'Admin (Desktop App)';
          cloudSyncInfo = await pushActivitiesToCloud(runActivities, subAdminLabel);
        } catch (e) {
          console.warn('Lỗi push cloud ngầm:', e.message);
          cloudSyncInfo = { success: false, error: e.message };
        }
      }

      res.json({ 
        success: true, 
        count: mergedData.length, 
        activities: mergedData, 
        scraped_count: runActivities.length, 
        filename,
        cloudSynced: cloudSyncInfo ? cloudSyncInfo.success : true,
        cloudError: cloudSyncInfo?.error || null,
        cloudResult: cloudSyncInfo?.result || null
      });
    } else {
      res.json({ success: true, count: 0, activities: [], scraped_count: 0, filename: null, cloudSynced: true });
    }
  } catch (error) {
    console.error('Lỗi auto-sync-scrape:', error.message);
    res.json({ success: false, error: error.message, stack: error.stack });
  }
});

// Endpoint đồng bộ toàn bộ dữ liệu cục bộ lên Render Cloud (Manual Push)
app.post('/api/cloud-sync/push-all', async (req, res) => {
  try {
    const subAdminName = req.body.subAdminName || 'Sub-Admin (Desktop App)';
    let activities = [];
    if (fs.existsSync(IMPORTED_FILE)) {
      try {
        activities = JSON.parse(fs.readFileSync(IMPORTED_FILE, 'utf8'));
      } catch (e) { activities = []; }
    }
    
    if (activities.length === 0) {
      return res.json({ success: true, message: 'Không có hoạt động nào trong bộ nhớ để đồng bộ.', syncedCount: 0 });
    }

    const formatted = activities.map(act => ({
      id: act.id,
      athleteName: act.athlete?.firstname || act.athleteName || act.athlete_name || 'Athlete',
      date: act.start_date_local || act.date || '',
      title: act.name || act.title || '',
      distance: (act.distance ? (act.distance > 100 ? (act.distance / 1000).toFixed(2) : act.distance) : '0').toString(),
      time: act.moving_time ? String(act.moving_time) : (act.time || '0'),
      elevation: (act.total_elevation_gain || 0).toString(),
      type: act.type || 'Run'
    }));

    const result = await pushActivitiesToCloud(formatted, subAdminName);
    res.json({
      success: result.success,
      message: result.success ? `Đã đồng bộ toàn bộ ${formatted.length} hoạt động lên Cloud Render thành công!` : `Lỗi đồng bộ: ${result.error}`,
      count: formatted.length,
      cloudResult: result.result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// TIẾP NHẬN HOẠT ĐỘNG TỪ SUB-ADMIN LOCAL TOOL (GỬI QUA USB)
// ==========================================
app.post('/api/challenge/sync-client-activities', (req, res) => {
  try {
    const { token, athleteId, activities, subAdminName } = req.body || {};
    
    // 1. Kiểm tra xác thực (Sync Token hoặc Athlete ID của Sub-Admin)
    const configuredToken = process.env.SYNC_SECRET_TOKEN || 'STRAVA_SUBADMIN_SYNC_2026';
    const subAdmins = loadAdminsList();
    const isValidToken = token && (token === configuredToken || token === 'STRAVA_SUBADMIN_SYNC_2026');
    const isValidAdmin = athleteId && (athleteId === SUPER_ADMIN_ID || isAthleteInSubAdmins(athleteId, subAdmins));
    
    if (!isValidToken && !isValidAdmin) {
      return res.status(401).json({ 
        success: false, 
        error: 'Mã xác thực (Sync Token) không hợp lệ. Vui lòng kiểm tra lại config.json.' 
      });
    }

    if (!Array.isArray(activities) || activities.length === 0) {
      return res.json({ 
        success: true, 
        count: 0, 
        syncedCount: 0, 
        message: 'Không có hoạt động nào được gửi lên.' 
      });
    }

    // 2. Lọc chỉ lấy các môn chạy bộ (Run, TrailRun, VirtualRun)
    const runActivities = activities.filter(act => {
      const t = (act.type || '').toLowerCase();
      return ['run', 'virtualrun', 'trailrun', 'trail run'].includes(t) || t.includes('run') || t.includes('trail');
    });

    if (runActivities.length === 0) {
      return res.json({ 
        success: true, 
        count: 0, 
        syncedCount: 0, 
        message: 'Không tìm thấy hoạt động chạy bộ nào để đồng bộ.' 
      });
    }

    // 3. Tạo file CSV backup trong Storage
    let csvContent = "Name,Activity ID,Date,Title,Distance,Calories,Time,Activity Type\n";
    runActivities.forEach(act => {
      const name = `"${(act.athleteName || 'Unknown Athlete').replace(/"/g, '""')}"`;
      const id = act.id || '';
      const date = act.date || '';
      const title = `"${(act.title || '').replace(/"/g, '""')}"`;
      const distance = `"${act.distance}"`;
      const calories = act.calories || 0;
      
      let rawTime = (act.time || '').toString().toLowerCase();
      let h = 0, m = 0, s = 0;
      if (rawTime.includes(':')) {
        const parts = rawTime.split(':');
        if (parts.length === 2) { m = parseInt(parts[0]) || 0; s = parseInt(parts[1]) || 0; }
        else if (parts.length >= 3) { h = parseInt(parts[0]) || 0; m = parseInt(parts[1]) || 0; s = parseInt(parts[2]) || 0; }
      } else {
        const hMatch = rawTime.match(/(\d+)h/);
        const mMatch = rawTime.match(/(\d+)m/);
        const sMatch = rawTime.match(/(\d+)s/);
        if (hMatch) h = parseInt(hMatch[1]);
        if (mMatch) m = parseInt(mMatch[1]);
        if (sMatch) s = parseInt(sMatch[1]);
      }
      const time = `"${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}"`;
      
      let type = act.type || 'Run';
      const lowerType = type.toLowerCase().replace(/[\s_-]/g, '');
      if (lowerType.includes('trail')) type = 'TrailRun';
      else if (lowerType.includes('virtual')) type = 'VirtualRun';
      else if (lowerType.includes('run')) type = 'Run';
      
      csvContent += `${name},${id},${date},${title},${distance},${calories},${time},${type}\n`;
    });

    const storageDir = path.join(__dirname, '../Storage');
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const filename = `data-autosync-scrape-${timestamp}.csv`;
    const filepath = path.join(storageDir, filename);
    fs.writeFileSync(filepath, csvContent, 'utf8');

    // 4. Merge vào imported_activities.json theo smart-interval
    let fileActivities = parseStorageCSV(csvContent);
    fileActivities = mapAthleteNamesUsingCSV(fileActivities);

    let existing = [];
    if (fs.existsSync(IMPORTED_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(IMPORTED_FILE, 'utf8'));
        if (!Array.isArray(existing)) existing = [];
      } catch (e) { existing = []; }
    }

    const dailyRanges = {};
    fileActivities.forEach(act => {
      if (act.start_date_local) {
        const dateStr = act.start_date_local.substring(0, 10);
        const actTime = new Date(act.start_date_local).getTime();
        if (!dailyRanges[dateStr]) {
          dailyRanges[dateStr] = { min: actTime, max: actTime };
        } else {
          if (actTime < dailyRanges[dateStr].min) dailyRanges[dateStr].min = actTime;
          if (actTime > dailyRanges[dateStr].max) dailyRanges[dateStr].max = actTime;
        }
      }
    });

    const intervals = Object.values(dailyRanges).map(range => ({
      min: range.min - 4000,
      max: range.max + 4000
    }));

    if (intervals.length > 0) {
      existing = existing.filter(act => {
        if (!act.start_date_local) return true;
        const actTime = new Date(act.start_date_local).getTime();
        return !intervals.some(interval => actTime >= interval.min && actTime <= interval.max);
      });
    }

    const mergedData = mergeActivitiesList(existing, fileActivities);
    fs.writeFileSync(IMPORTED_FILE, JSON.stringify(mergedData, null, 2), 'utf8');

    // 5. Ghi Audit Log
    const adminLabel = subAdminName || athleteId || 'Sub-Admin (USB Tool)';
    addAuditLog(
      'Đồng bộ dữ liệu Strava (USB Tool)',
      adminLabel,
      `Đã đồng bộ thành công ${runActivities.length} hoạt động vào hệ thống.`
    );

    res.json({
      success: true,
      message: `Đã đồng bộ thành công ${runActivities.length} hoạt động lên máy chủ!`,
      count: mergedData.length,
      syncedCount: runActivities.length,
      filename
    });
  } catch (error) {
    console.error('Lỗi sync-client-activities:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Hàm hỗ trợ map tên dựa trên AthleteID_Name.csv
function mapAthleteNamesUsingCSV(activities) {
  const mappingFile = path.join(__dirname, '../Storage/AthleteID_Name.csv');
  const mappingById = {};
  const mappingByName = {};
  
  if (fs.existsSync(mappingFile)) {
      const lines = fs.readFileSync(mappingFile, 'utf8').split('\n');
      lines.forEach(line => {
          const parts = line.trim().split(',');
          if (parts.length >= 2) {
              const id = parts[0].trim();
              const fullName = parts.slice(1).join(',').trim();
              
              if (fullName && fullName !== 'Name') {
                  const nameParts = fullName.split(' ');
                  const fn = nameParts[0];
                  const ln = nameParts.slice(1).join(' ');
                  const mappedName = { firstname: fn, lastname: ln };
                  
                  if (id && id !== 'Athlete ID') {
                      mappingById[id] = mappedName;
                  }
                  
                  if (ln) {
                      const initial = ln.charAt(0).toUpperCase() + '.';
                      const matchKey = `${fn}_${initial}`.toLowerCase();
                      mappingByName[matchKey] = mappedName;
                  }
              }
          }
      });
  }

  return activities.map(act => {
      if (act.athlete) {
          let newName = null;
          // 1. Try mapping by ID
          if (act.athlete.id && mappingById[act.athlete.id]) {
              newName = mappingById[act.athlete.id];
          } 
          // 2. Try mapping by Match Key
          else if (act.athlete.firstname) {
              const fn = act.athlete.firstname;
              const ln = act.athlete.lastname || '';
              const initial = ln ? ln.charAt(0).toUpperCase() + '.' : '';
              const matchKey = `${fn}_${initial}`.toLowerCase();
              if (mappingByName[matchKey]) {
                  newName = mappingByName[matchKey];
              }
          }

          if (newName) {
              return {
                  ...act,
                  athlete: {
                      ...act.athlete,
                      firstname: newName.firstname,
                      lastname: newName.lastname
                  }
              };
          }
      }
      return act;
  });
}

// Lưu imported activities
app.post('/api/challenge/imported', (req, res) => {
  try {
    let data = req.body;
    if (Array.isArray(data)) {
        // Tự động phát hiện và đăng ký Athlete ID mới từ activities được tải lên
        try {
          data.forEach(act => {
            if (act.athlete && act.athlete.id) {
              const athId = act.athlete.id.toString();
              const fn = (act.athlete.firstname || '').trim();
              const ln = (act.athlete.lastname || '').trim();
              const fullName = `${fn} ${ln}`.trim();
              if (fullName && !ln.endsWith('.') && fullName !== 'Unknown Athlete') {
                registerAthleteToCsvAndMapping({
                  athleteId: athId,
                  fullName: fullName
                });
              }
            }
          });
        } catch (e) {
          console.warn('Lỗi auto-register từ imported activities:', e.message);
        }
        data = mapAthleteNamesUsingCSV(data);
    }

    let existing = [];
    if (fs.existsSync(IMPORTED_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(IMPORTED_FILE, 'utf8'));
        if (!Array.isArray(existing)) existing = [];
      } catch (e) {
        existing = [];
      }
    }

    // Nếu có query replaceByDate, tìm khoảng thời gian (min, max) của file tải lên
    // và xóa tất cả các activity cũ nằm trong khoảng thời gian đó.
    if (req.query.replaceByDate === 'true' && Array.isArray(data) && data.length > 0) {
        const dailyRanges = {};

        data.forEach(act => {
            if (act.start_date_local) {
                const dateStr = act.start_date_local.substring(0, 10); // YYYY-MM-DD
                const actTime = new Date(act.start_date_local).getTime();
                if (!dailyRanges[dateStr]) {
                    dailyRanges[dateStr] = { min: actTime, max: actTime };
                } else {
                    if (actTime < dailyRanges[dateStr].min) dailyRanges[dateStr].min = actTime;
                    if (actTime > dailyRanges[dateStr].max) dailyRanges[dateStr].max = actTime;
                }
            }
        });

        const intervals = Object.values(dailyRanges).map(range => ({
            min: range.min - 4000, // nới rộng 4s
            max: range.max + 4000  // nới rộng 4s
        }));

        if (intervals.length > 0) {
            existing = existing.filter(act => {
                if (!act.start_date_local) return true;
                const actTime = new Date(act.start_date_local).getTime();
                // Check if actTime falls into ANY of the intervals
                const isWithinAnyInterval = intervals.some(interval => actTime >= interval.min && actTime <= interval.max);
                // Keep it if it does NOT fall into any interval
                return !isWithinAnyInterval;
            });
        }
    }

    const merged = Array.isArray(data) ? mergeActivitiesList(existing, data) : existing;

    const dir = path.dirname(IMPORTED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(IMPORTED_FILE, JSON.stringify(merged, null, 2), 'utf8');
    res.json(merged);
  } catch (error) {
    console.error('Lỗi lưu imported:', error.message);
    res.status(500).json({ error: 'Không thể lưu dữ liệu imported' });
  }
});

// Endpoint bảo trì/tự động quét và sửa lỗi tên thành viên bị viết tắt
app.post('/api/admin/auto-fix-members', getToken, async (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return res.status(404).json({ error: 'Config not found' });
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const athleteNamesFile = path.join(__dirname, '../Storage/AthleteID_Name.csv');
    let existingCsv = '';
    if (fs.existsSync(athleteNamesFile)) {
      existingCsv = fs.readFileSync(athleteNamesFile, 'utf8');
    }
    const idToName = {};
    const nameToId = {};
    existingCsv.split(/\r?\n/).forEach(l => {
      const p = l.split(',');
      if (p.length >= 2 && p[0].trim() && p[1].trim() && p[1].trim() !== 'Name') {
        const id = p[0].trim();
        const name = p.slice(1).join(',').trim();
        idToName[id] = name;
        nameToId[name.toLowerCase()] = id;
      }
    });

    let fixedCount = 0;
    const fixedDetails = [];

    // Duyệt qua participants trong config
    for (const [key, p] of Object.entries(config.participants || {})) {
      let athId = p.athleteId || p.id;
      
      // Nếu chưa có ID, thử trích xuất từ avatar URL
      if (!athId && p.profile_medium && p.profile_medium.includes('/athletes/')) {
        const m = p.profile_medium.match(/\/athletes\/(\d+)\//);
        if (m) athId = m[1];
      }

      // Nếu vẫn chưa có ID, thử tìm trong AthleteID_Name.csv theo tên
      if (!athId && p.name && nameToId[p.name.toLowerCase()]) {
        athId = nameToId[p.name.toLowerCase()];
      }

      const isAbbrev = !p.lastname || p.lastname.endsWith('.') || !p.name || p.name.endsWith('.');
      
      if (athId) {
        p.athleteId = athId;
        p.id = athId;

        // Nếu tên bị viết tắt, tra cứu public profile để lấy tên đầy đủ & avatar xịn
        if (isAbbrev) {
          try {
            const profile = await fetchStravaPublicProfile(athId);
            if (profile && profile.fullName) {
              const parts = profile.fullName.trim().split(' ');
              p.firstname = parts[0];
              p.lastname = parts.slice(1).join(' ');
              p.name = profile.fullName;
              if (profile.avatarUrl) {
                p.profile_medium = profile.avatarUrl;
                p.profile = profile.avatarUrl;
              }
              registerAthleteToCsvAndMapping({
                athleteId: athId,
                fullName: profile.fullName,
                avatarUrl: profile.avatarUrl
              });
              fixedCount++;
              fixedDetails.push({ key, id: athId, fixedName: profile.fullName });
            }
          } catch (err) {
            console.warn(`Lỗi fix athlete ${athId}:`, err.message);
          }
        } else {
          // Tên đã đầy đủ, đảm bảo đã đăng ký vào CSV
          registerAthleteToCsvAndMapping({
            athleteId: athId,
            fullName: p.name,
            avatarUrl: p.profile_medium || ''
          });
        }
      }
    }

    // Cập nhật lại monthlyParticipants nếu có
    if (config.monthlyParticipants) {
      Object.values(config.monthlyParticipants).forEach(monthMap => {
        Object.entries(monthMap).forEach(([key, p]) => {
          if (config.participants && config.participants[key]) {
            const master = config.participants[key];
            p.firstname = master.firstname;
            p.lastname = master.lastname;
            p.name = master.name;
            p.athleteId = master.athleteId;
            p.id = master.id;
            if (master.profile_medium) {
              p.profile_medium = master.profile_medium;
              p.profile = master.profile;
            }
          }
        });
      });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    res.json({ success: true, fixedCount, fixedDetails });
  } catch (error) {
    console.error('Lỗi auto-fix-members:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// TOTAL-KM BASELINE ROUTES
// ==========================================

// Đọc dữ liệu All-Time km từ file CSV Tong km To 02092026.csv
app.get('/api/challenge/total-km', (req, res) => {
  try {
    let filePath = TOTAL_KM_FILE;
    if (!fs.existsSync(filePath)) {
      const storageDir = path.join(__dirname, '../Storage');
      if (fs.existsSync(storageDir)) {
        // Find 'Tong km*.csv' first
        let files = fs.readdirSync(storageDir).filter(f => f.startsWith('Tong km') && f.endsWith('.csv'));
        if (files.length === 0) {
          // Fallback to 'Total-km*.csv'
          files = fs.readdirSync(storageDir).filter(f => f.startsWith('Total-km') && f.endsWith('.csv'));
        }
        if (files.length > 0) {
          // Sort to pick latest
          files.sort().reverse();
          filePath = path.join(storageDir, files[0]);
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.json({ cutoffDate: '2026-09-02T23:59:59.999Z', items: [] });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    const items = [];

    // Header: Athlete ID,Name,km
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',');
      if (parts.length >= 3) {
        const rawId = (parts[0] || '').trim().replace(/^\uFEFF/, '');
        const name = (parts[1] || '').trim();
        const rawDist = (parts[2] || '').trim();
        const dist = rawDist ? parseFloat(rawDist) : null;

        const athleteId = rawId ? parseInt(rawId, 10) : null;

        if (name || athleteId) {
          items.push({
            name,
            athleteId,
            baseDistance: dist !== null && !isNaN(dist) ? dist : null
          });
        }
      }
    }

    res.json({
      cutoffDate: '2026-09-02T23:59:59.999Z',
      items
    });
  } catch (error) {
    console.error('Lỗi đọc total-km base:', error.message);
    res.status(500).json({ error: 'Không thể đọc dữ liệu Total-km' });
  }
});

// Tải file All-Time chi tiết (All_Time_KM_02092026.csv)
app.get('/api/challenge/all-time-csv', (req, res) => {
  try {
    if (fs.existsSync(ALL_TIME_DETAILED_CSV)) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="All_Time_KM_02092026.csv"');
      fs.createReadStream(ALL_TIME_DETAILED_CSV).pipe(res);
    } else {
      res.status(404).json({ error: 'File All_Time_KM_02092026.csv không tồn tại' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật file Total-km CSV nếu cần
app.post('/api/challenge/total-km', (req, res) => {
  try {
    const { items, csvContent } = req.body;
    const dir = path.dirname(TOTAL_KM_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (csvContent) {
      fs.writeFileSync(TOTAL_KM_FILE, csvContent, 'utf8');
    } else if (Array.isArray(items)) {
      let csv = 'name,Dthletes,Distance\n';
      items.forEach(it => {
        const d = it.baseDistance !== null && it.baseDistance !== undefined ? it.baseDistance.toFixed(2) : '';
        const url = it.athleteUrl || (it.athleteId ? `/athletes/${it.athleteId}` : '');
        csv += `${it.name || ''},${url},${d}\n`;
      });
      fs.writeFileSync(TOTAL_KM_FILE, csv, 'utf8');
    }

    res.json({ success: true, message: 'Đã lưu Total-km' });
  } catch (error) {
    console.error('Lỗi lưu total-km:', error.message);
    res.status(500).json({ error: 'Không thể lưu Total-km' });
  }
});

// ==========================================
// LOGOUT & XÓA PHIÊN
// ==========================================
app.post('/api/auth/logout', async (req, res) => {
  const athleteId = req.headers['x-athlete-id'] || req.body?.athleteId;
  try {
    if (athleteId) {
      const tokenObj = tokenStore.get(athleteId.toString());
      if (tokenObj && tokenObj.access_token) {
        try {
          await strava.deauthorize(tokenObj.access_token);
        } catch (deauthErr) {
          console.warn('Deauthorize Strava error (bỏ qua):', deauthErr.message);
        }
      }
      tokenStore.delete(athleteId.toString());
      saveTokens();
    }

    // Xóa file cookie strava tạm đã lưu
    const cookieFile = path.join(__dirname, '../Storage/.strava-cookies.json');
    if (fs.existsSync(cookieFile)) {
      try { fs.unlinkSync(cookieFile); } catch (_) {}
    }

    // Nếu chạy trên Desktop App (có remote debugging port 9222), xóa sạch cookies trình duyệt Chrome
    try {
      await clearCookiesFromActiveBrowser();
    } catch (_) {}

    res.json({ message: 'Đã đăng xuất và làm mới phiên' });
  } catch (error) {
    console.error('Lỗi khi logout:', error.message);
    res.json({ message: 'Đã đăng xuất' });
  }
});

// ==========================================
// FULL-PAGE SCREENSHOT VIA HEADLESS CHROME
// ==========================================
app.post('/api/screenshot/full-table', async (req, res) => {
  const { month, year, athleteId, lang: currentLang, chartsCollapsed } = req.body || {};
  const frontendUrl = (fs.existsSync(path.join(__dirname, '../dist')) || !process.env.FRONTEND_URL)
    ? `http://localhost:${PORT || 3001}`
    : process.env.FRONTEND_URL;

  const browserPath = getBrowserExecutable();
  if (!browserPath) {
    return res.status(500).json({ error: 'Không tìm thấy Google Chrome hoặc Microsoft Edge trên máy tính.' });
  }

  const tempProfileDir = path.join(os.tmpdir(), `strava_shot_${Date.now()}`);
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        `--user-data-dir=${tempProfileDir}`,
        '--window-size=2000,1200'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 2000, height: 1200, deviceScaleFactor: 2 });

    // Set local storage authentication & language BEFORE page loads
    const targetAthId = (athleteId || '120540594').toString();
    const targetLang = currentLang || 'vi';

    await page.evaluateOnNewDocument((id, lng, isCollapsed) => {
      localStorage.setItem('athleteId', id);
      localStorage.setItem('athlete', JSON.stringify({
        id: parseInt(id, 10) || 120540594,
        firstname: 'Admin',
        lastname: ''
      }));
      localStorage.setItem('lang', lng);
      if (isCollapsed) {
        localStorage.setItem('strava_challenge_charts_collapsed', 'true');
      }
    }, targetAthId, targetLang, Boolean(chartsCollapsed));

    await page.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('.challenge-view, .dashboard, table', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));

    // Hide navbar and expand view for clean full-page screenshot
    await page.evaluate((targetMonth, isCollapsed) => {
      const navbar = document.querySelector('.navbar');
      if (navbar) navbar.style.display = 'none';

      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.style.display = 'none';

      // Ẩn toàn bộ khối biểu đồ nếu người dùng đang chọn Collapse
      if (isCollapsed) {
        const chartCard = document.querySelector('.challenge-analytics-card');
        if (chartCard) chartCard.style.display = 'none';
      }

      // Switch month tab if specified
      if (targetMonth) {
        const monthBtn = document.querySelector(`.month-pill[data-month="${targetMonth}"], .tab[data-month="${targetMonth}"]`);
        if (monthBtn) {
          monthBtn.click();
        } else {
          const monthPills = document.querySelectorAll('.month-pill, .tabs .tab');
          monthPills.forEach(pill => {
            const txt = pill.textContent || '';
            if (pill.getAttribute('data-month') === targetMonth.toString() ||
                txt.includes(`Tháng ${targetMonth}/`) || 
                txt.includes(`/${targetMonth}/`) ||
                txt.startsWith(`${targetMonth}/`)) {
              pill.click();
            }
          });
        }
      }

      const view = document.querySelector('.challenge-view') || document.querySelector('.app-main');
      if (view) {
        view.style.margin = '0 auto';
        view.style.padding = '16px';
        view.style.maxWidth = 'none';
        view.style.width = '1900px';
      }

      const wrapper = document.querySelector('.challenge-table-wrapper');
      if (wrapper) {
        wrapper.style.maxHeight = 'none';
        wrapper.style.overflow = 'visible';
      }

      // Đặt lại position static cho các ô để hàng TOTAL không bị nhảy lên giữa hoặc đầu bảng do sticky bottom
      const stickyElements = document.querySelectorAll('.challenge-table th, .challenge-table td, .totals-row, .totals-row td, .totals-row th, tfoot, thead');
      stickyElements.forEach(el => {
        el.style.setProperty('position', 'static', 'important');
        el.style.setProperty('bottom', 'auto', 'important');
        el.style.setProperty('top', 'auto', 'important');
      });
    }, month, Boolean(chartsCollapsed));

    await new Promise(r => setTimeout(r, 600));

    const targetEl = await page.$('.challenge-view') || await page.$('.app-main');
    let buffer;
    if (targetEl) {
      buffer = await targetEl.screenshot({ type: 'png' });
    } else {
      buffer = await page.screenshot({ fullPage: true, type: 'png' });
    }

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="Strava_Challenge_T${month || 'all'}_${year || '2026'}.png"`);
    res.send(buffer);
  } catch (err) {
    console.error('Lỗi chụp màn hình Chrome headless:', err);
    res.status(500).json({ error: err.message || 'Không thể tạo ảnh chụp màn hình qua Chrome' });
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    try { fs.rmSync(tempProfileDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// ==========================================
// AUTO-UPDATE SYSTEM (1-CLICK DESKTOP APP UPDATE)
// ==========================================

// Helper so sánh 2 version theo chuẩn semver (VD: '1.2.0' vs '1.1.0')
function isNewerVersion(latest, current) {
  if (!latest || !current) return false;
  const parse = v => v.toString().replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const li = l[i] || 0;
    const ci = c[i] || 0;
    if (li > ci) return true;
    if (li < ci) return false;
  }
  return false;
}

// 1. Trả về thông tin version hiện tại của server
app.get('/api/app/version', (req, res) => {
  try {
    const versionPath = path.join(__dirname, '../version.json');
    if (fs.existsSync(versionPath)) {
      const data = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      return res.json(data);
    }
    return res.json({ version: '1.2.0', releaseDate: '2026-09-05' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Cung cấp file gói nén cập nhật (update-bundle.zip)
app.get('/api/app/update-bundle.zip', (req, res) => {
  let bundlePath = path.join(__dirname, '../public/updates/update-bundle.zip');
  if (!fs.existsSync(bundlePath)) {
    const altPath = path.resolve(__dirname, '../../../public/updates/update-bundle.zip');
    if (fs.existsSync(altPath)) bundlePath = altPath;
  }
  if (fs.existsSync(bundlePath)) {
    res.download(bundlePath, 'update-bundle.zip');
  } else {
    res.status(404).json({ error: 'Gói cập nhật chưa sẵn sàng trên máy chủ Cloud.' });
  }
});

// 3. Desktop Client gọi để kiểm tra xem Cloud có version mới hơn không
app.get('/api/app/check-update', async (req, res) => {
  try {
    let currentVersion = '1.0.0';
    const localVersionPath = path.join(__dirname, '../version.json');
    if (fs.existsSync(localVersionPath)) {
      try {
        const localData = JSON.parse(fs.readFileSync(localVersionPath, 'utf8'));
        if (localData.version) currentVersion = localData.version;
      } catch (e) {}
    }

    const remoteUrl = `${RENDER_CLOUD_URL}/api/app/version`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let remoteData = null;
    let notDeployedYet = false;
    try {
      const remoteRes = await fetch(remoteUrl, { signal: controller.signal });
      clearTimeout(timeout);
      const contentType = remoteRes.headers.get('content-type') || '';
      if (remoteRes.ok && contentType.includes('application/json')) {
        remoteData = await remoteRes.json();
      } else if (remoteRes.ok && contentType.includes('text/html')) {
        notDeployedYet = true;
        console.warn('Render Cloud chưa được triển khai phiên bản có API update (trả về HTML SPA).');
      }
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.warn('Không thể kết nối Render Cloud để check update:', fetchErr.message);
    }

    if (!remoteData || !remoteData.version) {
      return res.json({
        hasUpdate: false,
        currentVersion,
        cloudConnected: false,
        notDeployedYet,
        message: notDeployedYet 
          ? 'Render Cloud chưa được cập nhật phiên bản mới lên GitHub.' 
          : 'Không thể kết nối tới Cloud Server (máy chủ Render có thể đang sleep hoặc chưa phản hồi).'
      });
    }

    const hasUpdate = isNewerVersion(remoteData.version, currentVersion);

    return res.json({
      hasUpdate,
      currentVersion,
      latestVersion: remoteData.version,
      releaseDate: remoteData.releaseDate || '',
      title: remoteData.title || '',
      changelog: remoteData.changelog || [],
      minAppVersion: remoteData.minAppVersion || '1.0.0',
      cloudConnected: true
    });
  } catch (err) {
    console.error('Lỗi check update:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Desktop Client thực hiện tải và cập nhật đè (Bảo toàn 100% Storage/ và .env)
app.post('/api/app/apply-update', async (req, res) => {
  try {
    const downloadUrl = `${RENDER_CLOUD_URL}/api/app/update-bundle.zip`;
    const tempDir = path.join(__dirname, '../local_cache');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempZip = path.join(tempDir, 'update_temp.zip');

    console.log(`[Auto-Update] Đang tải gói cập nhật từ ${downloadUrl}...`);
    
    const downloadRes = await fetch(downloadUrl);
    if (!downloadRes.ok) {
      throw new Error(`Không thể tải gói cập nhật từ Cloud (Status: ${downloadRes.status})`);
    }

    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempZip, buffer);

    console.log(`[Auto-Update] Đã tải xong ${buffer.length} bytes. Bắt đầu giải nén...`);

    // Dùng PowerShell Expand-Archive giải nén an toàn
    const rootDir = path.resolve(__dirname, '..');
    const psCmd = `powershell -NoProfile -Command "Expand-Archive -Path '${tempZip.replace(/'/g, "''")}' -DestinationPath '${rootDir.replace(/'/g, "''")}' -Force"`;
    
    execSync(psCmd, { stdio: 'pipe' });

    // Xóa file tạm
    try { fs.unlinkSync(tempZip); } catch (e) {}

    console.log('[Auto-Update] Giải nén thành công! Bảo toàn nguyên vẹn thư mục Storage/.');

    res.json({
      success: true,
      message: 'Cập nhật thành công! Ứng dụng sẽ tự động làm mới giao diện.'
    });
  } catch (err) {
    console.error('Lỗi apply update:', err);
    res.status(500).json({ error: err.message || 'Lỗi áp dụng bản cập nhật' });
  }
});

// ==========================================
// CLUB TREASURY & PENALTIES API (QUẢN LÝ TIỀN PHẠT & QUỸ CLB)
// ==========================================
function loadPenaltiesData() {
  try {
    if (fs.existsSync(PENALTIES_FILE)) {
      const content = fs.readFileSync(PENALTIES_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Lỗi đọc member_penalties_mapping.json:', err.message);
  }
  return {
    metadata: {
      totalMembers: 0,
      totalPenaltyFundCollected: 0,
      totalKmHistoricalRecorded: 0,
      currentClubFundBalance: 0,
      trackedMonthsRange: { from: '2022-06', to: '2026-06', totalMonths: 49 }
    },
    members: [],
    cashFlowLedger: []
  };
}

function savePenaltiesData(data) {
  writeStorageJson(PENALTIES_FILE, data);
}

// 1. Lấy thông số quỹ tổng quát và tóm tắt tháng
app.get('/api/penalties/summary', (req, res) => {
  try {
    const data = loadPenaltiesData();
    const queryMonth = req.query.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    let monthDueTotal = 0;
    let monthPaidTotal = 0;
    let monthUnpaidTotal = 0;
    let monthPenaltyRunnersCount = 0;
    let monthPaidRunnersCount = 0;

    data.members.forEach(m => {
      const monthFee = m.monthlyPenaltiesVND ? (m.monthlyPenaltiesVND[queryMonth] || 0) : 0;
      const statusObj = (m.monthlyPaymentStatus && m.monthlyPaymentStatus[queryMonth]) 
        ? m.monthlyPaymentStatus[queryMonth] 
        : { status: m.financialSummary?.paymentStatus || 'unpaid' };

      if (monthFee > 0) {
        monthDueTotal += monthFee;
        monthPenaltyRunnersCount++;
        if (statusObj.status === 'paid') {
          monthPaidTotal += monthFee;
          monthPaidRunnersCount++;
        } else {
          monthUnpaidTotal += monthFee;
        }
      }
    });

    res.json({
      metadata: data.metadata || {},
      queryMonth,
      monthlySummary: {
        monthDueTotal,
        monthPaidTotal,
        monthUnpaidTotal,
        monthPenaltyRunnersCount,
        monthPaidRunnersCount
      },
      currentClubFundBalance: data.metadata?.currentClubFundBalance || 11097000,
      totalPenaltyFundCollected: data.metadata?.totalPenaltyFundCollected || 16900000,
      totalMembers: data.members?.length || 28
    });
  } catch (err) {
    console.error('Lỗi get penalties summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Lấy danh sách thành viên kèm lịch sử phạt chi tiết và trạng thái nộp tiền tháng
app.get('/api/penalties/ledger', (req, res) => {
  try {
    const data = loadPenaltiesData();
    const queryMonth = req.query.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const membersWithMonthStatus = (data.members || []).map(m => {
      const monthPenalty = m.monthlyPenaltiesVND ? (m.monthlyPenaltiesVND[queryMonth] || 0) : 0;
      const paymentInfo = (m.monthlyPaymentStatus && m.monthlyPaymentStatus[queryMonth])
        ? m.monthlyPaymentStatus[queryMonth]
        : { status: 'unpaid', paidAt: null, note: '' };

      return {
        ...m,
        currentMonthPenaltyVND: monthPenalty,
        currentMonthPaymentStatus: paymentInfo.status || 'unpaid',
        currentMonthPaidAt: paymentInfo.paidAt || null,
        currentMonthPaymentNote: paymentInfo.note || ''
      };
    });

    res.json({
      metadata: data.metadata || {},
      queryMonth,
      members: membersWithMonthStatus
    });
  } catch (err) {
    console.error('Lỗi get penalties ledger:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Admin cập nhật trạng thái nộp phạt của runner (Paid/Unpaid/Waived)
app.post('/api/penalties/payment', (req, res) => {
  try {
    const { athleteId, rawName, month, status, paidAt, note, actor } = req.body;
    if (!month) {
      return res.status(400).json({ error: 'Thiếu thông tin tháng (month)' });
    }

    const data = loadPenaltiesData();
    const targetIdStr = athleteId ? String(athleteId) : null;
    const targetNameNorm = rawName ? rawName.trim().toLowerCase() : null;

    const member = (data.members || []).find(m => {
      if (targetIdStr && m.athleteId && String(m.athleteId) === targetIdStr) return true;
      if (targetNameNorm && m.rawName && m.rawName.trim().toLowerCase() === targetNameNorm) return true;
      if (targetNameNorm && m.fullName && m.fullName.trim().toLowerCase() === targetNameNorm) return true;
      return false;
    });

    if (!member) {
      return res.status(404).json({ error: 'Không tìm thấy thành viên tương ứng' });
    }

    if (!member.monthlyPaymentStatus) {
      member.monthlyPaymentStatus = {};
    }

    const newStatus = status || 'paid';
    const finalPaidAt = paidAt || (newStatus === 'paid' ? new Date().toISOString() : null);

    member.monthlyPaymentStatus[month] = {
      status: newStatus,
      paidAt: finalPaidAt,
      note: note || '',
      updatedBy: actor || 'Admin',
      updatedAt: new Date().toISOString()
    };

    // Đồng bộ vào financialSummary
    if (!member.financialSummary) member.financialSummary = {};
    member.financialSummary.paymentStatus = newStatus;

    savePenaltiesData(data);

    addAuditLog(
      'Cập nhật trạng thái nộp phạt',
      actor || 'Admin',
      `${member.fullName || member.rawName} - Tháng ${month}: ${newStatus === 'paid' ? 'Đã nộp' : 'Chưa nộp'}${note ? ` (${note})` : ''}`
    );

    res.json({
      success: true,
      member,
      queryMonth: month,
      updatedStatus: member.monthlyPaymentStatus[month]
    });
  } catch (err) {
    console.error('Lỗi cập nhật trạng thái payment:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Lấy sổ giao dịch thu / chi Quỹ CLB (Cash Flow)
app.get('/api/penalties/cashflow', (req, res) => {
  try {
    const data = loadPenaltiesData();
    res.json({
      currentClubFundBalance: data.metadata?.currentClubFundBalance || 11097000,
      totalPenaltyFundCollected: data.metadata?.totalPenaltyFundCollected || 16900000,
      cashFlowLedger: data.cashFlowLedger || []
    });
  } catch (err) {
    console.error('Lỗi get cashflow:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Admin thêm khoản thu hoặc chi Quỹ CLB mới
app.post('/api/penalties/cashflow', (req, res) => {
  try {
    const { date, description, amountVND, type, note, actor } = req.body;
    if (!description || !amountVND) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung và số tiền giao dịch' });
    }

    const data = loadPenaltiesData();
    if (!data.cashFlowLedger) data.cashFlowLedger = [];
    if (!data.metadata) data.metadata = {};

    const isExpense = type === 'expense' || Number(amountVND) < 0;
    const absAmount = Math.abs(Number(amountVND));
    const signedAmount = isExpense ? -absAmount : absAmount;

    const newTx = {
      id: Date.now().toString(),
      date: date || new Date().toISOString().split('T')[0],
      description: description.trim(),
      amountVND: signedAmount,
      type: isExpense ? 'expense' : 'income',
      note: note ? note.trim() : '',
      createdBy: actor || 'Admin',
      createdAt: new Date().toISOString()
    };

    data.cashFlowLedger.push(newTx);
    data.metadata.currentClubFundBalance = (data.metadata.currentClubFundBalance || 11097000) + signedAmount;

    savePenaltiesData(data);

    addAuditLog(
      'Giao dịch Quỹ CLB',
      actor || 'Admin',
      `${isExpense ? 'Chi' : 'Thu'} ${absAmount.toLocaleString('vi-VN')} VNĐ: ${description}`
    );

    res.json({
      success: true,
      transaction: newTx,
      currentClubFundBalance: data.metadata.currentClubFundBalance,
      cashFlowLedger: data.cashFlowLedger
    });
  } catch (err) {
    console.error('Lỗi thêm giao dịch cashflow:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Xuất báo cáo CSV đối soát tiền phạt và thành viên
app.get('/api/penalties/export-csv', (req, res) => {
  try {
    const csvPath = path.join(__dirname, '../Storage/member_penalties_mapped.csv');
    if (fs.existsSync(csvPath)) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="member_penalties_mapped.csv"');
      return res.send(fs.readFileSync(csvPath));
    }
    
    // Nếu chưa có file csv, tạo từ json
    const data = loadPenaltiesData();
    let csv = '\uFEFFSTT,Họ và Tên,Strava Athlete ID,Vai Trò,Tổng Tiền Phạt (VNĐ),Xếp Hạng Phạt,Tổng KM Lịch Sử,Xếp Hạng KM\n';
    (data.members || []).forEach(m => {
      const allTimeKm = m.financialSummary?.allTimeKmChallenge !== undefined ? m.financialSummary.allTimeKmChallenge : (m.financialSummary?.allTimeKm || m.financialSummary?.allTimeKmMoneyFile || 0);
      const kmRank = m.financialSummary?.kmRankChallenge || m.financialSummary?.kmRank || m.financialSummary?.kmRankMoneyFile || '';
      csv += `"${m.stt}","${m.fullName}","${m.athleteId || ''}","${m.role}","${m.financialSummary?.totalPenaltyVND || 0}","${m.financialSummary?.penaltyRank || ''}","${allTimeKm}","${kmRank}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="member_penalties_mapped.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Lỗi export CSV:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SERVE STATIC FILES (FOR DEPLOYMENT)
// ==========================================
// Cấu hình để backend Node.js tự động phục vụ file giao diện React (khi deploy)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Resilience: Bắt mọi ngoại lệ chưa được xử lý để máy chủ không bị crash
process.on('uncaughtException', (err) => {
  console.error('⚠️ [UncaughtException]:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [UnhandledRejection]:', reason?.message || reason);
});

// Start Server (Listen on 0.0.0.0 for seamless 127.0.0.1 and localhost compatibility)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Strava API Server đang chạy tại http://127.0.0.1:${PORT}`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.warn(`⚠️ Cổng ${PORT} đang tạm bận (TimeWait), tự động thử lại sau 1.5s...`);
    setTimeout(() => {
      try { server.close(); } catch(_) {}
      server.listen(PORT, '0.0.0.0');
    }, 1500);
  } else {
    console.error('Lỗi máy chủ:', e.message);
  }
});

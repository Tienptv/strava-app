import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StravaAPI } from './strava.js';
import { scrapeClubActivities, loginAndGetCookie, getSavedCookie } from './scraper.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGETS_FILE = path.join(__dirname, '../Storage/targets.json');
const CONFIG_FILE = path.join(__dirname, '../Storage/challenge_config.json');
const IMPORTED_FILE = path.join(__dirname, '../Storage/imported_activities.json');
const HISTORICAL_FILE = path.join(__dirname, '../Storage/historical_activities.json');
const TOTAL_KM_FILE = path.join(__dirname, '../Storage/Tong km To 17082026.csv');
const GOAL_FILE = path.join(__dirname, '../Storage/club_goal.json');
const TOKENS_FILE = path.join(__dirname, '../Storage/tokens.json');
const NAME_MAPPING_FILE = path.join(__dirname, '../Storage/name_mapping.json');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

    let dist = parseFloat(String(row.Distance || 0).replace(',', '.').replace(/[^\d.-]/g, ''));
    dist = isNaN(dist) ? 0 : dist * 1000;
    
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

// Lấy URL đăng nhập Strava
app.get('/api/auth/url', (req, res) => {
  const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/callback`;
  const scope = 'read,read_all,activity:read,activity:read_all';
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&approval_prompt=auto`;
  res.json({ url: authUrl });
});

// Đổi authorization code lấy access token
app.post('/api/auth/token', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Thiếu authorization code' });
    }

    const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/callback`;
    const tokenData = await strava.exchangeToken(code, redirectUri);

    // Lưu token với athlete ID làm key
    const athleteId = tokenData.athlete.id;
    tokenStore.set(athleteId.toString(), {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
    });
    saveTokens();

    res.json({
      athlete: tokenData.athlete,
      athleteId: athleteId,
      expires_at: tokenData.expires_at,
    });
  } catch (error) {
    console.error('Lỗi đổi token:', error.message);
    res.status(500).json({ error: 'Không thể xác thực với Strava' });
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

// Lấy thành viên của club
app.get('/api/clubs/:id/members', getToken, async (req, res) => {
  try {
    const { page = 1, per_page = 30 } = req.query;
    let members = await strava.getClubMembers(req.accessToken, req.params.id, {
      page: parseInt(page),
      per_page: parseInt(per_page),
    });
    
    // Gắn Full Name cho danh sách thành viên
    if (Array.isArray(members)) {
      const mapping = getFullNameMapping();
      members = members.map(member => {
        const fn = member.firstname || '';
        const ln = member.lastname || '';
        const initial = ln ? ln.charAt(0).toUpperCase() + '.' : '';
        const matchKey = `${fn}_${initial}`;
        
        if (mapping[matchKey]) {
          return {
            ...member,
            firstname: mapping[matchKey].firstname,
            lastname: mapping[matchKey].lastname
          };
        }
        return member;
      });
    }

    res.json(members);
  } catch (error) {
    console.error('Lỗi lấy members:', error.message);
    res.status(500).json({ error: 'Không thể lấy danh sách thành viên' });
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

    // Đảm bảo thư mục tồn tại
    const dir = path.dirname(TARGETS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(TARGETS_FILE, JSON.stringify(data, null, 2));
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
          if (mapping[key]) {
            config.participants[key].firstname = mapping[key].firstname;
            config.participants[key].lastname = mapping[key].lastname;
          }
        });
      }
      
      if (config.monthlyParticipants) {
        Object.keys(config.monthlyParticipants).forEach(month => {
          const monthData = config.monthlyParticipants[month];
          Object.keys(monthData).forEach(key => {
            if (mapping[key]) {
              monthData[key].firstname = mapping[key].firstname;
              monthData[key].lastname = mapping[key].lastname;
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

    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
    res.json(merged);
  } catch (error) {
    console.error('Lỗi lưu config:', error.message);
    res.status(500).json({ error: 'Không thể lưu cấu hình' });
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

// Lưu mục tiêu câu lạc bộ (Club Goal)
app.post('/api/challenge/goal', (req, res) => {
  try {
    const data = req.body;
    const dir = path.dirname(GOAL_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GOAL_FILE, JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Lỗi lưu goal:', error.message);
    res.status(500).json({ error: 'Không thể lưu mục tiêu câu lạc bộ' });
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
    
    // 2. Filter for 'Run' activities
    const runActivities = stravaActivities.filter(act => act.type === 'Run');
    
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
      
      const type = 'Run';
      
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
    const cookie = await loginAndGetCookie();
    res.json({ success: true, cookie });
  } catch (error) {
    console.error('Lỗi login Strava:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Lấy cookie đã lưu
app.get('/api/strava/cookie', (req, res) => {
  const cookie = getSavedCookie();
  res.json({ hasCookie: !!cookie, cookie: cookie || '' });
});

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
    
    // 2. Filter for 'Run' activities and limit to the requested amount
    const runActivities = scrapedActivities.filter(act => act.type === 'Run').slice(0, limit);
    
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
      
      const type = 'Run';
      
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
      
      res.json({ success: true, count: mergedData.length, activities: mergedData, scraped_count: runActivities.length, filename });
    } else {
      res.json({ success: true, count: 0, activities: [], scraped_count: 0, filename });
    }
  } catch (error) {
    console.error('Lỗi auto-sync-scrape:', error.message);
    res.json({ success: false, error: error.message, stack: error.stack });
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
        let minDate = null;
        let maxDate = null;

        data.forEach(act => {
            if (act.start_date_local) {
                const dateStr = act.start_date_local.substring(0, 10); // YYYY-MM-DD
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

// ==========================================
// TOTAL-KM BASELINE ROUTES
// ==========================================

// Đọc dữ liệu All-Time km từ file CSV Tong km To 17082026.csv
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
          filePath = path.join(storageDir, files[0]);
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.json({ cutoffDate: '2026-07-31T23:59:59.999Z', items: [] });
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
      cutoffDate: '2026-07-31T23:59:59.999Z',
      items
    });
  } catch (error) {
    console.error('Lỗi đọc total-km base:', error.message);
    res.status(500).json({ error: 'Không thể đọc dữ liệu Total-km' });
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
// LOGOUT
// ==========================================
app.post('/api/auth/logout', getToken, async (req, res) => {
  try {
    await strava.deauthorize(req.accessToken);
    tokenStore.delete(req.athleteId);
    saveTokens();
    res.json({ message: 'Đã đăng xuất' });
  } catch (error) {
    tokenStore.delete(req.athleteId);
    saveTokens();
    res.json({ message: 'Đã đăng xuất' });
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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Strava API Server đang chạy tại http://localhost:${PORT}`);
});

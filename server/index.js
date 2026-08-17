import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StravaAPI } from './strava.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGETS_FILE = path.join(__dirname, '../Storage/targets.json');
const CONFIG_FILE = path.join(__dirname, '../Storage/challenge_config.json');
const IMPORTED_FILE = path.join(__dirname, '../Storage/imported_activities.json');
const TOTAL_KM_FILE = path.join(__dirname, '../Storage/Total-km-17-08-2026.csv');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Lưu trữ token tạm thời (trong production nên dùng database)
const tokenStore = new Map();

const strava = new StravaAPI(
  process.env.STRAVA_CLIENT_ID,
  process.env.STRAVA_CLIENT_SECRET
);

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
function getToken(req, res, next) {
  const athleteId = req.headers['x-athlete-id'];
  if (!athleteId) {
    return res.status(401).json({ error: 'Thiếu athlete ID' });
  }
  const tokenData = tokenStore.get(athleteId);
  if (!tokenData) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
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

// Lấy thành viên của club
app.get('/api/clubs/:id/members', getToken, async (req, res) => {
  try {
    const { page = 1, per_page = 30 } = req.query;
    const members = await strava.getClubMembers(req.accessToken, req.params.id, {
      page: parseInt(page),
      per_page: parseInt(per_page),
    });
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
    const updates = req.body; // Expecting { matchKey, target, penalty }
    let data = {};
    if (fs.existsSync(TARGETS_FILE)) {
      data = JSON.parse(fs.readFileSync(TARGETS_FILE, 'utf8'));
    }
    
    const { matchKey, target, penalty } = updates;
    if (!matchKey) {
      return res.status(400).json({ error: 'Thiếu matchKey' });
    }

    if (!data[matchKey]) {
      data[matchKey] = {};
    }
    
    if (target !== undefined) data[matchKey].target = target;
    if (penalty !== undefined) data[matchKey].penalty = penalty;

    // Đảm bảo thư mục tồn tại
    const dir = path.dirname(TARGETS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(TARGETS_FILE, JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Lỗi lưu targets:', error.message);
    res.status(500).json({ error: 'Không thể lưu dữ liệu' });
  }
});

// ==========================================
// CONFIG & IMPORTED ROUTES
// ==========================================

// Đọc cấu hình (participants, clubId)
app.get('/api/challenge/config', (req, res) => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      res.json(JSON.parse(data));
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
    const data = req.body;
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Lỗi lưu config:', error.message);
    res.status(500).json({ error: 'Không thể lưu cấu hình' });
  }
});

// Đọc imported activities
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

// Lưu imported activities
app.post('/api/challenge/imported', (req, res) => {
  try {
    const data = req.body;
    const dir = path.dirname(IMPORTED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(IMPORTED_FILE, JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Lỗi lưu imported:', error.message);
    res.status(500).json({ error: 'Không thể lưu dữ liệu imported' });
  }
});

// ==========================================
// TOTAL-KM BASELINE ROUTES
// ==========================================

// Đọc dữ liệu All-Time km từ file CSV Total-km-17-08-2026.csv
app.get('/api/challenge/total-km', (req, res) => {
  try {
    let filePath = TOTAL_KM_FILE;
    if (!fs.existsSync(filePath)) {
      const storageDir = path.join(__dirname, '../Storage');
      if (fs.existsSync(storageDir)) {
        const files = fs.readdirSync(storageDir).filter(f => f.startsWith('Total-km') && f.endsWith('.csv'));
        if (files.length > 0) {
          filePath = path.join(storageDir, files[0]);
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.json({ cutoffDate: '2026-08-17T23:59:59.999Z', items: [] });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    const items = [];

    // Header: name,Dthletes,Distance
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',');
      if (parts.length >= 2) {
        const name = (parts[0] || '').trim();
        const athleteUrl = (parts[1] || '').trim();
        const rawDist = (parts[2] || '').replace(/[^\d.]/g, '').trim();
        const dist = rawDist ? parseFloat(rawDist) : null;

        let athleteId = null;
        const idMatch = athleteUrl.match(/\/athletes\/(\d+)/);
        if (idMatch) {
          athleteId = parseInt(idMatch[1], 10);
        }

        if (name || athleteId) {
          items.push({
            name,
            athleteUrl,
            athleteId,
            baseDistance: dist !== null && !isNaN(dist) ? dist : null
          });
        }
      }
    }

    res.json({
      cutoffDate: '2026-08-17T23:59:59.999Z',
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
    res.json({ message: 'Đã đăng xuất' });
  } catch (error) {
    tokenStore.delete(req.athleteId);
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

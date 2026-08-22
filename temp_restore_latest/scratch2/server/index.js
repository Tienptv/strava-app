import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { StravaAPI } from './strava.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`🚀 Strava API Server đang chạy tại http://localhost:${PORT}`);
});

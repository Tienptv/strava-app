/**
 * CLI Tool Quản Lý & Đăng Ký Strava Push Subscriptions (Webhook)
 * Cách dùng:
 *   node server/manage_webhook.cjs list          -> Xem danh sách webhook hiện có trên Strava
 *   node server/manage_webhook.cjs create        -> Đăng ký webhook trỏ về Render Cloud
 *   node server/manage_webhook.cjs delete <id>   -> Xóa subscription theo ID
 */

const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

dotenv.config({ path: path.join(__dirname, '../.env') });

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || 'STRAVA_RENDER_WEBHOOK_2026';
const RENDER_URL = (process.env.RENDER_CLOUD_URL || 'https://strava-app-86t5.onrender.com').replace(/\/+$/, '');
const CALLBACK_URL = `${RENDER_URL}/api/webhook`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Lỗi: Thiếu STRAVA_CLIENT_ID hoặc STRAVA_CLIENT_SECRET trong file .env');
  process.exit(1);
}

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (_) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function listSubscriptions() {
  console.log('\n======================================================');
  console.log('   DANH SÁCH STRAVA WEBHOOK PUSH SUBSCRIPTIONS');
  console.log('======================================================');
  console.log(`- Client ID: ${CLIENT_ID}`);

  const url = `https://www.strava.com/api/v3/push_subscriptions?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`;
  try {
    const res = await fetchJson(url);
    if (res.status === 200 && Array.isArray(res.data)) {
      if (res.data.length === 0) {
        console.log('ℹ️ Chưa có Webhook subscription nào được đăng ký cho ứng dụng này.');
      } else {
        console.log(`✅ Tìm thấy ${res.data.length} subscription đang hoạt động:`);
        res.data.forEach((sub, i) => {
          console.log(`\n  [#${i + 1}] ID: ${sub.id}`);
          console.log(`       Callback URL: ${sub.callback_url}`);
          console.log(`       Created At:   ${sub.created_at}`);
          console.log(`       Updated At:   ${sub.updated_at}`);
        });
      }
    } else {
      console.error(`⚠️ Strava API phản hồi mã lỗi ${res.status}:`, res.data || res.text);
    }
  } catch (err) {
    console.error('❌ Lỗi kết nối Strava API:', err.message);
  }
  console.log('======================================================\n');
}

async function createSubscription() {
  console.log('\n======================================================');
  console.log('   ĐĂNG KÝ MỚI STRAVA WEBHOOK PUSH SUBSCRIPTION');
  console.log('======================================================');
  console.log(`- Callback URL: ${CALLBACK_URL}`);
  console.log(`- Verify Token: ${VERIFY_TOKEN}`);
  console.log(`\n⏳ Đang gửi yêu cầu đăng ký lên Strava...`);

  // Strava yêu cầu form-encoded hoặc json cho push_subscriptions
  const postData = JSON.stringify({
    client_id: Number(CLIENT_ID),
    client_secret: CLIENT_SECRET,
    callback_url: CALLBACK_URL,
    verify_token: VERIFY_TOKEN
  });

  const url = 'https://www.strava.com/api/v3/push_subscriptions';
  try {
    const res = await fetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      body: postData
    });

    if (res.status === 201 || res.status === 200) {
      console.log('🎉 ĐĂNG KÝ THÀNH CÔNG VỚI STRAVA!');
      console.log(`- Subscription ID: ${res.data.id}`);
      console.log(`- Callback URL:    ${res.data.callback_url}`);
      console.log('\nTừ bây giờ, mọi bài chạy mới từ Strava sẽ tự động được gửi về Render Cloud!');
    } else {
      console.error(`❌ Đăng ký thất bại! Mã lỗi: ${res.status}`);
      console.error('Chi tiết lỗi:', res.data || res.text);
      console.log('\nGợi ý xử lý:');
      console.log('1. Đảm bảo server Render đã chạy và có endpoint GET /api/webhook.');
      console.log('2. Đảm bảo biến STRAVA_VERIFY_TOKEN trên Render khớp với token trong file này.');
      console.log('3. Nếu đã có subscription cũ, hãy chạy "node server/manage_webhook.cjs list" và xóa subscription cũ trước.');
    }
  } catch (err) {
    console.error('❌ Lỗi gửi request:', err.message);
  }
  console.log('======================================================\n');
}

async function deleteSubscription(subId) {
  if (!subId) {
    console.error('❌ Lỗi: Thiếu Subscription ID để xóa. Ví dụ: node server/manage_webhook.cjs delete 123456');
    return;
  }

  console.log('\n======================================================');
  console.log(`   XOÁ STRAVA WEBHOOK SUBSCRIPTION ID: ${subId}`);
  console.log('======================================================');

  const url = `https://www.strava.com/api/v3/push_subscriptions/${subId}?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`;
  try {
    const res = await fetchJson(url, { method: 'DELETE' });
    if (res.status === 204 || res.status === 200) {
      console.log(`✅ Đã xoá thành công Subscription ID: ${subId}`);
    } else {
      console.error(`⚠️ Xoá thất bại! Mã lỗi ${res.status}:`, res.data || res.text);
    }
  } catch (err) {
    console.error('❌ Lỗi kết nối Strava API:', err.message);
  }
  console.log('======================================================\n');
}

const command = (process.argv[2] || 'list').toLowerCase();
const argId = process.argv[3];

switch (command) {
  case 'list':
  case 'view':
    listSubscriptions();
    break;
  case 'create':
  case 'register':
    createSubscription();
    break;
  case 'delete':
  case 'remove':
    deleteSubscription(argId);
    break;
  default:
    console.log('Cách dùng:');
    console.log('  node server/manage_webhook.cjs list');
    console.log('  node server/manage_webhook.cjs create');
    console.log('  node server/manage_webhook.cjs delete <subscription_id>');
}

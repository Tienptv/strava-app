import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import webPush from 'web-push';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startCronJobs() {
  console.log('⏰ Bắt đầu các tác vụ Cron cho Push Notifications...');

  // Gửi thông báo nhắc nhở chạy bộ hàng ngày vào 17:00
  cron.schedule('0 17 * * *', () => {
    console.log('Chạy cron: Gửi nhắc nhở chạy bộ lúc 17:00');
    sendNotificationToAll({
      title: 'HRC 200K - Đã đến giờ chạy!',
      body: 'Buổi chiều mát mẻ, lên giày và chinh phục mục tiêu hôm nay nào!',
      url: '/'
    });
  });

  // Gửi thông báo vào cuối tháng nếu sắp hết hạn
  cron.schedule('0 9 28-31 * *', () => {
    console.log('Chạy cron: Nhắc nhở chốt tháng lúc 9:00 sáng');
    sendNotificationToAll({
      title: 'Sắp kết thúc tháng!',
      body: 'Chỉ còn vài ngày nữa là hết tháng, hãy kiểm tra lại mục tiêu 200K của bạn nhé!',
      url: '/'
    });
  });
}

function sendNotificationToAll(payload) {
  const subscriptionsPath = path.join(__dirname, '../Storage/wpn_subscriptions.json');
  if (fs.existsSync(subscriptionsPath)) {
    const data = JSON.parse(fs.readFileSync(subscriptionsPath, 'utf8'));
    const subscriptions = data.subscriptions || [];
    
    let successCount = 0;
    
    Promise.all(subscriptions.map(subData => {
      return webPush.sendNotification(subData.subscription, JSON.stringify(payload))
        .then(() => {
          successCount++;
        })
        .catch(err => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.log('Subscription has expired or is no longer valid:', err.endpoint);
          } else {
            console.error('Lỗi khi gửi thông báo cron:', err);
          }
        });
    })).then(() => {
      console.log(`Đã gửi thông báo cron cho ${successCount}/${subscriptions.length} thiết bị.`);
    });
  }
}

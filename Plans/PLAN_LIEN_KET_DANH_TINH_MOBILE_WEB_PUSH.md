# Kế Hoạch Triển Khai: Liên Kết Danh Tính Thành Viên Cho Web Push Notifications Trên Mobile

## 1. Bối Cảnh & Vấn Đề Kỹ Thuật
- **Thực trạng sử dụng thực tế:**
  - Đa số thành viên câu lạc bộ Haskoning khi mở link `https://strava-app-86t5.onrender.com` trên điện thoại đều bấm chọn **"Xem Bảng Xếp Hạng CLB (Khách)"** (`isGuest = true`) để xem nhanh tiến độ mà không đăng nhập tài khoản Strava OAuth.
  - Khi thành viên bấm **"Bật thông báo"** trên điện thoại ở chế độ Khách, thiết bị được gửi lên server với định danh `athleteId: 'guest'`.
- **Hệ quả trên PC của Admin:**
  - Admin bấm **"Bắn Push toàn CLB"** hoặc tab **"Tùy chỉnh Push"** (gửi Tất cả) thì điện thoại đó **vẫn nhận được 100%**.
  - Nhưng trên danh sách nhắc nhở cá nhân (Tab 1: Nhắc thiếu km, Tab 2: Nhắc nợ tiền phạt), các thành viên như **Cuong Nguyen, Huy Hoang, Sang Nguyen...** vẫn hiển thị biểu tượng xám **`⚪ 📱 0`**, và nút bấm **"📲 Bắn Push phạt"** bị vô hiệu hóa vì hệ thống không biết chiếc điện thoại ở chế độ Khách đó thuộc về ai trong số 47 thành viên của CLB.

---

## 2. Mục Tiêu Đạt Được
1. **Trải nghiệm mượt mà trên Mobile (Không cần đăng nhập Strava):**
   - Thành viên mở điện thoại ở chế độ Khách, bấm "Bật thông báo" sẽ có một ô chọn tên thân thiện: *"Bạn là ai trong CLB?"*.
   - Nếu thành viên đã từng ghim (⭐ Pin) tên mình trên Bảng xếp hạng điện thoại, hệ thống tự động gợi ý chọn ngay tên đó.
   - Chỉ cần chọn đúng 1 lần, danh tính được lưu vĩnh viễn vào `localStorage` trên điện thoại (có nút bấm "Đổi người nhận" nếu cần).
2. **Hiển thị trực quan tức thì trên PC Admin:**
   - Ngay sau khi thành viên chọn tên và bật thông báo, trên PC của Admin tại Tab 7 (Reminders & Notifications), VĐV đó sẽ sáng đèn xanh **`🟢 📱 1 máy`**.
   - Nút **"📲 Bắn Push phạt"** hoặc **"📲 Bắn Push"** của người đó sẽ sáng đèn Teal Gradient, Admin chỉ việc bấm vào là gửi thẳng đến màn hình khóa điện thoại của đúng thành viên đó.
3. **Tuân thủ tuyệt đối quy tắc hệ thống:**
   - **Rule 1 (Đồng bộ Cloud & PC):** Dữ liệu token đăng ký trên Render Cloud được kéo tự động khi bấm "Làm mới" hoặc bấm "Auto sync Strava" ở Sidebar / "Kéo dữ liệu từ Cloud" ở Tab 4.
   - **Rule 2 (Kiểm thử 100%):** Viết script test case tự động kiểm tra quy trình liên kết danh tính và gửi thông báo.
   - **Rule 3 & 4 (Haskoning Branding & Bilingual):** Giao diện đẹp, chuẩn màu sắc, song ngữ VI/EN 100%.

---

## 3. Thiết Kế Kỹ Thuật Chi Tiết

### A. Backend (`server/index.js`)
1. **Endpoint mới `GET /api/wpn/athletes-roster` (Public):**
   - Trả về danh sách rút gọn các VĐV trong CLB từ `AthleteID_Name.csv` và `challenge_config.json`:
     ```json
     [
       { "id": 72851794, "name": "Lieu Vo", "matchKey": "Lieu_V." },
       { "id": 82871822, "name": "Andie Le", "matchKey": "Andie_L." },
       { "id": 133066813, "name": "Cuong Nguyen", "matchKey": "Cuong_N." }
     ]
     ```
2. **Nâng cấp `POST /api/wpn/subscribe`:**
   - Nhận thêm các trường: `{ subscription, athleteId, athleteName, athleteKey, device }`.
   - Lưu trữ đa chiều trong `Storage/wpn_subscriptions.json`:
     - Lưu theo `athleteId` (ID số nếu có).
     - Lưu theo `athleteKey` hoặc tên chuẩn hoá (`athleteName`), giúp tra cứu hai chiều chính xác.
3. **Nâng cấp `GET /api/wpn/subscribers-status`:**
   - Tự động map tất cả các key (ID số, tên đầy đủ, matchKey) vào `athleteMap` để các component Frontend tìm kiếm bằng bất kỳ định danh nào cũng thấy máy.
   - Đảm bảo đếm `totalDevices` theo số lượng `endpoint` thực tế (không bị tính trùng lặp).
4. **Nâng cấp `POST /api/wpn/send`:**
   - Hỗ trợ gửi thông báo tới VĐV bằng cả `targetId` (ID số) hoặc `athleteKey` / `athleteName` (tên).

### B. Frontend Mobile (`NotificationPermissionBanner.jsx`)
1. **Giao diện chọn danh tính thông minh:**
   - Khi `athleteId === 'guest'`, dưới tiêu đề banner sẽ có nút bấm hoặc dropdown nhỏ gọn, thẩm mỹ:
     - *"Nhận thông báo cho: [ Chọn tên của bạn trong CLB... ▼ ]"*
     - Danh sách thả xuống có ô tìm kiếm nhanh (Search) để thành viên chọn tên trong 1 giây.
     - Tùy chọn cuối cùng: *"📢 Khách xem chung (Chỉ nhận tin toàn CLB)"*.
   - Nếu máy đã lưu tên (trong `localStorage.getItem('linked_athlete')`):
     - Hiển thị: *"Đang nhận tin cho: **Cuong Nguyen** (Thay đổi)"*.
2. **Tự động liên kết khi Ghim VĐV (`MobileLeaderboard.jsx`):**
   - Khi thành viên bấm icon ngôi sao (⭐ Pin) để theo dõi bài chạy của mình trên Bảng xếp hạng di động, hệ thống kiểm tra nếu chưa liên kết push thì tự động đặt VĐV được ghim làm danh tính nhận thông báo.

### C. Giao Diện Admin PC (`SmartReminderTool.jsx`)
- Tự động nhận diện thiết bị theo cả `athleteId`, `rawName` và `fullName`.
- Khi có ít nhất 1 máy đăng ký:
  - Hiển thị huy hiệu xanh: `🟢 📱 1 máy` (hoặc `2 máy`).
  - Nút **"Bắn Push phạt"** và **"Bắn Push"** chuyển sang trạng thái kích hoạt (Active), có hiệu ứng hover nhấc nhẹ 2px kèm bóng đổ Teal Brand.
  - Hộp thoại xác nhận hiển thị rõ tên người nhận và số thiết bị sẽ nhận được.

---

## 4. Kế Hoạch Kiểm Thử (Verification Plan)
1. **Kiểm thử API Endpoint:**
   - Chạy test script `scratch/test_identity_push.cjs` để gọi `GET /api/wpn/athletes-roster`.
   - Giả lập một thiết bị di động ở chế độ Khách gửi request `POST /api/wpn/subscribe` gắn với danh tính `Cuong Nguyen`.
   - Gọi `GET /api/wpn/subscribers-status` kiểm tra xem `athleteMap['Cuong Nguyen']` và `athleteMap['133066813']` đã có cờ `registered: true` chưa.
   - Gọi `POST /api/wpn/send` nhắm mục tiêu `Cuong Nguyen` kiểm tra phản hồi thành công.
2. **Kiểm thử Frontend Build:**
   - Chạy `npm run build --prefix frontend` để đảm bảo code React không có lỗi cú pháp, bundle thành công.
   - Đồng bộ sang thư mục `dist/`.

---

## 5. Quy Trình Phê Duyệt
- Kế hoạch này được tạo để Admin xem xét phương án kỹ thuật và thiết kế giao diện.
- Khi Admin bấm **Proceed / Approve**, các bước lập trình sẽ được thực hiện tuần tự và kiểm thử thực tế 100%.

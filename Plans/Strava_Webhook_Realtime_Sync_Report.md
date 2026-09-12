# BÁO CÁO PHÂN TÍCH VÀ KẾ HOẠCH TRIỂN KHAI: ĐỒNG BỘ REAL-TIME TỪ GARMIN/COROS QUA STRAVA WEBHOOK

**Dự án:** Strava Desktop Software  
**Tính năng:** Đồng bộ dữ liệu theo thời gian thực (Real-time Sync) từ các thiết bị thể thao (Garmin, Coros, Suunto, Apple Health).  

---

## PHẦN 1: PHÂN TÍCH CÁC GIẢI PHÁP ĐỒNG BỘ DỮ LIỆU

Mục tiêu ban đầu là lấy dữ liệu từ các đồng hồ thể thao như Garmin. Tuy nhiên, do rào cản về chính sách API của các hãng phần cứng, chúng tôi đã đưa ra 3 hướng tiếp cận:

1. **Dùng Strava làm trạm trung chuyển (Được chọn):** Các thiết bị đồng hồ vốn dĩ đều có tính năng tự động đẩy dữ liệu sang Strava. Nếu chúng ta khai thác Strava API qua cơ chế Webhook (Push Subscriptions), chúng ta có thể lấy được dữ liệu của tất cả các hãng đồng hồ ngay khi người dùng hoàn thành hoạt động.
2. **Tích hợp API trực tiếp (Garmin Connect API):** Giải pháp này bị loại bỏ do đòi hỏi phải đăng ký tài khoản doanh nghiệp (Enterprise) với Garmin, quy trình duyệt rất khắt khe và mất nhiều thời gian, cộng với việc phải xây dựng bộ phân tích file `.FIT` phức tạp.
3. **Import file thủ công:** Xây dựng tính năng kéo thả file `.FIT`, `.TCX` lên app. Giải pháp này bị loại bỏ vì tính thủ công cao, đi ngược lại định hướng tự động hóa của hệ thống.

---

## PHẦN 2: ĐÁNH GIÁ CHI TIẾT GIẢI PHÁP STRAVA WEBHOOK (REAL-TIME SYNC)

Sau khi chốt phương án 1, dưới đây là các phân tích chi tiết về tính khả thi và trải nghiệm người dùng:

### 1. Trải nghiệm thời gian thực (Độ trễ hệ thống)
* **Câu hỏi đặt ra:** Các user khác có thể thấy ngay hoạt động của mọi người khi vừa kết thúc bài chạy không?
* **Phân tích:** 
  - Garmin đẩy lên Strava mất khoảng 2-5 giây.
  - Strava đẩy Webhook về server Render mất < 1 giây.
  - Mã nguồn Frontend React hiện tại của dự án có chứa lệnh `setInterval(loadTargets, 8000)`, nghĩa là giao diện tự động làm mới mỗi 8 giây.
* **Kết luận:** Trải nghiệm hoàn toàn là **Real-time**. Tính từ lúc bấm lưu trên đồng hồ, số liệu sẽ nhảy trên bảng xếp hạng của mọi người dùng khác chỉ trong vòng **10 đến 15 giây**.

### 2. Khả năng hoạt động trên nền tảng di động (Mobile)
* **Câu hỏi đặt ra:** Cơ chế này có hoạt động trên giao diện điện thoại không?
* **Phân tích:** 
  - Webhook hoạt động ngầm 100% trên Backend server (Render), không phụ thuộc vào thiết bị của người dùng cuối. 
  - Frontend của dự án đã hỗ trợ Responsive (có các file `mobile_css.txt`).
  - Người dùng có thể mở link web trên trình duyệt Safari/Chrome điện thoại để "Đăng nhập với Strava" một lần duy nhất. Sau đó, họ có thể tắt web, chỉ cần xách đồng hồ đi chạy.
* **Kết luận:** Ứng dụng hoạt động hoàn hảo trên điện thoại. Không yêu cầu người dùng phải mở app hay mang theo điện thoại khi chạy bộ.

### 3. Vấn đề bảo mật và quyền riêng tư
* **Câu hỏi đặt ra:** Có thể lấy được hoạt động của *tất cả* mọi người trong giải chạy không?
* **Phân tích:** Webhook sẽ **chỉ bắt được hoạt động của những ai đã từng bấm nút đăng nhập và cấp quyền** cho ứng dụng của bạn (quyền `activity:read_all`). Đối với những người chỉ tham gia Strava Club mà chưa từng mở web/app của bạn để đăng nhập, Webhook sẽ không có tác dụng.
* **Quy tắc hệ thống:** Bắt buộc mọi thành viên dự giải phải thao tác kết nối Strava trên hệ thống ít nhất một lần.

---

## PHẦN 3: KẾ HOẠCH TRIỂN KHAI KỸ THUẬT

Để hệ thống Webhook hoạt động, chúng ta cần cấu hình Server Render (đang chạy tại `https://strava-app-86t5.onrender.com`) làm trạm thu nhận sự kiện từ Strava.

### 1. Các đoạn mã cần thêm vào `server/index.js`

**A. API Endpoint Xác thực Webhook (`GET /api/webhook`)**
- Nhiệm vụ: Trả lời câu hỏi xác minh từ Strava khi đăng ký Webhook.
- Cách làm: Đọc `hub.verify_token` từ request, so sánh với biến môi trường `STRAVA_VERIFY_TOKEN`, nếu đúng thì trả lời bằng `hub.challenge`.

**B. API Endpoint Lắng nghe Sự kiện (`POST /api/webhook`)**
- Nhiệm vụ: Nhận "ping" từ Strava mỗi khi có bài chạy mới.
- Cách làm: 
  - Trả về mã `200 OK` ngay lập tức để Strava xác nhận đã gửi thành công.
  - Trích xuất `owner_id` (Mã Strava người chạy) và `object_id` (Mã ID bài chạy).
  - Kiểm tra xem đây có phải là sự kiện tạo mới bài chạy hay không (`aspect_type === 'create'`).

**C. Hàm xử lý logic đồng bộ (`processNewActivity`)**
- Nhiệm vụ: Rút trích số liệu chi tiết.
- Cách làm: 
  1. Mở `tokens_v2.json`, tìm `access_token` của người chạy (`owner_id`).
  2. Dùng token đó gọi hàm `strava.getActivityById` để lấy khoảng cách, thời gian, loại hình thể thao.
  3. Lọc lấy các bài chạy bộ. Dùng hàm `mapAthleteNamesUsingCSV` để gán đúng tên.
  4. Trộn dữ liệu vào file `imported_activities.json` bằng hàm `mergeActivitiesList`.

### 2. Các bước Setup Hệ thống

1. **Thiết lập biến môi trường:** Vào Dashboard của Render, thêm biến `STRAVA_VERIFY_TOKEN`.
2. **Đăng ký Webhook API:** Viết một script ngắn gọi đến `https://www.strava.com/api/v3/push_subscriptions` chứa `client_id`, `client_secret` của App, URL Render của bạn và Verify Token.
3. **Triển khai và Kiểm thử:** 
   - Push code lên Render.
   - Thử nghiệm tạo một bài chạy "Manual Activity" trên điện thoại để kiểm tra xem webhook có đổ dữ liệu về file JSON trên Render thành công không.

---
*Báo cáo được tổng hợp để định hướng cho bản cập nhật Real-time Sync tích hợp Strava Webhook vào Strava Desktop Software.*

# KẾ HOẠCH CHI TIẾT: 2 HƯỚNG CHỐNG MẤT DỮ LIỆU ĐÁNH DẤU TRÊN CLOUD

Tài liệu này trình bày chi tiết các bước thực hiện cho 2 giải pháp nhằm khắc phục tình trạng Server Render miễn phí bị "ngủ đông" và xóa mất dữ liệu tick phạt/mục tiêu của Admin khi thao tác trên điện thoại.

---

## HƯỚNG 1: "THUỐC CHỐNG NGỦ" BẰNG UPTIMEROBOT (KHUYÊN DÙNG NẾU MUỐN NHANH)

**Cơ chế:** Dùng một bên thứ 3 cứ mỗi 10 phút lại tự động truy cập vào trang web của bạn một lần, giúp Render lầm tưởng lúc nào cũng có khách và thức 24/24. Ổ cứng của Render sẽ không bao giờ bị reset.

### 🛠 Các bước thực hiện (Bạn tự thao tác):
1. **Đăng ký tài khoản:**
   - Truy cập trang web: [UptimeRobot](https://uptimerobot.com) hoặc [cron-job.org](https://cron-job.org).
   - Đăng ký một tài khoản hoàn toàn miễn phí.

2. **Thiết lập Bot tự động:**
   - Chọn tạo "Monitor" (Trình theo dõi) mới.
   - Loại theo dõi (Monitor Type): Chọn `HTTP(s)`.
   - URL: Điền link ứng dụng Strava của bạn (VD: `https://strava-app-86t5.onrender.com`).
   - Khoảng thời gian (Interval): Chọn **10 phút** / lần.
   - Nhấn "Create Monitor" (Lưu lại).

3. **Luồng vận hành mới:**
   - Web trên Render sẽ thức 24/7. 
   - Sáng: Bạn dùng điện thoại tick phạt.
   - Tối: Về mở máy tính, bấm nút **"Pull from Render Cloud"**. Dữ liệu sẽ về y nguyên không mất 1 dấu tick nào.
   - Cuối cùng, sau khi Pull xong, bạn bấm **"Run Git Push"** để đóng gói cục dữ liệu an toàn đó lên Github lưu vĩnh viễn.

*Lưu ý: Dù không bị xóa, Render vẫn có thể khởi động lại nếu hệ thống của họ bảo trì mạng (rất hiếm). Việc đẩy Git Push vào buổi tối vẫn là bắt buộc để an toàn tuyệt đối.*

---

## HƯỚNG 2: CHUYỂN ĐỔI SANG FIREBASE DATABASE (CHUYÊN NGHIỆP, VĨNH VIỄN)

**Cơ chế:** Đập bỏ cơ chế lưu dữ liệu bằng file `.json` thủ công, chuyển sang cắm thẳng vào kho dữ liệu thời gian thực của Google (Firebase Realtime Database). 

### 🛠 Các bước thực hiện:

#### Bước 1: Khởi tạo Database (Bạn thao tác)
- Truy cập [Firebase Console](https://console.firebase.google.com).
- Đăng nhập bằng Gmail và bấm **Create a project**.
- Trong giao diện, tìm mục **Realtime Database** -> Bấm Create Database.
- Sau khi tạo xong, đi tới phần **Project Settings > Service Accounts**, bấm "Generate new private key" để tải về một file `.json` chứa mã bảo mật.

#### Bước 2: Thiết lập bảo mật trên Render (Bạn thao tác)
- Đưa các mã bảo mật lấy được từ Firebase lên mục `Environment Variables` trên trang quản lý của Render.

#### Bước 3: Đại phẫu thuật mã nguồn (AI / Lập trình viên thao tác)
Mình sẽ thực hiện sửa đổi toàn bộ backend của bạn:
1. Gỡ bỏ mọi câu lệnh `fs.writeFileSync` (ghi file) trong `server/index.js`.
2. Cài đặt thêm thư viện `firebase-admin` vào `package.json`.
3. Cắm các endpoints (ví dụ: chỗ lưu thông tin tick phạt, chỗ sửa target, chỗ lưu file csv import) thẳng vào Firebase.
4. **Hủy bỏ hoàn toàn** các nút "Pull from Cloud" hay "Push to Cloud" vì lúc này Phần mềm trên Máy tính và Website trên Cloud đều cùng nhìn vào 1 cục Database của Firebase. Mọi thay đổi đều được đồng bộ Real-time (Thời gian thực). Máy tính vừa mở lên là đã thấy dấu tick của điện thoại ban sáng.

### ⏳ Đánh giá
- Hướng 1 chỉ mất **5 phút** để bạn tự làm.
- Hướng 2 sẽ mất khoảng **1 - 2 tiếng** cho mình để viết lại cấu trúc Backend và cho bạn để Test lại toàn bộ tính năng.

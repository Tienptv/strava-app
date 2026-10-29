# KẾ HOẠCH TRIỂN KHAI: ĐĂNG KÝ PRODUCTION ACCESS STRAVA API & CHUẨN HÓA MÃ NGUỒN

> **Mục tiêu:** Nâng hạn mức số lượng vận động viên ủy quyền từ **10 lên 100+ hoặc Không giới hạn (Unlimited)** qua cổng chính thức Strava Developers, giúp toàn bộ 48+ thành viên CLB Haskoning kết nối Webhook real-time thành công.  
> **Chế độ:** Orchestrator & Direct Execution Mode (Senior Systems Engineer)

---

## 1. Mục Tiêu & Yêu Cầu Cốt Lõi (Core Requirements)

Để Strava Developer Review Team phê duyệt đơn xin nâng cấp lên Production Mode, hệ thống phải đáp ứng 100% các tiêu chí bắt buộc của Strava:
1. **Public Privacy Policy & Terms of Service:** Phải có 2 đường link công khai đang hoạt động tại `https://strava-app-86t5.onrender.com/privacy-policy` và `/terms-of-service` giải thích minh bạch cách thức thu thập và bảo vệ dữ liệu hoạt động của vận động viên.
2. **Tuân thủ Strava API Brand Guidelines:** Nút kết nối phải hiển thị đúng chuẩn "Connect with Strava", không dùng từ "Strava" làm thương hiệu riêng cho ứng dụng.
3. **Mẫu đơn giải trình chuyên nghiệp (Application Request Template):** Soạn thảo sẵn toàn bộ thông tin đăng ký (Tên ứng dụng, Mục đích sử dụng, Tỷ lệ request, Thông tin bảo mật) bằng tiếng Anh chuẩn doanh nghiệp để Admin chỉ việc copy-paste vào trang Strava API.
4. **Mở rộng logic Backend (`server/index.js`):** Khi Strava duyệt xong và hạn mức được mở, server phải tự động cho phép các thành viên trong danh sách CLB (`club_roster.json` / `AthleteID_Name.csv`) lưu token vào `tokens_v2.json` mà không bị chặn nhầm.

---

## 2. Đề Xuất & Khuyến Nghị Kỹ Thuật (Recommendations & Trade-offs)

### Phương án A: Tích hợp trực tiếp Privacy Policy & Terms vào Single-Page App (Khuyên dùng)
- **Ưu điểm:**
  - Tích hợp liền mạch trong React frontend (`/privacy-policy`, `/terms-of-service`).
  - Giao diện đồng bộ với chuẩn thương hiệu Haskoning (màu `#002D54`, `#00A3A6`, font Plus Jakarta Sans).
  - Có sẵn nút chuyển đổi song ngữ Anh - Việt (EN/VI).
  - Strava Reviewer bấm vào duyệt ngay lập tức trên domain `strava-app-86t5.onrender.com`.
- **Nhược điểm:** Cần thêm 2 component trang tĩnh và khai báo Route.

### Phương án B: Trỏ sang trang Google Docs / Notion công khai
- **Ưu điểm:** Không cần viết code giao diện.
- **Nhược điểm:** Thiếu tính chuyên nghiệp, dễ bị Strava Reviewer từ chối hoặc yêu cầu bổ sung do domain không đồng nhất với Website URL của ứng dụng (`onrender.com`).
- **Kết luận:** **Chọn Phương án A** để đảm bảo tỷ lệ duyệt 100% ngay từ lần đầu tiên.

---

## 3. Phạm Vi Tác Động (Blast Radius)

Các file sẽ được tạo mới và điều chỉnh:

```
frontend/
  ├── src/
  │    ├── pages/
  │    │    ├── PrivacyPolicy.jsx         (Tạo mới - Trang Chính sách Bảo mật chuẩn Strava)
  │    └── TermsOfService.jsx        (Tạo mới - Trang Điều khoản Sử dụng)
  │    ├── App.jsx                        (Thêm 2 routes công khai /privacy-policy và /terms-of-service)
  │    └── i18n/
  │         └── translations.js           (Bổ sung nhãn i18n song ngữ cho Privacy & Terms)
server/
  └── index.js                            (Cập nhật logic OAuth token: mở rộng cho phép thành viên CLB khi app được duyệt)
```

---

## 4. Kế Hoạch Triển Khai Từng Bước (Step-by-Step Execution Plan)

### Bước 1: Xây dựng Trang Privacy Policy & Terms of Service
- Viết 2 component `PrivacyPolicy.jsx` và `TermsOfService.jsx` với nội dung chuẩn chỉnh theo khuyến nghị của Strava API Agreement:
  - Mục đích thu thập: Chỉ đọc dữ liệu chạy bộ (`activity:read`, `activity:read_all`) để phục vụ bảng xếp hạng nội bộ công ty HaskoningDHV.
  - Cam kết bảo mật: Không chia sẻ dữ liệu cho bên thứ ba, không dùng cho mục đích thương mại/quảng cáo.
  - Quyền của VĐV: VĐV có toàn quyền ngắt kết nối (Revoke access) bất kỳ lúc nào trên trang cá nhân Strava hoặc gửi yêu cầu xóa dữ liệu.
  - Hiển thị logo nhận diện "Powered by Strava" theo đúng Brand Guidelines.

### Bước 2: Cập Nhật Tuyến Đường (Routing) & Phục Vụ Trang Tĩnh
- Trong `frontend/src/App.jsx`:
  - Thêm `<Route path="/privacy-policy" element={<PrivacyPolicy />} />`
  - Thêm `<Route path="/terms-of-service" element={<TermsOfService />} />`
- Thêm link liên kết nhỏ dưới chân trang `Login.jsx` để người dùng và reviewer dễ dàng nhấp vào xem.

### Bước 3: Cập Nhật Backend OAuth Handler (`server/index.js`)
- Điều chỉnh hàm kiểm tra phân quyền tại `app.post('/api/auth/token')`:
  - Hiện tại: Chỉ `isAuthorizedAdmin` mới được lưu token; thành viên khác bị `deauthorize` ngay.
  - Cập nhật thông minh: Khi nhận token của thành viên thuộc CLB (`isClubMember`), hệ thống sẽ lưu token vào `tokens_v2.json` để phục vụ Webhook real-time (thay vì tự động deauthorize).

### Bước 4: Kiểm Thử Toàn Diện Bằng Script Tự Động
- Chạy cú pháp và build frontend (`npm run build`).
- Kiểm tra HTTP response của cả 2 URL mới (`/privacy-policy` và `/terms-of-service`) đảm bảo trả về mã `200 OK`.
- Kiểm thử luồng đăng nhập Strava không bị lỗi cú pháp.

### Bước 5: Cung Cấp Hướng Dẫn & Mẫu Đơn Đăng Ký Chuẩn Strava Cho Người Dùng
- Cung cấp checklist các trường thông tin cụ thể để Admin truy cập `strava.com/settings/api` điền và bấm nút **Request Production Access**.
- Cung cấp đoạn văn bản tiếng Anh soạn sẵn (copy-paste trực tiếp).

---

## 5. Rủi Ro & Biện Pháp Phòng Ngừa (Risks & Edge Cases)

| Rủi ro tiềm ẩn | Mức độ | Biện pháp phòng ngừa |
| :--- | :---: | :--- |
| **Strava Reviewer từ chối do tên app có từ "Strava"** | **CAO** | Đặt tên app là `Haskoning Vietnam Running Club` hoặc `Haskoning Fitness Tracker`, tuyệt đối không đặt là `Strava Haskoning App` (vi phạm bản quyền tên của Strava). |
| **Thành viên ngoài CLB bấm Authorize làm tràn quota trong thời gian chờ duyệt** | **TRUNG BÌNH** | Backend chỉ chấp nhận lưu token nếu `athlete.id` có trong danh sách thành viên `club_roster.json` hoặc danh sách Admin. Người lạ sẽ bị từ chối an toàn. |
| **Single Page App bị lỗi 404 khi Strava Reviewer gõ trực tiếp URL `/privacy-policy`** | **TRUNG BÌNH** | Server Express (`server/index.js`) đã có cấu hình fallback `app.get('*', ...)` trỏ về `dist/index.html`, đảm bảo load mượt mà trên Render. |

---

## 6. Tiêu Chí Hoàn Thành (Definition of Done)

- [ ] Trang `/privacy-policy` và `/terms-of-service` hiển thị đẹp mắt, đầy đủ nội dung song ngữ, truy cập công khai không cần đăng nhập.
- [ ] Build dự án thành công (`npm run build` không lỗi).
- [ ] Backend sẵn sàng đón nhận token của các thành viên CLB để kích hoạt Webhook real-time.
- [ ] Admin nhận được mẫu đơn tiếng Anh chuẩn chỉnh và hoàn thành việc gửi yêu cầu lên Strava Developer Platform.

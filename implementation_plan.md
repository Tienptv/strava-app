# Kế Hoạch Triển Khai: Sửa Lỗi Đăng Nhập, Bảo Mật Quyền Admin & Cơ Chế Mã PIN Cá Nhân (Giải Pháp 1 + Reset PIN)

---

## I. TỔNG QUAN GIẢI PHÁP ĐÃ ĐƯỢC PHÊ DUYỆT

1. **Khắc phục lỗi văng trang Login (401 Error):**
   - Loại bỏ các lệnh gọi API Strava OAuth cá nhân (`/activities`, `/athlete/stats`, `/clubs`) trong [Dashboard.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Dashboard.jsx) khi thành viên đăng nhập bằng mã PIN.
   - Sửa hàm `apiFetch` trong [App.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/App.jsx) để không gọi `handleLogout()` làm mất phiên khi gặp lỗi 401 trên các API cá nhân.
2. **Khóa chặt quyền Quản trị viên (Chốt chọn Cách A):**
   - Phiên đăng nhập bằng Member PIN **100% là Runner thường** (`isAdmin = false, isSuperAdmin = false`), dù có chọn tên Tien PhamTV hay bất kỳ Admin/Sub-Admin nào.
   - Quyền Admin **bắt buộc** phải đăng nhập tài khoản Strava chính chủ qua **Strava OAuth** tại mục *"Exclusively for Administrators"*.
3. **Mã PIN cá nhân (Chốt chọn Giải pháp 1 + Cơ chế Tạo lại / Reset PIN):**
   - **PIN ban đầu (Mặc định):** Là **4 chữ số cuối của Strava Athlete ID** của từng thành viên (đã hiển thị ngay dưới tên trong dropdown). Không cần Passcode `200k` nữa!
   - **Cơ chế Tự đổi PIN (Self-Service Change PIN):** Khi đã vào trong app, thành viên có thể bấm "Đổi mã PIN" sang 4 số bí mật tùy thích.
   - **Cơ chế Admin Tạo lại PIN (Admin Reset PIN 1-Click):** Nếu thành viên quên PIN, Admin vào trang Quản trị bấm nút "Reset PIN" để đưa PIN của thành viên đó về lại 4 số cuối Strava ID.

---

## II. THIẾT KẾ KIẾN TRÚC CHI TIẾT

### 1. Thuật toán PIN Mặc định & Hashing bảo mật
- **Quy tắc PIN mặc định:**
  $$\text{defaultPin} = \text{athleteId.slice}(-4)$$
  *(Ví dụ: ID `133066813` $\rightarrow$ PIN `6813`; ID `110041582` $\rightarrow$ PIN `1582`)*
- **Lưu trữ dữ liệu:** `Storage/member_pins.json`
- **Cơ chế xác thực:**
  - Nếu thành viên chưa đổi PIN: So khớp mã nhập vào với `defaultPin`.
  - Nếu thành viên đã đổi PIN: So khớp băm `SHA256(pin + athleteId + APP_SECRET)` với `pinHash` đã lưu.
- **Chống dò quét (Brute-force protection):**
  - Nhập sai quá **5 lần** liên tiếp $\rightarrow$ Khóa tạm thời 15 phút.

---

### 2. Các API Backend cần xây dựng & cập nhật trong [server/index.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/index.js)

1. `POST /api/auth/verify-member`:
   - Input: `{ athleteId, pin }`
   - Kiểm tra PIN (nếu có custom PIN thì check hash, nếu chưa thì check 4 số cuối ID).
   - Trả về: `{ success: true, athlete: athleteData, isDefaultPin: boolean }`.
2. `POST /api/member/change-pin`:
   - Header: `x-athlete-id: athleteId`
   - Input: `{ oldPin, newPin }`
   - Kiểm tra `oldPin` hợp lệ, `newPin` phải là chuỗi 4 chữ số (`/^\d{4}$/`).
   - Hash và lưu vào `Storage/member_pins.json`. Ghi `audit_logs.json`.
3. `POST /api/admin/reset-member-pin`:
   - Header: `x-athlete-id: adminAthleteId`
   - Input: `{ targetAthleteId }`
   - Kiểm tra quyền: Chỉ Super Admin hoặc Sub Admin được gọi.
   - Xóa bản ghi trong `Storage/member_pins.json` (đưa về mặc định là 4 số cuối ID). Ghi `audit_logs.json`.
4. `GET /api/auth/roles`:
   - Nếu client gửi header `x-auth-method: member_pin`, trả về `isAdmin: false, isSuperAdmin: false, permissions: null`.

---

### 3. Giao diện Người dùng (Frontend)

1. **Trang Đăng nhập ([Login.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Login.jsx)):**
   - Bỏ trường nhập "Club Access Passcode (200k)".
   - Thay bằng trường: **"Mã PIN cá nhân 4 số"** (có nút bật/tắt hiện mật khẩu 👁️).
   - Thêm dòng chú thích thông minh dưới ô nhập:
     *Tiếng Việt:* `💡 Mã PIN mặc định là 4 số cuối của ID hiển thị bên trên (ví dụ ID: 133066813 ➔ PIN: 6813). Bạn có thể đổi PIN sau khi đăng nhập.`
     *English:* `💡 Default PIN is the last 4 digits of your Athlete ID above (e.g. ID: 133066813 ➔ PIN: 6813). You can change it after logging in.`
2. **Hộp thoại Đổi mã PIN ([ChangePinModal.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/ChangePinModal.jsx)):**
   - Modal đẹp mắt theo chuẩn thương hiệu Haskoning Navy/Teal.
   - Nút mở modal đặt ở:
     - Header / Navbar (bấm vào avatar cá nhân).
     - Hoặc trong thẻ Mục tiêu cá nhân [PersonalGoal.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/PersonalGoal.jsx).
3. **Trang Quản trị ([Administer.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Administer.jsx)):**
   - Thêm nút **"🔄 Reset PIN"** trong bảng quản lý thành viên.
   - Bấm vào sẽ hiện popup xác nhận: *"Reset mã PIN của thành viên [Tên] về 4 số cuối ID Strava?"* $\rightarrow$ Bấm xác nhận $\rightarrow$ Gọi API reset.

---

## III. PHẠM VI TÁC ĐỘNG (BLAST RADIUS)

1. [frontend/src/App.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/App.jsx)
2. [frontend/src/pages/Dashboard.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Dashboard.jsx)
3. [frontend/src/pages/Login.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Login.jsx)
4. [frontend/src/components/Navbar.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/Navbar.jsx)
5. [frontend/src/pages/Administer.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Administer.jsx)
6. [frontend/src/i18n/translations.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/i18n/translations.js)
7. [server/index.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/index.js)
8. File lưu trữ mới: `Storage/member_pins.json`

---

## IV. KẾ HOẠCH TỪNG BƯỚC THỰC HIỆN (STEP-BY-STEP EXECUTION PLAN)

- [ ] **Bước 1**: Cập nhật backend [server/index.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/index.js):
  - Viết logic kiểm tra PIN mặc định (4 số cuối ID) & PIN tùy chỉnh (SHA-256 hash).
  - Viết endpoint `POST /api/auth/verify-member` nhận `pin`.
  - Viết endpoint `POST /api/member/change-pin`.
  - Viết endpoint `POST /api/admin/reset-member-pin`.
  - Cập nhật `/api/auth/roles` tước bỏ quyền Admin đối với phiên `member_pin`.
- [ ] **Bước 2**: Sửa lỗi 401 văng Login trong [Dashboard.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Dashboard.jsx) và [App.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/App.jsx).
- [ ] **Bước 3**: Cập nhật giao diện [Login.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Login.jsx) sang ô nhập PIN cá nhân kèm hướng dẫn 4 số cuối ID.
- [ ] **Bước 4**: Thêm tính năng "Đổi mã PIN" trên giao diện ([ChangePinModal.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/ChangePinModal.jsx)) và nút "Reset PIN" trong [Administer.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Administer.jsx).
- [ ] **Bước 5**: Bổ sung đầy đủ từ điển đa ngôn ngữ (Tiếng Việt & Tiếng Anh) trong [translations.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/i18n/translations.js).
- [ ] **Bước 6**: Chạy bộ kiểm thử tự động (Unit / Integration Test qua script node):
  - Test 1: Đăng nhập bằng 4 số cuối ID thành công, không bị 401 văng trang.
  - Test 2: Chọn Tien PhamTV login bằng PIN không lấy được quyền Admin.
  - Test 3: Đổi PIN sang 4 số mới thành công $\rightarrow$ Đăng nhập bằng PIN mới thành công, PIN cũ bị từ chối.
  - Test 4: Admin gọi API reset PIN $\rightarrow$ PIN trở về 4 số cuối ID.
  - Test 5: Nhập sai PIN 5 lần bị khóa tạm thời.
- [ ] **Bước 7**: Báo cáo kết quả trung thực 100% kèm log kiểm thử.

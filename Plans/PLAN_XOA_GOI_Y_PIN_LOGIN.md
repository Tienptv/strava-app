# KẾ HOẠCH TRIỂN KHAI: XÓA GỢI Ý MÃ PIN TRÊN GIAO DIỆN ĐĂNG NHẬP

## 1. Mục Tiêu & Yêu Cầu Cốt Lõi (Objectives & Core Requirements)
Theo hình ảnh người dùng đã gửi và đánh dấu đỏ:
1. **Xóa dòng chữ gợi ý trong Placeholder của ô nhập PIN:**
   - Trước: `Enter 4-digit PIN (default: last 4 digits of ID)...` / `Nhập 4 số PIN (mặc định: 4 số cuối ID)...`
   - Sau: Đổi thành `Enter 4-digit personal PIN...` / `Nhập mã PIN cá nhân 4 số...`
2. **Xóa hoàn toàn Hộp gợi ý mã PIN bên dưới ô nhập:**
   - Xóa bỏ khối thông tin:
     `Default PIN for [Member Name] is [xxxx] (last 4 digits of ID). You can change it after logging in.`
   - Giúp form đăng nhập gọn gàng, bí mật và không để lộ mã PIN mặc định ra màn hình công cộng.

---

## 2. Phân Tích Kỹ Thuật & Đề Xuất (Recommendations & Trade-offs)

### Phân Tích Bảo Mật (Security Pushback & Validation)
- **Đánh giá:** Yêu cầu này của bạn là **rất chuẩn xác về tư duy bảo mật**.
- **Lý do:** Trước đó, việc để hộp gợi ý hiển thị trực tiếp `Default PIN for ... is 6813` tuy tiện cho lần đầu làm quen nhưng lại vô tình để lộ mã PIN cho bất kỳ ai mở trang web và chọn tên thành viên đó.
- **Sau khi xóa gợi ý:**
  - Quy ước "Mã PIN mặc định là 4 số cuối ID Strava" sẽ do Admin phổ biến nội bộ trong group chạy bộ/Zalo của câu lạc bộ.
  - Người ngoài hoặc thành viên khác khi chọn tên sẽ **không thấy bất kỳ gợi ý nào**, bảo vệ tuyệt đối thông tin và chỉ tiêu chạy của người đó.
  - Logic xác thực backend (mặc định 4 số cuối ID, tự đổi PIN, đếm sai 5 lần khóa tài khoản, Admin 1-click Reset PIN) **vẫn hoạt động nguyên vẹn 100%**.

---

## 3. Phạm Vi Tác Động (Blast Radius)

| Thành phần / File | Thay đổi dự kiến |
|:---|:---|
| [frontend/src/pages/Login.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Login.jsx) | Xóa bỏ hoàn toàn khối `div` hộp gợi ý mã PIN (dòng 421 - 448). |
| [frontend/src/i18n/translations.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/i18n/translations.js) | Cập nhật song ngữ (`vi` & `en`) cho key `memberPinPlaceholder` thành `"Nhập mã PIN cá nhân 4 số..."` và `"Enter 4-digit personal PIN..."`. |
| [dist/](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/dist) | Đồng bộ bundle sau khi build để bản chạy Desktop cập nhật ngay lập tức. |

---

## 4. Kế Hoạch Từng Bước (Step-by-step Execution Plan)

### Bước 1: Cập nhật từ điển dịch thuật (`translations.js`)
- Rút gọn text placeholder cho cả 2 ngôn ngữ:
  - `vi`: `'Nhập mã PIN cá nhân 4 số...'`
  - `en`: `'Enter 4-digit personal PIN...'`

### Bước 2: Loại bỏ khối Hộp gợi ý trong `Login.jsx`
- Xóa bỏ khối JSX hiển thị hộp gợi ý màu xanh Teal (chứa icon `Sparkles` và đoạn text gợi ý 4 số cuối ID).
- Giữ nguyên cấu trúc input PIN, icon `Key`, nút ẩn/hiện mật khẩu `Eye`/`EyeOff`, và thông báo lỗi `errorMsg` khi nhập sai.

### Bước 3: Biên dịch & Kiểm tra đóng gói (Vite Build)
- Chạy `npm run build --prefix frontend` để xác thực mã nguồn không có lỗi JSX/syntax.
- Đồng bộ `frontend/dist` sang thư mục `dist/`.

### Bước 4: Kiểm thử hồi quy tự động (Regression Verification)
- Chạy lại bộ test suite [server/test_member_pin_auth.mjs](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/test_member_pin_auth.mjs) để đảm bảo toàn bộ luồng đăng nhập, đổi PIN và reset PIN vẫn đạt chuẩn 100% Pass.

---

## 5. Tiêu Chí Hoàn Thành (Definition of Done)
1. Giao diện đăng nhập thành viên không còn hiển thị bất kỳ số PIN gợi ý nào.
2. Placeholder trong ô nhập hiển thị gọn gàng, bảo mật: `Enter 4-digit personal PIN...` / `Nhập mã PIN cá nhân 4 số...`.
3. Kiểm thử tự động đạt 100% PASS trên tất cả các test case.

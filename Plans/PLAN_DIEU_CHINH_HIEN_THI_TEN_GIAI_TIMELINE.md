# Kế hoạch Điều chỉnh Hiển thị Tên giải chạy trên Annual Timeline

Tài liệu này tổng hợp phân tích hiện trạng và các bước xử lý đã thực hiện:
1. **Xóa nút "Race names"** ở góc trên bên phải Timeline.
2. **Xóa khung viền/nền màu trắng** bao quanh tên các giải chạy.
3. **Liên kết tính năng ẩn/hiện tên giải chạy** trực tiếp vào nút **"Show Timeline Names"** trong trang Administer.

---

## 1. Phân tích hiện trạng (Root Cause Analysis)

Qua kiểm tra mã nguồn giao diện Timeline (ClubGoalProgress.jsx) và trang quản trị (Administer.jsx):

1. **Nút "Race names"**:
   - Đang nằm ở góc trên bên phải header của component `ClubGoalProgress` (cạnh chỉ số thời gian).
   - Nút này điều khiển state cục bộ `showRaceTitles` (mỗi lần reload trang lại bị reset, không lưu vào cơ sở dữ liệu và bị thừa thãi).
   
2. **Khung màu trắng quanh tên giải chạy**:
   - Hiện tại mỗi giải chạy đang render một thẻ `race-floating-title` với style inline:
     - `background: 'rgba(255, 255, 255, 0.9)'`
     - `border: '1px solid rgba(226, 232, 240, 0.8)'`
     - `boxShadow: '0 2px 8px rgba(0,0,0,0.1)'`
     - `backdropFilter: 'blur(10px)'`
   - Điều này tạo nên một chiếc hộp / khung màu trắng bo góc bao quanh chữ.

3. **Nút "Show Timeline Names" trong trang Administer**:
   - Quản lý cờ `goalData.showEventNames` được lưu trong file cấu hình `club_goal.json`.
   - Cần kích hoạt lưu tự động và dispatch `goalUpdated` để Timeline đồng bộ ngay lập tức.

---

## 2. Các bước triển khai thực hiện

### Component Timeline (ClubGoalProgress.jsx)
- **Xóa nút "Race names"** ở header, loại bỏ state cục bộ `showRaceTitles`.
- **Xóa bỏ khung hộp màu trắng**: Loại bỏ toàn bộ `background`, `border`, `box-shadow` xung quanh tên giải chạy.
- **Chuẩn hóa tên giải chạy**: Tên giải hiển thị dạng chữ phẳng (text thuần sắc nét, màu sắc hài hòa với nền timeline, không bị đóng khung hộp).
- **Kết nối cờ ẩn/hiện**: Tên giải chạy phụ thuộc trực tiếp vào cấu hình `goalData?.showEventNames !== false`.

### Trang Quản trị (Administer.jsx)
- Đảm bảo khi bấm nút **"Show Timeline Names"** (`Hiện tên trên Timeline`):
  - Tự động gọi hàm lưu cấu hình `handleSaveGoalSettings` xuống backend (`club_goal.json`).
  - Kích hoạt sự kiện `window.dispatchEvent(new Event('goalUpdated'))` để Timeline tự động cập nhật ngay lập tức.

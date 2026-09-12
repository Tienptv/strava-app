# Kế hoạch Tái Thiết Kế Bố Cục: Personal Goal, Statistics & Overview Cards

Tài liệu này phân tích các điểm thô, thiếu cân đối của khu vực **Mục tiêu cá nhân, Thống kê tháng và 4 thẻ tổng quan**, đồng thời đề xuất giải pháp tái cấu trúc bố cục, chuẩn hóa hệ thống Spacing (khoảng cách dọc & ngang) theo tiêu chuẩn thiết kế hiện đại, chuyên nghiệp.

---

## 1. Phân tích hiện trạng & Điểm yếu của Giao diện cũ

Dựa trên hình ảnh thực tế và mã nguồn hiện tại:

1. **Card 1 (Personal Goal) bị khoảng trống khổng lồ (Blank Void)**:
   - Do CSS Grid `grid-template-columns: repeat(3, 1fr)` buộc 3 card phải có chiều cao bằng nhau (Equal Height).
   - Card 2 (Statistics) có nội dung dài (6 widget + 1 box Coach), khiến Card 1 bị kéo dãn, để lại hơn 60% diện tích bên dưới thanh progress bar hoàn toàn trống trơn, tạo cảm giác cụt ngủn và thô.
2. **Card 3 (Penalty & Contribution) bị lỗi lồng hộp (Box-in-a-box)**:
   - Các khung xám viền đỏ và khung vàng bị lồng tầng tầng lớp lớp bên trong card chính, viền và nền không ăn nhập với phong cách chung.
   - **Lỗi hiển thị i18n**: Dòng chữ `clubAllTimeContribution: 1.040.000 VNĐ #7` đang hiện nguyên tên biến do thiếu key trong bộ từ điển `translations.js`.
3. **Hệ thống Spacing (Pacing dọc & ngang) bất đồng bộ**:
   - Hàng 3 Card trên (`personal-goal-dashboard`): `gap: 20px`, `padding: 20px`, `margin-bottom: 30px`.
   - Hàng 4 Card dưới (`stats-grid`): `gap: 16px`, `padding: 24px`, `margin-bottom: 32px`.
   - Các widget con bên trong: `padding: 12px`, `gap: 12px`.
   - Sự chênh lệch này khiến toàn bộ khu vực trông rời rạc, thiếu tính hệ thống như được ghép tạm từ các template AI khác nhau.
4. **Phân cấp thông tin chưa rõ ràng**:
   - Hàng trên là **Dữ liệu trong Tháng hiện tại** (Tháng 9/2026).
   - Hàng dưới là **Dữ liệu Tích lũy Toàn bộ** (All-time & 4 tuần gần nhất).
   - Chưa có sự kết nối hay nhãn phân tách logic khiến người xem dễ nhầm lẫn giữa số liệu tháng và số liệu toàn thời gian.

---

## 2. Giải pháp Đề xuất: Chuẩn Hóa Hệ Thống Spacing & Tái Cấu Trúc Bố Cục

### A. Chuẩn hóa Hệ thống Spacing (Unified Spacing System - 8pt Grid)
Thống nhất kích thước khoảng cách ngang và dọc cho toàn bộ khu vực:
- **Khoảng cách ngang giữa các Card (Horizontal Gap)**: Cố định **16px** (hoặc **20px** đồng bộ cho cả hàng 3 card và hàng 4 card).
- **Khoảng cách dọc giữa các hàng (Vertical Gap / Section Spacing)**: Cố định **20px**.
- **Độ đệm bên trong các Card (Card Internal Padding)**: Cố định **20px** cho tất cả các card lớn, **12px** cho các widget con.
- **Độ bo góc (Border Radius)**: Đồng bộ toàn bộ ở mức **16px** (`var(--radius-lg)`).
- **Ngôn ngữ màu sắc & bóng đổ (Glassmorphism Tokens)**: Dùng chung một hệ quy chuẩn nền kính mờ (`var(--bg-glass)`), viền mỏng tinh tế (`rgba(226, 232, 240, 0.6)`), và hiệu ứng đổ bóng mượt mà.

---

### B. Hai Phương Án Bố Cục Đẳng Cấp (Layout Options)

#### 🌟 LỰA CHỌN 1 (KHUYÊN DÙNG): Bento Grid Cân Đối Hoàn Hảo (Balanced Bento Grid)
*Giữ cấu trúc 3 cột nhưng tối ưu nội dung để 3 card đầy đặn, sang trọng, không còn khoảng trống thừa.*

1. **Cột 1: Mục tiêu Cá nhân & Tiến độ Thông minh (Personal Goal & Daily Run Rate)**:
   - Bên trên: Tiêu đề + nút Chỉnh sửa + Số km đạt được `11.9 / 100 km` và huy hiệu `%`.
   - Giữa: Thanh tiến độ phát sáng mượt mà (Glow Progress Bar).
   - **Điểm đột phá lấp khoảng trống**: Bổ sung **2 chỉ số con tính toán tức thì**:
     - 🎯 **Cần chạy mỗi ngày**: `4.6 km/ngày` (để đạt mục tiêu trong số ngày còn lại).
     - ⏳ **Thời gian còn lại**: `19 ngày còn lại`.
     - Chỉ số hoàn thành dự kiến (Pace Status).
   - Điều này biến khoảng trắng vô nghĩa thành khu vực thông tin đắt giá, giúp người chạy biết chính xác hôm nay mình phải chạy bao nhiêu km!
2. **Cột 2: Thống kê Hiệu suất Tháng (Monthly Performance)**:
   - 6 widget chỉ số (Tổng km, Thời gian, Số ngày chạy, Pace TB, Cự ly dài nhất, Số lần chạy) được căn chỉnh lưới đồng đều, icon phong cách Fluent UI tinh xảo.
   - Hộp **Coach Recommendation** được làm mỏng, tinh tế như một thanh thông báo thông minh (Smart Alert Pill) với viền màu cam/xanh dịu mắt.
3. **Cột 3: Kỷ luật & Đóng góp Quỹ CLB (Discipline & Club Fund)**:
   - **Làm phẳng (Flat Glass)**: Bỏ các lớp khung lồng khung thô cứng.
   - Phần Kỷ luật phạt: Huy hiệu thể hiện trạng thái `Đã tham gia cam kết (Tối đa 200k)` + Dự kiến phạt `180k` + số km cần bù.
   - Phần Đóng góp Quỹ: Huy hiệu đóng góp mạ vàng sang trọng, hiển thị đúng chữ tiếng Việt/Anh `Đóng góp quỹ CLB: 1.040.000 VNĐ #7` (sửa triệt để lỗi key `clubAllTimeContribution:`).
4. **Hàng 4 Card Thống Kê Toàn Thời Gian (Career Overview)**:
   - Đặt ngay bên dưới với `gap: 16px` và `padding: 20px` đồng bộ 100% với hàng trên.
   - Header phụ nhẹ nhàng: *"Tổng tích lũy hoạt động (Career Overview)"* để phân biệt rành mạch với số liệu tháng.

---

#### 🌟 LỰA CHỌN 2: Bố cục Tỷ lệ Vàng 2 Cột (2-Column Hero & Aside Layout)
- **Cột Trái Lớn (65% chiều rộng)**: Hợp nhất toàn bộ **Mục tiêu Tháng + 6 Thống kê Tháng + Lời khuyên Coach** thành một khối Dashboard lớn liền mạch, các chỉ số đặt gọn bên cạnh mục tiêu.
- **Cột Phải (35% chiều rộng)**: Dành riêng cho **Cam kết Kỷ luật, Quỹ CLB & Xếp hạng đóng góp** được thiết kế dạng thẻ dọc cao cấp.
- **Hàng 4 Card Dưới**: Giữ nguyên vị trí nhưng đồng bộ khoảng cách và phong cách thị giác.

---

## 3. Chi tiết các tệp sẽ cập nhật khi thực hiện

| Tệp tin | Vị trí thay đổi | Mục đích |
|:---|:---|:---|
| [PersonalGoal.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/PersonalGoal.jsx) | Card 1, Card 3, cấu trúc HTML | Bổ sung chỉ số km/ngày lấp khoảng trống Card 1; làm phẳng Card 3; sửa key dịch đóng góp quỹ |
| [translations.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/i18n/translations.js) | Từ điển VI & EN | Bổ sung key dịch `clubAllTimeContribution`, `dailyTargetNeeded`, `daysRemaining` |
| [index.css](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/index.css) | `.personal-goal-dashboard`, `.stats-grid`, `.pg-card`, `.stat-card` | Thống nhất kích thước gap (16px), padding (20px), border-radius (16px) đồng bộ giữa các hàng |
| [Dashboard.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Dashboard.jsx) | Khu vực render PersonalGoal & stats-grid | Thêm sub-header phân tầng số liệu tháng vs số liệu toàn thời gian |

---

## 4. Kế hoạch xác minh sau triển khai

1. **Kiểm tra tỷ lệ hình học & khoảng cách**: Đo đạc bằng DevTools đảm bảo gap dọc và ngang giữa các card đạt đúng 16px/20px đồng nhất.
2. **Kiểm tra độ đầy đặn của các Card**: Card 1 không còn vùng trắng thừa thãi; Card 3 hiển thị phẳng mượt, không lồng hộp; chữ tiếng Việt/Anh hiển thị chuẩn xác 100%.
3. **Kiểm tra tính Responsive**: Co giãn màn hình từ Desktop (1920px, 1440px, 1280px) xuống Tablet (1024px, 768px) và Mobile (375px - 414px) đảm bảo tự động chuyển thành lưới 2 cột hoặc 1 cột mượt mà, không bị vỡ bố cục.

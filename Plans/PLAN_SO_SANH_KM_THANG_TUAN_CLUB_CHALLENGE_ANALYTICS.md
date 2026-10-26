# Kế Hoạch Triển Khai: Bổ Sung Biểu Đồ So Sánh Các Tháng & Phân Tích Theo Tuần Trong Club Challenge Analytics

## 1. Mục Tiêu & Yêu Cầu Cốt Lõi (Objectives & Definition of Done)

### 1.1. Mục tiêu
Người dùng yêu cầu: *"trong phần thống kê này, bổ sung so sánh giữa các tháng số km của cả nhóm, thêm các chart so sánh cho tháng, tuần, ..."*
Hiện tại, khối **Club Challenge Analytics** mới chỉ cung cấp 3 góc nhìn:
1. `Daily Trend`: Xu hướng theo từng ngày của tháng đang chọn (1..31).
2. `Runners Progression Line`: Đường đua tích lũy/hàng ngày của từng runner trong tháng.
3. `All-Time KM Donut`: Cơ cấu đóng góp tổng km tích lũy từ trước đến nay.

Yêu cầu cần bổ sung 2 biểu đồ phân tích so sánh cấp độ nhóm cốt lõi:
1. **So sánh giữa các tháng (Monthly Comparison)**: So sánh tổng km của cả nhóm qua 12 tháng trong năm, chỉ ra tháng cao điểm (Peak Month), tháng thấp điểm, tỷ lệ tăng trưởng so với tháng trước (MoM Growth), số lượng runner tích cực và tổng lượt chạy mỗi tháng.
2. **Phân tích so sánh theo tuần (Weekly Analytics)**:
   - **Góc nhìn A - Các tuần trong tháng (Weeks in Month)**: Chia tháng thành các tuần (W1: ngày 1-7, W2: ngày 8-14, W3: ngày 15-21, W4: ngày 22-28, W5: ngày 29-cuối tháng), so sánh khối lượng km và số runner chạy từng tuần.
   - **Góc nhìn B - Nhịp độ các thứ trong tuần (Day of Week Distribution: Thứ 2 -> Chủ Nhật)**: Phân tích xem nhóm chạy nhiều nhất vào thứ mấy (ví dụ: Chủ nhật chạy Long Run chiếm 30% km cả tuần), số km và số lượt chạy trung bình của từng thứ.
   - **Góc nhìn C - Xu hướng các tuần liên tục (Rolling 8–12 Weeks)**: Xu hướng khối lượng km cả nhóm theo từng tuần liên tiếp (W35 -> W43) không bị ngắt quãng bởi ranh giới đầu/cuối tháng.

### 1.2. Tiêu chí hoàn thành (Definition of Done)
- [x] Tích hợp 2 tab mới vào thanh Segmented Control của `ChallengeCharts`: **"So sánh các tháng" (`tabMonthlyCompare`)** và **"Phân tích theo tuần" (`tabWeeklyCompare`)**.
- [x] Hỗ trợ chuyển đổi mượt mà giữa các góc nhìn con (sub-modes) bằng pill buttons chuẩn thẩm mỹ Haskoning.
- [x] Hiển thị KPI highlight chips (Peak Month, Monthly Avg, YTD Total, Peak Week, Best Day of Week).
- [x] Đánh dấu nổi bật tháng đang xem (`challengeMonth`) so với các tháng khác trên Bar Chart.
- [x] Đồng bộ 100% đa ngôn ngữ (Tiếng Việt & English) trong `translations.js`.
- [x] Chuẩn nhận diện thương hiệu Haskoning (Navy `#002D54`, Teal `#00A3A6`, Lime `#78BE20`, Amber `#F59E0B`).
- [x] Đảm bảo tuân thủ định danh thành viên bằng `athleteId`, deduplication theo `compKey` chống đúp hoạt động.
- [x] Viết test suite độc lập chạy kiểm thử tự động toàn bộ logic gom nhóm tháng/tuần và các trường hợp biên.

---

## 2. Phân Tích Phương Án & Khuyến Nghị Kỹ Thuật (Recommendations & Trade-offs)

### Phương án A: Chỉ tính toán trên dữ liệu tháng hiện tại
- **Ưu điểm**: Không cần truyền thêm prop `allActivities` vào `ChallengeCharts`, chỉ tính toán tuần 1..5 trong tháng và 7 ngày trong tuần.
- **Nhược điểm**: KHÔNG THỂ so sánh giữa các tháng trong năm (vì dữ liệu truyền vào `challengeData` hiện tại chỉ có các ngày của tháng đang chọn). Không đáp ứng đúng yêu cầu "so sánh giữa các tháng số km của cả nhóm".

### Phương án B (Khuyến nghị - Recommended): Truyền `allActivities` vào `ChallengeCharts` và gom nhóm dữ liệu tự động
- **Ưu điểm**:
  - `Dashboard.jsx` đã tải sẵn toàn bộ hoạt động của CLB (`allChallengeActivities` từ cả `historical_activities.json` và `imported_activities.json`).
  - `ChallengeCharts` nhận prop `allActivities={allChallengeActivities}` sẽ có đầy đủ dữ liệu 12 tháng của năm hiện tại (và các năm trước).
  - Tự động gom nhóm (aggregate) theo `year` và `month` với hiệu năng cực cao bằng `useMemo` (chỉ tính lại khi `allActivities` hoặc `year` thay đổi).
  - Cho phép người dùng vừa so sánh được 12 tháng của năm, vừa phân tích chi tiết theo tuần trong tháng và phân bổ 7 ngày trong tuần (T2 - CN).
  - Khả năng mở rộng tốt: Khi admin đổi năm trên thanh chọn tháng/năm, biểu đồ tự động cập nhật theo năm đó.
- **Nhược điểm**: Cần thêm một ít hàm tính toán gom nhóm tháng/tuần trong `ChallengeCharts.jsx` (đã được tối ưu O(N) với N là số lượng hoạt động).

---

## 3. Phạm Vi Tác Động (Blast Radius)

| File | Thành phần thay đổi | Mục đích |
| :--- | :--- | :--- |
| [Dashboard.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/pages/Dashboard.jsx) | `<ChallengeCharts />` props | Truyền thêm `allActivities={allChallengeActivities}` |
| [ChallengeCharts.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/ChallengeCharts.jsx) | `ChallengeCharts` component | Thêm tabs `monthly` & `weekly`, logic tính toán gom nhóm tháng/tuần, các subcontrols và Bar charts tương ứng |
| [translations.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/i18n/translations.js) | Từ điển `vi` & `en` | Bổ sung các keys ngôn ngữ cho tab, tooltip, metrics, chế độ tuần |
| [index.css](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/index.css) | Stylesheets | Bổ sung styles cho subcontrols, highlight cards, day-of-week badges, layout responsive |
| [test_challenge_charts_comparison.cjs](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/test_challenge_charts_comparison.cjs) | Test suite mới | Kiểm thử tự động tính toán tháng/tuần, deduplication, edge cases |

---

## 4. Kế Hoạch Từng Bước (Step-by-Step Execution Plan)

### Bước 1: Bổ sung từ điển đa ngôn ngữ (`translations.js`)
Thêm các khóa dịch song ngữ 100% cho cả `vi` và `en`:
- `tabMonthlyCompare`: 'So sánh các tháng' / 'Monthly Comparison'
- `tabWeeklyCompare`: 'Phân tích theo tuần' / 'Weekly Analytics'
- `monthlyCompareSubtitle`: 'So sánh tổng quãng đường và độ tích cực của CLB qua các tháng' / 'Comparison of total club distance and active participation across months'
- `weeklyCompareSubtitle`: 'Phân tích khối lượng chạy theo tuần và phân bố nhịp độ các ngày' / 'Weekly distance breakdown and day-of-week rhythm distribution'
- `modeWeeksInMonth`: 'Các tuần trong tháng' / 'Weeks in Month'
- `modeDayOfWeek`: 'Thứ trong tuần (T2 - CN)' / 'Day of Week (Mon - Sun)'
- `modeRollingWeeks`: '8 tuần gần nhất' / 'Recent 8 Weeks'
- `peakMonth`: 'Tháng cao điểm nhất' / 'Peak Month'
- `monthlyAvg`: 'Trung bình tháng' / 'Monthly Average'
- `ytdTotal`: 'Tổng lũy kế cả năm' / 'YTD Club Total'
- `momGrowth`: 'Tăng trưởng so với tháng trước' / 'MoM Growth'
- `weekLabel`: 'Tuần' / 'Week'
- `dayMonday` .. `daySunday`: 'Thứ Hai' .. 'Chủ Nhật' / 'Monday' .. 'Sunday'

### Bước 2: Truyền `allActivities` từ `Dashboard.jsx` sang `ChallengeCharts`
- Thêm prop `allActivities={allChallengeActivities}` vào `<ChallengeCharts />` tại dòng 596 của `Dashboard.jsx`.

### Bước 3: Nâng cấp `ChallengeCharts.jsx`
1. **Tiếp nhận props**: Nhận `allActivities = []`.
2. **Logic tính toán tháng (`monthlyStats`)**:
   - Lọc hoạt động trong năm `year` từ `allActivities`, loại bỏ trùng lặp (`compKey` / `act.id`).
   - Gom theo 12 tháng (1 đến 12).
   - Với mỗi tháng $m$: tính tổng km cả nhóm, số runner hoạt động (`activeRunnersSet.size`), số buổi chạy.
   - Tính toán chỉ số: `peakMonth`, `avgKmPerMonth`, `ytdTotalKm`, tăng trưởng % giữa tháng $m$ và tháng $m-1$.
   - Cấu hình dữ liệu Bar Chart: Màu thanh cột sử dụng Haskoning Teal (`#00A3A6`), riêng tháng hiện tại (`month`) đánh dấu màu Amber Gold (`#F59E0B`), tháng cao nhất đánh dấu dải năng lượng Lime (`#78BE20`).
3. **Logic tính toán tuần (`weeklyStats`)**:
   - **Chế độ 1 - Các tuần trong tháng (`weeksInMonth`)**:
     - Tuần 1 (1-7), Tuần 2 (8-14), Tuần 3 (15-21), Tuần 4 (22-28), Tuần 5 (29-hết tháng).
     - Tính tổng km và số runner chạy từng tuần từ `dailyDistances` / hoạt động trong tháng.
   - **Chế độ 2 - Phân bố theo thứ trong tuần (`dayOfWeekStats`)**:
     - 7 ngày (T2, T3, T4, T5, T6, T7, CN).
     - Gom km từ `dailyTotals` của tháng dựa theo `new Date(year, month - 1, day).getDay()`.
     - Tính % đóng góp của từng ngày vào tổng km tháng, xác định ngày cao điểm (vd: Chủ Nhật Long Run).
   - **Chế độ 3 - 8 tuần gần nhất (`rollingWeeksStats`)**:
     - Gom dữ liệu của 8 tuần gần nhất lùi từ tuần hiện tại để runner theo dõi phong độ liên tục.
4. **Giao diện người dùng (UI)**:
   - Mở rộng thanh segmented control từ 3 tab lên 5 tab.
   - Thêm subcontrols chuyển đổi chế độ xem cho tab tuần (`weeksInMonth` / `dayOfWeek` / `rollingWeeks`).
   - Thêm các thẻ KPI tóm tắt trực quan phía trên biểu đồ.
   - Đảm bảo tooltip hiển thị đầy đủ thông tin: Tổng km, số runner chạy, số lượt chạy, tỷ lệ đóng góp %.

### Bước 4: Tinh chỉnh CSS & Thiết kế chuẩn Haskoning (`index.css`)
- Định dạng các segmented pill buttons, KPI chips, badge thứ trong tuần.
- Đảm bảo responsive hoàn hảo trên cả màn hình desktop, tablet và mobile.
- Hiệu ứng hover nhấc nhẹ 2px, bo góc 8px theo đúng quy tắc Haskoning Branding.

### Bước 5: Kiểm thử tự động & Báo cáo trung thực 100%
- Tạo script test `test_challenge_charts_comparison.cjs` kiểm tra:
  - Tính chính xác của phép gom nhóm 12 tháng và 5 tuần.
  - Tính toán tỷ lệ tăng trưởng MoM (+/- %).
  - Xử lý các edge cases: tháng không có bài chạy (0 km), tháng 2 năm nhuận (29 ngày), runner không có ID (fallback name).
  - Type/Syntax check trên toàn bộ các file sửa đổi.

---

## 5. Dự Đoán Trường Hợp Biên & Biện Pháp Phòng Tránh (Edge Cases & Risks)

| Trường hợp biên (Edge Case) | Rủi ro tiềm ẩn | Biện pháp phòng tránh kỹ thuật |
| :--- | :--- | :--- |
| **Tháng tương lai chưa diễn ra** (ví dụ: đang ở T10 mà xem T11, T12) | Hiển thị 0 km hoặc lỗi chia cho 0 khi tính trung bình/tăng trưởng | Chỉ tính trung bình và tăng trưởng trên các tháng đã có bài chạy (`km > 0` hoặc `month <= currentMonth`). |
| **Tháng 2 có 28 hoặc 29 ngày** | Lệch ngày khi tính Tuần 4 & Tuần 5 | Dùng `new Date(year, month, 0).getDate()` để lấy chính xác số ngày thực tế của tháng. |
| **Trùng lặp hoạt động (Deduplication)** | Một bài chạy được import nhiều lần làm phóng đại số km của tháng | Sử dụng cơ chế lọc kép `seenActKeys` với cả `id` và `compKey` (`athleteId_timeMinute_distance_movingTime`). |
| **Lệch múi giờ (`start_date_local`)** | Chuỗi ngày có đuôi `'Z'` gây nhảy sang ngày hôm trước/sau khi parse | Bóc tách phần `'Z'` và đọc chuỗi `YYYY-MM-DD` trực tiếp hoặc parse đúng local time như chuẩn trong `challengeStats.js`. |
| **Không có dữ liệu (`allActivities` rỗng)** | Lỗi runtime `undefined` / `NaN` | Luôn kiểm tra mảng an toàn `Array.isArray(allActivities)` và gán giá trị mặc định fallback `0`. |
| **Nhiều runner trùng tên** | Gom nhầm km giữa các runner | Bắt buộc định danh theo Strava `athleteId` làm khóa chính theo quy tắc Workspace Rule số 6. |

---

## 6. Minh Họa Thiết Kế Giao Diện (UI Mockup)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ CLUB CHALLENGE ANALYTICS                                      [⭐ Set Default]  [Collapse ⌃]  │
│    Comparison of total club distance and active participation across months                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ 📊 TOTAL YTD KM ]     [ 🏆 PEAK MONTH ]        [ 📈 MONTHLY AVG ]      [ 🏃 ACTIVE RUNNERS ]  │
│   7,842.5 km              Month 8 (1,420 km)       871.4 km/mo             22/24 runners        │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Daily Trend ] [ Runners Line ] [ ⭐ Monthly Comparison ] [ ⭐ Weekly Analytics ] [ All-Time Donut ]│
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Chế độ: 12 Tháng Năm 2026]                                 🔥 Peak Month: Tháng 8 (1,420.5 km) │
│                                                                                                 │
│  KM                                                                                             │
│ 1500│                                     █                                                     │
│ 1200│                         █           █                                                     │
│  900│             █           █           █           █ (T10 đang xem)                          │
│  600│ █           █           █           █           █                                         │
│  300│ █     █     █     █     █     █     █     █     █                                         │
│    0└───┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴                     │
│        T1    T2    T3    T4    T5    T6    T7    T8    T9   T10   T11   T12                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

# Kế Hoạch Triển Khai: Nâng Cấp AI Coach Với Mô Hình Khoa Học Thể Thao Chuẩn Garmin & Apple Health

## 1. Bối Cảnh & Mục Tiêu (Context & Objectives)
Người dùng mong muốn ứng dụng các mô hình và thuật toán thể thao hiện đại từ các chương trình như **Garmin (Firstbeat Analytics)** và **Apple Health (Apple Fitness+)** vào tính năng **AI Coach** của dự án Strava Desktop Software.

Mặc dù các tệp model nhị phân đóng của Garmin/Apple không thể xuất ra ngoài thiết bị do rào cản bản quyền phần cứng, chúng ta hoàn toàn có thể xây dựng **bộ máy Khoa học Thể thao Sinh lý học (Sports Science & Physiological Analytics Engine)** dựa trên chính xác các công thức và nguyên lý mà Garmin / Firstbeat và Jack Daniels VDOT đang sử dụng.

### Mục Tiêu Nâng Cấp:
1. **Thuật toán Tải Luyện Tập & Trạng Thái Thể Lực chuẩn Garmin (ACWR Training Status):**
   - Tính toán tỷ lệ tải cấp tính 7 ngày (Acute Load) so với tải nền tảng 28 ngày (Chronic Load) theo mô hình Banister & Gabbett ACWR.
   - Phân loại trạng thái: **`🔥 Productive (Hiệu quả)`**, **`⚡ Peaking (Điểm rơi phong độ)`**, **`🌿 Recovery (Phục hồi)`**, **`⚠️ Overreaching (Quá tải/Cảnh báo chấn thương)`**, **`📉 Maintaining (Duy trì)`**, **`💤 Detraining (Giảm thể lực)`**.
2. **Ước tính VDOT & Dự Đoán Thành Tích (Race Time Predictor kiểu Garmin):**
   - Ứng dụng công thức VDOT của Jack Daniels để dự đoán thời gian hoàn thành các cự ly thi đấu: **5K**, **10K**, **21.1K (Half Marathon)**.
   - Tính toán các dải Pace tập luyện cá nhân hóa: **Easy Pace (Zone 2)**, **Marathon Pace**, **Threshold Pace (Tempo)**, **Interval Pace**.
3. **Phân Tích Nhịp Tim & Guồng Chân (Heart Rate Zones & Cadence Insights):**
   - Trích xuất dữ liệu `average_heartrate` và `cadence` từ các bài tập Strava (do đồng hồ Garmin / Apple Watch sync lên).
   - Đánh giá tỷ lệ hiếu khí (Zone 2) và cảnh báo sải bước dài (over-striding < 155 spm) để tránh chấn thương khớp gối.
4. **Nâng Cấp Prompt Cho Gemini AI Coach (Sports Science Persona):**
   - Bơm các dữ liệu ACWR, VDOT, Recovery Hours và Zone nhịp tim vào Context của Google Gemini API trong [server/ai_coach_service.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/ai_coach_service.js).
   - Gemini sẽ phản hồi với vị thế của một HLV trưởng Garmin chuyên nghiệp, giàu chuyên môn và truyền cảm hứng.
5. **Giao Diện Widget Thể Thao Garmin Sang Trọng (Haskoning Brand UI):**
   - Thêm khối **Garmin Training Status & Race Predictor** trong tab Mục Tiêu Cá Nhân ([PersonalGoal.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/PersonalGoal.jsx)).
   - Thanh đo ACWR trực quan với 3 dải màu: Xanh Lime (`#78BE20`) cho Sweet Spot tối ưu, Vàng cảnh báo, Đỏ nguy hiểm.
   - Thời gian phục hồi khuyến nghị (**Recovery Hours**).

---

## 2. Thiết Kế Kỹ Thuật Chi Tiết (Technical Architecture)

### Module 1: Bộ Máy Khoa Học Thể Thao ([server/sports_science_service.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/sports_science_service.js) - [NEW])
Tạo riêng một module thể thao chuyên biệt:
- **`calculateACWR(activities, athleteId)`:**
  - Lọc tất cả hoạt động chạy trong 28 ngày gần nhất dựa trên `athleteId`.
  - Tải 7 ngày gần nhất (Acute): Tổng km có trọng số cường độ (kết hợp pace và nhịp tim nếu có).
  - Tải 28 ngày (Chronic): Trung bình 4 tuần.
  - Tỷ lệ: `acwr = acuteLoad / Math.max(1, chronicLoad / 4)`.
  - Xác định nhãn Garmin:
    - `acwr > 1.5`: `Overreaching` (Cảnh báo quá tải, nguy cơ chấn thương)
    - `1.0 <= acwr <= 1.3`: `Productive` (Vùng tối ưu Sweet Spot)
    - `0.8 <= acwr < 1.0`: `Maintaining` hoặc `Peaking` (nếu tải trước đó cao và đang giảm dần)
    - `0.5 <= acwr < 0.8`: `Recovery`
    - `acwr < 0.5`: `Detraining`
- **`calculateVDOTAndPredictions(activities, athleteId)`:**
  - Tìm bài chạy tốt nhất (Best Effort) trong 60 ngày gần nhất (khoảng cách >= 3km, pace nhanh nhất).
  - Áp dụng công thức VDOT (Jack Daniels) tính VO2 tiêu thụ oxy tương đương.
  - Dự đoán thời gian hoàn thành 5K, 10K, 21K:
    - $Time_{target} = Time_{best} \times (Distance_{target} / Distance_{best})^{1.06}$ (Công thức Riegel).
  - Trả về dải Pace đề xuất: Easy (Zone 2), Tempo, Interval.
- **`calculateRecoveryHours(latestRun, acwr)`:**
  - Ước lượng thời gian phục hồi cần thiết (12h, 24h, 36h, 48h, 72h) dựa trên cự ly bài chạy gần nhất, nhịp tim trung bình và tỷ lệ ACWR.

### Module 2: Tích Hợp Vào Backend & Gemini AI ([server/ai_coach_service.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/ai_coach_service.js) [MODIFY])
- Nhập module `sports_science_service.js` vào `ai_coach_service.js`.
- Bổ sung `sportsMetrics` vào kết quả trả về của `/api/ai/coach-advice`:
  ```json
  {
    "badge": "Productive 🔥",
    "trainingStatus": {
      "key": "productive",
      "label": "Tập luyện hiệu quả (Productive)",
      "acwr": 1.15,
      "statusColor": "#78BE20",
      "recoveryHours": 24,
      "description": "Khối lượng tập luyện đang ở vùng tối ưu giúp nâng cao thể lực bền vững."
    },
    "racePredictions": {
      "vdot": 42.5,
      "predicted5k": "26:45",
      "predicted10k": "55:30",
      "predicted21k": "2:04:15"
    },
    "trainingPaces": {
      "easyZone2": "6:30 - 7:00 /km",
      "tempo": "5:45 - 6:00 /km",
      "interval": "5:10 - 5:25 /km"
    },
    "message": "...",
    "actionPlan": "..."
  }
  ```
- Cập nhật System Prompt gửi đến Gemini Flash: Bổ sung chỉ số ACWR, trạng thái thể lực Garmin và dải Pace Zone 2 để Gemini tư vấn chính xác chuyên môn.

### Module 3: Giao Diện Frontend ([frontend/src/components/PersonalGoal.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/PersonalGoal.jsx) & [frontend/src/index.css](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/index.css) [MODIFY])
- Thiết kế Component **`GarminTrainingStatusWidget`** tích hợp trong AI Coach Box:
  1. **Badge Thể Lực Thể Thao:** Hiển thị nổi bật phong cách Garmin (`🔥 Productive`, `⚡ Peaking`, `⚠️ Overreaching`).
  2. **Thanh ACWR Meter:** Dải màu gradient trực quan thể hiện tải 7 ngày / 28 ngày.
  3. **Đồng hồ thời gian phục hồi (Recovery Advisor):** Ví dụ: `⏱ 24h nghỉ ngơi tối ưu`.
  4. **Bảng Dự Đoán Cự Ly (Race Predictor):** 3 chip nhỏ gọn hiển thị dự đoán 5K, 10K, 21K.
  5. **Gợi ý Pace Zone 2:** Hướng dẫn runner chạy dưỡng sinh phục hồi hiệu quả nhất.
- Đảm bảo tuân thủ 100% nhận diện thương hiệu Haskoning (Navy `#002D54`, Teal `#00A3A6`, Lime Green `#78BE20`).
- Đa ngôn ngữ song song 100% (VI & EN) trong [translations.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/i18n/translations.js).

---

## 3. Danh Sách File Cần Chỉnh Sửa & Tạo Mới

| Thao tác | Tệp tin | Trách nhiệm |
| :--- | :--- | :--- |
| **[NEW]** | [server/sports_science_service.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/sports_science_service.js) | Lõi thuật toán ACWR, Training Status, Jack Daniels VDOT, Race Time Predictor, Recovery Time. |
| **[MODIFY]** | [server/ai_coach_service.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/ai_coach_service.js) | Tích hợp metrics khoa học thể thao vào response, nâng cấp prompt Gemini với các chỉ số sinh lý học. |
| **[MODIFY]** | [frontend/src/components/PersonalGoal.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/PersonalGoal.jsx) | Render Widget Training Status, thanh ACWR Meter, Race Predictions, Recovery Hours. |
| **[MODIFY]** | [frontend/src/i18n/translations.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/i18n/translations.js) | Thêm từ điển song ngữ VI/EN cho các trạng thái Garmin (Productive, Peaking, Overreaching, Race Predictor, v.v.). |
| **[MODIFY]** | [frontend/src/index.css](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/index.css) | Thêm CSS styles cho Garmin Sports Science Widget, thanh ACWR meter, race chips, và hiệu ứng nút chuẩn Haskoning. |

---

## 4. Kế Hoạch Kiểm Thử Thực Tế (Verification Plan)

### Automated Tests:
- Tạo test script `scratch/test_sports_science_garmin.mjs` kiểm tra toàn bộ:
  1. **Tính toán ACWR:**
     - Test case tải bình thường (ACWR ~ 1.1) -> Trả về `productive`.
     - Test case tăng vọt quãng đường gấp 2 lần trong 7 ngày (ACWR > 1.6) -> Trả về `overreaching` kèm cảnh báo chấn thương.
     - Test case nghỉ dài ngày -> Trả về `detraining` hoặc `recovery`.
  2. **Jack Daniels VDOT & Race Predictor:**
     - Test case với bài chạy 5km 25:00 -> Dự đoán 10K (~52 phút) và HM (~1h55) theo chuẩn sinh lý học.
  3. **Athlete ID Rule (Quy tắc 6):**
     - Kiểm thử độc lập giữa 2 runner trùng tên (ví dụ: `Phuong N.` ID 1111 và `Phuong T.` ID 2222) đảm bảo ACWR và VDOT tính toán hoàn toàn độc lập dựa trên Strava Athlete ID.
  4. **Bilingual Parity (Quy tắc 4):**
     - Đảm bảo 100% nhãn trạng thái chuyển đổi mượt mà giữa Tiếng Anh và Tiếng Việt không sót chuỗi nào.
  5. **Vite Build Verification:**
     - Chạy `npm run build` để đảm bảo 0 lỗi biên dịch.

### Manual Verification:
- Mở giao diện trên trình duyệt xem trực quan Widget Training Status phong cách Garmin trong mục Personal Goal & AI Coach.

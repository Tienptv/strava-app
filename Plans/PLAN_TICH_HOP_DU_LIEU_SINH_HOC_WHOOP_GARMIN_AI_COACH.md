# Kế Hoạch Triển Khai: Tích Hợp Dữ Liệu Sinh Học Whoop & Garmin Vào AI Running Coach

---

## 1. Phân Tích Chuyên Sâu: "Whoop Coach Có Thể Tích Hợp Vào AI Coach Của Dự Án Không?"

### 1.1. Bản Chất Kỹ Thuật: "Whoop Coach" vs. "WHOOP Developer API"

Khi nghiên cứu khả năng tích hợp Whoop vào dự án, cần phân biệt rõ hai khái niệm cốt lõi:

| Khái niệm | Đặc điểm kỹ thuật | Khả năng tích hợp vào dự án |
| :--- | :--- | :--- |
| **Whoop Coach (Gốc)** | Là chatbot AI đóng kín chạy bên trong ứng dụng di động WHOOP (sử dụng OpenAI GPT-4 kết hợp dữ liệu cá nhân của hội viên WHOOP). WHOOP **không cung cấp API** để nhúng trực tiếp con bot chat này ra ứng dụng bên ngoài. | ❌ **Không thể** nhúng nguyên bản cửa sổ chat của Whoop Coach vào ứng dụng khác. |
| **WHOOP Developer API (OAuth 2.0)** | WHOOP cung cấp cổng API chính thức (`https://api.prod.whoop.com/developer/v1/`) cho phép trích xuất toàn bộ dữ liệu sinh lý học 24/7 của vận động viên. |  **Tích hợp hoàn hảo 100%**: Sử dụng toàn bộ chỉ số sinh lý từ Whoop làm đầu vào cho **AI Running Coach (Google Gemini Flash + Sports Science Engine)** của dự án. |

> **Kết luận:** Hệ thống của chúng ta không cần (và không thể) gọi con bot đóng kín của WHOOP, mà sẽ **nạp trực tiếp các dữ liệu sinh lý học của Whoop vào bộ não AI Coach hiện có**. Khi đó, AI Coach của chúng ta sẽ thông minh hơn cả Whoop Coach nguyên bản vì nó vừa hiểu sâu giáo án chạy bộ điền kinh (Strava, VDOT, ACWR), vừa thấu hiểu thể trạng sinh lý học (Whoop Recovery, HRV, Sleep).

---

### 1.2. Các Chỉ Số Sinh Học Cốt Lõi Từ Whoop Được Nạp Vào AI Coach

1. **Recovery Score (0 - 100%):**
   - **Vùng Xanh (> 66%):** Cơ thể phục hồi hoàn toàn, hệ thần kinh tự chủ sẵn sàng cho bài tập nặng/dài.
   - **Vùng Vàng (34% - 66%):** Cơ thể ở mức cân bằng, duy trì bài chạy cự ly trung bình ở Zone 2.
   - **Vùng Đỏ (< 34%):** Cơ thể kiệt quệ, hệ miễn dịch và mô cơ đang bị căng thẳng nghiêm trọng.
2. **HRV (Heart Rate Variability - rmSSD):**
   - Thước đo vàng của hệ thần kinh tự chủ (Autonomic Nervous System). HRV cao phản ánh trạng thái thư giãn (phó giao cảm), HRV sụt giảm mạnh phản ánh căng thẳng, mệt mỏi hoặc ủ bệnh.
3. **Resting Heart Rate (RHR):**
   - Nhịp tim nghỉ khi ngủ sâu. Nếu RHR tăng cao bất thường (tăng 5-8 bpm so với baseline), đây là dấu hiệu cơ thể quá tải hoặc viêm nhiễm mô cơ.
4. **Day Strain (0 - 21):**
   - Tải tim mạch tích lũy trong toàn bộ 24 giờ của một ngày (bao gồm cả áp lực công việc, đi lại chứ không chỉ riêng lúc chạy).
5. **Sleep Performance & Sleep Debt:**
   - Thời lượng ngủ thực tế so với nhu cầu tái tạo cơ bắp và số giờ thiếu ngủ tích lũy.

---

### 1.3. Sức Mạnh Khi Kết Hợp "Ngoại Lực" (Strava) + "Nội Lực" (Whoop)

Hiện tại, AI Running Coach của dự án phân tích chủ yếu dựa trên **Ngoại lực (External Workload)** từ Strava:
- Cự ly (km), Vận tốc (Pace), Độ dốc (Elevation Gain), Tải 7 ngày / 28 ngày (ACWR), Jack Daniels VDOT.

Khi tích hợp thêm Whoop, hệ thống bổ sung thêm mảnh ghép **Nội lực sinh lý (Internal Physiological Load)**.

#### 💡 Kịch bản thực tế chứng minh sự vượt trội:
> **Tình huống:** Runner còn thiếu **15 km** để hoàn thành mục tiêu tháng và giải tỏa áp lực nộp phạt quỹ CLB.
>
> - **Khi KHÔNG có Whoop:** AI Coach thấy còn thiếu km sẽ giục:
>   *🏃 "Bạn còn thiếu 15km trong 2 ngày cuối tháng. Hôm nay bạn cần chạy 7.5km pace 6:00 để đuổi kịp tiến độ!"*
> - **Khi CÓ dữ liệu Whoop (Recovery 22% - Vùng Đỏ, HRV tụt 35%, nợ ngủ 2.5 tiếng):** AI Coach lập tức kích hoạt bộ lọc bảo vệ:
>   *🛑 "Cảnh báo an toàn sinh học: Recovery sáng nay của bạn chỉ đạt 22% (Vùng Đỏ) do thiếu ngủ và hệ thần kinh đang căng thẳng cực độ. Bất chấp mục tiêu tháng còn thiếu 15km, HÔM NAY BẠN BẮT BUỘC KHÔNG ĐƯỢC CHẠY GẮNG SỨC! Hãy nghỉ ngơi hoàn toàn hoặc chỉ đi bộ nhẹ nhàng 2km Zone 1 để tránh nguy cơ rách cơ hoặc trụy tim mạch. Tiến độ tháng sẽ được bù đắp khi chỉ số phục hồi chuyển sang màu Xanh."*

---

### 1.4. Ba Phương Án Tích Hợp Whoop Cụ Thể

1. **Phương án 1: Tích hợp chính thức qua WHOOP Developer API (OAuth 2.0 - Tự động 100%):**
   - Thành viên liên kết tài khoản Whoop qua cổng OAuth 2.0 chuẩn.
   - Backend Node.js tự động gọi các endpoint `/v1/recovery`, `/v1/cycle`, `/v1/activity/sleep` theo `athleteId`.
   - Dữ liệu hoàn toàn tự động, chính xác từng mili-giây.
2. **Phương án 2: Tận dụng tính năng "Auto-Share to Strava" của Whoop (Zero Setup):**
   - Hầu hết runner đeo Whoop đều bật đồng bộ sang Strava. Khi bài tập đẩy sang Strava, Whoop tự động chèn thông số vào mô tả bài chạy (Description) hoặc ảnh sticker: `Strain: 14.5`, `Recovery: 78%`.
   - Hệ thống cào bài từ Strava có thể dùng regex bóc tách các dòng này để nạp vào AI Coach mà không cần đăng ký Developer App.
3. **Phương án 3: Widget Daily Check-in / Recovery Slider trên giao diện UI:**
   - Trên tab Mục Tiêu Cá Nhân ([PersonalGoal.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/PersonalGoal.jsx)), bổ sung 1 thanh gạt cảm nhận thể lực:
     - *Hôm nay điểm Recovery / Thể lực của bạn bao nhiêu?* (Thanh trượt từ 1% - 100% kèm 3 màu Đỏ / Vàng / Xanh).
   - Dù runner đeo Whoop, Garmin, Apple Watch hay không đeo gì, AI Coach đều có thể phản hồi sát với thể trạng hôm đó.

---

## 2. Phân Tích Mở Rộng: Tích Hợp Dữ Liệu Sinh Học Từ Garmin Watch

Đối với các vận động viên sử dụng **Đồng hồ Garmin**, hệ sinh thái Garmin cung cấp bộ chỉ số sinh học phong phú hàng đầu:

| Nhóm dữ liệu Garmin | Các chỉ số cụ thể | Ứng dụng vào AI Coach |
| :--- | :--- | :--- |
| **Dữ liệu trong bài chạy** *(In-workout)* | • Nhịp tim trung bình, nhịp tim max.<br>• Guồng chân (Cadence - spm).<br>• Dao động dọc, thời gian tiếp đất (Ground Contact Time). | Đánh giá cường độ thực tế, phát hiện chạy quá sải chân (< 155 spm) để chỉnh dáng chạy tránh đau khớp gối. |
| **Dữ liệu sinh học 24/7** *(All-day Biometrics)* | • **Body Battery (1 - 100):** Pin năng lượng sinh học.<br>• **HRV Status:** Trạng thái cân bằng biến thiên nhịp tim đêm.<br>• **Sleep Score (1 - 100):** Điểm chất lượng giấc ngủ.<br>• **Resting HR:** Nhịp tim nghỉ.<br>• **Garmin Training Readiness:** Điểm sẵn sàng vận động. | Quyết định runner nên chạy bài nặng (Interval/Tempo) hay bắt buộc chạy nhẹ Zone 2 / Nghỉ ngơi khi Body Battery < 30. |

### Các con đường kỹ thuật tích hợp Garmin:
1. **Qua Strava Sync (Đã có sẵn trong dự án):**
   - Garmin tự động sync nhịp tim và cadence sang Strava. File [sports_science_service.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/sports_science_service.js) của chúng ta đã tái tạo thành công mô hình Firstbeat ACWR, Training Status và Recovery Hours.
2. **Qua thư viện mã nguồn mở `garmin-connect` (Node.js/Python):**
   - Đăng nhập qua token `garth` để kéo tự động 100% các chỉ số 24/7 (Body Battery, HRV Status, Sleep Score) về máy tính mỗi sáng mà không mất phí bản quyền.

---

## 3. Kiến Trúc Kỹ Thuật Tổng Thể (System Architecture)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA INGESTION LAYER                             │
│                                                                         │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐  │
│  │   STRAVA SYNC (Hiện tại)  │         │    WHOOP & GARMIN SYNC      │  │
│  │  - Distance, Moving Time  │         │  - Whoop: Recovery, HRV,    │  │
│  │  - In-run Avg/Max HR      │         │    Strain, Sleep Performance│  │
│  │  - Cadence, Elevation     │         │  - Garmin: Body Battery,    │  │
│  └─────────────┬─────────────┘         │    HRV Status, Sleep Score  │  │
│                │                       └──────────────┬──────────────┘  │
└────────────────┼──────────────────────────────────────┼─────────────────┘
                 │                                      │
                 ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     STORAGE & NORMALIZATION (Rule 6)                    │
│                                                                         │
│   Storage/athlete_biometrics.json  <── Khóa chính duy nhất: athleteId   │
│   {                                                                     │
│     "athleteId": "12345678",                                            │
│     "date": "2026-09-15",                                               │
│     "source": "whoop" | "garmin" | "manual_checkin",                    │
│     "recoveryScore": 78,      // 0 - 100%                               │
│     "bodyBattery": 82,        // 0 - 100                                │
│     "hrvStatus": "balanced",  // balanced | low | unbalanced            │
│     "sleepScore": 85,         // 0 - 100%                               │
│     "sleepDurationHours": 7.5,                                          │
│     "restingHeartRate": 52                                              │
│   }                                                                     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     AI RUNNING COACH ENGINE                             │
│                                                                         │
│   1. Sports Science Service (Firstbeat ACWR + VDOT + Recovery Time)     │
│   2. Biometric Safety Gate (Bộ lọc an toàn sinh học):                   │
│      - Nếu Recovery < 33% (Red) hoặc Body Battery < 25:                 │
│        => OVERRIDE: Cấm bài tập nặng/dài, bắt buộc Rest Day hoặc Zone 1 │
│   3. Google Gemini 1.5/2.0 Flash Prompt Injection                       │
│   4. Smart Heuristic Fallback Engine                                    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     UI PRESENTATION (PersonalGoal.jsx)                  │
│                                                                         │
│   - Widget "Chỉ Số Thể Lực Sinh Học" (Biometric Readiness Dashboard)    │
│   - Gauge vòng tròn hiển thị Recovery / Body Battery (Xanh / Vàng / Đỏ) │
│   - Chip trạng thái Giấc ngủ (Sleep) & HRV Balance                      │
│   - Nút "Điểm danh thể lực hôm nay (Daily Readiness Check-in)"          │
│     (Dành cho runner không đeo thiết bị hoặc muốn cập nhật nhanh)       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Danh Sách Tệp Tin Can Thiệp Dự Kiến

| Thao tác | Tệp tin | Trách nhiệm kỹ thuật |
| :--- | :--- | :--- |
| **[NEW]** | [server/biometrics_service.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/biometrics_service.js) | Quản lý lưu trữ `Storage/athlete_biometrics.json`, chuẩn hóa điểm số theo chuẩn Rule 6 (`athleteId` làm khóa chính). |
| **[MODIFY]** | [server/ai_coach_service.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/ai_coach_service.js) | Nạp dữ liệu sinh học vào `extractRunnerContext`, thiết lập bộ lọc Override an toàn sinh học, cập nhật System Prompt cho Gemini và bộ Smart Heuristic. |
| **[MODIFY]** | [server/index.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/index.js) | Bổ sung API endpoints: `GET /api/biometrics/athlete/:athleteId`, `POST /api/biometrics/checkin`. |
| **[MODIFY]** | [frontend/src/components/PersonalGoal.jsx](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/components/PersonalGoal.jsx) | Render Widget đo thể lực sinh học (Body Battery / Whoop Recovery), tích hợp nút Daily Check-in. |
| **[MODIFY]** | [frontend/src/i18n/translations.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/i18n/translations.js) | Định nghĩa đầy đủ song ngữ VI và EN cho các thuật ngữ sinh lý học. |
| **[MODIFY]** | [frontend/src/index.css](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/index.css) | Định dạng CSS đồng bộ nhận diện thương hiệu Haskoning cho Biometric Gauge và Animation trạng thái tim mạch. |

---

## 5. Kế Hoạch Kiểm Thử Toàn Diện (Verification Plan)

Tuân thủ nghiêm ngặt **Quy tắc 2** (Kiểm thử thực tế 100%) và **Quy tắc 6** (Athlete ID Mandatory):

1. **Kiểm thử Biometric Safety Override (Test Case Vùng Đỏ):**
   - Tạo runner giả lập còn nợ nhiều km nhưng Recovery = 18% hoặc Body Battery = 15.
   - Xác thực AI Coach **bắt buộc** ra lệnh Rest Day / Zone 1, không được thúc ép chạy nặng.
2. **Kiểm thử Đạt Đỉnh Phong Độ (Test Case Vùng Xanh):**
   - Giả lập runner Recovery = 88%, Sleep = 8.5h, HRV Balanced.
   - Xác thực AI Coach khích lệ và đề xuất bài biến tốc (Interval) hoặc bài chạy dài (Long Run).
3. **Kiểm thử Phân Định Theo Athlete ID (Test Case Trùng Tên):**
   - Giả lập 2 runner cùng tên "Anh Tuan" nhưng mang `athleteId: "1001"` (Vùng Đỏ) và `athleteId: "1002"` (Vùng Xanh).
   - Xác thực hệ thống không bị nhầm lẫn dữ liệu sinh học giữa 2 người.
4. **Kiểm thử Song Ngữ Độc Lập (Bilingual Parity):**
   - Chuyển đổi qua lại giữa Tiếng Việt (`vi`) và Tiếng Anh (`en`), đảm bảo không trộn lẫn ngôn ngữ.

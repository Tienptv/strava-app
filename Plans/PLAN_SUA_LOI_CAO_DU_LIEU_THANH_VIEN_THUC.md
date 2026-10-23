# KẾ HOẠCH KHẮC PHỤC TRIỆT ĐỂ: XỬ LÝ DỮ LIỆU THÀNH VIÊN MỚI THỨC (THỨC TẠ NGỌC TRÍ) & CHUẨN HÓA ĐỊNH DANH ATHLETE ID

> **Thời điểm kiểm tra:** 07/10/2026  
> **Người thực hiện:** Senior / Principal AI Engineer  
> **Trạng thái:** Chờ phê duyệt (Awaiting User Review & Approval)

---

## I. TỔNG QUAN VẤN ĐỀ & KẾT QUẢ KHẢO SÁT THỰC TẾ (INVESTIGATION FINDINGS)

### 1. Thực tế bất ngờ: Trình cào (Puppeteer) ĐÃ CÀO THÀNH CÔNG bài chạy của Thức!
Kiểm tra thực tế các tệp dữ liệu vừa cào lúc **09:40:28 ngày 07/10/2026** cho thấy:
- Trong tệp `Storage/data-autosync-scrape-2026-10-07-094028.csv`, **dòng 7 ghi nhận chính xác 100%**:
  ```csv
  "Thức Tạ Ngọc Trí",20474180592,2026-10-06T19:36:55Z,"Chạy bộ buổi tối","4.86 km",0,"00:39:02",Run
  ```
- Hoạt động chạy này cũng **đã được lưu** vào `Storage/imported_activities.json` trên PC và **đã được đẩy lên Render Cloud**:
  ```json
  {
    "id": "20474180592",
    "type": "Run",
    "distance": 4860,
    "moving_time": 2342,
    "start_date_local": "2026-10-06T19:36:55Z",
    "athlete": {
      "id": null,
      "firstname": "Thức Tạ Ngọc",
      "lastname": "Trí"
    }
  }
  ```
👉 **Kết luận sơ bộ:** Bộ cào (Scraper) **không hề bị lỗi hay bỏ sót**. Vấn đề nằm ở **chuỗi xử lý dữ liệu sau khi cào (Pipeline Mapping & UI Calculation)** khiến bài chạy bị rơi rụng và không thể gán vào bảng thử thách của Thức (Thức bị hiển thị 0 km trên giao diện).

---

## II. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

Chuỗi xử lý dữ liệu gặp **4 điểm nghẽn kỹ thuật (Bottlenecks)** liên hoàn:

```
[Strava Scraper cào được bài] 
        │
        ▼
[1. Mất Athlete ID]: Xuất ra CSV trung gian thiếu cột ID -> act.athlete.id biến thành null
        │
        ▼
[2. Lệch tách tên tiếng Việt]: "Thức Tạ Ngọc Trí" bị cắt pop() thành { fn: "Thức Tạ Ngọc", ln: "Trí" }
        │
        ▼
[3. mapAthleteNamesUsingCSV thất bại]: 
    - matchKey tính ra là "thức tạ ngọc_t." KHÁC "thức_t." trong mapping -> Bỏ qua!
    - Kể cả khớp, hàm KHÔNG GÁN athlete.id (vẫn để null) -> Vi phạm Rule #6
        │
        ▼
[4. Frontend processChallengeData thất bại]:
    - Khớp ID: athlete.id là null -> Bỏ qua!
    - Khớp Tên: "thứctạngọc" !== "thức" (member.firstname) -> Bỏ qua!
        │
        ▼
[KẾT QUẢ]: Thức hiển thị 0 km trên toàn bộ bảng Thử thách tháng 10 & BXH!
```

1. **Điểm nghẽn 1 (Backend - Thiếu Athlete ID trong CSV trung gian):**
   - Trong `server/index.js` (`/api/clubs/:id/auto-sync-scrape` và `/api/challenge/sync-client-activities`), hệ thống chuyển dữ liệu vừa cào thành chuỗi CSV với header: `Name,Activity ID,Date,Title,Distance,Calories,Time,Activity Type`.
   - Chuỗi CSV này **không có cột `Athlete ID`** hay `/athletes/{id}`, khiến hàm `parseStorageCSV` đọc lại thì gán `athleteId = null`.
2. **Điểm nghẽn 2 (Backend - Tách tên tiếng Việt bị đảo vế):**
   - Hàm `parseStorageCSV` dùng `nameParts.pop()` để lấy họ (`lastname`), phần còn lại làm tên (`firstname`).
   - Tên tiếng Việt 4 từ `"Thức Tạ Ngọc Trí"` bị tách thành `firstname = "Thức Tạ Ngọc"`, `lastname = "Trí"`.
3. **Điểm nghẽn 3 (Backend - `mapAthleteNamesUsingCSV` không nhận diện và nuốt mất ID):**
   - Trong `Storage/AthleteID_Name.csv`: `1265228772,Thức Tạ Ngọc Trí` $\rightarrow$ sinh ra matchKey: `thức_t.`.
   - Nhưng bài tập có `firstname = "Thức Tạ Ngọc"`, `lastname = "Trí"` $\rightarrow$ sinh ra matchKey: `thức tạ ngọc_t.`.
   - Hai key khác nhau nên `mapAthleteNamesUsingCSV` bỏ qua, không chuẩn hóa được tên.
   - Đặc biệt: `mapAthleteNamesUsingCSV` **không có logic gán `act.athlete.id = id`** $\rightarrow$ Hệ quả là hiện có **207/405 bài chạy** trong `imported_activities.json` đang bị `athlete.id: null`!
4. **Điểm nghẽn 4 (Frontend - So sánh họ tên đơn lẻ trong `processChallengeData`):**
   - Trong `frontend/src/utils/challengeStats.js`:
     ```javascript
     memFname === fname && (memLname === lname || ...)
     ```
   - Cấu hình VĐV Thức (`Thức_T.`): `firstname = "Thức"`, `lastname = "Tạ Ngọc Trí"`.
   - Bài tập đưa vào: `firstname = "Thức Tạ Ngọc"`, `lastname = "Trí"`.
   - Điều kiện `memFname === fname` so sánh `"thức" === "thứctạngọc"` $\rightarrow$ **FALSE**!
   - Vì `athlete.id = null` nên không khớp được bằng ID, và khớp bằng tên cũng thất bại $\rightarrow$ Bài chạy 4.86 km bị loại bỏ hoàn toàn khỏi tháng 10.

---

## III. ĐỀ XUẤT GIẢI PHÁP & PHÂN TÍCH ĐÁNH ĐỔI (RECOMMENDATIONS & TRADE-OFFS)

| Phương Án | Mô Tả | Ưu Điểm | Nhược Điểm / Rủi Ro | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- |
| **Phương án A (Tạm bợ)**: Đổi tên Thức trong `challenge_config.json` thành `firstname: "Thức Tạ Ngọc"`, `lastname: "Trí"` | Sửa thủ công 1 bản ghi cấu hình để khớp với chuỗi tách tên lỗi. | Nhanh, không cần sửa code. | Gốc rễ vẫn lỗi. Lần cào sau hoặc thành viên mới khác có tên 3-4 chữ sẽ tiếp tục bị lỗi 0 km. Vi phạm Rule #6. | ❌ Không chấp nhận |
| **Phương án B (Khuyến nghị - Toàn diện & Bền vững)**: Khắc phục đa tầng Pipeline + Chuẩn hóa Full Name + Backfill ID theo Rule #6 | 1. Giữ nguyên `athleteId` khi sinh CSV trung gian.<br>2. Nâng cấp `parseStorageCSV` & `mapAthleteNamesUsingCSV` tự động tra cứu Full Name qua `name_mapping.json` & `AthleteID_Name.csv` và **bắt buộc gán `athlete.id`**.<br>3. Nâng cấp `processChallengeData` & `challengeDataLoader` so khớp Full Name gộp (`actFullName === memFullName`).<br>4. Chạy script backfill cập nhật `athlete.id` cho 207 bài chạy đang bị null trong `imported_activities.json`. | Giải quyết triệt để 100% tận gốc rễ; tuân thủ nghiêm ngặt **Rule #6 (Athlete ID Mandatory)**; tương thích mọi định dạng tên tiếng Việt 2, 3, 4, 5 từ; dữ liệu lịch sử sạch đẹp. | Cần cập nhật cả Backend và Frontend (nhưng blast radius rất rõ ràng và kiểm soát được). | 🌟 **(Khuyên Dùng)** |

---

## IV. PHẠM VI TÁC ĐỘNG (BLAST RADIUS)

1. [server/index.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/server/index.js):
   - Cập nhật định dạng CSV trung gian (bổ sung thông tin Athlete/ID).
   - Nâng cấp `parseStorageCSV` để nhận diện Athlete ID từ CSV hoặc tự động tra cứu từ `name_mapping.json` / `AthleteID_Name.csv`.
   - Nâng cấp `mapAthleteNamesUsingCSV` để khớp theo Full Name và **gán `act.athlete.id = id`**.
2. [frontend/src/utils/challengeStats.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/utils/challengeStats.js):
   - Nâng cấp `processChallengeData` và `getCombinedDistance` bổ sung so khớp Full Name gộp (`normalize(fname + lname) === normalize(memFname + memLname)`).
3. [frontend/src/utils/challengeDataLoader.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/utils/challengeDataLoader.js):
   - Nâng cấp bước enrich ID khớp theo Full Name gộp.
4. [Storage/imported_activities.json](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/Storage/imported_activities.json):
   - Backfill gán `athlete.id: "1265228772"` và chuẩn hóa tên cho bài chạy của Thức (và các runner khác đang bị null).

---

## V. KẾ HOẠCH TRIỂN KHAI TỪNG BƯỚC (STEP-BY-STEP EXECUTION PLAN)

### Bước 1: Nâng cấp Backend (`server/index.js`)
- **1.1.** Cập nhật `mapAthleteNamesUsingCSV`:
  - Đọc cả `Storage/AthleteID_Name.csv` và `Storage/name_mapping.json`.
  - Hỗ trợ tra cứu theo: `id`, `fullName` (chính xác & không dấu), `matchKey`.
  - Khi khớp, cập nhật đầy đủ `athlete.id = id`, `athlete.firstname`, `athlete.lastname`.
- **1.2.** Cập nhật `parseStorageCSV`:
  - Đọc cột `Athlete ID` hoặc trích xuất số ID nếu có.
  - Tích hợp tra cứu ngược từ tên sang ID nếu `athleteId` đang là null.
- **1.3.** Cập nhật các luồng ghi CSV trung gian trong `auto-sync-scrape` và `sync-client-activities`:
  - Ghi kèm ID vận động viên để dữ liệu không bao giờ bị rơi rụng.

### Bước 2: Nâng cấp Frontend Matching Engine (`challengeStats.js` & `challengeDataLoader.js`)
- **2.1.** Cập nhật `processChallengeData`:
  - Ưu tiên 1: Khớp bằng `athlete.id` (chính xác tuyệt đối theo Rule #6).
  - Ưu tiên 2: Khớp bằng Full Name kết hợp: `normalize(actFname + actLname) === normalize(memFname + memLname)`.
  - Ưu tiên 3: Khớp bằng matchKey và firstname/lastname linh hoạt.
- **2.2.** Cập nhật tương tự cho `getCombinedDistance` trong `challengeStats.js` và `challengeDataLoader.js`.

### Bước 3: Backfill Dữ liệu `Storage/imported_activities.json`
- Chạy script chuẩn hóa dữ liệu cho bài chạy ID `20474180592`:
  - Gán `athlete.id = "1265228772"`, `athlete.firstname = "Thức"`, `athlete.lastname = "Tạ Ngọc Trí"`.
  - Quét và bổ sung ID cho các bài chạy bị null khác dựa trên mapping chuẩn.

### Bước 4: Kiểm thử thực nghiệm (Rigorous Test Verification)
- **Test 1: Syntax & Compile Check:** Kiểm tra cú pháp toàn bộ các file sửa đổi bằng `node -c`.
- **Test 2: Match Engine Test:** Chạy test script độc lập kiểm tra `processChallengeData` với bài chạy của Thức $\rightarrow$ Kỳ vọng: Thức đạt **4.86 km** vào ngày 06/10/2026.
- **Test 3: Name Disambiguation & Rule #6 Test:** Kiểm tra kịch bản VĐV trùng tên (ví dụ: `Phuong N.` vs `Phuong T.`) vẫn phân định độc lập nhờ Athlete ID.
- **Test 4: Cloud Sync Verification:** Kiểm tra tính toàn vẹn của dữ liệu sẵn sàng đồng bộ 2 chiều PC $\leftrightarrow$ Render Cloud.

---

## VI. DỰ ĐOÁN RỦI RO & BIỆN PHÁP PHÒNG NGỪA (RISKS & EDGE CASES)

1. **Rủi ro trùng tên:** Nếu có 2 người cùng tên tiếng Việt (ví dụ: 2 người tên Nguyễn Văn A):
   - *Phòng ngừa:* Luôn ưu tiên so khớp bằng `athlete.id` trước tiên. Chỉ dùng tên khi dữ liệu cũ bị thiếu ID.
2. **Rủi ro ghi đè khi đồng bộ Cloud:**
   - *Phòng ngừa:* Thực hiện đúng quy tắc "Kéo (Pull) trước khi Đẩy (Push)" theo Rule #1. Sau khi cập nhật file local, đẩy file đã sửa lên Render để cả mobile và desktop đều đồng nhất.
3. **Tương thích ngược (Backward Compatibility):**
   - *Phòng ngừa:* Giữ nguyên cấu trúc JSON của activities (`id`, `type`, `distance`, `moving_time`, `start_date_local`, `athlete: { id, firstname, lastname }`), không thay đổi schema làm gãy các component khác.

---

## VII. ĐIỀU KIỆN HOÀN THÀNH (DEFINITION OF DONE)
1. Thức Tạ Ngọc Trí hiển thị đúng **4.86 km** trên bảng Thử thách tháng 10/2026 tại ngày 06/10.
2. Các lần bấm "Auto sync Strava" tiếp theo tự động nhận diện và gán đúng bài chạy cho Thức và các thành viên mới mà không cần can thiệp thủ công.
3. Tất cả bài tập mới cào về đều được gán `athlete.id` hợp lệ theo Rule #6.
4. Kiểm thử chạy qua 100% không có lỗi runtime.

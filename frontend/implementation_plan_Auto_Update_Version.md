# Kế hoạch Triển khai: Hệ thống Tự động Cập nhật Phiên bản (1-Click Auto Update) cho Desktop App của Sub-Admin

Tài liệu này mô tả chi tiết giải pháp kỹ thuật nhằm giúp máy tính của các **Sub-Admin** tự động kiểm tra, tải và cập nhật giao diện (UI) và tính năng mới nhất từ dự án chỉ với **1 cú nhấp chuột**, bảo đảm **100% dữ liệu cá nhân (Storage, Cookie Strava, Cấu hình)** được bảo toàn nguyên vẹn.

---

## 1. Mục tiêu và Nguyên tắc Kỹ thuật

1. **Trải nghiệm 1-Click:** Sub-Admin không cần biết kỹ thuật, không cần Git, không cần copy/paste thủ công. Khi có bản mới, ứng dụng tự thông báo và có nút bấm cập nhật.
2. **Dung lượng siêu nhẹ (~ 2-3 MB):** Vì máy Sub-Admin đã có sẵn runtime `node.exe` và Chrome, gói cập nhật chỉ chứa phần mã nguồn thay đổi (`dist/` và `server/index.js`).
3. **Bảo vệ dữ liệu cục bộ tuyệt đối:** Quá trình cập nhật **tuyệt đối không bao giờ ghi đè** lên:
   - Thư mục `Storage/` (chứa Cookie Strava cá nhân, danh sách hoạt động đã lưu, file cấu hình riêng của máy đó).
   - File cấu hình môi trường `.env`.
4. **Cơ chế dự phòng kép:**
   - **Cách 1 (Ưu tiên):** Nút cập nhật trực tiếp trên giao diện Desktop App.
   - **Cách 2 (Dự phòng):** File script `UPDATE_APP.bat` trong thư mục app (dành cho trường hợp app chưa bật hoặc muốn update trước khi mở).

---

## 2. Kiến trúc & Luồng hoạt động (Workflow)

```
[Developer PC]
      │  (Khi có tính năng mới: chạy lệnh "npm run release-update")
      ▼
   Build `dist/` + Nén gói `update-bundle.zip` (~2.5MB) + Tăng version trong `version.json`
      │
      ▼  Git push
[Render Cloud Server (strava-app-86t5.onrender.com)]
   ├── GET /api/app/version           (Trả về version mới nhất & changelog)
   └── GET /api/app/update-bundle.zip (Cung cấp gói nén cập nhật)
      ▲
      │ (Kiểm tra & Tải về)
[Sub-Admin Desktop App (localhost:3001)]
   ├── 1. Tự động kiểm tra version khi mở app (hoặc bấm nút "Kiểm tra cập nhật")
   ├── 2. Phát hiện Cloud có version mới (ví dụ: v1.2.0 > v1.1.0)
   ├── 3. Hiện Popup: Danh sách tính năng mới + Nút [Cập nhật ngay]
   ├── 4. Tải zip về thư mục tạm `local_cache/`
   ├── 5. Giải nén đè lên `dist/` và `server/index.js` (Bảo toàn Storage/)
   └── 6. Tự động F5 làm mới giao diện hoàn tất trong 3 giây!
```

---

## 3. Các thành phần cần triển khai (Proposed Changes)

### Component 1: Quản lý Phiên bản (`version.json`)
- **[NEW]** `version.json` (ở thư mục gốc và trong `desktop_release/Strava_App_Desktop/`):
  ```json
  {
    "version": "1.2.0",
    "releaseDate": "2026-09-05",
    "title": "Cập nhật Gộp nút Đồng bộ Strava & Khử trùng lặp",
    "changelog": [
      "Loại bỏ triệt để lỗi trùng lặp thành viên câu lạc bộ",
      "Gộp nút Auto sync Strava và tự động đồng bộ lên Render Cloud",
      "Cân đối giao diện bảng Challenge và các tab tháng"
    ],
    "minAppVersion": "1.0.0"
  }
  ```

---

### Component 2: Render Cloud Backend (`server/index.js`)
- **[MODIFY]** Bổ sung 2 endpoint phục vụ cập nhật:
  1. `GET /api/app/version`: Trả về thông tin phiên bản mới nhất từ `version.json`.
  2. `GET /api/app/update-bundle.zip`: Cho phép client tải file zip bản build mới nhất (lưu tại `public/updates/update-bundle.zip`).

---

### Component 3: Desktop App Backend (`desktop_release/Strava_App_Desktop/server/index.js`)
- **[MODIFY]** Bổ sung 2 API xử lý cục bộ:
  1. `GET /api/app/check-update`:
     - Gọi `https://strava-app-86t5.onrender.com/api/app/version`.
     - So sánh với `version.json` local.
     - Trả về: `{ hasUpdate: boolean, currentVersion, latestVersion, changelog, title, releaseDate }`.
  2. `POST /api/app/apply-update`:
     - Tải `update-bundle.zip` từ Render Cloud vào thư mục tạm `local_cache/update_temp/`.
     - Dùng module `adm-zip` (hoặc PowerShell giải nén có sẵn của Windows) giải nén đè vào `dist/`, `server/index.js`, và `version.json`.
     - **Kiểm tra an toàn:** Bỏ qua hoặc không đụng chạm tới thư mục `Storage/` và `.env`.
     - Trả về `{ success: true, message: 'Cập nhật thành công!' }`.

---

### Component 4: Giao diện Người dùng (`src/components/Sidebar.jsx`)
- **[MODIFY]** Bổ sung mục quản lý Version ở cuối Sidebar:
  - Hiển thị số phiên bản hiện tại: `v1.1.0` kèm nút nhỏ `[ 🔄 Kiểm tra cập nhật ]`.
  - Nếu có bản mới: Hiển thị chấm thông báo màu xanh `● Có bản mới v1.2.0`.
  - Hộp thoại cập nhật thông minh (SweetAlert2):
    - Tiêu đề phiên bản & Ngày phát hành.
    - Danh sách các tính năng/sửa lỗi mới (`changelog`).
    - Nút `[ Cập nhật ngay (~2.5 MB) ]` & `[ Để sau ]`.
    - Thanh tiến trình tải và thông báo hoàn tất, tự động F5 trang sau khi cập nhật.

---

### Component 5: Script dự phòng 1-Click (`desktop_release/Strava_App_Desktop/UPDATE_APP.bat`)
- **[NEW]** File script `UPDATE_APP.bat` đặt trong thư mục `desktop_release/Strava_App_Desktop/`:
  - Dùng PowerShell một dòng tải `update-bundle.zip` từ Cloud.
  - Giải nén đè `dist/` và `server/index.js`.
  - Thông báo hoàn tất.

---

### Component 6: Công cụ phát hành dành cho Developer (`tools/create_update_bundle.cjs`)
- **[NEW]** File script giúp bạn đóng gói tự động khi muốn phát hành tính năng mới:
  - Chạy `npm run release` hoặc chạy script.
  - Script sẽ tự động:
    1. Chạy `npm run build`.
    2. Đóng gói thư mục `dist/` và `server/index.js` thành `public/updates/update-bundle.zip`.
    3. Cập nhật version trong `version.json`.
    4. Sao chép vào `desktop_release` để đồng bộ.
    5. Bạn chỉ việc `git commit & push` lên Render Cloud!

---

## 4. Kế hoạch Kiểm thử & Xác thực (Verification Plan)

### Kiểm thử Tự động & API:
1. **Kiểm tra endpoint version:**
   - Query `GET http://localhost:3001/api/app/version` kiểm tra trả về đúng cấu trúc JSON.
2. **Kiểm thử logic so sánh version:**
   - Giả lập bản local là `1.1.0` và cloud là `1.2.0`, xác nhận API `/api/app/check-update` trả về `hasUpdate: true`.
3. **Kiểm thử tính toàn vẹn dữ liệu (Bảo toàn Storage/):**
   - Đặt file dữ liệu test trong `Storage/challenge_config.json` và `Storage/strava_cookie.txt`.
   - Thực hiện `apply-update`.
   - Xác nhận 100% dữ liệu trong `Storage/` không hề bị thay đổi hay xóa mất.

### Kiểm thử Giao diện thực tế:
1. Mở Desktop App trên trình duyệt.
2. Bấm nút "Kiểm tra cập nhật".
3. Xác nhận popup SweetAlert2 hiển thị rõ ràng thông tin phiên bản và changelog.
4. Bấm "Cập nhật ngay", xác nhận ứng dụng tải gói, cập nhật và F5 lại thành công với version mới.

---

## 5. Đánh giá Ưu điểm & Tính an toàn

| Tiêu chí | Đánh giá |
| :--- | :--- |
| **Độ tiện lợi cho Sub-Admin** | ⭐⭐⭐⭐⭐ Chỉ cần 1 click trên màn hình hoặc nhấp đúp file `.bat`. |
| **Dung lượng tải** | ⚡ Siêu nhẹ (~ 2 - 3 MB), hoàn tất trong 3 - 5 giây. |
| **Độ an toàn dữ liệu** | 🔒 100% an toàn cho Cookie Strava và các file trong `Storage/`. |
| **Khả năng tự động hóa** | 🤖 Developer chỉ cần chạy 1 lệnh đóng gói rồi Git push lên Cloud. |

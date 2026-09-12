# Workspace Rules: Strava Desktop Software

## 1. Quy Tắc Đồng Bộ Dữ Liệu Giữa Cloud Render và PC Desktop
- **Bản chất hệ thống:**
  - Phiên bản PC (`Strava_Tracker.exe` / localhost) chạy offline cục bộ trên máy tính của Admin.
  - PC **KHÔNG tự động đồng bộ ngầm** (auto-sync) dữ liệu từ Cloud Render về ổ cứng máy tính.
  - Mọi dữ liệu mới phát sinh trên Cloud (bài chạy mới do thành viên đẩy lên, dấu tick phạt, mục tiêu cá nhân do Sub-admin thao tác trên điện thoại) bắt buộc phải do **Admin chủ động kéo về máy tính (Manual Pull)**.
- **Cách kéo dữ liệu về PC:**
  - Cách 1 (Khuyên dùng): Bấm nút **"Auto sync Strava"** ở Sidebar (tự động cào bài tập, tự động gọi `/api/storage/pull-from-cloud` kéo dữ liệu về máy, và push bundle hoàn chỉnh lên lại Cloud).
  - Cách 2: Vào **Quản trị (Administer)** -> Tab 4 (Quản trị dữ liệu) -> Bấm nút **"Kéo dữ liệu từ Cloud (Pull from Render Cloud)"**.
- **Nguyên tắc an toàn dữ liệu:**
  - Luôn tuân thủ quy tắc: **Kéo (Pull) trước khi Đẩy (Push)** để không bao giờ ghi đè làm mất các dữ liệu phạt / mục tiêu mà Sub-admin đã thao tác trên điện thoại.

---

## 2. Quy Tắc Bắt Buộc Kiểm Thử Thực Tế & Báo Cáo Chân Thật 100%
- **Tạo Test Case giả định sau khi Proceed:**
  - Mỗi khi hoàn thành viết hoặc sửa mã nguồn, AI bắt buộc phải tạo các test case giả định và chạy kiểm thử thực tế bằng command line.
  - Đảm bảo mã nguồn không có lỗi cú pháp (SyntaxError), lỗi import hoặc runtime exception.
- **Báo cáo trung thực 100%:**
  - Phản hồi chân thật, minh bạch toàn bộ log thực thi của test case (case nào PASS, case nào FAIL).
  - Tuyệt đối không ngụy tạo kết quả, không che giấu lỗi coding.

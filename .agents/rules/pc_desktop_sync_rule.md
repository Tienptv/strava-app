# Rule: Cơ chế đồng bộ dữ liệu giữa Cloud Render và PC Desktop

## 1. Nguyên Tắc Cốt Lõi
- Phiên bản PC (Desktop App: `Strava_Tracker.exe` / chạy qua localhost) hoạt động độc lập cục bộ trên máy tính của Admin, lưu trữ dữ liệu tại thư mục `Storage/` nội bộ.
- PC **KHÔNG tự động đồng bộ ngầm (auto-sync)** dữ liệu từ Cloud Render về ổ cứng máy tính.
- Mọi dữ liệu mới phát sinh trên Cloud (bài chạy mới do thành viên đẩy lên, mục tiêu hoặc dấu tick phạt do Sub-admin thao tác trên điện thoại) bắt buộc phải do **Admin chủ động kéo về máy tính (Manual Pull)**.

## 2. Thao Tác Kéo Dữ Liệu Hợp Lệ Trên PC
Khi Admin cần cập nhật dữ liệu từ Cloud Render về máy PC, thực hiện theo 1 trong 2 cách:
1. **Bấm nút "Auto sync Strava" trên thanh Sidebar**: Hệ thống cào dữ liệu từ Strava, đồng thời tự động gọi `POST /api/storage/pull-from-cloud` để kéo toàn bộ file JSON mới nhất từ Render về `Storage/` máy tính, rồi đồng bộ bundle hoàn thiện ngược lại lên Render.
2. **Vào mục Quản trị (Administer)** -> Tab Quản trị dữ liệu -> Bấm nút **"Kéo dữ liệu từ Cloud (Pull from Render Cloud)"**.

## 3. Chú Ý Khi Phát Triển Code & Hỗ Trợ
- Không bao giờ giả định PC tự động có dữ liệu mới nhất từ Cloud Render nếu chưa có thao tác Pull.
- Khi hướng dẫn Admin hoặc thực hiện đẩy dữ liệu từ PC lên Render, luôn tuân thủ nguyên tắc: **Kéo (Pull) trước khi Đẩy (Push)** để bảo toàn các dữ liệu tick phạt / mục tiêu do Sub-admin thao tác trên điện thoại.

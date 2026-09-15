# Rule: Quy Tắc Định Danh Thành Viên Bắt Buộc Bằng ID (Athlete ID Mandatory Rule)

## 1. Lý Do & Bối Cảnh Cốt Lõi
- **Vấn đề trùng lặp & bất đồng nhất tên gọi:**
  - Tên thành viên có thể trùng lặp (ví dụ trong CLB có nhiều người cùng tên Phương, cùng tên Huy, cùng tên Tuấn, Sơn...).
  - Thứ tự họ và tên trên Strava và tiếng Việt thường bị đảo lộn (ví dụ: `Hà Xuân An` vs `An Ha`, `Phạm Văn Tiến` vs `Tien PhamTV`), hoặc thành viên tự đổi tên hiển thị trên trang cá nhân Strava bất kỳ lúc nào.
  - Sử dụng tên hoặc viết tắt (như `split(' ')[0]`, `firstname_L.`, hoặc so sánh chuỗi `includes`) đã từng gây ra lỗi nghiêm trọng: gộp nhầm dữ liệu, tạo runner ảo, sai lệch mục tiêu km và phạt tiền.
- **ID là định danh duy nhất (Unique Identifier):**
  - Mỗi vận động viên trên Strava có một **Strava Athlete ID duy nhất** (chuỗi số không bao giờ thay đổi, ví dụ: `110041582`, `133066813`...).
  - ID là căn cứ duy nhất đảm bảo tính chính xác 100% về mặt dữ liệu, thành tích và tài chính/phạt.

---

## 2. Nguyên Tắc Bắt Buộc Cho Mọi Tính Năng Mới
Mọi tính năng phát triển mới hoặc nâng cấp trong tương lai **BẮT BUỘC** phải tuân thủ nghiêm ngặt các nguyên tắc sau:

1. **Athlete ID làm Khóa Chính (Primary Key):**
   - Mọi hoạt động tính toán: cộng tổng km, theo dõi tiến độ tuần/tháng, ghi nhận mục tiêu cá nhân (personal target), ghi nhận nợ phạt (penalties), lưu vết lịch sử (audit logs), bắn thông báo (web push notifications)... **đều phải sử dụng Strava Athlete ID làm khóa định danh chính**.
   - Cấu trúc lưu trữ dữ liệu (JSON, Map, Object, State) liên quan đến thành viên phải được lập chỉ mục (index / key) theo `athleteId` (hoặc `athlete_id`).

2. **Tên chỉ dùng cho mục đích hiển thị (Display Only):**
   - Tên thành viên (`fullName`, `runnerName`, `displayName`, `abbreviatedName`...) **CHỈ ĐƯỢC PHÉP DÙNG ĐỂ HIỂN THỊ TRÊN GIAO DIỆN (UI)** cho người dùng xem.
   - **TUYỆT ĐỐI KHÔNG** dùng chuỗi tên làm khóa tìm kiếm, khóa nhóm (group by), khóa so sánh logic nghiệp vụ, hoặc căn cứ để phạt/thưởng.
   - **NGHIÊM CẤM** các kỹ thuật lọc theo họ/tên cắt cụt như `name.split(' ')[0]`, `name.includes(...)` để gom nhóm bài tập hoặc đối chiếu runner.

3. **Xử lý Activity & Đọc Dữ Liệu:**
   - Mọi bài tập (activity) khi cào về (scrape), import qua file, hoặc nhận từ webhook/API phải trích xuất ngay `act.athlete.id` (hoặc `athleteId`).
   - Nếu dữ liệu đầu vào là file lịch sử cũ bị khuyết ID, bắt buộc phải tra cứu qua bảng ánh xạ chuẩn (`name_mapping.json` / `challenge_config.json`) để tìm ra đúng `athleteId` trước khi đưa vào luồng tính toán.

4. **Kiểm thử logic với Test Case trùng tên:**
   - Khi viết test case cho các tính năng mới, bắt buộc phải tạo kịch bản giả định có ít nhất 2 thành viên trùng tên (ví dụ: `Phuong N.` ID 12345 và `Phuong T.` ID 67890) để đảm bảo hệ thống phân định độc lập 100% dựa trên ID.

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

---

## 3. Quy Tắc Chuẩn Thương Hiệu Haskoning & Thiết Kế Giao Diện Đồng Bộ (Haskoning Branding & Unified UI Rule)
- **Bảng màu nhận diện thương hiệu (Haskoning Brand Palette):**
  - **Primary Navy (`#002D54` / `#002855`):** Màu chữ thương hiệu "Haskoning", tiêu đề chính, header, card viền tối, thanh điều hướng.
  - **Brand Teal / Cyan (`#00A3A6`):** Màu khẩu hiệu *"Enhancing Society Together"*, liên kết, điểm nhấn chủ đạo (accent), active tab, ring focus, nút chính.
  - **Brand Lime Green (`#78BE20` / `#84BD00`):** Màu năng lượng thể thao từ cánh hoa logo dưới, dùng cho tiến độ hoàn thành, huy hiệu tích cực, dải năng lượng.
  - **Brand Sky / Cyan (`#0080A0` / `#00A3E0`):** Màu chuyển tiếp từ cánh hoa logo trên.
  - **Brand Gradients:**
    - Gradient Biểu Tượng: `linear-gradient(135deg, #78BE20 0%, #00A3A6 50%, #002D54 100%)`
    - Gradient Nút Bấm / Thẻ Chính: `linear-gradient(135deg, #00A3A6 0%, #002D54 100%)`
    - Gradient Năng Lượng / Hành Động: `linear-gradient(135deg, #78BE20 0%, #00A3A6 100%)`
- **Quy tắc Font chữ & Typography:**
  - Headings / Logo text: `'Plus Jakarta Sans', sans-serif`, trọng số 700 - 900, màu `#002D54`.
  - Khẩu hiệu / Slogan: *"Enhancing Society Together"*, màu `#00A3A6`, font chữ hiện đại, thanh lịch.
  - Nội dung / Body text: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- **Quy tắc Đồng Bộ Hiệu Ứng Nút Bấm (Unified Button Effects):**
  - Mọi nút bấm trong toàn bộ ứng dụng (Sidebar, Header, Table, Modal, AI Coach, Admin, Mobile) phải đồng bộ:
    1. **Bo góc:** Chuẩn `8px` hoặc `10px` (`--radius-sm` hoặc `--radius-md`).
    2. **Độ dày chữ:** `font-weight: 600`, `letter-spacing: 0.01em`.
    3. **Hiệu ứng Hover:** Luôn nhấc nhẹ lên 2px (`transform: translateY(-2px);`) kèm bóng đổ phát sáng thương hiệu (`box-shadow: 0 4px 14px rgba(0, 163, 166, 0.35)` cho nút Teal hoặc `0 4px 14px rgba(0, 45, 84, 0.18)` cho nút Navy/Secondary).
    4. **Hiệu ứng Active (Khi bấm):** Nhấn lún nhẹ tự nhiên (`transform: translateY(0) scale(0.98); box-shadow: 0 2px 6px rgba(0, 163, 166, 0.25);`).
    5. **Hiệu ứng chuyển động (Physics Transition):** Mượt mà `transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`.
    6. **Trạng thái Disabled:** Mờ 55%, chuột `not-allowed`, vô hiệu hóa transform/shadow.

---

## 4. Quy Tắc Đa Ngôn Ngữ Đồng Bộ (Bilingual Parity & Full i18n Rule)
- **Yêu cầu cốt lõi:**
  - Khi người dùng chọn giao diện **English (`en`)**: Toàn bộ nội dung hiển thị (tiêu đề, nút bấm, nhãn bảng biểu, chú thích tooltip, hộp thoại thông báo Swal, phản hồi phân tích của AI Running Coach...) **bắt buộc phải hiển thị 100% bằng Tiếng Anh**.
  - Khi người dùng chọn giao diện **Việt Nam (`vi`)**: Toàn bộ nội dung hiển thị **bắt buộc phải hiển thị 100% bằng Tiếng Việt**.
- **Tuyệt đối không trộn lẫn ngôn ngữ (Zero Language Mixing):**
  - Nghiêm cấm để sót văn bản Tiếng Việt khi giao diện đang ở chế độ Tiếng Anh, và ngược lại.
- **Kỹ thuật bắt buộc:**
  - Không hardcode chuỗi ký tự đơn ngữ vào mã nguồn. Luôn dùng `t('key')` từ [translations.js](file:///c:/Users/926166/OneDrive%20-%20Haskoning/Tien_926166/Strava_Desktop_Software/frontend/src/i18n/translations.js) hoặc cấu trúc rẽ nhánh `lang === 'en' ? '...' : '...'`.
  - Khi thêm key mới, bắt buộc phải định nghĩa song song cả 2 mục `vi` và `en` trong `translations.js`.
  - Các API sinh văn bản cho client (như AI Coach advice, Weekly training plan, xuất báo cáo) bắt buộc phải nhận tham số `lang` và trả về kết quả đúng ngôn ngữ tương ứng.

---

## 5. Quy Tắc Luôn Lập Kế Hoạch Cho Người Dùng Review Trước Khi Thực Thi (Mandatory Plan-First & User Review Rule)
- **Bắt buộc tạo Plan sau mỗi yêu cầu (Prompt) của người dùng:**
  - Ngay sau mỗi prompt yêu cầu từ người dùng (thêm tính năng mới, chỉnh sửa giao diện, sửa lỗi logic, can thiệp mã nguồn...), AI **bắt buộc phải nghiên cứu và tạo Kế Hoạch Triển Khai (`implementation_plan.md`) trước tiên**.
  - Kế hoạch phải được xây dựng rõ ràng, phân tích nguyên nhân kỹ thuật, đề xuất giải pháp, liệt kê cụ thể các file sẽ chỉnh sửa và kế hoạch kiểm thử thực tế.
  - Bắt buộc thiết lập `RequestFeedback: true` và `UserFacing: true` trong metadata của plan.
- **Tạo điều kiện để người dùng Review & Bổ sung ý kiến (Review & Comments):**
  - AI phải chỉ rõ các điểm cốt lõi và câu hỏi mở (nếu có) để người dùng có thể thoải mái để lại comment, góp ý thêm hoặc điều chỉnh yêu cầu trước khi chốt.
- **Tuyệt đối không tự ý viết code trước khi được phê duyệt:**
  - AI tuyệt đối **KHÔNG được tự ý sửa file mã nguồn hay chạy các lệnh thay đổi hệ thống** trước khi người dùng xem xét kế hoạch, bổ sung comment và bấm **Proceed / Approve**.

---

## 6. Quy Tắc Định Danh Thành Viên Bắt Buộc Bằng ID (Athlete ID Mandatory Rule)
- **Lý do & Bối cảnh cốt lõi:**
  - Tên thành viên có thể trùng lặp (ví dụ: nhiều người cùng tên Phương, Huy, Sơn...), hoặc thứ tự họ - tên bị đảo lộn giữa Strava và tiếng Việt (`Hà Xuân An` vs `An Ha`), hoặc thành viên có thể tự đổi tên Strava bất kỳ lúc nào.
  - Strava Athlete ID là duy nhất (Unique Identifier), không bao giờ thay đổi. Do đó ID là căn cứ duy nhất đảm bảo tính chính xác 100% về mặt dữ liệu, thành tích chạy và tài chính/phạt.
- **Nguyên tắc bắt buộc cho mọi tính năng phát triển sau này:**
  1. **Athlete ID làm Khóa Chính (Primary Key):**
     - Mọi hoạt động tính toán: cộng dồn km, theo dõi tiến độ tuần/tháng, ghi nhận mục tiêu cá nhân (personal target), ghi nhận nợ phạt (penalties), lưu vết lịch sử (audit logs), bắn thông báo (web push notifications)... **bắt buộc phải lấy Strava Athlete ID làm khóa định danh chính**.
     - Cấu trúc lưu trữ dữ liệu (JSON, Map, Object, State) liên quan đến thành viên phải được index theo `athleteId`.
  2. **Tên chỉ dùng cho mục đích hiển thị (Display Only):**
     - Tên thành viên (`fullName`, `runnerName`, `displayName`...) **CHỈ ĐƯỢC DÙNG ĐỂ HIỂN THỊ TRÊN GIAO DIỆN (UI)** cho người dùng đọc.
     - **Tuyệt đối KHÔNG** dùng chuỗi tên làm khóa tìm kiếm, khóa nhóm (group by), khóa so sánh logic nghiệp vụ, hoặc căn cứ phạt/thưởng.
     - **Nghiêm cấm** các kỹ thuật lọc theo họ/tên cắt cụt như `name.split(' ')[0]`, `name.includes(...)` để gom nhóm bài tập hoặc đối chiếu runner.
  3. **Xử lý Activity & Đọc Dữ Liệu:**
     - Mọi bài tập (activity) khi cào về (scrape), import qua file, hoặc nhận từ webhook/API phải trích xuất ngay `act.athlete.id` (hoặc `athleteId`).
     - Nếu dữ liệu đầu vào là file lịch sử cũ bị khuyết ID, bắt buộc phải tra cứu qua bảng ánh xạ chuẩn (`name_mapping.json` / `challenge_config.json`) để tìm ra đúng `athleteId` trước khi đưa vào luồng tính toán.
  4. **Kiểm thử logic với Test Case trùng tên:**
     - Khi viết test case cho các tính năng mới, bắt buộc phải tạo kịch bản giả định có ít nhất 2 thành viên trùng tên (ví dụ: `Phuong N.` ID 12345 và `Phuong T.` ID 67890) để đảm bảo hệ thống phân định độc lập 100% dựa trên ID.




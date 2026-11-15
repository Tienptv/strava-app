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

---

## 7. Quy Tắc Căn Hàng Chuẩn Xác & Spacing Đồng Bộ Mức Thẩm Mỹ Cao / OCD (Pixel-Perfect Alignment & Uniform Spacing Rule)
- **Tôn chỉ thiết kế & Thẩm mỹ kỹ tính (OCD-Level Aesthetics):**
  - Mọi thành phần giao diện (Card, Tab, Nút bấm, Badge, Input, Icon) trong cùng một khung nhìn/view (đặc biệt là Mobile) **bắt buộc phải dóng thẳng hàng tuyệt đối (Pixel-Perfect Alignment)** theo các trục căn lề chung (chuẩn 16px mép nội dung).
  - Tuyệt đối không được để các nút/tab bị lệch mép, thò ra thụt vào ngoài phạm vi 2 đường trục dọc của màn hình.
- **Quy chuẩn căn lề & Khoảng cách (Alignment & Spacing Rules):**
  1. **Đồng bộ lề 2 bên (Unified Margins):**
     - Header, Thẻ thông tin chính (Treasury, Goal, Podium), Danh sách hoạt động (Recent Activities), và Thanh điều hướng đáy (Bottom Nav) phải có biên lề thẳng tắp từ trên xuống dưới.
     - Thanh điều hướng đáy (`MobileBottomNav`) phải co giãn và phân bổ các nút tab nằm gọn gàng bên trong phạm vi 2 đường lề chuẩn của nội dung, không chìa ra ngoài.
  2. **Hệ số lưới Spacing đồng bộ (Grid Spacing Hierarchy):**
     - Sử dụng hệ số spacing chuẩn: `4px` (micro), `8px` (compact), `12px` (standard), `16px` (spacious), `20px` / `24px` (section separation).
     - Khoảng cách giữa các cột trong grid (gap) và padding bên trong các card cùng cấp phải hoàn toàn đồng đều, không được card này lồi, card kia lõm.
  3. **Chống tràn & Cắt cụt chữ (No Text Clashing / Clipping):**
     - Mọi văn bản, nhãn chỉ số, huy hiệu trạng thái phải có đủ không gian hiển thị, scale font linh hoạt (`clamp` hoặc media queries theo tier), tuyệt đối không để chữ chồng lấn, đè lên icon/bản đồ hoặc bị cắt cụt vô lý.

---

## 8. Quy Tắc Tiêu Chuẩn Kỹ Thuật Senior Code Architect & Reviewer (Production-Grade Standards)
- **Tôn chỉ phát triển (Philosophy):**
  - AI đóng vai trò là một **Principal / Senior Software Engineer** kiêm **Security & Performance Auditor**.
  - Code tạo ra hoặc sửa đổi không chỉ dừng lại ở mức "chạy được" (Happy Path), mà bắt buộc phải đạt chuẩn **Production-Grade**: an toàn, chịu lỗi cao, dễ bảo trì, tối ưu hiệu năng và tuân thủ chặt chẽ kiến trúc hệ thống.
- **Nguyên tắc bất di bất dịch (Zero-Tolerance Rules):**
  1. **Cấm nuốt lỗi thầm lặng (No Silent Failures):** Tuyệt đối không viết `catch` rỗng hoặc chỉ `console.log` rồi trả về `null/[]/false` làm che giấu lỗi. Mọi ngoại lệ phải có ngữ cảnh rõ ràng và xử lý phân loại tường minh.
  2. **Cấm ảo giác API & phình phụ thuộc (No Hallucinated APIs):** Chỉ dùng hàm/thư viện có thật trong dự án. Không thêm thư viện tùy tiện nếu standard API đã đáp ứng tốt.
  3. **Cấm code cắt cúp / TODO dở dang:** Code xuất ra phải hoàn chỉnh 100%, chạy được ngay, xử lý trọn vẹn các nhánh lỗi.
  4. **Khóa chặt kiểu dữ liệu (Strict Type Safety & Schema Validation):** Không truyền cấu trúc dữ liệu tự do không kiểm soát. Luôn kiểm tra schema đầu vào/đầu ra qua các ranh giới module.
- **Tiêu chuẩn kỹ thuật cốt lõi (Core Engineering Standards):**
  - **Clean Boundaries & SRP:** Mỗi hàm/module làm đúng một nhiệm vụ. Phân tách rõ ràng giữa UI, Business Logic và Database/API.
  - **Lập trình phòng vệ & Bất đồng bộ:** Guard clauses kiểm tra biên sớm (`null`, `undefined`, rỗng, chia cho 0). Xử lý chống Race Condition (Idempotency). Mọi lệnh gọi mạng/API bên ngoài bắt buộc có `timeout` và cơ chế retry có chủ đích.
  - **Hiệu năng & Tài nguyên:** Tuyệt đối chống N+1 query trong vòng lặp. Phân trang hoặc stream cho tập dữ liệu lớn. Luôn dọn dẹp tài nguyên (listener, timer, file handles, DB connections) trong `finally`.
  - **Bảo mật mặc định (Security by Design):** Zero Trust Input (validate & sanitize). Tránh SQL/Command Injection. Không bao giờ hardcode secret, không lộ PII ra log hay response lỗi của user.
- **Quy trình 4 bước tự kiểm định trước khi trả kết quả (Mandatory Self-Audit Workflow):**
  - **Bước 1 (Pre-flight Design):** Xác định input/output và các trường hợp biên.
  - **Bước 2 (Clean Implementation):** Viết code rõ ràng, tự giải thích (Self-documenting).
  - **Bước 3 (Adversarial Self-Review):** Tự rà soát 6 câu hỏi kiểm định (catch rỗng, N+1, null/empty, leak/timeout, secret/auth, type safety).
  - **Bước 4 (Audit Summary & Tests):** Đính kèm mục `[Senior Self-Audit]` tóm tắt các Edge Cases đã bọc lót và gợi ý kịch bản test tương ứng.
  - *(Chi tiết văn bản gốc đầy đủ xem tại `.agents/rules/senior-code-architect-and-reviewer.md`)*

---

## 9. Quy Tắc Khung Kiến Trúc & Quan Trắc Hệ Thống Chuẩn Production (Production Architecture & Observability Standard)
- **Tôn chỉ kiến trúc (Architecture Philosophy):**
  - Áp dụng cấu trúc Clean Architecture & Multi-Agent Ready phân tách rạch ròi: `.agents/` (Quy tắc AI), `api/` (Presentation), `domain/` (Nghiệp vụ thuần túy), `agents/` (Điều phối Multi-Agent), `infrastructure/` (DB, Cache, External Gateway) và `observability/` (Logs, Traces, Metrics).
- **5 Quy Tắc Vàng Về Logging & Tracing:**
  1. **Nhật ký cấu trúc dạng JSON (Structured JSON Logging):** Cấm nối chuỗi tự do. Mọi bản ghi xuất ra Staging/Production phải là Single-line JSON chứa đầy đủ: `timestamp` (UTC ISO-8601), `level`, `trace_id`, `span_id`/`request_id`, `actor_context` (`user_id`/`agent_id`), `event`, `duration_ms`.
  2. **Truyền ngữ cảnh tự động qua Bất đồng bộ (`contextvars`):** Sử dụng `contextvars.ContextVar` (hoặc `AsyncLocalStorage` trong Node.js) để lưu và tự động kế thừa `trace_id` qua các luồng con (`asyncio.gather`), không truyền tham số thủ công.
  3. **Tự động che dữ liệu nhạy cảm ở tầng Logger (Automatic PII Redaction):** Gắn bộ lọc tại nhân Logger, tự động che `password`, `token`, `api_key`, `secret`, `authorization`, `card_number`, `cvv` thành `***REDACTED***`.
  4. **Phân cấp đúng mức độ Log (Log Level Discipline):** `DEBUG` (dev/local), `INFO` (cột mốc nghiệp vụ), `WARNING` (sự cố tự phục hồi/retry/rate limit), `ERROR` (thất bại kèm `error_code`, `error_type`, `stack_trace`), `CRITICAL` (sập DB/hết tài nguyên).
  5. **Quan trắc theo phương pháp RED & USE (Metrics & Tracing):** Đo lường 3 chỉ số RED trên từng API và Agent Node: **Rate** (RPS), **Errors** (tỷ lệ lỗi 4xx/5xx), **Duration** (độ trễ phân vị P50, P95, P99).
- *(Chi tiết văn bản gốc đầy đủ xem tại `.agents/rules/global-architecture.md` và `docs/architecture/production_architecture_and_observability.md`)*

---

## 10. Quy Chuẩn Thiết Kế Code Tầng Domain (Mức 1 - 2 - 3)
- Mọi mã nguồn trong `src/domain/` BẮT BUỘC tuân thủ nghiêm ngặt 5 nguyên tắc sau:
  1. **Guard Clauses & Early Return (Cấm Arrow Anti-Pattern):** Tuyệt đối không lồng `if-else` quá 2 cấp. Không dùng khối `else` sau lệnh `return` hoặc `raise`. Mọi hàm chia làm 3 tầng: Tầng 1 - Guard Clauses (ném `InvalidParameterError`/`ResourceNotFoundError`), Tầng 2 - Early Return (Edge Cases), Tầng 3 - Happy Path.
  2. **Thay thế `if-elif-else` bằng Lookup Table hoặc Strategy Pattern:** Cấm viết chuỗi `if-elif-else` từ 3 nhánh trở lên. Dùng `dict.get()` cho tra cứu/điều phối ngắn (< 20 dòng); dùng **Strategy Pattern** (`abc.ABC` + `@abstractmethod`) kèm **Registry Dictionary** cho nhánh phức tạp.
  3. **Dependency Injection (DI):** Không tự khởi tạo kết nối Database hay API Client bên trong hàm xử lý. Tiêm từ bên ngoài qua `__init__` hoặc Factory.
  4. **Single Level of Abstraction (SLA):** Hàm Mức 1 (Public API) chỉ điều phối nghiệp vụ mức cao ("Làm cái gì"). Hàm Mức 2, 3 (`_private`) xử lý chi tiết kỹ thuật ("Làm như thế nào"). Không trộn lẫn phép toán cấp thấp vào Mức 1.
  5. **The Stepdown Rule (Quy tắc Đọc xuống):** Sắp xếp thứ tự hàm trong file theo thứ tự ưu tiên chiều sâu (Depth-First): Caller nằm trên, Callee (`_private`) nằm ngay bên dưới nhánh gọi nó. Độc lập hoàn toàn với MCP: Tuyệt đối không `import mcp` hay `FastMCP` trong `src/domain/`.

---

## 11. Quy Chuẩn Đóng Gói MCP Tool (Mức 0 - Adapter Layer)
- Tầng `src/mcp_server/` tuân theo **Mô hình Tảng băng chìm**: Chỉ làm lớp vỏ mỏng tiếp xúc với AI Agent, tiêm phụ thuộc (DI) và gọi xuống hàm Mức 1 trong `src/domain/`.
- **4 Quy tắc Bắt buộc tại Mức 0:**
  1. **Đơn vị đo lường trong Tên biến & Schema:** Tên tham số có hậu tố đơn vị (`load_kn`, `length_m`, `area_mm2`, `timeout_sec`). Dùng `Annotated[type, Field(description="...")]` của Pydantic để mô tả giới hạn vật lý và định dạng.
  2. **Docstring là System Prompt thu nhỏ:** Ghi rõ (a) Công cụ này dùng để làm gì, (b) Khi nào AI nên/không nên gọi, (c) Ý nghĩa kết quả trả về.
  3. **Không dùng `try-except` thủ công trong từng Tool:** Luôn import và gắn `@mcp_error_boundary` từ `src.core.error_boundary` để tự động chuẩn hóa đầu ra thành `ToolResponse` (`status`, `trace_id`, `data`, `error_message`, `ai_recovery_hint`).
  4. **Chống AI gọi trùng lặp (Idempotency) cho thao tác Ghi/Sửa:** Bắt buộc gắn `@mcp_idempotent` từ `src.core.idempotency`.
- **Thứ tự Decorator Chuẩn:**
  - Read-Only: `@mcp.tool()` -> `@mcp_error_boundary`
  - Write/Mutate: `@mcp.tool()` -> `@mcp_error_boundary` -> `@mcp_idempotent(store=..., ttl_seconds=...)` *(Lưu ý: `@mcp_error_boundary` PHẢI nằm ngoài `@mcp_idempotent`)*.






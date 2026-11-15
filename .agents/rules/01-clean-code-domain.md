# QUY CHUẨN THIẾT KẾ CODE TẦNG DOMAIN (MỨC 1 - 2 - 3)

Mọi mã nguồn trong `src/domain/` BẮT BUỘC tuân thủ nghiêm ngặt 5 nguyên tắc sau:

## 1. Guard Clauses & Early Return (Cấm Arrow Anti-Pattern)
- Tuyệt đối không lồng `if-else` quá 2 cấp. Không dùng khối `else` sau lệnh `return` hoặc `raise`.
- Mọi hàm phải được chia làm 3 tầng từ trên xuống:
  1. **Tầng 1 - Guard Clauses:** Kiểm tra điều kiện biên/không hợp lệ ở ngay đầu hàm. Nếu vi phạm, bắt buộc ném ra `InvalidParameterError(message="...", ai_hint="...")` hoặc `ResourceNotFoundError` từ `src.core.exceptions`.
  2. **Tầng 2 - Early Return:** Trả về ngay kết quả cho các trường hợp đặc biệt (Edge Cases) trước khi chạy tính toán nặng.
  3. **Tầng 3 - Happy Path:** Luồng tính toán chính nằm phẳng hoàn toàn ở cuối hàm.

## 2. Thay thế `if-elif-else` bằng Lookup Table hoặc Strategy Pattern
- **Cấm viết chuỗi `if-elif-else` từ 3 nhánh trở lên.**
- **Trường hợp 1 (Đơn giản):** Nếu tra cứu hằng số hoặc điều phối các hàm ngắn (< 20 dòng, không có trạng thái riêng) -> Bắt buộc dùng `dict` (Lookup Table) kết hợp `.get()` và Guard Clause.
- **Trường hợp 2 (Phức tạp):** Nếu mỗi nhánh có nhiều biến nội bộ, công thức dài hoặc phụ thuộc tài nguyên bên ngoài -> Bắt buộc dùng **Strategy Pattern** (`abc.ABC` + `@abstractmethod`) kết hợp **Registry Dictionary**.

## 3. Dependency Injection (DI)
- Các class Strategy hoặc Service tuyệt đối không tự khởi tạo kết nối Database hay API Client bên trong hàm xử lý.
- Mọi phụ thuộc (DB connection, API client, cấu hình) phải được tiêm từ bên ngoài qua `__init__` hoặc thông qua Factory class.

## 4. Single Level of Abstraction (SLA)
- **Hàm Mức 1 (Public API):** Chỉ chứa các bước điều phối nghiệp vụ mức cao ("Làm cái gì"). Đọc từ trên xuống phải giống như mục lục công việc.
- **Hàm Mức 2, 3 (`_private`):** Chứa chi tiết kỹ thuật ("Làm như thế nào" như cắt chuỗi, tính toán công thức chi tiết, lọc mảng, đọc/ghi DB).
- Không bao giờ trộn lẫn phép toán cấp thấp hoặc xử lý chuỗi trực tiếp vào thân hàm Mức 1.

## 5. The Stepdown Rule (Quy tắc Đọc xuống)
- Sắp xếp thứ tự hàm trong file theo thứ tự gọi ưu tiên chiều sâu (**Depth-First**):
  - Hàm gọi (Caller - Mức 1) luôn nằm trên cùng.
  - Các hàm được gọi (Callee - Mức 2, Mức 3 bắt đầu bằng dấu `_`) phải nằm ngay bên dưới nhánh gọi nó.
- **Độc lập hoàn toàn với MCP:** Tuyệt đối không `import mcp` hay `FastMCP` trong `src/domain/`.

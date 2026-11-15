# BỘ RULE NỀN TẢNG (Project Rules) - Claude Code Configuration

Tài liệu này định nghĩa các quy chuẩn kỹ thuật nền tảng cho hệ thống, bao gồm thiết kế tầng Domain (Clean Code Mức 1, 2, 3) và tầng Adapter MCP Server (Mức 0).

---

# PHẦN 1: QUY CHUẨN THIẾT KẾ CODE TẦNG DOMAIN (MỨC 1 - 2 - 3)

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

---

# PHẦN 2: QUY CHUẨN ĐÓNG GÓI MCP TOOL (MỨC 0 - ADAPTER LAYER)

Tầng `src/mcp_server/` tuân theo **Mô hình Tảng băng chìm**: Chỉ làm lớp vỏ mỏng tiếp xúc với AI Agent, tiêm phụ thuộc (DI) và gọi xuống hàm Mức 1 trong `src/domain/`.

## 1. Bốn Quy tắc Bắt buộc tại Mức 0
1. **Đơn vị đo lường trong Tên biến & Schema:**
   - Tên tham số của hàm MCP Tool bắt buộc có hậu tố đơn vị (ví dụ: `load_kn`, `length_m`, `area_mm2`, `timeout_sec`).
   - Luôn dùng `Annotated[type, Field(description="...")]` của Pydantic để mô tả rõ ràng giới hạn vật lý và định dạng cho AI.
2. **Docstring là System Prompt thu nhỏ:**
   - Docstring của hàm `@mcp.tool()` phải ghi rõ: (a) Công cụ này dùng để làm gì, (b) Khi nào AI nên/không nên gọi, (c) Ý nghĩa kết quả trả về.
3. **Không dùng `try-except` thủ công trong từng Tool:**
   - Luôn import và gắn `@mcp_error_boundary` từ `src.core.error_boundary` để tự động chuẩn hóa đầu ra thành `ToolResponse` (chứa `status`, `trace_id`, `data`, `error_message`, `ai_recovery_hint`).
4. **Chống AI gọi trùng lặp (Idempotency) cho các thao tác Ghi/Sửa:**
   - Mọi MCP Tool có thao tác tạo mới, cập nhật DB, ghi file hoặc sửa bản vẽ BẮT BUỘC phải gắn `@mcp_idempotent` từ `src.core.idempotency`.

## 2. Thứ tự gắn Decorator Chuẩn (Bắt buộc đúng thứ tự từ trên xuống)

### Mẫu A: Công cụ Chỉ Đọc / Tính Toán (Read-Only Tool)
```python
@mcp.tool()
@mcp_error_boundary
def check_beam_capacity(
    beam_id: Annotated[str, Field(description="Mã định danh dầm, ví dụ: 'B-101'")],
    uniform_load_kn_per_m: Annotated[float, Field(gt=0, description="Tải trọng phân bố đều (kN/m)")]
) -> dict[str, Any]:
    """[System Prompt cho AI: Mô tả khi nào gọi và kết quả trả về]"""
    return domain_service.evaluate_beam(beam_id, uniform_load_kn_per_m)
```

### Mẫu B: Công cụ Ghi Dữ Liệu / Chỉnh Sửa (Write / Mutate Tool)
*(Lưu ý: `@mcp_error_boundary` PHẢI nằm ngoài `@mcp_idempotent` để bắt được lỗi `DuplicateInProgressError`)*
```python
@mcp.tool()
@mcp_error_boundary
@mcp_idempotent(store=idempotency_store, ttl_seconds=300.0)
def update_structural_element(
    element_id: Annotated[str, Field(description="Mã phần tử kết cấu")],
    section_name: Annotated[str, Field(description="Tên tiết diện mới, ví dụ: 'UB305x165x40'")]
) -> dict[str, Any]:
    """[System Prompt cho AI: Mô tả thao tác cập nhật có tính bất biến]"""
    return domain_service.upsert_element_section(element_id, section_name)
```

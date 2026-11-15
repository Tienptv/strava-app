# QUY CHUẨN ĐÓNG GÓI MCP TOOL (MỨC 0 - ADAPTER LAYER)

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

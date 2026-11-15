---
name: domain-driven-mcp
description: >-
  Quy chuẩn kiến trúc Domain-Driven Design và đóng gói MCP Tool Adapter (Mức 0) kết hợp thư viện src/core/.
  Áp dụng nguyên lý "Make it work -> Make it right -> Pack into MCP". Kích hoạt khi cần tái cấu trúc code nghiệp vụ
  tầng Domain (Mức 1-2-3), xử lý Guard Clauses & Strategy Pattern, hoặc đóng gói MCP Server Tool cho AI Agent.
---

# Domain-Driven Design & MCP Tooling (Production-Grade Skill)

Kỹ năng này chuẩn hóa quy trình phát triển và tái cấu trúc phần mềm theo kiến trúc **Domain-Driven Design (DDD) kết hợp AI Tooling (MCP Server)**, đảm bảo mã nguồn đạt chuẩn Production-Grade: chịu lỗi cao, tự phục hồi (Self-Correcting), chống Race Condition và sẵn sàng cho Multi-Agent.

---

## 1. Ba Trụ Cột Nền Tảng Của Hệ Thống

```
               [ AI Agent / MCP Client ]
                          │
  ┌───────────────────────▼────────────────────────┐
  │   TẦNG ADAPTER (MỨC 0): src/mcp_server/       │
  │   - FastMCP @mcp.tool()                        │
  │   - @mcp_error_boundary (ToolResponse JSON)    │
  │   - @mcp_idempotent (SHA-256 + SQLite WAL)     │
  └───────────────────────┬────────────────────────┘
                          │ (Gọi xuống Public API Mức 1)
  ┌───────────────────────▼────────────────────────┐
  │   TẦNG DOMAIN (MỨC 1 - 2 - 3): src/domain/    │
  │   - Mức 1: Public API điều phối (SLA)          │
  │   - Mức 2, 3: Private Helpers (_func)          │
  │   - Guard Clauses ném DomainError(ai_hint=...) │
  │   - Độc lập 100% với MCP Server               │
  └───────────────────────▲────────────────────────┘
                          │
  ┌───────────────────────┴────────────────────────┐
  │   THƯ VIỆN DÙNG CHUNG: src/core/              │
  │   - exceptions.py (DomainError, ai_hint)       │
  │   - error_boundary.py (Chuẩn hóa ToolResponse) │
  │   - idempotency.py (Bộ nhớ đệm chống trùng lặp)│
  └────────────────────────────────────────────────┘
```

---

## 2. Trụ Cột 1: Quy Chuẩn Code Tầng Domain (`src/domain/`)

Mọi hàm trong tầng Domain tuân thủ nghiêm ngặt 5 nguyên tắc:

### 1. Guard Clauses & Early Return
- Mọi hàm chia làm 3 tầng:
  1. **Tầng 1 (Guard Clauses):** Bắt lỗi tham số ngay đầu hàm. Ném `InvalidParameterError(message="...", ai_hint="...")` hoặc `ResourceNotFoundError`.
  2. **Tầng 2 (Early Return):** Trả về kết quả sớm cho các trường hợp biên đặc biệt trước khi tính toán nặng.
  3. **Tầng 3 (Happy Path):** Luồng tính toán chính nằm phẳng hoàn toàn, không lồng `if-else` quá 2 cấp. Cấm dùng `else` sau `return` hoặc `raise`.

### 2. Thay thế `if-elif-else` >= 3 nhánh
- **Nhánh ngắn (< 20 dòng):** Dùng `dict` (Lookup Table) kết hợp `.get()` và Guard Clause.
- **Nhánh phức tạp:** Dùng **Strategy Pattern** (`abc.ABC` + `@abstractmethod`) kết hợp **Registry Dictionary**.

### 3. Dependency Injection (DI)
- Tuyệt đối không tự khởi tạo DB Connection hoặc HTTP Client bên trong hàm domain. Tiêm từ bên ngoài qua `__init__` hoặc Factory.

### 4. Single Level of Abstraction (SLA)
- **Hàm Mức 1:** Chỉ chứa các bước điều phối nghiệp vụ mức cao ("Làm cái gì").
- **Hàm Mức 2, 3 (`_private`):** Xử lý chi tiết kỹ thuật ("Làm như thế nào").

### 5. The Stepdown Rule (Quy tắc Đọc xuống)
- Sắp xếp thứ tự hàm theo Depth-First: Caller (Mức 1) nằm trên cùng, các Callee (`_private`) nằm ngay bên dưới nhánh gọi nó.
- **Độc lập tuyệt đối:** Không bao giờ `import mcp` trong tầng Domain.

---

## 3. Trụ Cột 2: Thư Viện Core Dùng Chung (`src/core/`)

Import trực tiếp từ `src.core`:
```python
from src.core import (
    DomainError,
    InvalidParameterError,
    ResourceNotFoundError,
    DuplicateInProgressError,
    ToolResponse,
    mcp_error_boundary,
    mcp_idempotent,
    SQLiteIdempotencyStore,
    InMemoryIdempotencyStore,
)
```

### Phân cấp Exception & Self-Correction Hint
Khi ném lỗi, luôn cung cấp `ai_hint` rõ ràng để AI Agent tự sửa lỗi mà không làm phiền người dùng:
```python
raise InvalidParameterError(
    message=f"Tải trọng w={w_kn} kN không được nhỏ hơn hoặc bằng 0.",
    ai_hint="Hãy kiểm tra lại tham số 'uniform_load_kn' và truyền một giá trị dương lớn hơn 0."
)
```

---

## 4. Trụ Cột 3: Đóng Gói Tầng Adapter MCP (`src/mcp_server/`)

Mỗi MCP Tool được xây dựng như một lớp vỏ mỏng (Mô hình tảng băng chìm):
1. **Tên biến có hậu tố đơn vị:** `load_kn`, `length_m`, `area_mm2`, `timeout_sec`.
2. **Docstring là System Prompt thu nhỏ:** Mô tả rõ chức năng, khi nào nên gọi, ý nghĩa đầu ra.
3. **Thứ tự Decorator bắt buộc:**
   - **Read-Only Tool:**
     ```python
     @mcp.tool()
     @mcp_error_boundary
     def query_tool(...) -> dict[str, Any]:
         ...
     ```
   - **Write / Mutate Tool:**
     ```python
     @mcp.tool()
     @mcp_error_boundary
     @mcp_idempotent(store=idempotency_store, ttl_seconds=300.0)
     def mutate_tool(...) -> dict[str, Any]:
         ...
     ```
     *(Lưu ý: `@mcp_error_boundary` PHẢI nằm ngoài `@mcp_idempotent`)*.

---

## 5. Phối Hợp Cùng Subagent `agent-mcp-builder`

Khi cần tái cấu trúc một đoạn code phức tạp từ người dùng hoặc xây dựng một module MCP hoàn chỉnh từ đầu, Antigravity Orchestrator có thể ủy thác trực tiếp cho subagent `agent-mcp-builder` thông qua `invoke_subagent`:

```python
invoke_subagent(
    TypeName="agent-mcp-builder",
    Role="Principal MCP Architect",
    Prompt="Tái cấu trúc module sau theo quy chuẩn Domain-Driven và đóng gói thành MCP Tool: ..."
)
```

Hoặc người dùng có thể kích hoạt trực tiếp tại các nền tảng:
- **Antigravity / Gemini:** Tự động kích hoạt skill này khi phát hiện yêu cầu refactor domain / MCP.
- **Claude Code:** `/build-mcp-tool <đoạn code>`
- **Cursor IDE:** `@agent-mcp-builder <đoạn code>`

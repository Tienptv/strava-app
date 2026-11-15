# Khung Cấu Trúc Thư Mục Dự Án & Bộ Quy Tắc Thiết Kế Logging, Tracing, Quan Trắc Hệ Thống Chuẩn Production

Tài liệu này cung cấp bộ khung kiến trúc chuẩn **Production-Grade** dành cho các dự án **Python Web Backend (FastAPI/Async)** và **Hệ thống Multi-Agent (LangGraph/MCP)** phát triển trên **Google Antigravity IDE**.

## 1. Khung Cấu Trúc Thư Mục Dự Án Chuẩn Production (Clean Architecture + Multi-Agent Ready)

Cấu trúc dưới đây phân tách rạch ròi giữa **Quy tắc AI (`.agents/`)**, **Tầng Giao Tiếp (`api/`)**, **Tầng Nghiệp Vụ & Agent (`domain/`, `agents/`)**, **Tầng Hạ Tầng (`infrastructure/`)** và **Tầng Quan Trắc (`observability/`)**:

```text
project-root/
├── .agents/                                 # Cấu hình AI Agent cho Google Antigravity IDE
│   ├── rules/
│   │   └── global-architecture.md           # Quy tắc kiến trúc cốt lõi toàn dự án
│   └── skills/
│       ├── senior-code-architect-and-reviewer/
│       │   └── SKILL.md                     # Kỹ năng tự kiểm định code chuẩn Senior
│       └── observability-and-logging/
│           └── SKILL.md                     # Kỹ năng chuẩn hóa Logging, Tracing & Metrics
├── .github/
│   └── workflows/
│       ├── ci-quality-gate.yml              # Chốt chặn tự động: Ruff, Mypy, Pytest, Security Audit
│       └── cd-release.yml                   # Đóng gói Docker, chạy Migration & Deploy
├── docker/
│   ├── Dockerfile                           # Multi-stage build tối ưu dung lượng và bảo mật (non-root user)
│   └── docker-compose.yml                   # App + PostgreSQL + Redis + OpenTelemetry/Grafana Loki
├── docs/
│   ├── adr/                                 # Architecture Decision Records (Hồ sơ quyết định kiến trúc)
│   │   ├── 0001-two-phase-reservation.md
│   │   └── 0002-structured-json-logging.md
│   └── runbooks/                            # Sổ tay xử lý sự cố vận hành (On-call Runbooks)
│       └── high-latency-or-db-lock.md
├── migrations/                              # Quản lý phiên bản Database Schema (Alembic)
│   ├── versions/
│   └── env.py
├── src/
│   └── app/
│       ├── __init__.py
│       ├── main.py                          # Điểm khởi chạy ứng dụng (Lifespan, Middleware, Routers)
│       ├── config.py                        # Quản lý cấu hình & biến môi trường bằng Pydantic Settings
│       ├── api/                             # Tầng Presentation / Giao tiếp HTTP & WebSocket
│       │   ├── dependencies.py              # Dependency Injection (Auth, DB Session, Rate Limiter)
│       │   ├── middlewares/
│       │   │   └── correlation.py           # Gắn kết trace_id, request_id và đo thời gian thực thi
│       │   └── v1/
│       │       ├── routers/
│       │       └── schemas/                 # DTOs: Request/Response Pydantic Schemas
│       ├── domain/                          # Tầng Nghiệp Vụ Lõi (Không phụ thuộc thư viện ngoài)
│       │   ├── entities/
│       │   ├── exceptions.py                # Hệ thống phân loại lỗi nghiệp vụ (Typed Domain Exceptions)
│       │   ├── interfaces/                  # Giao diện Repository & Gateway (Protocols)
│       │   └── services/                    # Xử lý logic nghiệp vụ thuần túy
│       ├── agents/                          # Tầng Điều Phối AI / Multi-Agent (nếu có)
│       │   ├── orchestrator.py              # LangGraph StateGraph & luồng điều phối
│       │   ├── state.py                     # Định nghĩa TypedDict/Pydantic State giữa các Agent
│       │   ├── nodes/                       # Các nhánh Agent chuyên biệt
│       │   └── mcp_clients/                 # Kết nối MCP Servers có bọc Timeout & Circuit Breaker
│       ├── infrastructure/                  # Tầng Thực Thi Hạ Tầng (Database, Cache, External APIs)
│       │   ├── db/
│       │   │   ├── session.py               # Async Connection Pool (SQLAlchemy / Asyncpg)
│       │   │   ├── models.py                # ORM Models
│       │   │   └── repositories/            # Thực thi truy vấn DB (chống N+1, khóa dòng an toàn)
│       │   ├── cache/                       # Redis Client & Idempotency Store
│       │   └── gateways/                    # HTTP Clients gọi bên thứ 3 (bọc Retry & Timeout)
│       └── observability/                   # Tầng Quan Trắc Hệ Thống (Logs, Traces, Metrics)
│           ├── context.py                   # Quản lý ContextVars (trace_id, request_id, user_id, agent_id)
│           ├── logger.py                    # Bộ định dạng JSON Logger + Bộ lọc che dữ liệu nhạy cảm (PII Masking)
│           ├── tracing.py                   # Decorator đo thời gian và bắt lỗi từng hàm/Agent Node
│           └── metrics.py                   # Bộ đếm Prometheus / OpenTelemetry (Latency, Error Rate)
├── tests/                                   # Bộ kiểm thử tự động phân tầng (Testing Pyramid)
│   ├── conftest.py                          # Fixtures dùng chung (Mock DB, AsyncClient)
│   ├── unit/                                # Kiểm thử nhanh logic nghiệp vụ và biên (Edge Cases)
│   ├── integration/                         # Kiểm thử tương tác DB, Redis, Idempotency & Race Condition
│   └── e2e/                                 # Kiểm thử toàn luồng API
├── .env.example                             # Mẫu biến môi trường (tuyệt đối không commit file .env thật)
├── pyproject.toml                           # Quản lý thư viện và cấu hình Ruff, Mypy, Pytest
└── Makefile                                 # Lệnh tắt chuẩn hóa: make lint, make typecheck, make test, make run
```

## 2. Bộ Quy Tắc Thiết Kế Logging, Tracing & Quan Trắc Hệ Thống Chuẩn Senior

Để hệ thống tự động chỉ ra điểm nghẽn hoặc nguyên nhân gốc rễ (Root Cause) chỉ trong vài giây khi xảy ra sự cố, mọi dòng nhật ký (Log) và dấu vết (Trace) phải tuân thủ **5 quy tắc vàng**:

### Quy tắc 1: Nhật ký cấu trúc dạng JSON (Structured JSON Logging)
* **Cấm nối chuỗi tự do:** Không viết `logger.info(f"User {user_id} bought item {sku}")` vì hệ thống phân tích log (như Grafana Loki, ELK, Datadog) không thể lọc hay thống kê tự động theo trường dữ liệu.
* **Chuẩn hóa trường dữ liệu:** Mọi bản ghi log xuất ra môi trường Staging/Production phải ở định dạng JSON trên một dòng (Single-line JSON), luôn chứa bộ khung trường chuẩn:
  * `timestamp`: Thời gian chuẩn UTC định dạng ISO-8601 (`2026-11-14T15:30:00.123456Z`).
  * `level`: Mức độ nghiêm trọng (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`).
  * `trace_id`: Mã định danh xuyên suốt toàn bộ giao dịch (từ lúc người dùng bấm nút trên Web qua API xuống DB hoặc qua chuỗi 16 AI Agents).
  * `span_id` / `request_id`: Mã định danh của từng bước hoặc từng nhánh con đang thực thi.
  * `actor_context`: Gồm `user_id` hoặc `agent_id` đang thực hiện tác vụ.
  * `event`: Tên sự kiện ngắn gọn, cố định (ví dụ: `checkout.started`, `payment.retry`, `agent.node_completed`).
  * `duration_ms`: Thời gian thực thi tính bằng mili-giây (bắt buộc ở các bước gọi DB, API ngoài, hoặc LLM).

### Quy tắc 2: Truyền ngữ cảnh tự động qua Bất đồng bộ (`contextvars`)
* Trong môi trường Web bất đồng bộ (`asyncio`) hoặc khi chạy nhiều nhánh Multi-Agent song song (`asyncio.gather`), biến toàn cục thông thường sẽ bị ghi đè lẫn nhau giữa các luồng.
* **Giải pháp bắt buộc:** Sử dụng `contextvars.ContextVar` của Python để lưu `trace_id`, `request_id`, `user_id`, và `agent_id`. Khi một luồng cha đẻ ra 5 luồng con chạy song song, Python tự động sao chép ngữ cảnh `ContextVar` sang từng luồng con mà không cần truyền tay tham số `trace_id` vào mọi hàm trong dự án.

### Quy tắc 3: Tự động che dữ liệu nhạy cảm ở tầng Logger (Automatic PII & Secret Redaction)
* Không tin tưởng việc lập trình viên luôn nhớ che mật khẩu hay mã thẻ bằng tay ở từng câu lệnh log.
* **Giải pháp bắt buộc:** Gắn một bộ lọc (`logging.Filter`) ngay tại nhân Logger. Bất kỳ trường dữ liệu nào có tên nhạy cảm (`password`, `token`, `api_key`, `secret`, `authorization`, `card_number`, `cvv`) hoặc chuỗi khớp mẫu thẻ/khóa bí mật đều tự động bị biến đổi thành `***REDACTED***` trước khi ghi ra màn hình hoặc file.

### Quy tắc 4: Phân cấp đúng mức độ Log (Log Level Discipline)
* **`DEBUG`:** Chi tiết dữ liệu trung gian phục vụ gỡ lỗi ở môi trường máy cá nhân (tắt trên Production).
* **`INFO`:** Các cột mốc chuyển trạng thái nghiệp vụ quan trọng (Đơn hàng được tạo, Agent hoàn thành phân tích nhánh vĩ mô, Thanh toán thành công).
* **`WARNING`:** Sự cố tạm thời mà hệ thống tự phục hồi được hoặc dữ liệu đầu vào bất thường (Cổng thanh toán timeout lần 1 phải retry, User nhập sai định dạng, chạm giới hạn Rate Limit).
* **`ERROR`:** Lỗi làm thất bại một yêu cầu của người dùng hoặc một nhánh tác vụ và cần can thiệp/kiểm tra (Thanh toán thất bại sau 3 lần retry, câu truy vấn DB bị lỗi, MCP Server sập). Luôn đính kèm `error_code`, `error_type` và `stack_trace`.
* **`CRITICAL`:** Lỗi đe dọa làm sập toàn bộ hệ thống (Mất kết nối hoàn toàn tới Database chính, hết sạch ổ cứng/RAM).

### Quy tắc 5: Quan trắc theo phương pháp RED & USE (Metrics & Tracing)
Bên cạnh Log, mỗi cổng giao tiếp API và mỗi Agent Node cần đo lường 3 chỉ số **RED**:
1. **R - Rate (Lưu lượng):** Số lượng request hoặc tác vụ xử lý mỗi giây (RPS).
2. **E - Errors (Tỷ lệ lỗi):** Phần trăm request thất bại (phân tách rõ lỗi `4xx` do phía gửi và lỗi `5xx` do hệ thống).
3. **D - Duration (Độ trễ phân vị):** Theo dõi độ trễ ở phân vị **P50, P95 và P99** (không dùng số trung bình cộng vì trung bình cộng che giấu các giao dịch bị treo 10–30 giây).

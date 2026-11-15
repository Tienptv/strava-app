---
name: observability-and-logging
description: >-
  Chuẩn hóa Logging, Tracing và Metrics chuẩn Production-Grade cho hệ thống backend và Multi-Agent.
  Áp dụng 5 quy tắc vàng: Structured JSON Logging, truyền ngữ cảnh contextvars, tự động che dữ liệu nhạy cảm PII,
  kỷ luật phân cấp Log Levels, và đo lường quan trắc RED (Rate, Errors, Duration).
---

# Observability and Logging (Production-Grade Skill)

Kỹ năng này hướng dẫn và áp dụng bộ tiêu chuẩn thiết kế Logging, Tracing và Quan trắc hệ thống đạt chuẩn Production cho backend hiện đại (FastAPI, Async, Multi-Agent LangGraph/MCP).

---

## 1. 5 Quy Tắc Vàng Về Logging & Tracing

### Quy tắc 1: Nhật ký cấu trúc dạng JSON (Structured JSON Logging)
* **Cấm nối chuỗi tự do:** Không viết `logger.info(f"User {user_id} bought item {sku}")`.
* **Bộ khung JSON chuẩn:** Mọi bản ghi log xuất ra môi trường Staging/Production phải ở định dạng JSON trên một dòng (Single-line JSON), luôn chứa:
  * `timestamp`: Thời gian chuẩn UTC định dạng ISO-8601 (`2026-11-14T15:30:00.123456Z`).
  * `level`: Mức độ nghiêm trọng (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`).
  * `trace_id`: Mã định danh xuyên suốt toàn bộ giao dịch (từ lúc người dùng bấm nút trên Web qua API xuống DB hoặc qua chuỗi Multi-Agent).
  * `span_id` / `request_id`: Mã định danh của từng bước hoặc từng nhánh con đang thực thi.
  * `actor_context`: Gồm `user_id` hoặc `agent_id` đang thực hiện tác vụ.
  * `event`: Tên sự kiện ngắn gọn, cố định (ví dụ: `checkout.started`, `payment.retry`, `agent.node_completed`).
  * `duration_ms`: Thời gian thực thi tính bằng mili-giây (bắt buộc ở các bước gọi DB, API ngoài, hoặc LLM).

### Quy tắc 2: Truyền ngữ cảnh tự động qua Bất đồng bộ (`contextvars`)
* **Giải pháp bắt buộc:** Sử dụng `contextvars.ContextVar` (hoặc `AsyncLocalStorage` trong Node.js) để lưu `trace_id`, `request_id`, `user_id`, và `agent_id`.
* Khi một luồng cha đẻ ra nhiều nhánh con chạy song song (`asyncio.gather`), ngữ cảnh `ContextVar` được kế thừa tự động, không cần truyền tham số thủ công qua từng hàm.

### Quy tắc 3: Tự động che dữ liệu nhạy cảm ở tầng Logger (Automatic PII & Secret Redaction)
* Gắn một bộ lọc (`logging.Filter`) ngay tại nhân Logger.
* Bất kỳ trường dữ liệu nào có tên nhạy cảm (`password`, `token`, `api_key`, `secret`, `authorization`, `card_number`, `cvv`) hoặc chuỗi khớp mẫu thẻ/khóa bí mật đều tự động bị biến đổi thành `***REDACTED***` trước khi ghi ra màn hình hoặc file.

### Quy tắc 4: Phân cấp đúng mức độ Log (Log Level Discipline)
* **`DEBUG`:** Chi tiết dữ liệu trung gian phục vụ gỡ lỗi ở môi trường local/dev (tắt trên Production).
* **`INFO`:** Các cột mốc chuyển trạng thái nghiệp vụ quan trọng (Đơn hàng được tạo, Agent hoàn thành phân tích nhánh vĩ mô, Thanh toán thành công).
* **`WARNING`:** Sự cố tạm thời mà hệ thống tự phục hồi được hoặc dữ liệu đầu vào bất thường (Timeout lần 1 phải retry, User nhập sai định dạng, chạm giới hạn Rate Limit).
* **`ERROR`:** Lỗi làm thất bại một yêu cầu của người dùng hoặc một nhánh tác vụ (Thanh toán thất bại sau 3 lần retry, DB query exception, MCP Server sập). Luôn đính kèm `error_code`, `error_type` và `stack_trace`.
* **`CRITICAL`:** Lỗi đe dọa làm sập toàn bộ hệ thống (Mất kết nối hoàn toàn tới DB chính, cạn kiệt tài nguyên ổ cứng/RAM).

### Quy tắc 5: Quan trắc theo phương pháp RED & USE (Metrics & Tracing)
Đo lường 3 chỉ số **RED** trên từng cổng API và từng Agent Node:
1. **R - Rate (Lưu lượng):** Số lượng request hoặc tác vụ xử lý mỗi giây (RPS).
2. **E - Errors (Tỷ lệ lỗi):** Phần trăm request thất bại (phân tách rõ lỗi `4xx` và lỗi `5xx`).
3. **D - Duration (Độ trễ phân vị):** Theo dõi độ trễ ở phân vị **P50, P95 và P99** (không dùng số trung bình cộng).

---

## 2. Khung Thư Mục Chuẩn Tầng Quan Trắc (`observability/`)

```text
src/app/observability/
├── context.py        # Quản lý ContextVars (trace_id, request_id, user_id, agent_id)
├── logger.py         # Bộ định dạng JSON Logger + Bộ lọc che dữ liệu nhạy cảm (PII Masking)
├── tracing.py        # Decorator đo thời gian và bắt lỗi từng hàm/Agent Node
└── metrics.py        # Bộ đếm Prometheus / OpenTelemetry (Latency, Error Rate)
```

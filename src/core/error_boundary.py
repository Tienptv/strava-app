"""
Decorator @mcp_error_boundary xử lý lỗi tập trung tại Tầng MCP Adapter (Mức 0).
Đảm bảo AI Agent luôn nhận được cấu trúc JSON chuẩn (ToolResponse) và không bao giờ
bị lộ Stack Trace nội bộ khi xảy ra lỗi hệ thống.
"""

import functools
import inspect
import logging
import uuid
from typing import Any, Callable, Optional, ParamSpec, TypedDict, TypeVar

from src.core.exceptions import DomainError

logger = logging.getLogger("MCPServer")


class ToolResponse(TypedDict):
    status: str                     # "success" | "validation_error" | "transient_error" | "system_error"
    trace_id: str                   # Mã định danh duy nhất cho mỗi lần gọi Tool
    data: Optional[dict[str, Any]]  # Kết quả nghiệp vụ khi thành công
    error_message: Optional[str]    # Mô tả lỗi đã được làm sạch (Sanitized)
    ai_recovery_hint: Optional[str] # Chỉ dẫn cụ thể để AI Agent biết bước tiếp theo cần làm gì


P = ParamSpec("P")
R = TypeVar("R", bound=dict[str, Any])


def mcp_error_boundary(func: Callable[P, R]) -> Callable[P, ToolResponse]:
    """
    Decorator bọc quanh các hàm MCP Tool (Mức 0):
    - Bảo toàn 100% chữ ký hàm (Function Signature) cho FastMCP thông qua @functools.wraps.
    - Tự động bắt và phân loại lỗi từ tầng Mức 1 thành cấu trúc ToolResponse cho AI Agent.
    """
    if inspect.iscoroutinefunction(func):
        @functools.wraps(func)
        async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> ToolResponse:
            trace_id = uuid.uuid4().hex[:8]
            try:
                raw_result = await func(*args, **kwargs)
                return {
                    "status": "success",
                    "trace_id": trace_id,
                    "data": raw_result,
                    "error_message": None,
                    "ai_recovery_hint": None,
                }
            except Exception as exc:
                return _handle_tool_exception(exc, func.__name__, kwargs, trace_id)

        return async_wrapper  # type: ignore

    @functools.wraps(func)
    def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> ToolResponse:
        trace_id = uuid.uuid4().hex[:8]
        try:
            raw_result = func(*args, **kwargs)
            return {
                "status": "success",
                "trace_id": trace_id,
                "data": raw_result,
                "error_message": None,
                "ai_recovery_hint": None,
            }
        except Exception as exc:
            return _handle_tool_exception(exc, func.__name__, kwargs, trace_id)

    return sync_wrapper


def _handle_tool_exception(
    exc: Exception,
    tool_name: str,
    tool_args: dict[str, Any],
    trace_id: str,
) -> ToolResponse:
    log_extra = {"trace_id": trace_id}

    # Nhóm 1: Lỗi Nghiệp vụ & Đầu vào đã được kiểm soát (DomainError)
    if isinstance(exc, DomainError):
        logger.warning(
            f"[trace_id={trace_id}] Domain validation failed in '{tool_name}' "
            f"with args={tool_args}: {exc.message}",
            extra=log_extra,
        )
        return {
            "status": "validation_error",
            "trace_id": trace_id,
            "data": None,
            "error_message": exc.message,
            "ai_recovery_hint": exc.ai_hint,
        }

    # Nhóm 2: Lỗi Hạ tầng tạm thời (Timeout, Mạng, Kết nối DB)
    if isinstance(exc, (TimeoutError, ConnectionError)):
        logger.error(
            f"[trace_id={trace_id}] Infrastructure timeout/connection error in '{tool_name}': {exc}",
            extra=log_extra,
        )
        return {
            "status": "transient_error",
            "trace_id": trace_id,
            "data": None,
            "error_message": "Kết nối tới cơ sở dữ liệu hoặc dịch vụ kỹ thuật bị quá thời gian chờ (Timeout).",
            "ai_recovery_hint": (
                "Không thay đổi tham số. Hãy thử gọi lại công cụ này thêm 1 lần nữa "
                "hoặc báo cho người dùng hệ thống dữ liệu đang bận."
            ),
        }

    # Nhóm 3: Lỗi Hệ thống bất ngờ (Giấu tuyệt đối Stack Trace nội bộ)
    logger.critical(
        f"[trace_id={trace_id}] Unhandled system exception in '{tool_name}' with args={tool_args}",
        exc_info=True,
        extra=log_extra,
    )
    return {
        "status": "system_error",
        "trace_id": trace_id,
        "data": None,
        "error_message": f"Lỗi hệ thống nội bộ khi thực thi '{tool_name}'. Mã tra cứu log: {trace_id}.",
        "ai_recovery_hint": (
            "Dừng việc gọi lại công cụ này. Hãy thông báo mã tra cứu lỗi (trace_id) "
            "cho người dùng để bộ phận kỹ thuật kiểm tra."
        ),
    }

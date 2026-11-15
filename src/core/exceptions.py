"""
Hệ thống phân cấp Ngoại lệ (Exceptions) dùng chung cho toàn dự án.
Tầng Domain (Mức 1-2-3) chỉ ném ra các lỗi kế thừa từ DomainError kèm theo ai_hint.
"""


class DomainError(Exception):
    """
    Lớp cơ sở cho mọi lỗi nghiệp vụ đã được kiểm soát ở Tầng Domain (Mức 1).
    Bắt buộc cung cấp `ai_hint` để AI Agent biết cách tự phục hồi (Self-Correction).
    """

    def __init__(self, message: str, ai_hint: str) -> None:
        super().__init__(message)
        self.message = message
        self.ai_hint = ai_hint


class InvalidParameterError(DomainError):
    """
    Ném ra tại tầng Guard Clauses khi dữ liệu đầu vào vi phạm quy tắc vật lý,
    tiêu chuẩn thiết kế hoặc định dạng nghiệp vụ.
    """
    pass


class ResourceNotFoundError(DomainError):
    """
    Ném ra khi không tìm thấy thực thể (dầm, cọc, vật liệu, bản vẽ...) trong Database.
    """
    pass


class DuplicateInProgressError(DomainError):
    """
    Ném ra bởi @mcp_idempotent khi 2 request có cùng tham số gọi vào Tool ghi dữ liệu
    tại cùng một thời điểm (Race Condition).
    """

    def __init__(self, tool_name: str, key: str) -> None:
        super().__init__(
            message=f"Thao tác '{tool_name}' (key={key[:8]}) đang được xử lý ở một tiến trình khác.",
            ai_hint="Không gọi lặp lại công cụ này. Hãy chờ kết quả từ lệnh gọi trước đó."
        )

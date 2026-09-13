# Rule: Luôn Lập Kế Hoạch & Chờ Người Dùng Review Sau Mỗi Prompt (Plan-First & Review Workflow)

## 1. Nguyên Tắc Cốt Lõi
Sau mỗi câu lệnh (Prompt) của người dùng liên quan đến phát triển, sửa đổi mã nguồn, tái cấu trúc logic hoặc thiết kế UI/UX:

1. **BẮT BUỘC LẬP KẾ HOẠCH TRƯỚC TIÊN (PLAN-FIRST):**
   - Nghiên cứu kỹ lưỡng codebase, kiến trúc hiện tại và yêu cầu của người dùng.
   - Luôn khởi tạo hoặc cập nhật file kế hoạch triển khai `implementation_plan.md` với đầy đủ các mục:
     - Mục tiêu công việc (Goal Description).
     - Phân tích hiện trạng & nguyên nhân kỹ thuật.
     - Các giải pháp kiến trúc đề xuất.
     - Danh sách chi tiết các file cần thay đổi (`[NEW]`, `[MODIFY]`, `[DELETE]`).
     - Kế hoạch kiểm thử cụ thể (Verification Plan).
   - Thiết lập metadata: `RequestFeedback: true` và `UserFacing: true` để giao diện hiển thị bảng phê duyệt cho người dùng.

2. **CHỜ NGƯỜI DÙNG REVIEW & BỔ SUNG Ý KIẾN (USER REVIEW & COMMENTS):**
   - Trình bày ngắn gọn, dẫn link tới bản kế hoạch và nêu bật các câu hỏi mở (Open Questions) để người dùng dễ dàng comment, góp ý hoặc điều chỉnh định hướng.
   - Tuyệt đối **KHÔNG tự ý sửa đổi code, không chạy các lệnh thay đổi dữ liệu** trước khi người dùng xem xét, comment và bấm chấp thuận (**Proceed / Approve**).

3. **THỰC THI CHÍNH XÁC THEO KẾ HOẠCH ĐÃ ĐƯỢC CHỐT:**
   - Sau khi người dùng đồng ý với kế hoạch (và các comment điều chỉnh nếu có), mới tiến hành viết code, thực thi và kiểm thử theo đúng quy tắc kiểm thử thực tế 100%.

# Rule: Bắt Buộc Kiểm Thử Thực Tế & Báo Cáo Kết Quả Chân Thật 100%

## 1. Nguyên Tắc Cốt Lõi
Mỗi khi AI hoàn thành việc viết hoặc chỉnh sửa mã nguồn (Proceed / Execute code thay đổi):
1. **BẮT BUỘC TẠO TEST CASE GIẢ ĐỊNH ĐỂ KIỂM THỬ THỰC TẾ:**
   - Tuyệt đối không dừng lại sau khi sửa code mà không chạy thử nghiệm.
   - Phải thiết lập các kịch bản kiểm thử (Test Cases / Mock Payloads) bao phủ các luồng: Thành công (Happy Path), Sai dữ liệu (Edge Cases), Lỗi bảo mật / Token không hợp lệ.
   - Trực tiếp chạy test script bằng command line để xác minh mã nguồn thực thi được, không phát sinh lỗi cú pháp (SyntaxError) hay lỗi runtime.

2. **BÁO CÁO KẾT QUẢ CHÂN THẬT 100%:**
   - Phản hồi đầy đủ và trung thực kết quả kiểm thử thực tế từ đầu ra của command line.
   - Nêu rõ các case ĐẠT (PASS) và case KHÔNG ĐẠT (FAIL nếu có).
   - Tuyệt đối không ngụy tạo kết quả, không làm tròn hay che giấu lỗi runtime.
   - Nếu có lỗi phát sinh, phải phân tích rõ nguyên nhân và đưa ra giải pháp khắc phục triệt để.

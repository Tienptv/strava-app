# Hướng Dẫn Sử Dụng & Cập Nhật Dữ Liệu Strava Dashboard

Ứng dụng **Strava Dashboard** giúp theo dõi tiến độ hoàn thành mục tiêu tập thể (ví dụ: Chạy Xuyên Việt). Do API của Strava dành cho Club bị giới hạn (chỉ trả về một số hoạt động gần nhất, không trả về toàn bộ lịch sử trong năm), ứng dụng cho phép người dùng tự tải lên các file dữ liệu CSV của cá nhân để cập nhật và cộng dồn số liệu chính xác.

## 1. Cách lấy dữ liệu (Export CSV) từ Strava
Để có được file CSV ghi nhận đầy đủ quá trình chạy của bạn:
1. Đăng nhập vào trang web [Strava.com](https://www.strava.com) trên máy tính.
2. Đi tới **Settings** (Cài đặt) > **My Account** (Tài khoản của tôi).
3. Tìm phần **Download or Delete Your Account** và click vào **Get Started**.
4. Trong phần **Download Request**, chọn **Request your archive** (Yêu cầu kho lưu trữ của bạn).
5. Strava sẽ gửi một email kèm link tải file nén (zip). Sau khi tải về và giải nén, bạn sẽ thấy file **`activities.csv`** chứa toàn bộ hoạt động của bạn.

*(Lưu ý: Nếu bạn có file CSV export riêng từ một tool bên thứ 3 nào đó, chỉ cần đảm bảo file có các cột cơ bản như `Activity Type`, `Date`, `Distance`, `Moving Time` hoặc `Duration`, `Athlete` / `Name`).*

## 2. Hướng dẫn đẩy dữ liệu (Import CSV) lên Server

Trên giao diện chính của Dashboard, thanh Menu (Sidebar) bên trái cung cấp 2 tùy chọn để đẩy dữ liệu lên server:

- **[Chọn File]**: Phù hợp khi bạn muốn tải lên 1 hoặc nhiều file CSV lẻ (Giữ phím `Ctrl` hoặc `Shift` để chọn nhiều file cùng lúc).
- **[Chọn Folder]**: Phù hợp khi nhóm của bạn có nhiều thành viên và bạn đã gom chung tất cả file CSV vào một thư mục. Khi chọn thư mục này, trình duyệt sẽ tự động quét toàn bộ bên trong để tìm và tải lên tất cả các file có đuôi `.csv`.

### Luồng xử lý dữ liệu:
- **Tự động lọc**: Hệ thống sẽ bỏ qua các file không phải CSV.
- **Tự động gộp (Merge) & Chống trùng lặp**: Các bản ghi mới tải lên sẽ được đối chiếu với cơ sở dữ liệu hiện có trên server thông qua các thông tin: *Tên người chạy, Ngày chạy, Thời gian di chuyển, và Quãng đường*.
  - Nếu trùng lặp (ví dụ bạn tải lại file cũ): Dữ liệu mới nhất sẽ được ưu tiên ghi đè.
  - Nếu là dữ liệu mới hoàn toàn: Sẽ được bổ sung vào hệ thống.
- **Lưu trữ**: Dữ liệu gộp cuối cùng sẽ được gửi thẳng lên Server và lưu an toàn tại `server/data/imported_activities.json`. Hệ thống ngay lập tức sẽ tự động cập nhật lại tổng số KM trên thanh Tiến độ Mục tiêu mà không làm mất số liệu của các thành viên khác.

## 3. Hướng dẫn cập nhật phiên bản mới (Triển khai lên Render)

Bất cứ khi nào bạn có thay đổi mã nguồn (code) của ứng dụng trên máy tính cá nhân, bạn có thể dễ dàng cập nhật những thay đổi đó lên trang web chính thức (trên Render):

1. **Sử dụng GitHub Desktop**: 
   - Mở GitHub Desktop, nhập mô tả tóm tắt nội dung thay đổi vào ô **Summary (required)**.
   - Nhấn nút **Commit to main**.
   - Sau đó nhấn **Push origin** để đẩy (upload) code mới lên kho lưu trữ GitHub.
2. **Cập nhật tự động (Auto Deploy)**:
   - Khi code mới đã được đẩy lên GitHub, máy chủ **Render sẽ tự động nhận diện** có phiên bản mới.
   - Render sẽ tự động tiến hành quá trình tải code, cài đặt và khởi động lại trang web của bạn.
   - Quá trình này **thường mất khoảng 1-2 phút**. Sau thời gian đó, bạn chỉ cần tải lại (F5) trang web chính thức là sẽ thấy những thay đổi được áp dụng.

---

### Khởi động dự án (Dành cho Developer)

**1. Khởi động Server API (Backend):**
```bash
cd server
npm install
node index.js
```
*(Server mặc định chạy tại cổng 3001, cung cấp API lưu trữ CSV và cấu hình)*

**2. Khởi động Frontend:**
```bash
npm install
npm run dev
```
*(Mở đường dẫn localhost hiển thị trên Terminal để xem Dashboard)*

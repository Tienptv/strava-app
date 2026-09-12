# Quy Tắc Đa Ngôn Ngữ Đồng Bộ (Bilingual Parity & Full i18n Rule)

## 1. Yêu Cầu Cốt Lõi
Hệ thống Strava Desktop Software hỗ trợ đầy đủ 2 ngôn ngữ: **Tiếng Việt (`vi`)** và **Tiếng Anh (`en`)**.

- Khi người dùng chọn giao diện **English (`en`)**:
  - Toàn bộ giao diện người dùng **bắt buộc phải hiển thị 100% bằng Tiếng Anh**.
  - Bao gồm: Tiêu đề trang, nhãn nút bấm, cột bảng dữ liệu, thông báo popup (SweetAlert2), thông báo lỗi, chú thích tooltip, và nội dung tư vấn từ AI Running Coach / Kế hoạch tuần 7 ngày.
- Khi người dùng chọn giao diện **Việt Nam (`vi`)**:
  - Toàn bộ giao diện người dùng **bắt buộc phải hiển thị 100% bằng Tiếng Việt**.
  - Không để sót các cụm từ Tiếng Anh chưa dịch (ngoại trừ các thuật ngữ quốc tế phổ biến như "Pace", "Strava", "Cookie", "Admin", hoặc slogan thương hiệu *"Enhancing Society Together"*).

---

## 2. Nguyên Tắc Không Trộn Lẫn Ngôn Ngữ (Zero Language Mixing)
- Tuyệt đối không để xảy ra tình trạng:
  - Bật Tiếng Anh mà vẫn còn nút hoặc đoạn văn Tiếng Việt.
  - Bật Tiếng Việt mà vẫn còn nút hoặc đoạn văn Tiếng Anh.
- Mọi chuỗi văn bản mới khi thêm vào ứng dụng phải được dịch và đồng bộ đầy đủ cả 2 ngôn ngữ.

---

## 3. Quy Chuẩn Kỹ Thuật Khi Viết Code
1. **Frontend:**
   - Luôn sử dụng context đa ngôn ngữ:
     ```javascript
     import { useLang } from '../i18n/LangContext';
     const { lang, t } = useLang();
     ```
   - Sử dụng `t('translationKey')` cho các chuỗi có trong từ điển `translations.js`.
   - Đối với các chuỗi động hoặc template string, sử dụng biểu thức điều kiện:
     ```javascript
     lang === 'en' ? 'English text...' : 'Văn bản tiếng Việt...'
     ```
   - Khi tạo key mới trong `frontend/src/i18n/translations.js`, bắt buộc phải bổ sung đồng thời ở cả `vi: { ... }` và `en: { ... }`.

2. **Backend & AI Service:**
   - Mọi API endpoint tạo nội dung trả về cho người dùng (như `/api/ai/coach-advice`, `/api/ai/weekly-plan`, thông báo đồng bộ dữ liệu) phải nhận tham số `lang` từ client (`vi` hoặc `en`).
   - AI Prompt và thuật toán Smart Heuristic phải kiểm tra `lang`:
     - Nếu `lang === 'en'`: xuất kết quả, tiêu đề, badge, action plan bằng Tiếng Anh.
     - Nếu `lang === 'vi'`: xuất kết quả, tiêu đề, badge, action plan bằng Tiếng Việt.

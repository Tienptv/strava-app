# Quy Tắc Chuẩn Thương Hiệu Haskoning & Thiết Kế Giao Diện Đồng Bộ (Haskoning Branding & Unified UI Rule)

## 1. Bảng Màu Thương Hiệu (Haskoning Brand Palette)
Hệ thống giao diện kế thừa 100% màu sắc từ bộ nhận diện thương hiệu Haskoning (Royal HaskoningDHV):

- **Primary Navy (`#002D54` / `#002855`):**
  - Màu chữ thương hiệu "Haskoning".
  - Dùng cho: Tiêu đề lớn (h1, h2), header chính, text chính (`--text-primary`), viền tối của các card dữ liệu.
- **Brand Teal / Cyan (`#00A3A6`):**
  - Màu khẩu hiệu *"Enhancing Society Together"* và cánh hoa trên bên trái của logo.
  - Dùng cho: Nút hành động chính (`.btn--primary`), tab đang chọn, link, viền focus, icon nổi bật (`--accent`).
  - Màu hỗ trợ: `--accent-light: #00B4B8`, `--accent-dark: #007C7E`, `--accent-glow: rgba(0, 163, 166, 0.35)`.
- **Brand Lime Green (`#78BE20` / `#84BD00`):**
  - Màu xanh lá tươi đầy sức sống từ cánh hoa phía dưới của logo Haskoning.
  - Dùng cho: Thanh tiến độ hoàn thành, dải huy hiệu thể thao tích cực, nút tăng tốc/năng lượng (`--secondary`).
- **Brand Azure / Sky (`#0080A0` / `#00A3E0`):**
  - Màu chuyển tiếp bầu trời từ cánh hoa trên bên phải của logo.
- **Brand Gradients:**
  - Gradient biểu tượng (Star Gradient): `linear-gradient(135deg, #78BE20 0%, #00A3A6 50%, #002D54 100%)`
  - Gradient chính (Primary / Header / Hero): `linear-gradient(135deg, #00A3A6 0%, #002D54 100%)`
  - Gradient năng lượng (Energy / Action): `linear-gradient(135deg, #78BE20 0%, #00A3A6 100%)`

---

## 2. Typography & Khẩu Hiệu Thương Hiệu
- **Tiêu đề & Logo (Headings):**
  - Font: `'Plus Jakarta Sans', -apple-system, sans-serif`.
  - Trọng số: `700` đến `900` (bold / extra bold).
  - Màu sắc: `#002D54` (`--primary-navy`).
- **Khẩu hiệu thương hiệu (Slogan / Tagline):**
  - Nội dung: *"Enhancing Society Together"*.
  - Màu sắc: `#00A3A6` (`--accent`).
  - Font: Thon gọn, hiện đại, thanh lịch.
- **Nội dung chung (Body text):**
  - Font: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
  - Màu sắc: `#002D54` hoặc `#334155`.

---

## 3. Quy Chuẩn Hiệu Ứng Nút Bấm Đồng Bộ (Unified Button Effects)
Mọi nút bấm trong toàn bộ hệ thống (Desktop & Mobile, Sidebar, Header, Table, Modal, AI Coach Box, Administer, v.v.) bắt buộc phải tuân theo chuẩn tương tác:

1. **Bo góc (Border Radius):** Chuẩn `8px` hoặc `10px` (`--radius-sm` hoặc `--radius-md`). Không dùng bo nhọn góc vuông.
2. **Typography của nút:** `font-weight: 600; letter-spacing: 0.01em;`.
3. **Hiệu ứng Hover:**
   - Nâng nhẹ lên: `transform: translateY(-2px);`
   - Đổ bóng phát sáng thương hiệu (Glow effect):
     - Nút Teal / Primary: `box-shadow: 0 4px 14px rgba(0, 163, 166, 0.35);`
     - Nút Lime / Energy: `box-shadow: 0 4px 14px rgba(120, 190, 32, 0.35);`
     - Nút Secondary / Navy: `box-shadow: 0 4px 14px rgba(0, 45, 84, 0.18);`
4. **Hiệu ứng Active (Khi bấm vào):**
   - Lún nhẹ tự nhiên: `transform: translateY(0) scale(0.98);`
   - Giảm bóng đổ: `box-shadow: 0 2px 6px rgba(0, 163, 166, 0.25);`
5. **Thời gian & Đường cong chuyển động (Physics Transition):**
   - `transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);`
6. **Focus-visible:** `outline: 2px solid #00A3A6; outline-offset: 2px;`
7. **Trạng thái Disabled:** `opacity: 0.55; cursor: not-allowed; transform: none !important; box-shadow: none !important;`

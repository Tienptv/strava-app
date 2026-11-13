# Seasonal Theme Architecture (Haskoning 200K Running Club)

Thư mục này quản lý các chủ đề giao diện theo mùa (Seasonal Themes) của ứng dụng, được kích hoạt linh hoạt từ trang **Quản trị (Administer -> Seasonal Themes)** hoặc tự động theo tháng.

---

## 1. Cấu Trúc Thư Mục

```
frontend/src/themes/
├── christmas/                  # Chủ đề Giáng Sinh & Mùa Đông Lễ Hội (Tháng 12)
│   ├── ChristmasHeaderBar.jsx   # Thanh header bảng xếp hạng chủ đề Noel
│   ├── ChristmasDecorations.jsx # Vector SVG trang trí: Mũ Noel, Cây thông, Vòng nguyệt quế
│   ├── SnowfallEffect.jsx       # Hiệu ứng tuyết rơi 3D nhẹ nhàng (GPU CSS)
│   ├── christmasTheme.css       # Styles viền sương giá, ánh đèn Fairy Lights
│   └── index.js                 # Export module của Christmas Theme
├── halloween/                  # Chủ đề Halloween Huyền Bí (Tháng 10)
├── tet/                        # Chủ đề Tết Cổ Truyền & Xuân Phát Tài (Tháng 1-2, Coming Soon)
└── index.js                    # Theme Registry & Dynamic Resolver
```

---

## 2. Tiêu Chuẩn Kỹ Thuật Khi Xây Dựng Theme Mới

1. **Zero Layout Shift (Không xô lệch bố cục):**
   - Header bar của theme phải giữ nguyên chiều cao chuẩn (`min-height: 74px`).
   - Các chi tiết trang trí nhô ra ngoài (mũ, bóng ma, vòng hoa...) phải dùng `position: absolute; pointer-events: none`.
2. **Hiệu năng 60fps:**
   - Hoạt ảnh dùng CSS transitions / keyframes với `transform: translate3d` hoặc `opacity`.
   - Tuyệt đối không dùng thư viện JS nặng gây tụt frame khi bảng có nhiều dòng.
3. **Phối màu thương hiệu Haskoning:**
   - Dù theo chủ đề lễ hội, luôn giữ sự hài hòa với bảng màu chính: Navy (`#002D54`), Teal (`#00A3A6`), Lime Green (`#78BE20`).
4. **Hỗ trợ thẻ Giải chạy sắp tới (Upcoming Race Badge):**
   - Theme header phải luôn chứa thẻ `.upcoming-race-badge` nằm cạnh dropdown chọn tháng.


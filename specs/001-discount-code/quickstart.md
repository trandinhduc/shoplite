# Quickstart: kiểm chứng mã giảm giá

## Điều kiện

```bash
npm install
npx playwright install chromium   # lần đầu chạy e2e
```

## 1. Kiểm tra tự động (chạy trước khi commit)

```bash
npx vitest run src/features/coupons src/features/checkout src/features/orders src/app/api
npm run check
npm run test:e2e
```

Kỳ vọng: toàn bộ pass; các test giá trị biên (đúng 300.000đ/500.000đ, chạm trần 100.000đ, hết hạn
đúng ngày 28/02/2026, giỏ rỗng) có mặt và xanh.

## 2. Kiểm tra thủ công

```bash
npm run dev   # http://localhost:3000
```

| # | Thao tác | Kỳ vọng |
|---|----------|---------|
| 1 | Giỏ tiền hàng 600.000đ → `/checkout` → nhập `shoplite10` → Áp dụng | Dòng giảm 60.000đ, tổng mới hiện ngay |
| 2 | Giỏ tiền hàng ≥ 1.000.000đ + `SHOPLITE10` | Giảm đúng 100.000đ (chạm trần) |
| 3 | Tiền hàng 200.000đ + `SHOPLITE10` | Lỗi "cần mua thêm 100.000 ₫" |
| 4 | Nhập `TET2026` | Lỗi "đã hết hạn" |
| 5 | Nhập `ABC` | Lỗi "không tồn tại" |
| 6 | Áp dụng `GIAM50K` (đơn 500.000đ) → Gỡ mã | Tổng về giá gốc |
| 7 | Áp dụng mã rồi Đặt hàng | Trang `/orders/<id>` có dòng mã và số tiền giảm, tổng khớp |
| 8 | Áp dụng `SHOPLITE10`, rồi ở tab khác xóa bớt giỏ để tiền hàng < 300.000đ, quay lại bấm Đặt hàng | Đơn bị từ chối, mã tự gỡ, hiện "cần mua thêm…", thông tin đã điền còn nguyên, không tự đặt lại |
| 9 | Đơn `standard` 520.000đ + `GIAM50K` | Phí ship vẫn miễn phí, tổng 470.000đ (ngưỡng xét trước giảm) |
| 10 | Mở đơn cũ trong `storage/orders.json` (không có `discount`) | Hiển thị bình thường, không có dòng giảm giá |

## 3. Kiểm tra chống gian lận

```bash
curl -s -X POST localhost:3000/api/orders -H 'content-type: application/json' -d '{
  "customer":{"fullName":"Test User","phone":"0912345678","address":"123 Đường ABC, Quận 1, TP HCM"},
  "shippingMethod":"standard","paymentMethod":"cod",
  "items":[{"productId":"<id>","quantity":1}],
  "couponCode":"GIAM50K","discount":{"amount":999999},"total":1}'
```

Kỳ vọng: giá trị `discount`/`total` tự điền bị bỏ qua; đơn chỉ nhận mức giảm do server tính, hoặc bị
từ chối `422` nếu chưa đạt điều kiện.

Tham chiếu: [contracts/api.md](./contracts/api.md), [data-model.md](./data-model.md).

## Kết quả kiểm tra (2026-11-08)

- **Tự động:** `npm run check` xanh (lint, typecheck, 210 test); `npm run test:e2e` xanh (3 test, gồm kịch bản `SHOPLITE10`: giảm 45.000 ₫, tổng 435.000 ₫, chi tiết đơn hiển thị mã và số tiền giảm).
- **Mục 3 (chống gian lận), chạy `curl` thật trên dev server:** `ABC` → `422 COUPON_NOT_FOUND`; `TET2026` → `422 COUPON_EXPIRED`; `SHOPLITE10` với tiền hàng 150.000 ₫ → `422 COUPON_MIN_ORDER_NOT_MET` (`details.shortfall = "150000"`); mã 33 ký tự → `400` (`details.couponCode`); giỏ rỗng kèm mã → `400` (`details.items`). Các ca bị từ chối không ghi đơn nào. Đơn 600.000 ₫ với `GIAM50K` kèm `discount.amount = 999999`, `discountAmount = 999999`, `total = 1` tự điền → `201`, server chỉ ghi `discount = 50000` và `total = 550000`.
- **Mục 2 (thao tác giao diện), chạy trên Chromium thật qua Playwright (script tạm, không nằm trong repo), dev server `localhost:3000`:**
  - Bước 1: giỏ 600.000 ₫ + `shoplite10` → giảm 60.000 ₫, tổng 540.000 ₫.
  - Bước 2: giỏ 1.500.000 ₫ → giảm đúng 100.000 ₫ (chạm trần), tổng 1.400.000 ₫.
  - Bước 3: dùng tiền hàng 150.000 ₫ (catalog không có mức 200.000 ₫) → "Cần mua thêm 150.000 ₫ để dùng mã này", không có dòng giảm giá.
  - Bước 4 và 5: `TET2026` → "Mã giảm giá đã hết hạn"; `ABC` → "Mã giảm giá không tồn tại" (thông báo không lặp lại mã nhập).
  - Bước 6: `GIAM50K` → "Gỡ mã" → tổng về 600.000 ₫. Nút "Gỡ mã" nằm một dòng (cao 32px).
  - Bước 8: áp `SHOPLITE10`, đổi giỏ từ tab khác còn 150.000 ₫ → mã tự gỡ ngay (không cần chờ bấm Đặt hàng), hiện "Cần mua thêm 150.000 ₫", họ tên đã nhập còn nguyên. Nhánh server từ chối lúc bấm Đặt hàng được test component và route phủ, không thử live.
  - Bước 9: 2 × 250.000 ₫ = 500.000 ₫ + `GIAM50K` → ship "Miễn phí", tổng 450.000 ₫ (ngưỡng xét trước giảm). Catalog không có tổ hợp đúng 520.000 ₫.
  - Bước 10 và 7: chỉ đọc đơn có sẵn trong `storage/orders.json`, không ghi gì: đơn không có `discount` hiển thị bình thường (không có dòng giảm giá); đơn có `discount` hiển thị "-100.000 ₫". Mình không đặt đơn mới trên server dev của bạn để không ghi vào dữ liệu của bạn; luồng đặt đơn có mã đã được e2e chạy trên server riêng với `ORDERS_FILE` tạm.
  - `storage/orders.json` giống hệt trước và sau khi chạy (so sánh `cmp`).
- **Mục `[Gap]` của `checklists/security.md` còn chưa có yêu cầu riêng trong spec:** chống dò mã (CHK021), đặt hàng lặp (CHK022), ghi log lần áp dụng mã bị từ chối (CHK023). Đã được reviewer tick là chấp nhận; nếu muốn xử lý thì cần làm rõ spec trước.

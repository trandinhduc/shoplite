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

# Quickstart: kiểm chứng tính năng mã giảm giá

Tham chiếu: [data-model.md](./data-model.md), [contracts/](./contracts/).

## Chuẩn bị

```bash
npm install          # không có dependency mới
npm run dev          # http://localhost:3000
```

Hôm nay (2026-11-08) đã qua 28/02/2026, nên `TET2026` luôn là mã hết hạn.

## 1. Kiểm tra tự động

```bash
npx vitest run src/features/coupons          # logic mã: biên ngưỡng, mức tối đa, hết hạn, làm tròn
npx vitest run src/features/checkout         # pricing (ship sau giảm), checkout-form
npx vitest run src/features/orders src/app/api   # service + route orders, coupons/validate
npm run check                                 # lint + typecheck + toàn bộ test — MUST pass
npm run test:e2e                              # luồng đặt hàng có mã — MUST pass
```

## 2. Kịch bản thủ công trên trình duyệt

| #   | Thao tác                                                                                            | Kết quả mong đợi                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Giỏ: 1 × Tai nghe SoundMax Pro (1.290.000) → /checkout → nhập `shoplite10` → Áp dụng                | Dòng "Giảm giá (SHOPLITE10) −100.000 ₫", ship Miễn phí, tổng **1.190.000 ₫**                                                                                                                                                                   |
| 2   | Bấm "Gỡ mã"                                                                                         | Dòng giảm giá biến mất, tổng 1.290.000 ₫                                                                                                                                                                                                       |
| 3   | Nhập `KHONGCO` → Áp dụng                                                                            | "Mã giảm giá không tồn tại" cạnh ô mã                                                                                                                                                                                                          |
| 4   | Nhập `TET2026` → Áp dụng                                                                            | "Mã giảm giá đã hết hạn"                                                                                                                                                                                                                       |
| 5   | Giỏ tạm tính < 500.000 → `GIAM50K`                                                                  | "…chưa đạt giá trị tối thiểu 500.000 ₫. Mua thêm X ₫…"                                                                                                                                                                                         |
| 6   | Áp `GIAM50K` với tạm tính ≥ 500.000, rồi về giỏ giảm số lượng xuống dưới ngưỡng, quay lại /checkout | Với plan hiện tại mã **không** được giữ khi rời trang (Q4 chưa chốt). Để thấy trạng thái tạm ngưng: giữ tab /checkout mở, giảm số lượng ở tab /cart khác → tab checkout hiện "Mua thêm X ₫", mã vẫn còn; tăng lại ≥ ngưỡng → mã tự có hiệu lực |
| 7   | Tạm tính 520.000, giao tiêu chuẩn, áp `GIAM50K`                                                     | Giảm 50.000, ship 30.000, tổng 500.000 ₫                                                                                                                                                                                                       |
| 8   | Đặt hàng với mã ở #1 → trang chi tiết đơn                                                           | Có dòng "Giảm giá (SHOPLITE10) −100.000 ₫", tổng 1.190.000 ₫                                                                                                                                                                                   |
| 9   | Mở một đơn cũ trong `storage/orders.json`                                                           | Hiển thị như trước, không lỗi, không có dòng giảm giá                                                                                                                                                                                          |

## 3. Kiểm tra chống gian lận bằng curl

```bash
curl -s -X POST localhost:3000/api/orders -H 'Content-Type: application/json' -d '{
  "customer":{"fullName":"Test","phone":"0912345678","address":"1 Đường Thử, Hà Nội"},
  "shippingMethod":"standard","paymentMethod":"cod",
  "items":[{"productId":"p001","quantity":1}],
  "couponCode":"SHOPLITE10","discount":1290000,"total":1}'
```

Kỳ vọng: 201, `discount: 100000`, `total: 1190000` (con số client gửi bị bỏ qua).

```bash
curl -s -X POST localhost:3000/api/coupons/validate -H 'Content-Type: application/json' -d '{"code":"TET2026"}'
```

Kỳ vọng: 422 `COUPON_EXPIRED`.

> Lệnh curl tạo đơn thật trong `storage/orders.json`; xóa đơn thử sau khi kiểm tra nếu cần.

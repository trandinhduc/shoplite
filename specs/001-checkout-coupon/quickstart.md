# Quickstart: kiểm chứng tính năng mã giảm giá

## Chuẩn bị

```bash
npm install
npm run check          # lint + typecheck + unit test phải pass
npm run dev            # http://localhost:3000
```

Giá tham khảo: `p010` Cáp USB-C 150.000 ₫ (xem `src/data/products.ts`).

## Kịch bản tự động

| Lệnh                                   | Chứng minh                                                   |
| -------------------------------------- | ------------------------------------------------------------ |
| `npx vitest run src/features/coupons`  | Quy tắc mã: chuẩn hóa, hết hạn, giá trị biên, tính tiền giảm |
| `npx vitest run src/features/checkout` | `calculateOrderTotals` với giảm giá, ngưỡng ship sau giảm    |
| `npx vitest run src/features/orders`   | Server từ chối mã sai / hết hạn / chưa đủ tối thiểu, lưu mã  |
| `npx vitest run src/app/api`           | Contract `POST /api/coupons/validate`, `POST /api/orders`    |
| `npm run test:e2e`                     | Luồng áp mã → đặt hàng → chi tiết đơn hiển thị dòng giảm giá |

## Kịch bản thủ công (UI)

1. Thêm 2 × `p010` (300.000 ₫) → thanh toán → nhập `shoplite10` → "Áp dụng":
   giảm 30.000 ₫, phí ship 30.000 ₫, tổng 300.000 ₫.
2. Tải lại trang: mã vẫn còn (FR-018).
3. Về giỏ hàng giảm còn 1 × `p010` → quay lại thanh toán: mã tự gỡ, báo cần mua thêm 150.000 ₫ (FR-016).
4. Nhập `TET2026`: báo mã đã hết hạn. Nhập `KHONGCO`: báo mã không tồn tại.
5. Đủ 560.000 ₫, áp `GIAM50K` → đặt hàng: trang chi tiết đơn có dòng "Giảm giá (GIAM50K) -50.000 ₫",
   phí ship "Miễn phí", tổng 510.000 ₫.
6. Mở một đơn cũ trong `/orders`: hiển thị như trước, không có dòng giảm giá.

## Kiểm tra chống gian lận (API)

```bash
curl -s -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -d '{
  "customer": { "fullName": "Nguyễn Văn A", "phone": "0912345678", "address": "12 Nguyễn Huệ, Quận 1, TP.HCM" },
  "shippingMethod": "standard", "paymentMethod": "cod",
  "items": [{ "productId": "p010", "quantity": 1 }],
  "couponCode": "GIAM50K", "discount": 999999, "total": 0
}'
```

Kỳ vọng: `422 COUPON_MIN_ORDER_NOT_MET` (tạm tính 150.000 ₫), không có đơn mới.

Lệnh `curl` đang bị chặn trong `.claude/settings.json` (`Bash(curl *)`); người chạy tự gõ trong terminal.

# Quickstart: kiểm chứng tính năng mã giảm giá

Tài liệu này hướng dẫn chạy và kiểm tra, không chứa code cài đặt. Chi tiết request và response xem trong
[contracts/](./contracts/), dữ liệu xem trong [data-model.md](./data-model.md).

## Chuẩn bị

```bash
git switch 001-discount-codes
npm install
npx playwright install chromium   # chỉ cần lần đầu
```

## 1. Kiểm tra tự động

```bash
npm run check                                  # lint + typecheck + toàn bộ vitest
npx vitest run src/features/coupons            # quy tắc mã, dữ liệu tĩnh, CouponField
npx vitest run src/features/checkout/pricing   # tiền giảm, làm tròn, phí ship
npx vitest run src/features/orders src/app/api # service + route: nhánh lỗi + HTTP status
npm run test:e2e                               # luồng mua hàng có mã
npm run format:check
```

Kỳ vọng: tất cả đều pass. Test biên phải có mặt (constitution II):
- tạm tính 299.999 / 300.000 / 300.001 với `SHOPLITE10`;
- 999.999 / 1.000.000 / 1.000.001 để kiểm tra chặn 100.000;
- 499.999 / 500.000 với `GIAM50K`;
- `2026-02-28T23:59:59+07:00` và `2026-03-01T00:00:00+07:00` với `TET2026`.

## 2. Kiểm tra API bằng tay

Chạy `npm run dev`. Sản phẩm `p006` có giá lấy từ `src/data/products.ts`. Chọn số lượng sao cho tạm tính khớp với từng kịch bản.

```bash
# Xem trước mã: kỳ vọng 200, discount tương ứng
curl -s -X POST http://localhost:3000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code":" shoplite10 ","items":[{"productId":"p006","quantity":2}]}'

# Mã không tồn tại: kỳ vọng 422 COUPON_NOT_FOUND
curl -s -X POST http://localhost:3000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC123","items":[{"productId":"p006","quantity":1}]}'

# Mã hết hạn: kỳ vọng 422 COUPON_EXPIRED
curl -s -X POST http://localhost:3000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"TET2026","items":[{"productId":"p006","quantity":1}]}'

# Gian lận: gửi discount/total tự khai, kỳ vọng 201 với số do server tính
curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer":{"fullName":"Nguyễn Văn A","phone":"0912345678","address":"12 Nguyễn Huệ, Quận 1, TP.HCM"},
       "shippingMethod":"standard","paymentMethod":"cod",
       "items":[{"productId":"p006","quantity":2}],
       "couponCode":"SHOPLITE10","discount":999999,"total":1}'
```

## 3. Kiểm tra giao diện bằng tay

1. Thêm hàng để tạm tính khoảng 250.000 ₫, vào `/checkout`, nhập `SHOPLITE10`.
   Kỳ vọng: báo cần mua thêm 50.000 ₫, tổng tiền không đổi.
2. Thêm hàng cho tạm tính ≥ 300.000 ₫, áp dụng `shoplite10`.
   Kỳ vọng: dòng "Giảm giá (SHOPLITE10)", tổng mới, ô nhập bị ẩn, có nút "Gỡ mã".
3. Đổi sang "Giao hàng nhanh". Kỳ vọng: tiền giảm giữ nguyên, phí ship đổi.
4. Bấm "Gỡ mã". Kỳ vọng: tổng tiền về giá gốc.
5. Áp dụng `TET2026`. Kỳ vọng: báo mã đã hết hạn.
6. Áp dụng lại `SHOPLITE10` rồi đặt hàng. Kỳ vọng: trang chi tiết đơn có dòng giảm giá và tổng đã trừ.
7. Áp dụng `SHOPLITE10` cho giỏ khoảng 350.000 ₫, về `/cart` xóa bớt còn khoảng 250.000 ₫, rồi quay lại `/checkout`.
   Kỳ vọng: mã bị gỡ, thông báo cần mua thêm 50.000 ₫. Thêm hàng lại thì mã **không** tự áp dụng.
   Làm lại nhưng giỏ vẫn ≥ 300.000 ₫ (hoặc tải lại trang). Kỳ vọng: mã vẫn còn, tiền giảm được tính lại.
8. Mở một đơn cũ trong `/orders`. Kỳ vọng: hiển thị như trước, không có dòng giảm giá.
9. Chỉ dùng bàn phím (Tab, Enter) để áp mã và gỡ mã. Kỳ vọng: nhấn Enter trong ô mã không đặt hàng.

Kịch bản mã hết hạn lúc đặt hàng (FR-015a) không tái hiện được bằng tay với dữ liệu hiện có, vì phải đổi đồng hồ.
Kịch bản này được kiểm bằng service test và route test có inject `now` (xem [contracts/orders-post.md](./contracts/orders-post.md)).

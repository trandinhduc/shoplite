# Quickstart: Kiểm chứng tính năng mã giảm giá

Hướng dẫn chạy và kiểm tra end-to-end. Chi tiết hợp đồng: [contracts/](./contracts/), mô hình dữ
liệu: [data-model.md](./data-model.md).

## Điều kiện

- Node >= 22.12, đã `npm install`; lần đầu chạy e2e: `npx playwright install chromium`.
- Không cần biến môi trường mới. Có thể dùng `ORDERS_FILE=/tmp/shoplite-orders.json` để không đụng
  `storage/orders.json` thật khi thử tay.

## 1. Kiểm tra tự động

```bash
npm run check                                   # lint + typecheck + toàn bộ unit/route test
npx vitest run src/features/coupons             # quy tắc mã: biên tối thiểu, mức tối đa, làm tròn, hết hạn
npx vitest run src/features/checkout/pricing    # tổng tiền có giảm giá, phí ship theo subtotal trước giảm
npx vitest run src/features/orders              # placeOrder với mã, bỏ qua số tiền client gửi
npx vitest run src/app/api                       # route /api/coupons/validate và /api/orders
npm run test:e2e                                 # luồng mua hàng có mã (đụng luồng mua hàng → bắt buộc)
```

Kỳ vọng: tất cả pass. Test hết hạn dùng `now` cố định nên không phụ thuộc ngày chạy.

## 2. Kiểm tra API bằng tay

```bash
npm run dev
```

```bash
# Hợp lệ: p006 = 450.000đ → SHOPLITE10 giảm 45.000đ
curl -s -X POST localhost:3000/api/coupons/validate -H 'Content-Type: application/json' \
  -d '{"code":" shoplite10 ","items":[{"productId":"p006","quantity":1}]}'
# → 200 { coupon: { code: "SHOPLITE10", … }, subtotal: 450000, discount: 45000 }

# Chưa đạt tối thiểu
curl -s -X POST localhost:3000/api/coupons/validate -H 'Content-Type: application/json' \
  -d '{"code":"GIAM50K","items":[{"productId":"p006","quantity":1}]}'
# → 422 COUPON_MIN_SUBTOTAL_NOT_MET, details.shortfall = "50000"

# Hết hạn / không tồn tại
#   code "TET2026" → 422 COUPON_EXPIRED ; code "KHONGCO" → 422 COUPON_NOT_FOUND

# Gian lận: gửi kèm discount/total tự khai → bị bỏ qua
curl -s -X POST localhost:3000/api/orders -H 'Content-Type: application/json' -d '{
  "customer":{"fullName":"Thử Nghiệm","phone":"0912345678","address":"1 Lê Lợi, Quận 1, TP.HCM"},
  "shippingMethod":"standard","paymentMethod":"cod",
  "items":[{"productId":"p006","quantity":1}],
  "couponCode":"SHOPLITE10","discount":450000,"total":0}'
# → 201, discount 45000, shippingFee 30000, total 435000

# Mã hết hạn khi đặt hàng → 422 COUPON_EXPIRED, không có đơn mới trong GET /api/orders
```

## 3. Kiểm tra giao diện (http://localhost:3000)

| #   | Thao tác                                                                             | Kỳ vọng                                                                                                          |
| --- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Giỏ 450.000đ → `/checkout` → nhập `shoplite10` → Áp dụng                             | Dòng "Giảm giá (SHOPLITE10) −45.000 ₫", tổng giảm tương ứng                                                      |
| 2   | Nhập `GIAM50K` → Áp dụng                                                             | Báo cần mua thêm 50.000 ₫; SHOPLITE10 vẫn giữ                                                                    |
| 3   | Nhập `TET2026`, rồi `KHONGCO`                                                        | "Mã giảm giá đã hết hạn" / "Mã giảm giá không tồn tại"; ô mã `aria-invalid`                                      |
| 4   | Ô trống → Áp dụng; Enter trong ô mã                                                  | "Vui lòng nhập mã giảm giá"; Enter không đặt hàng                                                                |
| 5   | Áp `GIAM50K` với giỏ 600.000đ → mở tab `/cart` giảm số lượng còn 450.000đ → quay lại | Mã ở trạng thái lỗi, cần mua thêm 50.000 ₫, tổng không trừ; tăng lại ≥ 500.000đ → tự có hiệu lực                 |
| 6   | Bấm "Gỡ mã"                                                                          | Dòng giảm giá biến mất, tổng về ban đầu                                                                          |
| 7   | Đặt hàng với `SHOPLITE10`                                                            | `/orders/{id}`: dòng "Giảm giá (SHOPLITE10)", tổng khớp trang thanh toán; danh sách `/orders` hiện tổng sau giảm |
| 8   | Mở một đơn cũ (tạo trước tính năng)                                                  | Không có dòng giảm giá, tổng như cũ                                                                              |

Ca "mã hết hạn giữa lúc áp dụng và đặt hàng" (Story 5 #3–#5) chỉ kiểm bằng unit/route test với `now`
inject, vì không có mã nào hết hạn trong lúc chạy thử.

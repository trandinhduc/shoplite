# API Contracts: Mã giảm giá

Lỗi luôn theo dạng chung `{ "error": { "code", "message", "details?" } }` (qua `handleRouteError`).

## Không có endpoint xem trước

Xem trước mã diễn ra hoàn toàn ở client bằng `evaluateCoupon` (xem [research.md](../research.md) mục 1),
nên feature này **không thêm route mới**. Chỉ có hợp đồng của `POST /api/orders` thay đổi.

## POST /api/orders (SỬA)

Thêm một trường tùy chọn vào request; response thêm `discount` khi có dùng mã.

```json
{
  "customer": { "...": "..." },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [{ "productId": "p1", "quantity": 2 }],
  "couponCode": "GIAM50K"
}
```

**201 Created** (rút gọn): `{ ..., "subtotal": 600000, "shippingFee": 0, "discount": { "code": "GIAM50K", "amount": 50000 }, "total": 550000 }`

- Server kiểm tra lại mã tại thời điểm đặt và tính `discount` + `total` bằng `calculateOrderTotals`; mọi `discount`, `discountAmount`, `total` do client gửi bị bỏ qua.
- Không có `couponCode` (hoặc rỗng): hành vi như cũ, response không có `discount`.
- Mã không hợp lệ: đơn không được tạo, trả một trong các lỗi bên dưới. Client phản ứng bằng cách tự gỡ mã, hiện `error.message`, giữ nguyên form và không tự gửi lại.

**Lỗi mới liên quan đến mã**

| HTTP | code | Khi nào | Ví dụ message |
|------|------|---------|---------------|
| 400 | `VALIDATION_ERROR` | `couponCode` sai kiểu hoặc dài hơn 32 ký tự | (message Zod) |
| 422 | `COUPON_NOT_FOUND` | Mã không có trong hệ thống | "Mã giảm giá không tồn tại" |
| 422 | `COUPON_EXPIRED` | Mã đã hết hạn | "Mã giảm giá đã hết hạn" |
| 422 | `COUPON_MIN_ORDER_NOT_MET` | Tiền hàng (tính từ catalog) < tối thiểu | "Cần mua thêm 100.000 ₫ để dùng mã này" (`details.shortfall = "100000"`) |

Thông báo do `describeCouponFailure` tạo, dùng chung với phần xem trước ở client.

## GET /api/orders, GET/PATCH /api/orders/:id

Không đổi hợp đồng; object order có thể có hoặc không có `discount` (đơn cũ không có).

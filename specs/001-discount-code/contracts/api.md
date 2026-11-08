# API Contracts: Mã giảm giá

Lỗi luôn theo dạng chung `{ "error": { "code", "message", "details?" } }` (qua `handleRouteError`).

## POST /api/coupons/validate (MỚI)

Xem trước mã cho giỏ hàng hiện tại. Không tạo hay thay đổi dữ liệu.

**Request**

```json
{ "couponCode": "shoplite10", "items": [{ "productId": "p1", "quantity": 2 }] }
```

- `couponCode`: bắt buộc, không rỗng sau khi trim, ≤ 32 ký tự.
- `items`: cùng schema với `POST /api/orders`. Giá luôn lấy từ catalog.

**200 OK**

```json
{ "code": "SHOPLITE10", "subtotal": 600000, "discountAmount": 60000 }
```

**Lỗi**

| HTTP | code | Khi nào | Ví dụ message |
|------|------|---------|---------------|
| 400 | `VALIDATION_ERROR` | Body sai JSON/schema, mã rỗng, giỏ rỗng | "Vui lòng nhập mã giảm giá" |
| 422 | `PRODUCT_NOT_FOUND` | Sản phẩm không tồn tại | (hiện có) |
| 422 | `COUPON_NOT_FOUND` | Mã không có trong hệ thống | "Mã giảm giá không tồn tại" |
| 422 | `COUPON_EXPIRED` | Mã đã hết hạn | "Mã giảm giá đã hết hạn" |
| 422 | `COUPON_MIN_ORDER_NOT_MET` | Tiền hàng < tối thiểu | "Cần mua thêm 100.000 ₫ để dùng mã này" (`details.shortfall = "100000"`) |

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
- Mã không hợp lệ: cùng các lỗi 422 như trên, đơn không được tạo.

## GET /api/orders, GET/PATCH /api/orders/:id

Không đổi hợp đồng; object order có thể có hoặc không có `discount` (đơn cũ không có).

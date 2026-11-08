# Contract: Orders với mã giảm giá

## POST `/api/orders`

### Request

Giữ toàn bộ payload hiện tại và thêm field optional:

```json
{
  "customer": {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "address": "12 Nguyễn Huệ, Quận 1, TP.HCM"
  },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [{ "productId": "p006", "quantity": 2 }],
  "couponCode": "shoplite10"
}
```

`couponCode` được trim/normalize khi xử lý. Client không được gửi
`discountAmount`, `subtotal` hoặc `total` để yêu cầu server chấp nhận.

### Success response: `201`

Response là Order hiện tại, bổ sung khi có mã:

```json
{
  "status": "pending",
  "subtotal": 900000,
  "discountCode": "SHOPLITE10",
  "discountAmount": 90000,
  "shippingFee": 0,
  "total": 810000
}
```

Đơn không dùng mã có `discountAmount: 0` hoặc có thể thiếu các field optional;
consumer phải coi field thiếu là không có giảm giá.

### Invalid coupon response

Nếu mã được gửi khi đặt hàng nhưng không còn hợp lệ, không lưu đơn với ưu đãi
đó. Route dùng error shape hiện tại:

```json
{
  "error": {
    "code": "INVALID_COUPON",
    "message": "Mã giảm giá đã hết hạn",
    "details": { "reason": "expired", "couponCode": "TET2026" }
  }
}
```

Các `reason` tối thiểu: `not_found`, `expired`, `minimum_subtotal`. Với
`minimum_subtotal`, `details.minimumShortfall` chứa số tiền cần mua thêm.

## Client preview contract

Không có endpoint riêng. Checkout gọi hàm thuần của feature coupon với subtotal
hiện tại và ngày hiện tại để cập nhật summary; kết quả preview không được xem là
nguồn sự thật khi submit.

## Backward compatibility

GET order và trang chi tiết phải chấp nhận Order thiếu `discountCode`/
`discountAmount`, không lỗi parse/render và giữ tổng tiền đã lưu của đơn cũ.

# API Contract: Tạo đơn hàng mới (POST /api/orders)

Mở rộng endpoint hiện tại `POST /api/orders` để tiếp nhận `couponCode`, thực hiện xác thực và tính toán lại giảm giá độc lập trên máy chủ.

---

## 1. Thông tin chung

- **Method**: `POST`
- **Path**: `/api/orders`
- **Content-Type**: `application/json`

---

## 2. Request Body

```json
{
  "customer": {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "email": "a@example.com",
    "address": "123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    "note": "Giao giờ hành chính"
  },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [
    {
      "productId": "p001",
      "quantity": 1
    }
  ],
  "couponCode": "SHOPLITE10"
}
```

> **Ghi chú bảo mật (Constitution Rule III)**: Client chỉ gửi trường `couponCode`. Client **tuyệt đối không gửi** `discountAmount`, `subtotal`, `shippingFee`, hay `total`. Server tự động tính lại toàn bộ các trường này.

---

## 3. Responses

### 3.1. Thành công: 201 Created

Trả về toàn bộ thông tin đơn hàng đã lưu, bao gồm `couponCode` và `discount` (nếu có).

```json
{
  "id": "SL-20261108-A1B2C3",
  "status": "pending",
  "createdAt": "2026-11-08T14:40:00.000Z",
  "updatedAt": "2026-11-08T14:40:00.000Z",
  "customer": {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "email": "a@example.com",
    "address": "123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    "note": "Giao giờ hành chính"
  },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [
    {
      "productId": "p001",
      "slug": "tai-nghe-khong-day-soundmax-pro",
      "name": "Tai nghe không dây SoundMax Pro",
      "image": { "emoji": "🎧", "from": "#e0f2fe", "to": "#c7d2fe" },
      "unitPrice": 1290000,
      "quantity": 1,
      "lineTotal": 1290000
    }
  ],
  "subtotal": 1290000,
  "shippingFee": 0,
  "discount": 100000,
  "total": 1190000,
  "couponCode": "SHOPLITE10"
}
```

### 3.2. Lỗi khi Coupon không hợp lệ lúc đặt hàng: 400 Bad Request / 422 Unprocessable Entity

Khi client gửi `couponCode` nhưng mã không hợp lệ trên server:

#### Coupon đã hết hạn tại thời điểm bấm đặt hàng (HTTP 422)

```json
{
  "error": {
    "code": "COUPON_EXPIRED",
    "message": "Mã giảm giá đã hết hạn sử dụng. Vui lòng gỡ mã để tiếp tục đặt hàng."
  }
}
```

#### Coupon không tồn tại (HTTP 422)

```json
{
  "error": {
    "code": "COUPON_NOT_FOUND",
    "message": "Mã giảm giá không tồn tại"
  }
}
```

#### Đơn hàng không còn đủ giá trị tối thiểu (HTTP 422)

```json
{
  "error": {
    "code": "COUPON_MIN_ORDER_NOT_MET",
    "message": "Đơn hàng chưa đạt giá trị tối thiểu của mã giảm giá"
  }
}
```


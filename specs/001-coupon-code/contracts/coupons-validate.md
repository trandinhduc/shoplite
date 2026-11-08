# API Contract: Kiểm tra mã giảm giá (POST /api/coupons/validate)

Endpoint mỏng phục vụ việc xác thực mã giảm giá và tính trước số tiền giảm tại trang thanh toán phía client trước khi đặt hàng.

---

## 1. Thông tin chung

- **Method**: `POST`
- **Path**: `/api/coupons/validate`
- **Content-Type**: `application/json`
- **Authentication**: Public / None

---

## 2. Request Body

```json
{
  "code": "SHOPLITE10",
  "subtotal": 1290000
}
```

### Schema Attributes

| Thuộc tính | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `code` | `string` | Có | Mã giảm giá người dùng nhập (hệ thống tự trim và uppercase) |
| `subtotal` | `number` | Có | Tạm tính tiền hàng hiện tại trong giỏ (phải là số $\ge 0$) |

---

## 3. Responses

### 3.1. Thành công: 200 OK (Mã hợp lệ)

Trả về thông tin chi tiết của coupon và số tiền giảm giá dự kiến.

```json
{
  "valid": true,
  "coupon": {
    "code": "SHOPLITE10",
    "type": "percentage",
    "value": 10,
    "maxDiscount": 100000,
    "minOrderValue": 300000,
    "description": "Giảm 10% tối đa 100.000 ₫ cho đơn từ 300.000 ₫"
  },
  "discountAmount": 100000
}
```

### 3.2. Không hợp lệ: 400 Bad Request / 422 Unprocessable Entity

Trả về cấu trúc lỗi chuẩn của ShopLite: `{ error: { code, message, details? } }`.

#### Trường hợp 1: Mã không tồn tại (HTTP 422)

```json
{
  "error": {
    "code": "COUPON_NOT_FOUND",
    "message": "Mã giảm giá không tồn tại"
  }
}
```

#### Trường hợp 2: Mã đã hết hạn (HTTP 422)

```json
{
  "error": {
    "code": "COUPON_EXPIRED",
    "message": "Mã giảm giá đã hết hạn sử dụng"
  }
}
```

#### Trường hợp 3: Đơn hàng chưa đạt giá trị tối thiểu (HTTP 422)

```json
{
  "error": {
    "code": "COUPON_MIN_ORDER_NOT_MET",
    "message": "Đơn hàng chưa đạt giá trị tối thiểu 300.000 ₫ (cần mua thêm 100.000 ₫)",
    "details": {
      "minOrderValue": "300000",
      "amountNeeded": "100000"
    }
  }
}
```

#### Trường hợp 4: Lỗi cú pháp/Body không hợp lệ (HTTP 400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu kiểm tra mã không hợp lệ",
    "details": {
      "code": "Vui lòng nhập mã giảm giá"
    }
  }
}
```


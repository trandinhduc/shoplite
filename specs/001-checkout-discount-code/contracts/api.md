# API Contract: Mã giảm giá

Mọi lỗi theo format chuẩn của dự án: `{ "error": { "code", "message", "details"? } }`
(`jsonError` / `handleRouteError` trong `src/lib/http.ts`). Message bằng tiếng Việt.

## GET `/api/coupons/:code` (mới)

Tra **một** mã để client tự tính số tiền giảm (research R1). Route mỏng: validate `:code` bằng
`couponCodeSchema.safeParse` (Zod), gọi `lookupCoupon` rồi ánh xạ kết quả sang HTTP.

- `:code`: mã khách nhập, đã URL-encode. `lookupCoupon` chuẩn hóa bằng trim + chữ HOA.

**200 OK**: mã tồn tại (kể cả khi đã hết hạn; client tự đánh giá hạn dùng bằng `evaluateCoupon`).

```json
{
  "coupon": {
    "code": "SHOPLITE10",
    "type": "percent",
    "value": 10,
    "maxDiscount": 100000,
    "minSubtotal": 300000
  }
}
```

```json
{
  "coupon": {
    "code": "TET2026",
    "type": "percent",
    "value": 15,
    "maxDiscount": 200000,
    "expiresOn": "2026-02-28"
  }
}
```

**404 Not Found**: mã không tồn tại.

```json
{
  "error": {
    "code": "COUPON_NOT_FOUND",
    "message": "Mã giảm giá không tồn tại"
  }
}
```

**400 Bad Request**: `:code` không qua `couponCodeSchema` (Zod:
`z.string().trim().min(1).max(32)`). Message lấy từ issue đầu tiên:

| Trường hợp                    | `message`                   |
| ----------------------------- | --------------------------- |
| Rỗng hoặc chỉ có khoảng trắng | `Vui lòng nhập mã giảm giá` |
| Dài hơn 32 ký tự sau khi trim | `Mã giảm giá không hợp lệ`  |

```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "Mã giảm giá không hợp lệ" }
}
```

Route MUST NOT trả về danh sách mã, và MUST NOT có endpoint liệt kê mã.

## POST `/api/orders` (sửa)

Body: giữ nguyên `PlaceOrderInput`, thêm một trường tùy chọn:

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

- `couponCode`: tùy chọn, `string`, trim, tối đa 32 ký tự. Không gửi hoặc gửi `""` nghĩa là không
  dùng mã.
- Các trường tiền như `discount`, `subtotal`, `total`, `shippingFee` nếu client gửi lên đều **bị bỏ
  qua** (không có trong schema).

**201 Created**: `Order` (xem [data-model.md](../data-model.md#order-sửa-srcfeaturesorderstypests)).
Đơn có mã thì có thêm:

```json
{
  "subtotal": 520000,
  "couponCode": "SHOPLITE10",
  "discount": 52000,
  "shippingFee": 0,
  "total": 468000
}
```

Đơn không dùng mã thì không có `couponCode` và `discount` (giữ nguyên response hiện tại).

**422 Unprocessable Entity**: mã không dùng được tại thời điểm đặt hàng (FR-012). Đơn **không**
được tạo.

```json
{
  "error": {
    "code": "INVALID_COUPON",
    "message": "Mã giảm giá đã hết hạn",
    "details": { "couponCode": "Mã giảm giá đã hết hạn", "reason": "expired" }
  }
}
```

| `details.reason` | `message`                                                   |
| ---------------- | ----------------------------------------------------------- |
| `not_found`      | `Mã giảm giá không tồn tại`                                 |
| `expired`        | `Mã giảm giá đã hết hạn`                                    |
| `below_minimum`  | `Mua thêm {formatCurrency(shortfall)} để sử dụng mã {CODE}` |

Thứ tự kiểm tra trong `placeOrder`: validate schema → sản phẩm và tồn kho (lỗi hiện có) → mã giảm
giá → tính tiền → lưu.

Các lỗi hiện có (`VALIDATION_ERROR`, `PRODUCT_NOT_FOUND`, `INSUFFICIENT_STOCK`) giữ nguyên.

## GET `/api/orders`, GET `/api/orders/:id`, PATCH `/api/orders/:id`

Không đổi hành vi. Response `Order` có thể có thêm `couponCode` và `discount`. Đơn cũ không có hai
trường này.

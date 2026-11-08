# Contract: `POST /api/orders` (sửa) và `GET /api/orders[/id]` (mở rộng response)

## `POST /api/orders`: request

Thêm một trường **optional** `couponCode`. Không có trường tiền nào.

```json
{
  "customer": {
    "fullName": "Phạm Minh D",
    "phone": "0356789012",
    "address": "99 Hai Bà Trưng, Huế"
  },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [{ "productId": "p001", "quantity": 1 }],
  "couponCode": "SHOPLITE10"
}
```

- `couponCode`: string, trim, tối đa 32 ký tự; rỗng được coi như không có mã.
- Mọi khóa như `discount`, `total`, `subtotal`, `unitPrice` do client gửi đều bị Zod loại bỏ (FR-016).

## Xử lý phía server (`orderService.placeOrder`)

1. `placeOrderSchema.safeParse` → `mergeItems` → giá và tồn kho từ catalog (như hiện tại).
2. `subtotal = calculateSubtotal(orderItems)`.
3. Nếu có `couponCode`: `evaluateCoupon(findCoupon(code), subtotal, now())`. Nếu `ok: false` thì throw `OrderError` tương ứng và **không lưu đơn** (FR-018).
4. `calculateOrderTotals(orderItems, shippingMethod, discount)`. Phí ship tính trên `subtotal − discount`.
5. Lưu đơn với `discount` và `coupon` (nếu có).

## `POST /api/orders`: response

### 201

```json
{
  "id": "SL-20261108-4F9A2C",
  "status": "pending",
  "subtotal": 1290000,
  "discount": 100000,
  "coupon": { "code": "SHOPLITE10", "discount": 100000 },
  "shippingFee": 0,
  "total": 1190000,
  "...": "các trường hiện có"
}
```

Đơn không dùng mã: `discount: 0`, không có `coupon`.

### Lỗi mới (bổ sung vào `HTTP_STATUS_BY_CODE` trong `order-errors.ts`)

| HTTP | `error.code`                  | `error.message`                                                                    | `details`                                                   |
| ---- | ----------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 422  | `COUPON_NOT_FOUND`            | "Mã giảm giá không tồn tại"                                                        | `{ couponCode }`                                            |
| 422  | `COUPON_EXPIRED`              | "Mã giảm giá đã hết hạn"                                                           | `{ couponCode }`                                            |
| 422  | `COUPON_MIN_SUBTOTAL_NOT_MET` | "Đơn hàng chưa đạt giá trị tối thiểu 500.000 ₫. Mua thêm 50.000 ₫ để dùng mã này." | `{ couponCode, minSubtotal: "500000", shortfall: "50000" }` |

Các lỗi hiện có (`VALIDATION_ERROR` 400, `PRODUCT_NOT_FOUND` 422, `INSUFFICIENT_STOCK` 409) giữ nguyên. Kiểm tra tồn kho và sản phẩm chạy **trước** kiểm tra mã.

## `GET /api/orders`, `GET /api/orders/[id]`

Trả thêm `discount` và `coupon` khi có. Đơn cũ không có hai trường này; client và page MUST dùng `order.discount ?? 0` và kiểm tra `order.coupon` trước khi hiển thị.

## Test bắt buộc (cập nhật `src/app/api/orders/route.test.ts`)

- 201 với `SHOPLITE10`, tạm tính 1.290.000: `discount = 100_000`, `total = 1_190_000`.
- 201: body chứa `discount: 999_999, total: 1` → bị bỏ qua, số tiền do server tính.
- 422 cho từng mã lỗi coupon (`COUPON_MIN_SUBTOTAL_NOT_MET` có `details.shortfall`).
- 201 khi không có `couponCode`: `discount = 0`, không có `coupon` (hồi quy).

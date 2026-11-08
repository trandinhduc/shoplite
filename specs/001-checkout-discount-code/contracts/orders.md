# Contract: thay đổi `POST /api/orders` và dữ liệu `Order`

Route `src/app/api/orders/route.ts` **không đổi**; thay đổi nằm ở `placeOrderSchema` và
`orderService.placeOrder`.

## Request — thêm `couponCode` (tùy chọn)

```json
{
  "customer": { "fullName": "Nguyễn Văn A", "phone": "0912345678", "address": "12 Nguyễn Huệ, Quận 1, TP.HCM" },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [{ "productId": "p006", "quantity": 2 }],
  "couponCode": "shoplite10"
}
```

- `couponCode`: `string`, trim, ≤ 32 ký tự; thiếu hoặc rỗng = không dùng mã.
- Mọi trường tiền client gửi (`discount`, `subtotal`, `total`, `unitPrice`…) **bị bỏ qua**.

## Xử lý ở server (thứ tự)

1. `placeOrderSchema.safeParse` → `VALIDATION_ERROR` (400) nếu sai.
2. Gộp dòng, lấy giá từ catalog, kiểm tra tồn kho (như hiện tại).
3. Nếu có `couponCode`: `normalizeCouponCode` → `findCoupon` → `evaluateCoupon(rule, subtotal, now())`.
   - Không tìm thấy → `COUPON_NOT_FOUND` (422)
   - `expired` → `COUPON_EXPIRED` (422)
   - `below_minimum` → `COUPON_MIN_SUBTOTAL_NOT_MET` (422)
   - Không tạo đơn trong mọi trường hợp lỗi (FR-013).
4. `calculateOrderTotals(items, shippingMethod, discount)`; phí ship tính trên subtotal trước giảm.
5. `repository.save(order)`.

## 201 Created — `Order` có thêm trường khi dùng mã

```json
{
  "id": "SL-20261108-4F9A2C",
  "status": "pending",
  "subtotal": 900000,
  "couponCode": "SHOPLITE10",
  "discount": 90000,
  "shippingFee": 0,
  "total": 810000
}
```

(Rút gọn; các trường khác như hiện tại.) Đơn không dùng mã: **không có** `couponCode`/`discount`,
giống hệt định dạng cũ.

## Lỗi mới (dạng `ApiErrorBody`)

| HTTP | `error.code`                  | `details`                       |
| ---- | ----------------------------- | ------------------------------- |
| 422  | `COUPON_NOT_FOUND`            | `{ "couponCode": "<message>" }` |
| 422  | `COUPON_EXPIRED`              | `{ "couponCode": "<message>" }` |
| 422  | `COUPON_MIN_SUBTOTAL_NOT_MET` | `{ "couponCode": "<message>" }` |

Client (`CheckoutForm`): `error.code` bắt đầu bằng `COUPON_` → gỡ mã khỏi tóm tắt, hiện
`details.couponCode` tại ô mã, giữ nguyên dữ liệu form, trạng thái về `idle`.

## `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id`

Không đổi hành vi. Đơn cũ (thiếu `couponCode`/`discount`) trả về nguyên trạng.

## Test route bắt buộc (`src/app/api/orders/route.test.ts`, repository in-memory)

- 201 với `couponCode: "shoplite10"` → `discount` và `total` đúng.
- 201 khi gửi kèm `discount: 999999, total: 1` → server bỏ qua, số tiền tự tính.
- 422 cho từng mã lỗi `COUPON_*`; không có đơn nào được lưu.
- 201 không có `couponCode` → response không có trường `discount`.

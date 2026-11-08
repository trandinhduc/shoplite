# Contract delta: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`

Chỉ ghi phần **thay đổi** so với hành vi hiện có (`src/app/api/orders/route.ts`, AGENTS.md mục 3).
Route Handler không đổi; thay đổi nằm ở `placeOrderSchema` và `orderService.placeOrder`.

## `POST /api/orders` — request

Thêm trường tùy chọn `couponCode`:

```json
{
  "customer": { "fullName": "…", "phone": "…", "address": "…" },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [{ "productId": "p006", "quantity": 1 }],
  "couponCode": "SHOPLITE10"
}
```

- `couponCode`: string, trim, 1–32 ký tự, không phân biệt hoa/thường. Bỏ trống trường = không dùng mã.
- Mọi trường tiền do client gửi (`discount`, `total`, `subtotal`, `unitPrice`…) bị **bỏ qua** (Zod
  loại khóa lạ).
- `couponCode` là mảng/số/chuỗi rỗng → 400 `VALIDATION_ERROR`, `details["couponCode"]`.

## `POST /api/orders` — xử lý

1. Validate schema (như cũ) → 2. gộp dòng, lấy giá, kiểm tra tồn kho (như cũ, FR-022) →
2. tính `subtotal` → 4. nếu có `couponCode`: `evaluateCoupon(findCoupon(code), subtotal, now)`; lỗi →
   ném `OrderError` tương ứng, **không lưu đơn**, không tự bỏ mã (FR-021) →
3. `calculateOrderTotals(items, shippingMethod, discount)` → 6. lưu đơn.

`now` dùng chung cho kiểm tra hạn mã và `createdAt`.

## `POST /api/orders` — 201 response (Order)

Thêm hai trường:

```json
{
  "id": "SL-20261108-4F9A2C",
  "subtotal": 450000,
  "discount": 45000,
  "couponCode": "SHOPLITE10",
  "shippingFee": 30000,
  "total": 435000
}
```

Không dùng mã: `discount: 0`, không có `couponCode`. `shippingFee` dựa trên `subtotal` trước giảm.

## `POST /api/orders` — lỗi mới

| HTTP | `error.code`                  | message / details                                        |
| ---- | ----------------------------- | -------------------------------------------------------- |
| 422  | `COUPON_NOT_FOUND`            | như [coupons-validate.md](./coupons-validate.md)         |
| 422  | `COUPON_EXPIRED`              | như trên                                                 |
| 422  | `COUPON_MIN_SUBTOTAL_NOT_MET` | như trên, kèm `details.minSubtotal`, `details.shortfall` |

Các lỗi hiện có (`VALIDATION_ERROR` 400, `PRODUCT_NOT_FOUND` 422, `INSUFFICIENT_STOCK` 409) giữ
nguyên và được kiểm **trước** mã giảm giá.

## `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id`

Không đổi hình dạng. Đơn mới có thêm `discount`/`couponCode`; đơn cũ không có hai trường này (client
coi `discount` thiếu = 0). Hủy đơn giữ nguyên `discount`/`couponCode`.

## UI contract: trang chi tiết đơn `/orders/[id]`

Khối tổng tiền theo thứ tự: Tạm tính → **Giảm giá ({couponCode}) −{discount}** (chỉ khi
`couponCode` có và `discount > 0`; `data-testid="order-discount"`) → Phí giao hàng → Tổng cộng.
Hướng dẫn chuyển khoản dùng `order.total` (đã trừ giảm giá).

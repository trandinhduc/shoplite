# Contract: `POST /api/orders` (mở rộng)

Request nhận thêm một trường tùy chọn là `couponCode`. Mọi phần khác giữ nguyên như hiện tại (xem README).

## Request

```json
{
  "customer": { "fullName": "Nguyễn Văn A", "phone": "0912345678", "address": "12 Nguyễn Huệ, Quận 1, TP.HCM" },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [{ "productId": "p006", "quantity": 2 }],
  "couponCode": "giam50k"
}
```

- `couponCode`: `z.string().trim().toUpperCase().max(32).optional()`. Chuỗi rỗng coi như không có mã.
- Mọi trường tiền do client gửi (`discount`, `subtotal`, `total`, `shippingFee`, `unitPrice`) đều bị
  schema bỏ qua. Server tính lại toàn bộ (FR-014, constitution III).

## Xử lý mã trong `orderService.placeOrder`

1. Validate schema, gộp dòng, lấy giá từ catalog, kiểm tra tồn kho (như hiện tại).
2. Nếu có `couponCode`, đánh giá mã bằng `evaluateCoupon(findCoupon(code), subtotal, now())`:

| Kết quả | Hành vi |
| --- | --- |
| `ok` | Đơn lưu `couponCode` và `discount`; `total` đã trừ giảm giá |
| `NOT_FOUND` | Ném `OrderError("COUPON_NOT_FOUND")` → **422**, không tạo đơn (FR-015) |
| `MIN_ORDER_NOT_MET` | Ném `OrderError("COUPON_MIN_ORDER_NOT_MET", …, { minOrderValue, missingAmount })` → **422**, không tạo đơn (FR-015) |
| `EXPIRED` | **Vẫn tạo đơn** với `discount: 0`, không có `couponCode`; response kèm `couponNotice` (FR-015a) |

3. Đơn không có `couponCode`: lưu `discount: 0`.

## 201 Created

```json
{
  "id": "SL-20261108-4F9A2C",
  "status": "pending",
  "subtotal": 600000,
  "discount": 50000,
  "couponCode": "GIAM50K",
  "shippingFee": 0,
  "total": 550000,
  "...": "các trường Order hiện có"
}
```

Trường hợp mã hết hạn lúc đặt:

```json
{
  "id": "SL-20261108-7B1D0E",
  "subtotal": 600000,
  "discount": 0,
  "shippingFee": 0,
  "total": 600000,
  "couponNotice": { "code": "COUPON_EXPIRED", "couponCode": "TET2026" },
  "...": "các trường Order hiện có"
}
```

`couponNotice` không được lưu vào storage. Client chuyển tới `/orders/{id}?placed=1&couponExpired=TET2026`.

## Test bắt buộc

Service test dùng `createInMemoryOrderRepository()` và inject `now`. Route test mock `@/features/orders/server`.

- Đơn với `GIAM50K` ở tạm tính 499.999 (422) / 500.000 (201, giảm 50.000).
- Payload có `discount: 999999` và `total: 1`: đơn vẫn lưu số do server tính.
- `TET2026` khi `now` là `2026-02-28T23:59:59+07:00` → đơn có giảm giá; khi `now` là `2026-03-01T00:00:00+07:00` → đơn không giảm và response có `couponNotice`.
- `COUPON_NOT_FOUND` → 422 và repository không có đơn mới.
- Đơn không mã: `discount === 0` và không có `couponCode`.

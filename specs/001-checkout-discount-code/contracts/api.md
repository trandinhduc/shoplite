# API Contracts: Mã giảm giá

Mọi lỗi theo dạng chuẩn `{ "error": { "code", "message", "details"? } }` (`src/lib/http.ts`).
Message tiếng Việt có dấu.

## 1. `POST /api/coupons/validate` (mới)

File: `src/app/api/coupons/validate/route.ts` → `couponService.validateCoupon(body)`.

**Request**

```json
{ "code": " shoplite10 ", "items": [{ "productId": "p006", "quantity": 2 }] }
```

- `code`: string, trim, tối thiểu 1 ký tự (so khớp không phân biệt hoa/thường). Mã dài hơn 32
  ký tự hoặc có ký tự lạ → 422 `COUPON_NOT_FOUND` (không phải `VALIDATION_ERROR`).
  `VALIDATION_ERROR` chỉ khi mã rỗng/chỉ khoảng trắng hoặc sai kiểu.
- `items`: cùng ràng buộc với `placeOrderSchema.items` (≥ 1 dòng, `quantity` 1–10).
- Giá không được gửi; tiền hàng do server tính từ catalog.

**200 OK** — mã hợp lệ với giỏ hiện tại

```json
{
  "coupon": {
    "code": "SHOPLITE10",
    "type": "percent",
    "value": 10,
    "maxDiscount": 100000,
    "minSubtotal": 300000
  },
  "subtotal": 400000,
  "discount": 40000
}
```

**Lỗi**

| HTTP | `code`                        | `message`                                                                      | `details`                                                       |
| ---- | ----------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`            | "Thông tin mã giảm giá không hợp lệ" / "Body phải là JSON hợp lệ"              | lỗi theo field, ví dụ `{ "code": "Vui lòng nhập mã giảm giá" }` |
| 422  | `PRODUCT_NOT_FOUND`           | `Không tìm thấy sản phẩm "<id>"`                                               | —                                                               |
| 422  | `COUPON_NOT_FOUND`            | "Mã giảm giá không tồn tại"                                                    | —                                                               |
| 422  | `COUPON_EXPIRED`              | "Mã giảm giá đã hết hạn"                                                       | —                                                               |
| 422  | `COUPON_MIN_SUBTOTAL_NOT_MET` | "Đơn hàng chưa đạt tối thiểu 500.000 ₫ để dùng mã này. Hãy mua thêm 80.000 ₫." | `{ "minSubtotal": "500000", "shortfall": "80000" }`             |

Endpoint không ghi dữ liệu, không kiểm tồn kho.

## 2. `POST /api/orders` (mở rộng)

**Request** — thêm trường tùy chọn:

```json
{
  "customer": { "...": "..." },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [{ "productId": "p006", "quantity": 2 }],
  "couponCode": "SHOPLITE10"
}
```

- Thiếu `couponCode` hoặc chuỗi rỗng → đặt đơn như hiện nay.
- Mọi trường `discount`, `total`, giá… client gửi kèm đều bị bỏ qua.

**201 Created** — `Order` có thêm:

```json
{
  "subtotal": 400000,
  "discount": 40000,
  "shippingFee": 30000,
  "total": 390000,
  "couponCode": "SHOPLITE10"
}
```

Đơn không dùng mã: `"discount": 0`, không có `couponCode`.

**Lỗi mới** (ngoài các lỗi hiện có): `COUPON_NOT_FOUND`, `COUPON_EXPIRED`,
`COUPON_MIN_SUBTOTAL_NOT_MET` — cùng HTTP, message và `details` như bảng trên. Khi gặp các lỗi
này **không** có đơn nào được lưu.

Thứ tự kiểm tra trong `placeOrder`: schema → sản phẩm/tồn kho → mã giảm giá → tính tổng → lưu.

## 3. `GET /api/orders`, `GET /api/orders/[id]`

Không đổi shape; đơn mới có thêm `discount`/`couponCode`. Đơn cũ trả nguyên như đã lưu (không có
hai trường này) — client hiểu là không giảm giá.

## 4. UI contract (data-testid, text dùng trong test)

| Vị trí            | Phần tử                                       | data-testid / text                |
| ----------------- | --------------------------------------------- | --------------------------------- |
| Trang thanh toán  | Ô nhập mã (label "Mã giảm giá")               | `coupon-input`                    |
|                   | Nút "Áp dụng"                                 | `coupon-apply`                    |
|                   | Lỗi mã (gắn `aria-describedby`)               | `error-couponCode`                |
|                   | Mã đang áp dụng + nút "Gỡ mã"                 | `applied-coupon`, `coupon-remove` |
|                   | Ghi chú "chưa đủ điều kiện"                   | `coupon-ineligible`               |
|                   | Dòng giảm giá trong tóm tắt                   | `checkout-discount`               |
|                   | Giữ nguyên                                    | `shipping-fee`, `checkout-total`  |
| Chi tiết đơn hàng | Dòng "Giảm giá (MÃ)" (chỉ khi `discount > 0`) | `order-discount`                  |

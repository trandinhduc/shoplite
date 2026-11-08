# Data Model: Mã giảm giá khi thanh toán

## Coupon (mới - `src/features/coupons/coupon-rules.ts`, dữ liệu ở `src/data/coupons.ts`)

| Trường          | Kiểu                    | Bắt buộc | Ghi chú                                               |
| --------------- | ----------------------- | -------- | ----------------------------------------------------- |
| `code`          | `string`                | có       | Viết hoa, duy nhất; so khớp sau `normalizeCouponCode` |
| `type`          | `"percent" \| "fixed"`  | có       |                                                       |
| `value`         | `number`                | có       | `percent`: 1-100; `fixed`: số đồng > 0                |
| `maxDiscount`   | `number`                | percent  | Chỉ với `percent`; mức giảm tối đa (đồng)             |
| `minOrderValue` | `number`                | không    | So sánh `subtotal >= minOrderValue`                   |
| `expiresOn`     | `string` (`YYYY-MM-DD`) | không    | Hết hạn sau 23:59:59.999 ngày đó, giờ `+07:00`        |

Dữ liệu khởi tạo (FR-013):

| code         | type    | value  | maxDiscount | minOrderValue | expiresOn    |
| ------------ | ------- | ------ | ----------- | ------------- | ------------ |
| `SHOPLITE10` | percent | 10     | 100_000     | 300_000       | -            |
| `GIAM50K`    | fixed   | 50_000 | -           | 500_000       | -            |
| `TET2026`    | percent | 15     | 200_000     | -             | `2026-02-28` |

### Quy tắc

- `normalizeCouponCode(input) = input.normalize("NFKC").trim().toUpperCase()`; sau đó schema chỉ nhận `^[A-Z0-9]{1,32}$` (FR-014).
- `items`: tối đa 50 dòng mỗi request (FR-019).
- Số tiền giảm (FR-004, FR-005):
  - `percent`: `min(round(subtotal * value / 100), maxDiscount)`
  - `fixed`: `value`
  - Sau đó kẹp `min(discount, subtotal)`.
- `checkCouponEligibility(coupon, subtotal, now)` trả về một trong:
  - `{ ok: true, discount }`
  - `{ ok: false, reason: "expired" }`
  - `{ ok: false, reason: "min-order-not-met", minOrderValue, amountNeeded }`
    với `amountNeeded = minOrderValue - subtotal`
- Thứ tự kiểm tra: hết hạn → giá trị tối thiểu. Mã không tồn tại được xử lý trước đó ở
  `coupon-service` (`reason: "not-found"`).

## AppliedCoupon (mới - client, localStorage `shoplite:coupon`)

| Trường | Kiểu     | Ghi chú                                |
| ------ | -------- | -------------------------------------- |
| `code` | `string` | Mã đã chuẩn hóa                        |
| `rule` | `Coupon` | Quy tắc của đúng mã này, do API trả về |

Vòng đời: được đặt khi API xác nhận hợp lệ → bị xóa khi khách gỡ, khi tự gỡ (không còn đủ điều
kiện / hết hạn / API báo không hợp lệ lúc hiển thị lại) hoặc khi đặt hàng thành công.

## OrderTotals (sửa - `src/features/checkout/pricing.ts`)

| Trường        | Thay đổi | Công thức                                           |
| ------------- | -------- | --------------------------------------------------- |
| `subtotal`    | giữ      | `Σ unitPrice × quantity`                            |
| `discount`    | **mới**  | Tham số `discount` kẹp trong `[0, subtotal]`        |
| `shippingFee` | **sửa**  | `calculateShippingFee(subtotal - discount, method)` |
| `total`       | **sửa**  | `subtotal - discount + shippingFee`                 |

## Order (sửa - `src/features/orders/types.ts`)

| Trường       | Kiểu      | Thay đổi | Ghi chú                                                |
| ------------ | --------- | -------- | ------------------------------------------------------ |
| `couponCode` | `string?` | **mới**  | Chỉ có khi đơn dùng mã                                 |
| `discount`   | `number?` | **mới**  | Đơn mới luôn có (0 nếu không dùng mã); đơn cũ không có |

Tương thích ngược: mọi chỗ đọc dùng `order.discount ?? 0`; dòng giảm giá chỉ hiện khi `> 0`. Đơn cũ
trong `storage/orders.json` không được sửa.

## PlaceOrderInput (sửa - `src/features/checkout/checkout-schema.ts`)

- Thêm `couponCode: z.string().trim().max(32).optional()`; chuỗi rỗng coi như không dùng mã.
- Không thêm trường tiền nào (nguyên tắc III).

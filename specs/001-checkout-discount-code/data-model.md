# Data Model: Mã giảm giá khi thanh toán

**Feature**: `001-checkout-discount-code` | **Date**: 2026-11-08 | **Research**: [research.md](./research.md)

Đơn vị tiền: VND, số nguyên. Ngày: chuỗi `YYYY-MM-DD` theo giờ Việt Nam (UTC+7).

## Coupon (mới, `src/features/coupons/types.ts`, dữ liệu ở `src/data/coupons.ts`)

| Trường        | Kiểu                    | Bắt buộc      | Ràng buộc                                                       |
| ------------- | ----------------------- | ------------- | --------------------------------------------------------------- |
| `code`        | `string`                | ✔             | Chữ HOA, không khoảng trắng, duy nhất trong danh sách           |
| `type`        | `"percent" \| "fixed"`  | ✔             | `COUPON_TYPES`                                                  |
| `value`       | `number`                | ✔             | `percent`: số nguyên 1–100; `fixed`: số tiền > 0                |
| `maxDiscount` | `number`                | chỉ `percent` | > 0. Bắt buộc với `percent` (spec FR-002), bỏ trống với `fixed` |
| `minSubtotal` | `number`                | –             | ≥ 0. So với tạm tính trước giảm, tính cả giá trị bằng ngưỡng    |
| `expiresOn`   | `string` (`YYYY-MM-DD`) | –             | Dùng được đến 23:59:59.999 +07:00 của ngày này                  |

Nên định nghĩa bằng discriminated union theo `type` để TypeScript bắt buộc `maxDiscount` với mã
phần trăm.

Dữ liệu ban đầu (FR-017):

| code         | type    | value  | maxDiscount | minSubtotal | expiresOn    |
| ------------ | ------- | ------ | ----------- | ----------- | ------------ |
| `SHOPLITE10` | percent | 10     | 100 000     | 300 000     | –            |
| `GIAM50K`    | fixed   | 50 000 | –           | 500 000     | –            |
| `TET2026`    | percent | 15     | 200 000     | –           | `2026-02-28` |

## CouponEvaluation (mới, kết quả của `evaluateCoupon`, không lưu)

```text
{ ok: true,  coupon: Coupon, discount: number }
{ ok: false, reason: "not_found" }
{ ok: false, reason: "expired",       coupon: Coupon }
{ ok: false, reason: "below_minimum", coupon: Coupon, shortfall: number }
```

Quy tắc đánh giá `evaluateCoupon(coupon | undefined, subtotal, now)`, theo thứ tự:

1. Không có `coupon`: `not_found`.
2. `expiresOn` có và `now > deadline(expiresOn)`: `expired`.
3. `minSubtotal` có và `subtotal < minSubtotal`: `below_minimum`,
   `shortfall = minSubtotal − subtotal`.
4. Còn lại: `ok`, với `discount = calculateCouponDiscount(coupon, subtotal)`:
   - `percent`: `min(floor(subtotal × value / 100), maxDiscount)`;
   - `fixed`: `value`;
   - sau đó luôn lấy `min(…, subtotal)`, đảm bảo `0 ≤ discount ≤ subtotal`.

Giá trị biên bắt buộc phải có test (Nguyên tắc II):

| Trường hợp                            | Input                                          | Kỳ vọng                    |
| ------------------------------------- | ---------------------------------------------- | -------------------------- |
| Dưới tối thiểu 1đ                     | `SHOPLITE10`, subtotal 299 999                 | below_minimum, shortfall 1 |
| Đúng tối thiểu                        | `SHOPLITE10`, subtotal 300 000                 | ok, discount 30 000        |
| Chạm trần                             | `SHOPLITE10`, subtotal 1 000 000               | ok, discount 100 000       |
| Vượt trần                             | `SHOPLITE10`, subtotal 1 500 000               | ok, discount 100 000       |
| Làm tròn xuống                        | percent 15%, subtotal 333 333                  | discount 49 999            |
| Giảm cố định > tạm tính               | fixed 50 000 (không min), subtotal 30 000      | discount 30 000            |
| Phút cuối ngày hết hạn                | `TET2026`, now `2026-02-28T23:59:59.999+07:00` | không phải expired         |
| Đầu ngày hôm sau                      | `TET2026`, now `2026-03-01T00:00:00+07:00`     | expired                    |
| Hết hạn được kiểm tra trước tối thiểu | mã hết hạn và có min, subtotal dưới min        | expired                    |

## Mã chuẩn hóa

`normalizeCouponCode(input) = input.trim().toUpperCase()`. Chuỗi rỗng sau chuẩn hóa nghĩa là
"chưa nhập mã". UI hiện "Vui lòng nhập mã giảm giá" và không gọi API.

## CartState (sửa, `src/features/cart/types.ts`)

| Trường       | Kiểu         | Thay đổi                                          |
| ------------ | ------------ | ------------------------------------------------- |
| `items`      | `CartItem[]` | giữ nguyên                                        |
| `couponCode` | `string?`    | **mới**. Mã đã chuẩn hóa, không có = chưa áp dụng |

Action mới: `{ type: "apply-coupon"; code: string }` và `{ type: "remove-coupon" }`.

Chuyển trạng thái của `couponCode`:

```text
(không có) --apply-coupon--> code
code --apply-coupon(code2)--> code2   (UI chặn khi đã có mã, reducer vẫn chỉ giữ 1 mã)
code --remove-coupon--> (không có)
code --clear--> (không có)
code --remove/update-quantity làm items rỗng--> (không có)
```

`isCartState` chấp nhận dữ liệu cũ không có `couponCode`. Nếu `couponCode` có nhưng không phải
string thì bỏ qua trường đó (không xóa giỏ).

## OrderTotals (sửa, `src/features/checkout/pricing.ts`)

| Trường        | Thay đổi                                                 |
| ------------- | -------------------------------------------------------- |
| `subtotal`    | giữ nguyên                                               |
| `discount`    | **mới**, mặc định 0, kẹp trong `[0, subtotal]`           |
| `shippingFee` | giữ nguyên, tính theo `subtotal` **trước** giảm (FR-013) |
| `total`       | `subtotal − discount + shippingFee`                      |

## PlaceOrderInput (sửa, `placeOrderSchema`)

Thêm `couponCode?: string` (trim, tối đa 32 ký tự). Chuỗi rỗng được coi như không có mã. Server
chuẩn hóa mã trước khi tra.

## Order (sửa, `src/features/orders/types.ts`)

| Trường       | Kiểu      | Thay đổi                                                    |
| ------------ | --------- | ----------------------------------------------------------- |
| `couponCode` | `string?` | **mới**. Mã đã chuẩn hóa. Chỉ có khi đơn dùng mã            |
| `discount`   | `number?` | **mới**. > 0, chỉ có khi đơn dùng mã                        |
| `total`      | `number`  | ý nghĩa mở rộng: `subtotal − (discount ?? 0) + shippingFee` |

Bất biến: `couponCode` và `discount` cùng có hoặc cùng không có. Đơn cũ (không có hai trường)
hợp lệ và không cần migration.

## OrderErrorCode (sửa, `src/features/orders/order-errors.ts`)

Thêm `INVALID_COUPON` → HTTP 422. `details = { couponCode: <message tiếng Việt>, reason:
"not_found" | "expired" | "below_minimum" }`.

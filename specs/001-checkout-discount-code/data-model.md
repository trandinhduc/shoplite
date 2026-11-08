# Data Model: Mã giảm giá khi thanh toán

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Mọi số tiền là số nguyên VND. Các kiểu dưới đây mô tả hình dạng dữ liệu, không phải code hoàn chỉnh.

## 1. `Coupon` — mã giảm giá (dữ liệu tĩnh, chỉ phía server)

Nguồn: `src/data/coupons.ts` (`export const coupons: Coupon[]`). Kiểu: `src/features/coupons/types.ts`.

| Trường        | Kiểu                      | Bắt buộc           | Ghi chú                                                                  |
| ------------- | ------------------------- | ------------------ | ------------------------------------------------------------------------ |
| `code`        | `string`                  | ✔                  | Viết HOA, không khoảng trắng, duy nhất trong danh sách                   |
| `type`        | `"percentage" \| "fixed"` | ✔                  | `COUPON_TYPES = ["percentage", "fixed"] as const`                        |
| `value`       | `number`                  | ✔                  | `percentage`: 1–100 (%) · `fixed`: số tiền > 0                           |
| `maxDiscount` | `number`                  | ✔ khi `percentage` | Không có với `fixed` (union phân biệt theo `type`)                       |
| `minSubtotal` | `number`                  | —                  | Không có = không yêu cầu tối thiểu                                       |
| `expiresOn`   | `string` `YYYY-MM-DD`     | —                  | Ngày cuối còn hiệu lực (bao gồm), giờ Việt Nam. Không có = không hết hạn |

**Dữ liệu ban đầu** (FR-003):

| code         | type       | value  | maxDiscount | minSubtotal | expiresOn    |
| ------------ | ---------- | ------ | ----------- | ----------- | ------------ |
| `SHOPLITE10` | percentage | 10     | 100_000     | 300_000     | —            |
| `GIAM50K`    | fixed      | 50_000 | —           | 500_000     | —            |
| `TET2026`    | percentage | 15     | 200_000     | —           | `2026-02-28` |

**Ràng buộc** (kiểm bằng unit test trên chính dữ liệu): mã duy nhất; `code === normalizeCouponCode(code)`;
`percentage` có `maxDiscount > 0` và `0 < value <= 100`; `fixed` có `value > 0`.

`CouponRule` = hình dạng công khai của một `Coupon` trả cho client qua API (hiện trùng `Coupon`; tách
tên để nếu sau này thêm trường nội bộ thì không lộ ra ngoài).

## 2. `CouponEvaluation` — kết quả kiểm tra mã (thuần)

Trả về bởi `evaluateCoupon(coupon | undefined, subtotal, now)` trong `coupon-rules.ts`.

```text
| { ok: true;  code; discount }
| { ok: false; reason: "NOT_FOUND" }
| { ok: false; reason: "EXPIRED"; code }
| { ok: false; reason: "MIN_SUBTOTAL_NOT_MET"; code; minSubtotal; shortfall }
```

**Thứ tự kiểm tra** (FR-005): tồn tại → còn hạn (`now < cutoff(expiresOn)`) → `subtotal >= minSubtotal`.

**Tính `discount`** (FR-007, FR-008):

- `percentage`: `min(floor(subtotal × value / 100), maxDiscount)`
- `fixed`: `value`
- cả hai: `min(discount, subtotal)`

`shortfall = minSubtotal − subtotal` (luôn ≥ 1 khi không đạt).

**Thông báo** (`getCouponErrorMessage`, tiếng Việt, tiền qua `formatCurrency`):

| reason                 | message                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `NOT_FOUND`            | Mã giảm giá không tồn tại                                                                          |
| `EXPIRED`              | Mã giảm giá đã hết hạn                                                                             |
| `MIN_SUBTOTAL_NOT_MET` | Đơn hàng chưa đạt giá trị tối thiểu {minSubtotal} để dùng mã {code}. Bạn cần mua thêm {shortfall}. |
| (client, ô trống)      | Vui lòng nhập mã giảm giá                                                                          |

## 3. `OrderTotals` (mở rộng) — `src/features/checkout/pricing.ts`

| Trường        | Thay đổi      | Quy tắc                                                                          |
| ------------- | ------------- | -------------------------------------------------------------------------------- |
| `subtotal`    | giữ nguyên    | Σ `unitPrice × quantity`                                                         |
| `discount`    | **mới**       | tham số `discount` (mặc định 0) kẹp vào `[0, subtotal]`                          |
| `shippingFee` | giữ nguyên    | `calculateShippingFee(subtotal, method)` — dùng subtotal **trước** giảm (FR-010) |
| `total`       | đổi công thức | `subtotal − discount + shippingFee` (FR-009)                                     |

## 4. `Order` (mở rộng) — `src/features/orders/types.ts`

| Trường       | Kiểu      | Ghi chú                                                                                       |
| ------------ | --------- | --------------------------------------------------------------------------------------------- |
| `couponCode` | `string?` | Mã đã chuẩn hóa; chỉ có khi đơn dùng mã                                                       |
| `discount`   | `number?` | Đơn mới luôn có (0 nếu không dùng mã); đơn cũ trong `storage/orders.json` không có → coi là 0 |
| `total`      | `number`  | Đã trừ `discount`; giá trị lưu là nguồn sự thật để hiển thị (không tính lại)                  |

Không migration. Các trường được ghi một lần lúc `placeOrder` và không đổi về sau (FR-023);
`cancelOrder` giữ nguyên chúng qua spread.

## 5. `placeOrderSchema` (mở rộng) — `src/features/checkout/checkout-schema.ts`

Thêm `couponCode: couponCodeSchema.optional()` với `couponCodeSchema` (đặt ở
`src/features/coupons/coupon-schema.ts`): `z.string().trim().min(1).max(COUPON_CODE_MAX_LENGTH /* 32 */)`.
Khóa lạ (`discount`, `total`…) bị Zod loại bỏ. Mảng/kiểu khác → `VALIDATION_ERROR`
(`details["couponCode"]`).

`validateCouponSchema` (cùng file): `{ code: couponCodeSchema, items: <cùng schema items của placeOrderSchema> }`.

## 6. Trạng thái mã ở trang thanh toán (client) — Clarifications Q1/Q2

State: `appliedCoupon: { rule: CouponRule; lockedError?: string } | null` trong `CheckoutForm`.

Trạng thái hiển thị suy ra bởi `deriveCouponStatus(appliedCoupon, subtotal, now)`:

```text
none   ── Áp dụng (API 200) ─────────────────────────▶ active(discount)
none   ── Áp dụng (API 422) ── hiện lỗi cạnh ô, vẫn none
active ── tạm tính < minSubtotal ─────────────────────▶ error(min, shortfall)   [tự suy ra]
error(min) ── tạm tính >= minSubtotal ─────────────────▶ active                 [tự suy ra]
active/error ── Đặt hàng → 422 COUPON_EXPIRED / COUPON_NOT_FOUND ─▶ error(locked)
error(locked) ── chỉ thoát khi Gỡ mã hoặc Áp dụng mã khác thành công
bất kỳ ── Gỡ mã ───────────────────────────────────────▶ none
active/error ── Áp dụng mã mới thất bại ── giữ nguyên mã cũ (FR-016)
```

Chỉ `active` mới truyền `discount > 0` vào `calculateOrderTotals` để hiển thị. Khi đặt hàng, client
gửi `couponCode = appliedCoupon.rule.code` nếu `appliedCoupon !== null` (mọi trạng thái).

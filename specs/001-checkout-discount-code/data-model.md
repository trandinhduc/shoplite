# Data Model: Mã giảm giá khi thanh toán

## Coupon (`src/features/coupons/types.ts`, dữ liệu ở `src/data/coupons.ts`)

| Trường        | Kiểu                    | Bắt buộc | Ghi chú                                                  |
| ------------- | ----------------------- | -------- | -------------------------------------------------------- |
| `code`        | `string`                | có       | Viết hoa, duy nhất trong mảng, 1–32 ký tự                |
| `type`        | `"percent" \| "fixed"`  | có       |                                                          |
| `value`       | `number`                | có       | `percent`: 1–100; `fixed`: số đồng > 0                   |
| `maxDiscount` | `number`                | không    | Chỉ cho `percent`; không có = không giới hạn             |
| `minSubtotal` | `number`                | không    | So với tiền hàng **trước** giảm; không có = 0            |
| `expiresOn`   | `string` (`YYYY-MM-DD`) | không    | Ngày cuối còn dùng được, giờ Việt Nam; không có = vô hạn |

Dữ liệu ban đầu:

| code         | type      | value  | maxDiscount | minSubtotal | expiresOn    |
| ------------ | --------- | ------ | ----------- | ----------- | ------------ |
| `SHOPLITE10` | `percent` | 10     | 100_000     | 300_000     | —            |
| `GIAM50K`    | `fixed`   | 50_000 | —           | 500_000     | —            |
| `TET2026`    | `percent` | 15     | 200_000     | —           | `2026-02-28` |

**Bất biến** (kiểm bằng unit test trên mảng dữ liệu): `code` đã chuẩn hóa và không trùng;
`maxDiscount` chỉ xuất hiện khi `type = "percent"`; `expiresOn` đúng định dạng ngày.

`AppliedCoupon` = `Coupon` (định nghĩa công khai của một mã, trả về client sau khi validate).

## CouponEvaluation (kết quả hàm thuần `evaluateCoupon(coupon | undefined, subtotal, now)`)

```text
| { status: "valid"; discount: number }
| { status: "not_found" }
| { status: "expired" }
| { status: "min_subtotal_not_met"; minSubtotal: number; shortfall: number }
```

- Thứ tự kiểm: `not_found` → `expired` → `min_subtotal_not_met` → `valid`.
- `shortfall = minSubtotal − subtotal` (> 0).
- `discount`: `percent` → `min(floor(subtotal × value / 100), maxDiscount ?? ∞)`;
  `fixed` → `min(value, subtotal)`. Luôn `0 ≤ discount ≤ subtotal`.

## OrderTotals (mở rộng, `src/features/checkout/pricing.ts`)

| Trường        | Thay đổi | Quy tắc                                               |
| ------------- | -------- | ----------------------------------------------------- |
| `subtotal`    | giữ      | Σ `unitPrice × quantity`                              |
| `discount`    | **mới**  | Tham số vào, kẹp về `[0, subtotal]`; mặc định 0       |
| `shippingFee` | giữ      | `calculateShippingFee(subtotal, method)` — trước giảm |
| `total`       | đổi      | `subtotal − discount + shippingFee`                   |

## Order (mở rộng, `src/features/orders/types.ts`)

| Trường       | Kiểu      | Ghi chú                                                          |
| ------------ | --------- | ---------------------------------------------------------------- |
| `couponCode` | `string?` | **Mới**. Mã chuẩn hóa; chỉ có khi đơn dùng mã                    |
| `discount`   | `number?` | **Mới**. Đơn mới luôn ghi (0 nếu không mã); đơn cũ không có → 0  |
| `total`      | `number`  | Ý nghĩa mới: đã trừ `discount`. Đơn cũ giữ nguyên giá trị đã lưu |

Không có migration: đơn cũ trong `storage/orders.json` đọc được nguyên trạng.

## PlaceOrderInput (mở rộng `placeOrderSchema`)

| Trường       | Kiểu      | Ràng buộc                                                                    |
| ------------ | --------- | ---------------------------------------------------------------------------- |
| `couponCode` | `string?` | trim; thiếu hoặc chuỗi rỗng = không dùng mã; > 32 ký tự → `COUPON_NOT_FOUND` |

Không thêm trường giá, `discount` hay `total` (nguyên tắc III). Trường lạ client gửi bị Zod bỏ qua.

## Trạng thái mã trên trang thanh toán (client)

```text
(none) --Áp dụng hợp lệ--> applied
applied --giỏ < minSubtotal--> ineligible ("chưa đủ điều kiện", không giảm, hiển thị shortfall)
ineligible --giỏ ≥ minSubtotal--> applied (tự áp dụng lại)
applied | ineligible --Gỡ mã--> (none)
applied --Đặt hàng bị lỗi COUPON_*--> (none) + hiển thị lý do (FR-015)
applied | ineligible --Đặt hàng thành công--> (none) (xóa cùng giỏ)
```

- `applied`: gửi `couponCode` khi đặt hàng. `ineligible`: **không** gửi (đơn tạo không giảm, FR-013).
- Lưu ở localStorage key `"shoplite:coupon"` (giá trị `AppliedCoupon`); dữ liệu hỏng → `(none)`.
- Hết hạn được tính lại theo đồng hồ client khi hiển thị; server là bên quyết định cuối cùng.

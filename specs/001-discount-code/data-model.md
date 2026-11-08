# Data Model: Mã giảm giá

## Coupon (tĩnh, `src/data/coupons.ts`, chỉ đọc)

| Trường | Kiểu | Quy tắc |
|--------|------|---------|
| `code` | string | Viết hoa, duy nhất, là khóa tra cứu |
| `type` | `"percent" \| "fixed"` | |
| `value` | number | `percent`: 1–100; `fixed`: số đồng > 0 |
| `maxDiscount` | number? | Chỉ cho `percent`; trần mức giảm (đồng) |
| `minOrderValue` | number? | Xét trên tiền hàng trước giảm; thiếu = không ràng buộc |
| `expiresOn` | string? (`YYYY-MM-DD`) | Dùng được đến hết ngày đó (UTC+7); thiếu = không hết hạn |

Dữ liệu khởi tạo:

| code | type | value | maxDiscount | minOrderValue | expiresOn |
|------|------|-------|-------------|---------------|-----------|
| SHOPLITE10 | percent | 10 | 100000 | 300000 | — |
| GIAM50K | fixed | 50000 | — | 500000 | — |
| TET2026 | percent | 15 | 200000 | — | 2026-02-28 |

## CouponEvaluation (kết quả `evaluateCoupon`, không lưu)

- Hợp lệ: `{ ok: true, code, discountAmount }`
- Không hợp lệ: `{ ok: false, reason: "not_found" | "expired" | "min_order_not_met", shortfall?: number }`

## AppliedDiscount (lưu trong Order)

| Trường | Kiểu | Quy tắc |
|--------|------|---------|
| `code` | string | Mã đã chuẩn hóa tại thời điểm đặt |
| `amount` | number | Số đồng > 0, ≤ `subtotal`; chốt tại thời điểm đặt, không đổi sau đó |

## Order (sửa `src/features/orders/types.ts`)

Thêm `discount?: AppliedDiscount`. Quan hệ tiền: `total = subtotal - (discount?.amount ?? 0) + shippingFee`, `total >= 0`.
Đơn cũ không có `discount` vẫn hợp lệ; không cần migration `storage/orders.json`.

## PlaceOrderInput (sửa `checkout-schema.ts`)

Thêm `couponCode?: string` (trim, ≤ 32 ký tự; rỗng = không dùng). Tuyệt đối không thêm trường giá, số tiền giảm hay tổng tiền; nếu client gửi các trường đó, Zod object bỏ qua chúng.

## Chuyển trạng thái / ràng buộc

- Một đơn có tối đa một `discount`.
- Hủy đơn không đổi `discount` (không có hoàn lại lượt dùng vì không giới hạn lượt).

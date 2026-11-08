# Data Model: Mã giảm giá khi thanh toán

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Tất cả số tiền tính bằng VND và là số nguyên (đồng).

## Coupon (mã giảm giá) — `src/features/coupons/types.ts`, dữ liệu ở `src/data/coupons.ts`

Kiểu union theo `type`:

| Trường | Kiểu | Bắt buộc | Ràng buộc |
| --- | --- | --- | --- |
| `code` | `string` | ✔ | Viết HOA, không khoảng trắng, duy nhất trong danh sách |
| `type` | `"percent" \| "fixed"` | ✔ | |
| `percent` | `number` | khi `type = "percent"` | Số nguyên, từ 1 đến 100 |
| `maxDiscount` | `number` | khi `type = "percent"` | > 0 (FR-004: loại phần trăm luôn có mức tối đa) |
| `amount` | `number` | khi `type = "fixed"` | > 0 |
| `minOrderValue` | `number` | – | ≥ 0. Thiếu thì coi là 0 |
| `expiresOn` | `string` (`YYYY-MM-DD`) | – | Thiếu thì không hết hạn. Còn dùng được hết ngày này theo giờ Việt Nam (R6) |

Dữ liệu ban đầu (FR-019):

| code | type | percent / amount | maxDiscount | minOrderValue | expiresOn |
| --- | --- | --- | --- | --- | --- |
| `SHOPLITE10` | percent | 10 | 100.000 | 300.000 | – |
| `GIAM50K` | fixed | 50.000 | – | 500.000 | – |
| `TET2026` | percent | 15 | 200.000 | – | 2026-02-28 |

Test có kiểm tra tính toàn vẹn của dữ liệu tĩnh: mã viết HOA, không trùng, ràng buộc đúng theo `type`.

## DiscountRule — phần của Coupon dùng để tính tiền (`pricing.ts`)

`Pick` từ Coupon: `type`, `percent`/`maxDiscount` hoặc `amount`. `pricing.ts` chỉ phụ thuộc kiểu này
(import kiểu), không import dữ liệu mã.

## CouponEvaluation — kết quả kiểm tra mã (`features/coupons/coupon-rules.ts`)

```text
{ ok: true,  coupon, discount }
{ ok: false, reason: "NOT_FOUND" }
{ ok: false, reason: "EXPIRED", coupon }
{ ok: false, reason: "MIN_ORDER_NOT_MET", coupon, minOrderValue, missingAmount }
```

Thứ tự kiểm tra: tồn tại → hết hạn → đơn tối thiểu. Ví dụ `TET2026` với giỏ nhỏ luôn báo "hết hạn",
không báo "chưa đạt tối thiểu".

- `missingAmount = minOrderValue - subtotal` (> 0).
- `subtotal = minOrderValue` là đạt (FR-006).

Không có trạng thái tồn tại lâu dài. Đây chỉ là giá trị tính ra.

## OrderTotals (mở rộng) — `pricing.ts`

| Trường | Ghi chú |
| --- | --- |
| `subtotal` | Như hiện tại |
| `discount` | **Mới**. 0 nếu không có mã. Không bao giờ âm và không bao giờ vượt `subtotal` |
| `shippingFee` | Như hiện tại, tính trên `subtotal` **trước** giảm giá (FR-011) |
| `total` | `subtotal - discount + shippingFee` |

## Order (mở rộng) — `src/features/orders/types.ts`

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `couponCode` | `string?` | **Mới**. Mã đã áp dụng, dạng HOA. Không có nếu đơn không dùng mã hoặc mã hết hạn lúc đặt (FR-015a) |
| `discount` | `number?` | **Mới**. Đơn mới luôn có (0 nếu không mã). Đơn cũ không có → hiểu là 0 (FR-017) |
| `total` | `number` | Đã trừ `discount`. Ý nghĩa với đơn cũ không đổi |

Bất biến: `total === subtotal - (discount ?? 0) + shippingFee`. Nếu `couponCode` có giá trị thì `discount > 0`.

Hủy đơn (`pending → cancelled`) không thay đổi `couponCode` hay `discount`.

## PlacedOrderResponse — body 201 của `POST /api/orders` (không lưu)

`Order & { couponNotice?: { code: "COUPON_EXPIRED"; couponCode: string } }`. Xem
[contracts/orders-post.md](./contracts/orders-post.md).

## CartState (mở rộng) — `src/features/cart/types.ts`

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `items` | `CartItem[]` | Như hiện tại |
| `couponCode` | `string?` | **Mới**. Mã đang áp dụng (HOA). Lưu cùng key `shoplite:cart`. Giỏ cũ không có trường này vẫn hợp lệ |

Action mới: `{ type: "apply-coupon"; code }`, `{ type: "remove-coupon" }`. `clear` đặt lại cả `items` lẫn `couponCode`.
`remove` hay `update-quantity` **không** tự xóa mã. Việc kiểm tra lại là của trang thanh toán (R9).

## Trạng thái mã phía client

```text
không có mã ──Áp dụng (API 200)──▶ đã áp dụng(code)  [lưu trong cartStore]
     ▲                                  │
     │                                  ├─ vào lại /checkout hoặc items đổi → gọi lại validate
     │                                  │      ├─ 200 → giữ, tính lại tiền giảm
     ├────────── Gỡ mã ─────────────────┤      └─ 422 COUPON_* → gỡ hẳn + thông báo lý do (FR-018)
     ├── đặt hàng thành công (clear) ───┤
     └── đặt hàng bị từ chối vì mã ─────┘ (kèm thông báo)
```

Mã đã bị gỡ không tự áp dụng lại khi giỏ đạt lại điều kiện (Clarification Q2 = C).
Quy tắc trả về từ API chỉ nằm trong state của form, không được lưu.

# Data Model: Mã giảm giá khi thanh toán

Tiền là số nguyên VND. Thời điểm là chuỗi ISO 8601 có múi giờ.

## CouponRule (mới — `src/features/coupons/types.ts`, dữ liệu ở `src/data/coupons.ts`)

Union phân biệt bằng `type`:

| Trường        | Kiểu                         | Bắt buộc | Ghi chú                                                         |
| ------------- | ---------------------------- | -------- | --------------------------------------------------------------- |
| `code`        | `string`                     | Có       | In hoa, không khoảng trắng, duy nhất trong danh sách            |
| `type`        | `"percent" \| "fixed"`       | Có       | Hằng `COUPON_TYPES` dạng `as const`                             |
| `percent`     | `number` (1–100)             | `percent` | Phần trăm giảm trên tạm tính                                   |
| `maxDiscount` | `number` (> 0)               | `percent` | Mức giảm tối đa                                                |
| `amount`      | `number` (> 0)               | `fixed`  | Số tiền giảm cố định                                            |
| `minSubtotal` | `number` (≥ 0)               | Không    | Không có = không yêu cầu; so sánh `subtotal >= minSubtotal`     |
| `expiresAt`   | `string` (ISO, loại trừ)     | Không    | Không có = không hết hạn; hết hạn khi `now >= expiresAt`        |

Dữ liệu ban đầu (FR-018):

| code         | type      | giá trị | maxDiscount | minSubtotal | expiresAt                    |
| ------------ | --------- | ------- | ----------- | ----------- | ---------------------------- |
| `SHOPLITE10` | `percent` | 10      | 100_000     | 300_000     | —                            |
| `GIAM50K`    | `fixed`   | 50_000  | —           | 500_000     | —                            |
| `TET2026`    | `percent` | 15      | 200_000     | —           | `2026-03-01T00:00:00+07:00`  |

Quy tắc kiểm tra dữ liệu (unit test trên `coupons` data): mã duy nhất, đúng định dạng chuẩn hóa,
trường bắt buộc theo `type` có mặt và dương.

## CouponEvaluation (mới — kết quả của `evaluateCoupon(rule, subtotal, now)`)

| status          | Trường kèm theo                    | Ý nghĩa                                         |
| --------------- | ---------------------------------- | ----------------------------------------------- |
| `applied`       | `discount: number`                 | Đang giảm (`0 < discount ≤ subtotal`)           |
| `below_minimum` | `minSubtotal`, `shortfall: number` | "Chưa đủ điều kiện"; `shortfall = min − subtotal` |
| `expired`       | —                                  | Đã hết hạn                                      |

Thứ tự kiểm tra: `expired` → `below_minimum` → `applied`. "Không tồn tại" không thuộc evaluation
(chỉ xảy ra khi tra mã ở server).

Công thức `discount` (`calculateCouponDiscount(rule, subtotal)`):

- `percent`: `min(floor(subtotal × percent / 100), maxDiscount)`
- `fixed`: `amount`
- Sau cùng: `min(kết quả, subtotal)`, không âm.

### Trạng thái mã trên trang thanh toán (client, không lưu trữ)

```text
(không có mã) --Áp dụng, server OK--> [đã áp dụng] --evaluate--> applied | below_minimum
applied <--giỏ thay đổi, subtotal ≥ min--> below_minimum      (FR-017, tự chuyển qua lại)
[đã áp dụng] --Gỡ mã--> (không có mã)                          (FR-011)
[đã áp dụng] --server trả COUPON_*, hoặc evaluate = expired--> (không có mã) + thông báo (FR-013)
below_minimum --bấm Đặt hàng--> chặn, lỗi tại couponCode     (FR-017a)
```

## OrderTotals (sửa — `src/features/checkout/pricing.ts`)

| Trường        | Thay đổi | Ghi chú                                                   |
| ------------- | -------- | --------------------------------------------------------- |
| `subtotal`    | Giữ      |                                                           |
| `discount`    | **Mới**  | `0` khi không có mã; kẹp `[0, subtotal]`                  |
| `shippingFee` | Giữ      | Vẫn tính trên `subtotal` trước giảm (FR-007)              |
| `total`       | Đổi công thức | `subtotal − discount + shippingFee`, không âm        |

## Order (sửa — `src/features/orders/types.ts`)

| Trường       | Kiểu      | Thay đổi | Ghi chú                                                      |
| ------------ | --------- | -------- | ------------------------------------------------------------ |
| `couponCode` | `string?` | **Mới**  | Mã đã chuẩn hóa; chỉ có khi đơn dùng mã                      |
| `discount`   | `number?` | **Mới**  | Số tiền giảm lúc đặt; chỉ có khi đơn dùng mã (> 0)           |
| `total`      | `number`  | Giữ      | Đã trừ `discount`                                            |

Tương thích: đơn cũ thiếu cả hai trường → hiển thị như đơn không dùng mã (`discount ?? 0`). Giá trị
lưu lúc đặt không bao giờ được tính lại (FR-014). `cancelOrder` không đổi.

## PlaceOrderInput (sửa — `placeOrderSchema`)

| Trường       | Kiểu                              | Ghi chú                                         |
| ------------ | --------------------------------- | ----------------------------------------------- |
| `couponCode` | `string?` (trim, ≤ 32 ký tự)      | Rỗng = không dùng mã; chuẩn hóa ở service       |
| (khác)       | —                                 | `discount`, `total`… client gửi bị Zod bỏ qua   |

## OrderErrorCode (mở rộng — `order-errors.ts`)

| Code                          | HTTP | Message (ví dụ)                                                        |
| ----------------------------- | ---- | ---------------------------------------------------------------------- |
| `COUPON_NOT_FOUND`            | 422  | `Mã giảm giá "ABC" không tồn tại`                                      |
| `COUPON_EXPIRED`              | 422  | `Mã giảm giá "TET2026" đã hết hạn`                                     |
| `COUPON_MIN_SUBTOTAL_NOT_MET` | 422  | `Mã GIAM50K áp dụng cho đơn từ 500.000 ₫, bạn cần mua thêm 80.000 ₫`   |

Tất cả kèm `details: { couponCode: <message> }`.

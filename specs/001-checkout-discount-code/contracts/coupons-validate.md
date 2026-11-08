# Contract: `POST /api/coupons/validate`

Kiểm tra một mã giảm giá cho giỏ hàng hiện tại. Chỉ phục vụ Client Component (`CheckoutForm`).
Kết quả chỉ để **hiển thị**; khi đặt hàng server luôn kiểm tra lại (xem [orders.md](./orders.md)).

File: `src/app/api/coupons/validate/route.ts` → `couponService.validateCoupon(body)`; lỗi qua
`handleRouteError`.

## Request

```json
{
  "code": " shoplite10 ",
  "items": [{ "productId": "p006", "quantity": 1 }]
}
```

| Trường  | Ràng buộc                                                                           |
| ------- | ----------------------------------------------------------------------------------- |
| `code`  | string, trim, 1–32 ký tự; so khớp không phân biệt hoa/thường                        |
| `items` | giống `placeOrderSchema.items`: ≥ 1 dòng, `quantity` ∈ `[1, MAX_QUANTITY_PER_ITEM]` |

Không gửi giá; server lấy giá từ catalog. Không kiểm tra tồn kho (việc của lúc đặt hàng).

## 200 OK

```json
{
  "coupon": {
    "code": "SHOPLITE10",
    "type": "percentage",
    "value": 10,
    "maxDiscount": 100000,
    "minSubtotal": 300000
  },
  "subtotal": 450000,
  "discount": 45000
}
```

`coupon` là `CouponRule` của đúng mã đã gửi (client dùng để tự tính lại khi giỏ đổi). Không bao giờ
trả danh sách mã.

## Lỗi (`ApiErrorBody`)

| HTTP | `error.code`                  | Khi nào                            | `error.message`                                                                              | `details`                                           |
| ---- | ----------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 400  | `VALIDATION_ERROR`            | body không phải JSON / sai schema  | "Body phải là JSON hợp lệ" hoặc "Dữ liệu kiểm tra mã không hợp lệ"                           | lỗi theo trường (`toFieldErrors`)                   |
| 422  | `PRODUCT_NOT_FOUND`           | `productId` không có trong catalog | Không tìm thấy sản phẩm "…"                                                                  | —                                                   |
| 422  | `COUPON_NOT_FOUND`            | mã không tồn tại                   | Mã giảm giá không tồn tại                                                                    | —                                                   |
| 422  | `COUPON_EXPIRED`              | `now >= cutoff(expiresOn)`         | Mã giảm giá đã hết hạn                                                                       | —                                                   |
| 422  | `COUPON_MIN_SUBTOTAL_NOT_MET` | `subtotal < minSubtotal`           | Đơn hàng chưa đạt giá trị tối thiểu 500.000 ₫ để dùng mã GIAM50K. Bạn cần mua thêm 50.000 ₫. | `{ "minSubtotal": "500000", "shortfall": "50000" }` |
| 500  | `INTERNAL_ERROR`              | lỗi không lường trước              | Đã có lỗi xảy ra, vui lòng thử lại sau                                                       | —                                                   |

## Ví dụ kiểm thử (route test, `now` cố định)

| code         | items → subtotal                            | Kỳ vọng                   |
| ------------ | ------------------------------------------- | ------------------------- |
| `SHOPLITE10` | 300.000                                     | 200, discount 30.000      |
| `SHOPLITE10` | 299.999*                                    | 422 MIN, shortfall 1      |
| `shoplite10` | 2.000.000                                   | 200, discount 100.000     |
| `GIAM50K`    | 450.000                                     | 422 MIN, shortfall 50.000 |
| `TET2026`    | bất kỳ, now = 2026-02-28T23:59:59.999+07:00 | 200                       |
| `TET2026`    | bất kỳ, now = 2026-03-01T00:00:00+07:00     | 422 EXPIRED               |
| `KHONGCO`    | bất kỳ                                      | 422 NOT_FOUND             |

\* Biên không đạt được bằng giá catalog thật → kiểm ở unit test của `evaluateCoupon`.

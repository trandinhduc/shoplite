# Contract: `POST /api/coupons/validate` (mới)

File: `src/app/api/coupons/validate/route.ts`. Route mỏng, không có `"use client"`.

Kiểm tra mã có tồn tại và còn hạn hay không, **theo giờ server**. Endpoint không nhận giỏ hàng nên **không** kiểm tra ngưỡng tối thiểu; client tự kiểm tra bằng `evaluateCoupon` với định nghĩa trả về. Server kiểm tra lại toàn bộ khi `POST /api/orders`.

## Request

```json
{ "code": " shoplite10 " }
```

Validate bằng `validateCouponSchema` (Zod): `code` là string, trim, 1–32 ký tự. Mã được chuẩn hóa bằng `normalizeCouponCode` (trim + chữ HOA).

## Responses

### 200: mã dùng được

```json
{
  "coupon": {
    "code": "SHOPLITE10",
    "type": "percent",
    "value": 10,
    "maxDiscount": 100000,
    "minSubtotal": 300000
  }
}
```

Chỉ trả về định nghĩa của **đúng mã được hỏi**, không bao giờ trả danh sách.

### Lỗi: shape chuẩn `ApiErrorBody`

| HTTP | `error.code`       | `error.message`                                          | Khi nào                                                           |
| ---- | ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR` | "Body phải là JSON hợp lệ" / "Vui lòng nhập mã giảm giá" | Body sai JSON; `code` rỗng hoặc dài hơn 32 ký tự (`details.code`) |
| 422  | `COUPON_NOT_FOUND` | "Mã giảm giá không tồn tại"                              | Không có trong `src/data/coupons.ts`                              |
| 422  | `COUPON_EXPIRED`   | "Mã giảm giá đã hết hạn"                                 | `now > expiresOn 23:59:59.999 +07:00`                             |

`details.couponCode` chứa mã đã chuẩn hóa.

## Test bắt buộc (`route.test.ts`, `// @vitest-environment node`)

- 200 với `shoplite10` có khoảng trắng → `coupon.code === "SHOPLITE10"`.
- 422 `COUPON_NOT_FOUND` với `KHONGCO`.
- 422 `COUPON_EXPIRED` với `TET2026` (hôm nay > 28/02/2026).
- 400 với body `{ "code": "   " }` và body không phải JSON.

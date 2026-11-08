# Contract: `POST /api/coupons/validate`

Kiểm tra một mã giảm giá có tồn tại và còn hạn. **Không** kiểm tra giá trị tối thiểu (client tự
đánh giá bằng `evaluateCoupon` vì giỏ có thể thay đổi; server kiểm tra lại khi đặt hàng).

Route: `src/app/api/coupons/validate/route.ts` → `validateCouponCode(code, new Date())` trong
`src/features/coupons/coupon-service.ts`.

## Request

```json
{ "code": " shoplite10 " }
```

| Trường | Kiểu     | Ràng buộc                                   |
| ------ | -------- | ------------------------------------------- |
| `code` | `string` | Bắt buộc; sau trim 1–32 ký tự; không phân biệt hoa/thường |

## 200 OK

Trả về quy tắc công khai của **đúng mã đó** (`CouponRule`, xem data-model.md):

```json
{
  "coupon": {
    "code": "SHOPLITE10",
    "type": "percent",
    "percent": 10,
    "maxDiscount": 100000,
    "minSubtotal": 300000
  }
}
```

## Lỗi (dạng `ApiErrorBody`)

| HTTP | `error.code`       | Khi nào                                 | `details`                       |
| ---- | ------------------ | --------------------------------------- | ------------------------------- |
| 400  | `VALIDATION_ERROR` | Body không phải JSON, thiếu/rỗng `code` | `{ "code": "Vui lòng nhập mã giảm giá" }` |
| 422  | `COUPON_NOT_FOUND` | Không có mã sau chuẩn hóa               | `{ "couponCode": "<message>" }` |
| 422  | `COUPON_EXPIRED`   | `now >= expiresAt`                      | `{ "couponCode": "<message>" }` |

```json
{
  "error": {
    "code": "COUPON_EXPIRED",
    "message": "Mã giảm giá \"TET2026\" đã hết hạn",
    "details": { "couponCode": "Mã giảm giá \"TET2026\" đã hết hạn" }
  }
}
```

## Test route bắt buộc (`route.test.ts`, `// @vitest-environment node`)

- 200 với `SHOPLITE10`, với ` giam50k ` (chuẩn hóa).
- 422 `COUPON_NOT_FOUND` với `KHONGCO`.
- 422 `COUPON_EXPIRED` với `TET2026` khi `setSystemTime(2026-03-01T00:00:00+07:00)`; 200 khi
  `2026-02-28T23:59:59.999+07:00`.
- 400 khi body không phải JSON và khi `code` rỗng.

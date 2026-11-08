# Contract: `POST /api/coupons/validate`

Kiểm tra một mã với giỏ hàng hiện tại để **xem trước** tiền giảm. Endpoint này không tạo hay lưu gì.
Server tự tính tạm tính từ catalog (R2).

Route handler `src/app/api/coupons/validate/route.ts` chỉ làm phần mỏng: `readJsonBody`, gọi service,
và `handleRouteError`.

## Request

```json
{
  "code": " shoplite10 ",
  "items": [{ "productId": "p006", "quantity": 2 }]
}
```

| Trường | Ràng buộc (Zod, `validateCouponSchema`) |
| --- | --- |
| `code` | string, `trim` rồi `toUpperCase`, độ dài 1..32 |
| `items` | Dùng lại schema `items` của `placeOrderSchema` (1..10 mỗi dòng, ít nhất 1 dòng) |

Khóa lạ (ví dụ `subtotal`, `discount`) bị bỏ qua.

## 200 OK

```json
{
  "coupon": {
    "code": "SHOPLITE10",
    "type": "percent",
    "percent": 10,
    "maxDiscount": 100000,
    "minOrderValue": 300000
  },
  "subtotal": 500000,
  "discount": 50000
}
```

`coupon` chỉ gồm các trường cần để client tính lại (DiscountRule + `minOrderValue`). Không bao giờ
trả về danh sách mã.

## Lỗi — body `{ error: { code, message, details? } }`

| HTTP | `code` | Khi nào | `message` (ví dụ) | `details` |
| --- | --- | --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body không phải JSON, `code` rỗng, `items` sai | `Thông tin không hợp lệ` | lỗi theo từng trường |
| 422 | `PRODUCT_NOT_FOUND` | `productId` không có trong catalog | `Không tìm thấy sản phẩm "p999"` | – |
| 422 | `COUPON_NOT_FOUND` | Mã không có trong danh sách | `Mã giảm giá "ABC123" không tồn tại` | – |
| 422 | `COUPON_EXPIRED` | Đã qua `expiresOn` (giờ Việt Nam) | `Mã giảm giá "TET2026" đã hết hạn` | – |
| 422 | `COUPON_MIN_ORDER_NOT_MET` | `subtotal < minOrderValue` | `Đơn hàng cần tối thiểu 300.000 ₫ để dùng mã SHOPLITE10. Bạn cần mua thêm 50.000 ₫` | `{ "minOrderValue": "300000", "missingAmount": "50000" }` |

Thứ tự kiểm tra: schema → sản phẩm → tồn tại → hết hạn → tối thiểu.

## Test bắt buộc (route test, `// @vitest-environment node`)

- 200 với `SHOPLITE10` ở các mức tạm tính 300.000 / 1.000.000 / 2.000.000 (tiền giảm lần lượt 30.000 / 100.000 / 100.000).
- 422 cho từng mã lỗi ở trên, kiểm tra cả `code` lẫn HTTP status.
- `COUPON_MIN_ORDER_NOT_MET` tại tạm tính 299.999 trả `missingAmount = "1"`; tại 300.000 trả 200.
- 400 khi body không phải JSON hoặc `code` chỉ gồm khoảng trắng.

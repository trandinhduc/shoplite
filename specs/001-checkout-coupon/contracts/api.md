# API Contracts: Mã giảm giá

Mọi lỗi theo định dạng hiện có (`src/lib/http.ts`):

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": { "key": "string" }
  }
}
```

`message` bằng tiếng Việt. `details` là `Record<string, string>`: số tiền được gửi dạng chuỗi số nguyên
chưa định dạng (`"500000"`), client tự định dạng bằng `formatCurrency`.

## Mã lỗi

| code                       | HTTP | Khi nào                                       | message (ví dụ)                                                  | details                         |
| -------------------------- | ---- | --------------------------------------------- | ---------------------------------------------------------------- | ------------------------------- |
| `VALIDATION_ERROR`         | 400  | Body không phải JSON hoặc sai schema          | `Thông tin không hợp lệ`                                         | `{ "<field.path>": "<lỗi>" }`   |
| `PRODUCT_NOT_FOUND`        | 422  | `items` có sản phẩm không tồn tại (đã có)     | `Không tìm thấy sản phẩm "p999"`                                 | -                               |
| `INSUFFICIENT_STOCK`       | 409  | Chỉ `POST /api/orders` (đã có)                | `Sản phẩm "..." chỉ còn 3 sản phẩm`                              | -                               |
| `COUPON_NOT_FOUND`         | 422  | Mã không tồn tại                              | `Mã giảm giá "KHONGCO" không tồn tại`                            | -                               |
| `COUPON_EXPIRED`           | 422  | Đã qua 23:59:59.999 (+07:00) ngày `expiresOn` | `Mã giảm giá "TET2026" đã hết hạn`                               | -                               |
| `COUPON_MIN_ORDER_NOT_MET` | 422  | Tạm tính **trước giảm** < `minOrderValue`     | `Đơn hàng cần tối thiểu 500.000 ₫, mua thêm 50.000 ₫ để dùng mã` | `minOrderValue`, `amountNeeded` |
| `INTERNAL_ERROR`           | 500  | Lỗi không lường trước (đã có)                 | `Đã có lỗi xảy ra, vui lòng thử lại sau`                         | -                               |

Ví dụ:

```json
{
  "error": {
    "code": "COUPON_MIN_ORDER_NOT_MET",
    "message": "Đơn hàng cần tối thiểu 500.000 ₫, mua thêm 50.000 ₫ để dùng mã",
    "details": { "minOrderValue": "500000", "amountNeeded": "50000" }
  }
}
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Thông tin không hợp lệ",
    "details": { "code": "Vui lòng nhập mã giảm giá" }
  }
}
```

Thông báo lặp lại mã chỉ dùng mã đã chuẩn hóa (chỉ `A-Z0-9`, tối đa 32 ký tự) và được hiển thị dạng text thuần.

**Thứ tự kiểm tra** (cả hai endpoint): body/schema → sản phẩm (và tồn kho với `POST /api/orders`) →
mã: không tồn tại → hết hạn → chưa đạt tối thiểu.

## Coupon rule (dữ liệu trả về cho client)

| Trường          | Kiểu                   | Có khi                           |
| --------------- | ---------------------- | -------------------------------- |
| `code`          | `string`               | luôn có (đã chuẩn hóa, viết hoa) |
| `type`          | `"percent" \| "fixed"` | luôn có                          |
| `value`         | `number`               | luôn có                          |
| `maxDiscount`   | `number`               | `type = "percent"`               |
| `minOrderValue` | `number`               | mã có giá trị tối thiểu          |
| `expiresOn`     | `string` `YYYY-MM-DD`  | mã có ngày hết hạn               |

Chỉ quy tắc của đúng mã khách đã gửi; không có endpoint liệt kê mã.

## POST /api/coupons/validate (mới)

Kiểm tra mã cho giỏ hàng hiện tại. Không ghi dữ liệu.

| Trường  | Kiểu     | Ràng buộc                                                                                                                                                           |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`  | `string` | chuẩn hóa NFKC + trim + viết hoa, rồi chỉ `A-Z0-9`, 1-32 ký tự; rỗng → `details.code = "Vui lòng nhập mã giảm giá"`; ký tự khác → `"Mã giảm giá chỉ gồm chữ và số"` |
| `items` | `array`  | giống `items` của `placeOrderSchema` (1-50 dòng, `quantity` nguyên 1-10)                                                                                            |

```json
{ "code": " giam50k ", "items": [{ "productId": "p006", "quantity": 2 }] }
```

`200`:

```json
{
  "coupon": {
    "code": "GIAM50K",
    "type": "fixed",
    "value": 50000,
    "minOrderValue": 500000
  },
  "subtotal": 900000,
  "discount": 50000
}
```

```json
{
  "coupon": {
    "code": "SHOPLITE10",
    "type": "percent",
    "value": 10,
    "maxDiscount": 100000,
    "minOrderValue": 300000
  },
  "subtotal": 1500000,
  "discount": 100000
}
```

`subtotal` do server tính từ catalog. Lỗi: `400 VALIDATION_ERROR`, `422 PRODUCT_NOT_FOUND`, 3 mã lỗi coupon.

## POST /api/orders (sửa)

Thêm trường tùy chọn `couponCode: string` (chuẩn hóa như `code` ở trên, cho phép rỗng; không phải chuỗi, quá dài hoặc có ký tự ngoài `A-Z0-9` →
`400 VALIDATION_ERROR` với `details.couponCode`).

```json
{ "...": "như hiện tại", "couponCode": "SHOPLITE10" }
```

- Không gửi hoặc `""`: tạo đơn như hiện tại, `discount: 0`, không có `couponCode`.
- Có mã: server chuẩn hóa, kiểm tra lại theo giờ server lúc nhận request, tính lại tiền. Mã không hợp
  lệ → không tạo đơn, trả mã lỗi coupon.
- Mọi trường tiền client gửi kèm (`discount`, `total`, ...) bị bỏ qua.

`201` - `Order` đầy đủ, thêm `discount` và `couponCode`:

```json
{
  "id": "SL-20261108-4F9A2C",
  "status": "pending",
  "items": [
    {
      "productId": "p006",
      "quantity": 2,
      "unitPrice": 450000,
      "lineTotal": 900000
    }
  ],
  "subtotal": 900000,
  "discount": 50000,
  "couponCode": "GIAM50K",
  "shippingFee": 0,
  "total": 850000
}
```

(Rút gọn: `customer`, `createdAt`, ... như hiện tại.)

## GET /api/orders, GET /api/orders/:id (sửa)

- Đơn mới: luôn có `discount` (0 nếu không dùng mã), có `couponCode` khi dùng mã.
- Đơn cũ (tạo trước tính năng): không có hai trường này; client coi `discount` là `0`.

```json
{
  "id": "SL-20261021-AB12CD",
  "subtotal": 300000,
  "shippingFee": 30000,
  "total": 330000
}
```

## UI contract (trang thanh toán)

- Ô nhập có label "Mã giảm giá", nút "Áp dụng" (`type="button"`); Enter trong ô áp mã, không submit form đặt hàng.
- Đang kiểm tra: nút bị vô hiệu hóa, chữ "Đang kiểm tra…".
- Lỗi/thông báo hiển thị dưới ô (`role="alert"`), nối với ô qua `aria-describedby`.
- Đã áp dụng: hiện mã, nút "Gỡ mã", dòng "Giảm giá (CODE)" `-50.000 ₫` trong tóm tắt; phí ship và tổng cập nhật ngay.
- Trang giỏ hàng không hiển thị mã (spec Assumptions).

# Data Model: Mã giảm giá khi thanh toán

## Coupon

Nguồn: `src/data/coupons.ts`. Đây là dữ liệu read-only trong v1.

| Field             | Type                  | Rules                                                         |
| ----------------- | --------------------- | ------------------------------------------------------------- |
| `code`            | string                | Mã canonical viết hoa, duy nhất trong danh sách               |
| `kind`            | percentage hoặc fixed | Xác định cách tính                                            |
| `value`           | number                | Phần trăm từ 0 đến 100 hoặc số tiền VND nguyên không âm       |
| `maximumDiscount` | number hoặc undefined | Bắt buộc với percentage; VND nguyên không âm                  |
| `minimumSubtotal` | number                | VND nguyên không âm; so sánh với subtotal trước ship/discount |
| `expiresOn`       | string hoặc undefined | Ngày `YYYY-MM-DD`, diễn giải theo `Asia/Ho_Chi_Minh`          |

Giá trị ban đầu:

| Code         | Kind       |   Value |  Maximum | Minimum subtotal | Expires    |
| ------------ | ---------- | ------: | -------: | ---------------: | ---------- |
| `SHOPLITE10` | percentage |     10% | 100.000đ |         300.000đ | Không      |
| `GIAM50K`    | fixed      | 50.000đ |        — |         500.000đ | Không      |
| `TET2026`    | percentage |     15% | 200.000đ |               0đ | 28/02/2026 |

## Coupon evaluation

Kết quả thuần của việc áp dụng mã, không phải dữ liệu client được tin cậy.

| Field              | Type                            | Meaning                                       |
| ------------------ | ------------------------------- | --------------------------------------------- |
| `status`           | valid hoặc invalid              | Kết quả kiểm tra                              |
| `normalizedCode`   | string                          | Mã đã trim và uppercase                       |
| `discountAmount`   | number                          | Chỉ có ý nghĩa khi valid; không vượt subtotal |
| `reason`           | not_found, expired hoặc minimum | Lý do từ chối                                 |
| `minimumShortfall` | number hoặc undefined           | Số tiền cần mua thêm khi chưa đạt minimum     |

Mã rỗng có thể được xử lý như không có mã ở UI; request đặt hàng chỉ gửi mã
không rỗng nếu khách đã áp dụng.

## Order totals

`src/features/checkout/pricing.ts` mở rộng `OrderTotals`:

| Field            | Type   | Rules                                                    |
| ---------------- | ------ | -------------------------------------------------------- |
| `subtotal`       | number | Tổng giá catalog × quantity                              |
| `discountAmount` | number | 0 nếu không có mã; không vượt subtotal                   |
| `shippingFee`    | number | Quy tắc ship hiện tại, tính theo subtotal trước discount |
| `total`          | number | `subtotal - discountAmount + shippingFee`, không âm      |

`calculateOrderTotals` nhận coupon đã được xác thực hoặc coupon code theo hợp đồng
nội bộ; không nhận discount amount từ client.

## Order persistence

Mở rộng `Order` trong `src/features/orders/types.ts`:

| Field            | Type                  | Required for new order    | Legacy behavior                     |
| ---------------- | --------------------- | ------------------------- | ----------------------------------- |
| `discountCode`   | `string \| undefined` | Có khi dùng coupon        | Thiếu field được hiểu là không dùng |
| `discountAmount` | `number \| undefined` | Có thể lưu 0 hoặc số giảm | Thiếu field được hiểu là 0          |
| `subtotal`       | number                | Có                        | Đọc như hiện tại                    |
| `shippingFee`    | number                | Có                        | Đọc như hiện tại                    |
| `total`          | number                | Có                        | Đọc như hiện tại                    |

Không migration dữ liệu cũ. Trang chi tiết chỉ render dòng “Mã giảm giá” và
“Giảm giá” khi `discountCode` tồn tại hoặc `discountAmount` lớn hơn 0; nếu không,
giữ nguyên giao diện tổng tiền cũ.

## State transitions

1. Checkout bắt đầu với `no coupon`.
2. Client nhập mã → `valid` với preview discount hoặc `invalid` với lý do.
3. Client gỡ mã → quay về `no coupon`.
4. Giỏ hàng/phương thức giao hàng thay đổi → preview được tính lại; nếu subtotal
   không còn đạt điều kiện, mã bị gỡ và hiển thị lý do.
5. Submit → server xác nhận lại từ catalog và ngày hiện tại; chỉ coupon valid mới
   được persist vào Order.

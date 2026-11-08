# UI Contract: Mã giảm giá

Hợp đồng về nhãn, vai trò (role) và `data-testid`, dùng chung cho component test (Testing Library)
và Playwright. Text MUST đúng như bảng dưới. Số tiền MUST đi qua `formatCurrency`.

## Ô mã giảm giá trên trang `/checkout` (`CouponField`, client component)

Đặt trong `CheckoutForm`, ngay trên phần tóm tắt hoặc trong cột tóm tắt. Không hiện khi giỏ trống
(trang đã hiện `EmptyState`).

| Trạng thái      | Phần tử                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| Chưa có mã      | `<label for="couponCode">Mã giảm giá</label>`, input `id="couponCode"`, nút "Áp dụng" |
| Đang kiểm tra   | Nút "Áp dụng" disabled, có `aria-busy`                                                |
| Mã hợp lệ       | Hiện mã (chip) + nút "Gỡ mã" (`aria-label="Gỡ mã giảm giá {CODE}"`). Input bị ẩn      |
| Mã lỗi (giữ mã) | Như "Mã hợp lệ", thêm thông báo lỗi `role="alert"`, `data-testid="coupon-error"`      |
| Lỗi khi nhập    | Input còn hiện, thông báo lỗi `role="alert"` ngay dưới input, input có `aria-invalid` |

Cách áp dụng: bấm "Áp dụng" hoặc Enter trong input. Enter MUST NOT submit form đặt hàng.

Thông báo:

| Tình huống                 | Text                                                        |
| -------------------------- | ----------------------------------------------------------- |
| Bấm Áp dụng khi input rỗng | `Vui lòng nhập mã giảm giá`                                 |
| Mã không tồn tại           | `Mã giảm giá không tồn tại`                                 |
| Mã hết hạn                 | `Mã giảm giá đã hết hạn`                                    |
| Chưa đạt tối thiểu         | `Mua thêm {formatCurrency(shortfall)} để sử dụng mã {CODE}` |
| Lỗi mạng                   | `Không kiểm tra được mã giảm giá, vui lòng thử lại.`        |

Mã không tồn tại hoặc lỗi mạng khi bấm "Áp dụng": mã **không** được lưu vào giỏ. Mã hết hạn hoặc
chưa đạt tối thiểu: mã **được** lưu vào giỏ, hiện ở trạng thái "Mã lỗi", để tự có hiệu lực lại khi
khách mua thêm (FR-014).

## Tóm tắt đơn hàng (`CheckoutSummary`)

Thêm một dòng giữa "Tạm tính" và "Phí giao hàng", chỉ hiện khi mã hợp lệ:

| dt                  | dd                            | testid            |
| ------------------- | ----------------------------- | ----------------- |
| `Giảm giá ({CODE})` | `−{formatCurrency(discount)}` | `discount-amount` |

`checkout-total` (đã có) = tạm tính − giảm giá + phí giao hàng. `shipping-fee` (đã có) tính theo
tạm tính trước giảm.

## Nút "Đặt hàng"

Disabled khi có mã ở trạng thái lỗi (lỗi tính ở client hoặc server trả `INVALID_COUPON`). Khi
server trả `INVALID_COUPON`, message hiện tại `coupon-error`, không phải ở thông báo lỗi chung của
form.

## Trang chi tiết đơn `/orders/[id]`

Trong khối tổng tiền, thêm dòng giữa "Tạm tính" và "Phí giao hàng", chỉ khi đơn có `couponCode`
và `discount`:

| dt                  | dd                            | testid                  |
| ------------------- | ----------------------------- | ----------------------- |
| `Giảm giá ({CODE})` | `−{formatCurrency(discount)}` | `order-discount-amount` |

Đơn cũ: không có dòng này, các dòng còn lại không đổi.

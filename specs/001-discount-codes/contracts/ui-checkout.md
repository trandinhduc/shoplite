# Contract: UI mã giảm giá

Các selector dưới đây được e2e và component test dựa vào. Muốn đổi text hay testid thì phải cập nhật test (AGENTS.md §6).

## Trang thanh toán — `CouponField` (`src/features/coupons/components/coupon-field.tsx`, `"use client"`)

Đặt trong cột tóm tắt, ngay trên `CheckoutSummary`.

| Phần tử | Truy cập bằng | Ghi chú |
| --- | --- | --- |
| Ô nhập | `getByLabelText("Mã giảm giá")` | `<label htmlFor>`; khi lỗi thì có `aria-invalid` và `aria-describedby` trỏ tới thông báo lỗi |
| Nút áp dụng | `getByRole("button", { name: "Áp dụng" })` | Disabled khi đang kiểm tra; hiện "Đang kiểm tra…" |
| Thông báo lỗi | `role="alert"`, id gắn với ô nhập | Hiện nguyên `error.message` từ API, hoặc "Vui lòng nhập mã giảm giá" khi ô rỗng |
| Mã đã áp dụng | text `Đã áp dụng mã SHOPLITE10` | Khi đã áp dụng thì ẩn ô nhập (FR-008) |
| Nút gỡ | `getByRole("button", { name: "Gỡ mã" })` | |

Mã đã áp dụng được lưu trong `cartStore` (FR-020). Mỗi khi vào lại `/checkout` hoặc `items` đổi, client
kiểm tra lại mã qua API. Nếu mã không còn hợp lệ (FR-018), field tự gỡ hẳn mã và hiện thông báo
`role="status"`, ví dụ "Mã SHOPLITE10 đã được gỡ: Đơn hàng cần tối thiểu 300.000 ₫ để dùng mã SHOPLITE10.
Bạn cần mua thêm 50.000 ₫". Ô nhập hiện lại và để trống; mã không tự áp dụng lại.

Trong lúc kiểm tra lại, tóm tắt hiển thị giá chưa giảm và nút "Đặt hàng" bị disabled, để không gửi đơn
với con số chưa được xác nhận.

Nút "Áp dụng" có `type="button"`, không submit form thanh toán. Nhấn Enter trong ô mã sẽ áp dụng mã,
không đặt hàng.

## `CheckoutSummary` (mở rộng)

Thêm dòng giữa "Tạm tính" và "Phí giao hàng", chỉ hiện khi có mã:

| dt | dd | testid |
| --- | --- | --- |
| `Giảm giá (SHOPLITE10)` | `−50.000 ₫` (dùng `formatCurrency`) | `discount-amount` |

`checkout-total` hiển thị `total` đã trừ giảm giá.

## Trang chi tiết đơn `/orders/[id]`

- Dòng `Giảm giá (GIAM50K)` / `−50.000 ₫` (testid `order-discount`) chỉ hiện khi `order.couponCode`
  có giá trị và `order.discount > 0`. Đơn cũ hoặc đơn không mã thì không có dòng này.
- `?placed=1&couponExpired=CODE`: hiện khối `role="status"` màu vàng, ví dụ "Mã TET2026 đã hết hạn lúc
  đặt hàng nên không được áp dụng. Đơn hàng được tính theo giá gốc (mã lẽ ra giảm 90.000 ₫)."
  Khối nằm ngay dưới banner "Đặt hàng thành công", phía trên khối "Giao hàng & thanh toán"; số tiền chuyển
  khoản là `order.total` (giá gốc). Tham số `couponExpired` là input không tin cậy: `getExpiredCouponNotice`
  validate bằng `couponCodeSchema` và chỉ trả kết quả khi mã **thật sự đã hết hạn**. Nếu mã còn hạn, không
  tồn tại, không hợp lệ, hoặc đơn đã có `couponCode`, thì bỏ qua khối này.
- Nội dung chuyển khoản dùng `order.total` (đã trừ giảm giá), không cần đổi.

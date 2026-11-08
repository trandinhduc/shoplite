# UI contract: Ô mã giảm giá ở trang thanh toán `/checkout`

Component: `src/features/coupons/components/coupon-field.tsx` (client), được `CheckoutForm` render ở
cột phải, phía trên `CheckoutSummary`. Trạng thái và quy tắc chuyển: [data-model.md §6](../data-model.md).

## Phần tử (dùng cho Testing Library / Playwright)

| Phần tử                     | Truy cập                                              | Ghi chú                                                                          |
| --------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Ô nhập mã                   | `getByLabelText("Mã giảm giá")`, `id="couponCode"`    | `aria-invalid` khi có lỗi; `aria-describedby="coupon-message"`                   |
| Nút áp dụng                 | `getByRole("button", { name: "Áp dụng" })`            | `type="button"`; khi đang gọi API: disabled, nhãn "Đang kiểm tra…"               |
| Mã đang áp dụng             | `data-testid="applied-coupon"`                        | hiện mã + trạng thái                                                             |
| Nút gỡ                      | `getByRole("button", { name: "Gỡ mã" })`              | chỉ khi có mã đang áp dụng                                                       |
| Thông báo                   | `id="coupon-message"`, `data-testid="coupon-message"` | lỗi: `role="alert"`; thành công: `aria-live="polite"`                            |
| Dòng giảm giá trong tóm tắt | `data-testid="checkout-discount"`                     | "Giảm giá ({code})" · "−{formatCurrency(discount)}"; chỉ khi trạng thái `active` |
| Tổng                        | `data-testid="checkout-total"` (có sẵn)               | = subtotal − discount(active) + shippingFee                                      |

## Hành vi

- Enter trong ô mã = bấm "Áp dụng", **không** submit đơn hàng.
- Ô trống + "Áp dụng" → "Vui lòng nhập mã giảm giá", không gọi API.
- Áp dụng thành công → ô mã được xóa trắng, hiện mã đang áp dụng, dòng giảm giá và tổng mới.
- Áp dụng thất bại → thông báo lý do (message từ API), mã cũ (nếu có) giữ nguyên.
- Lỗi mạng → "Không kiểm tra được mã, vui lòng thử lại.", tổng không đổi.
- Đặt hàng bị 422 `COUPON_*` → thông báo hiển thị ở `coupon-message` (không chỉ ở lỗi chung dưới nút
  "Đặt hàng"), mã chuyển sang trạng thái lỗi theo data-model §6.
- Mọi số tiền qua `formatCurrency`.

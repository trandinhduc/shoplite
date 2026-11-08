# Contract: UI mã giảm giá

## Trang thanh toán: `CouponField` (`src/features/coupons/components/coupon-field.tsx`, `"use client"`)

Đặt trong cột tóm tắt của `CheckoutForm`, ngay trên `CheckoutSummary`.

| Phần tử                   | Yêu cầu truy cập được                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Ô nhập                    | `<label htmlFor="couponCode">Mã giảm giá</label>`; `aria-invalid` khi có lỗi; `aria-describedby` trỏ tới thông báo |
| Nút "Áp dụng"             | `<button type="button">`; disabled khi đang gọi API (chữ "Đang kiểm tra…")                                         |
| Mã đã áp dụng             | Hiện tên mã + nút "Gỡ mã" (`type="button"`)                                                                        |
| Thông báo lỗi / tạm ngưng | Ngay dưới ô mã, `role="alert"`, tiếng Việt theo [data-model.md §2](../data-model.md)                               |

Props gợi ý: `{ appliedCode, evaluation, error, pending, onApply(code), onRemove() }`. Component chỉ hiển thị; trạng thái nằm ở `CheckoutForm`.

**Enter trong ô mã** phải chạy "Áp dụng" chứ **không** submit form đặt hàng.

### Giữ mã trong phiên (`CheckoutForm`, FR-023)

| Sự kiện                          | Hành vi                                                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Áp mã thành công                 | `sessionStorage.setItem("shoplite:coupon", coupon.code)` — chỉ chuỗi mã, không có số tiền                                                                   |
| Mount, có key                    | Gọi lại `POST /api/coupons/validate` với mã đã lưu. 200 → khôi phục (dưới ngưỡng thì ở trạng thái tạm ngưng). 422 → xóa key, hiện `error.message` cạnh ô mã |
| Gỡ mã / đặt hàng 201             | `sessionStorage.removeItem("shoplite:coupon")`                                                                                                              |
| `sessionStorage` không dùng được | Bọc mọi truy cập trong `try/catch`; trang vẫn chạy như khi không có mã đã lưu                                                                               |

Client tính trạng thái bằng `evaluateCouponThreshold(appliedCoupon, subtotal)` và **không** xét hạn dùng bằng giờ máy khách; hạn dùng do server kiểm tra.

## `CheckoutSummary` (sửa)

Nhận thêm props `discount: number` và `couponCode?: string`. Khi `discount > 0`, thêm dòng giữa "Tạm tính" và "Phí giao hàng":

```text
Giảm giá (SHOPLITE10)        −100.000 ₫     data-testid="checkout-discount"
```

Phí ship và tổng tiền dùng `calculateOrderTotals(lines, method, discount)`. Mọi số tiền đi qua `formatCurrency`.

Thẻ chọn phương thức giao hàng trong `CheckoutForm` hiện đang gọi `calculateShippingFee(subtotal, method)`. Chỗ này MUST đổi thành `calculateShippingFee(subtotal − discount, method)` để nhãn "Miễn phí" khớp với tóm tắt.

## Trang chi tiết đơn `app/orders/[id]/page.tsx` (sửa)

Khi `order.coupon` có, thêm dòng giữa "Tạm tính" và "Phí giao hàng":

```text
Giảm giá (GIAM50K)           −50.000 ₫      data-testid="order-discount"
```

Đơn không có `coupon` (gồm cả đơn cũ) hiển thị như hiện tại.

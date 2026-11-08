# Kế hoạch Thiết kế lại Mã giảm giá (Coupon) cho ShopLite

## Mục tiêu
- Loại bỏ endpoint riêng **`POST /api/promotions/validate`**.
- Tích hợp kiểm tra coupon trực tiếp trong **API đặt hàng** và cung cấp một **endpoint preview** để UI có thể tính toán giảm giá ngay trên giao diện.
- Đảm bảo tính toàn vẹn, tránh gian lận và giữ đồng nhất với các contract đã tồn tại.

## Thiết kế mới
| Thành phần | Mô tả | Lợi ích |
|------------|------|---------|
| **`POST /api/orders/preview`** | Nhận payload `{ cartItems, couponCode? }` và trả về `{ subtotal, discountAmount, coupon?, shippingFee, total }`. | UI có thể gọi để hiển thị giảm giá ngay mà không cần một endpoint riêng cho coupon. | 
| **`POST /api/orders`** (đã có) | Khi tạo đơn, server **tự kiểm tra coupon** (sử dụng cùng logic với preview). Nếu không hợp lệ, trả lỗi `INVALID_COUPON`. | Đảm bảo server là nguồn sự thật, ngăn gian lận. |
| **Domain logic** (`src/features/coupons/…`) | Được giữ nguyên, cung cấp hàm `validateCoupon` được dùng bởi cả preview và order. | Tái sử dụng logic, giảm duplication. |
| **Contract Types** (`src/features/checkout/contracts/checkoutPreview.ts`) | Định nghĩa TypeScript interface cho request/response preview và order. | Kiểm tra compile‑time, đồng nhất giữa client và server. |

## Các bước thực hiện
1. **Tạo thư mục & contract** `src/features/checkout/contracts/checkoutPreview.ts`.
2. **Thêm route** `src/app/api/orders/preview/route.ts` sử dụng `validateCoupon` và `calculateOrderTotals`.
3. **Cập nhật UI** `CheckoutSummary`:
   - Khi người dùng nhập coupon, gọi **preview endpoint** để nhận `discountAmount` và cập nhật UI.
   - Khi người dùng nhấn “Đặt hàng”, payload vẫn chỉ gửi `couponCode`; server sẽ lại kiểm tra.
4. **Xóa** `src/app/api/promotions/validate/` (và các test liên quan).
5. **Cập nhật test**:
   - Thêm test cho endpoint preview.
   - Điều chỉnh các test hiện có để không còn phụ thuộc vào `/api/promotions/validate`.
6. **Cập nhật docs** (research.md, contracts) để phản ánh thay đổi.
7. **Chạy toàn bộ** `npm run check` và đảm bảo không lỗi.

## Đánh giá rủi ro & Mitigation
- **Rủi ro**: UI có thể hiển thị discount sai nếu preview và order logic không đồng nhất.
  - **Mitigation**: Sử dụng cùng **service** (`couponService.validateCoupon`) cho cả hai route.
- **Rủi ro**: Xóa endpoint cũ có thể làm một số test/CI break.
  - **Mitigation**: Cập nhật toàn bộ test và tài liệu trước khi merge.

## Timeline (ước tính)
- 1 giờ: Tạo contract & preview route.
- 1 giờ: Điều chỉnh UI, cập nhật tests.
- 30 phút: Xóa endpoint cũ & chạy toàn bộ test.
- 30 phút: Viết và cập nhật `research.md` & tài liệu.

## Kết luận
Thiết kế mới giảm số lượng endpoint, đồng nhất logic coupon và giúp UI có trải nghiệm mượt mà mà vẫn duy trì an ninh server‑side.


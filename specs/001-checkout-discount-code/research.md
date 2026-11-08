# Research: Mã giảm giá khi thanh toán

Không có mục `NEEDS CLARIFICATION` nào trong Technical Context; các quyết định dưới đây giải
quyết những điểm thiết kế còn mở khi đối chiếu spec với code hiện tại.

## R1. Nơi lưu danh sách mã

- **Decision**: Mảng tĩnh `coupons` trong `src/data/coupons.ts`, kiểu `Coupon` khai báo trong
  `src/features/coupons/types.ts` (giống `products.ts` + `catalog/types.ts`).
- **Rationale**: Spec loại trừ trang quản trị; dữ liệu tĩnh đúng nguyên tắc IV, test được trực tiếp.
- **Alternatives**: File JSON trong `storage/` (thừa, cần I/O); biến môi trường (khó đọc, khó test).

## R2. Client kiểm tra mã như thế nào

- **Decision**: Endpoint mới `POST /api/coupons/validate` nhận `{ code, items: [{ productId,
quantity }] }`. Server tính tiền hàng từ giá catalog, đánh giá mã, trả về định nghĩa công khai
  của mã (`AppliedCoupon`) và `discount`. Sau khi có định nghĩa, client tự tính lại bằng cùng hàm
  thuần `evaluateCoupon` mỗi khi giỏ thay đổi (FR-013), không cần gọi lại API.
- **Rationale**: Không đưa toàn bộ danh sách mã vào bundle client (tránh lộ mã chưa công bố); lý
  do lỗi ở bước "Áp dụng" do server quyết định theo giá thật (nguyên tắc III); hiển thị tức thì
  khi đổi giỏ vì dùng chung hàm thuần.
- **Alternatives**:
  - Import `src/data/coupons.ts` vào client và kiểm tra hoàn toàn ở client — đơn giản nhất nhưng
    lộ mọi mã trong JS bundle. Bị loại.
  - `GET /api/coupons/[code]` chỉ trả định nghĩa — client phải tự kết luận lỗi "chưa đạt tối
    thiểu" theo giá trong localStorage (có thể cũ). Bị loại.

## R3. Tích hợp vào `pricing.ts`

- **Decision**: `calculateOrderTotals(lines, method, discount = 0)` trả thêm trường `discount`
  (đã kẹp trong `[0, subtotal]`); `total = subtotal − discount + shippingFee`. Phí ship vẫn
  `calculateShippingFee(subtotal, method)` với subtotal **trước** giảm (Clarification FR-006).
  `pricing.ts` không import gì từ `coupons`; `coupons` không import `pricing` (chỉ nhận số
  `subtotal`) → không vòng phụ thuộc.
- **Rationale**: Giữ một nơi duy nhất tính tổng cho cả client lẫn server; tham số mặc định giữ
  tương thích mọi chỗ gọi hiện có (`checkout-summary.tsx`, test cũ).
- **Alternatives**: Để `pricing.ts` nhận `Coupon` — trộn hai tính năng, khó test riêng. Bị loại.

## R4. Ngày hết hạn và múi giờ

- **Decision**: Lưu `expiresOn: "2026-02-28"` (ngày cuối cùng còn dùng được, giờ Việt Nam). Hàm
  `isCouponExpired(coupon, now)` so `now >= Date.parse("<ngày kế tiếp>T00:00:00+07:00")`. `now`
  luôn được inject (DI) để test biên.
- **Rationale**: Dễ đọc cho người cấu hình; tránh lệch múi giờ của server (UTC) và client.
- **Alternatives**: Lưu ISO timestamp đầy đủ (khó đọc, dễ sai giây cuối ngày).

## R5. Mã lỗi

- **Decision**: Thêm vào `OrderErrorCode` + `HTTP_STATUS_BY_CODE`:
  `COUPON_NOT_FOUND` (422), `COUPON_EXPIRED` (422), `COUPON_MIN_SUBTOTAL_NOT_MET` (422). Lỗi tối
  thiểu kèm `details: { minSubtotal, shortfall }` (chuỗi số, vì `details` là
  `Record<string, string>`). Dùng chung lớp `OrderError` và `handleRouteError`.
- **Rationale**: Đúng quy ước AGENTS.md mục 4; client phân biệt lỗi mã bằng tiền tố `COUPON_` để
  tự gỡ mã (FR-015).
- **Alternatives**: Lớp `CouponError` riêng — phải sửa `handleRouteError`, thêm độ phức tạp.

## R6. Trạng thái mã phía client và việc giữ mã khi khách quay lại giỏ

- **Decision**: Lưu mã đã áp dụng (chỉ `AppliedCoupon`) trong localStorage key **mới**
  `COUPON_STORAGE_KEY = "shoplite:coupon"`, qua một store nhỏ `coupon-store.ts` theo mẫu
  `cart-store.ts` (`useSyncExternalStore`). Dữ liệu không hợp lệ → coi như chưa có mã. Khi mở
  trang thanh toán với mã đã lưu, client gọi lại `/api/coupons/validate` để làm mới. Đặt hàng
  thành công thì xóa mã cùng lúc với `clear()` giỏ.
- **Rationale**: Trang thanh toán không có nút sửa số lượng; khách xóa sản phẩm ở `/cart` rồi
  quay lại. Không lưu thì FR-013 ("tự áp dụng lại") không xảy ra được. Key riêng nên **không**
  đổi `CART_STORAGE_KEY` hay shape `CartState` (AGENTS.md mục 7).
- **Alternatives**: React state trong `CheckoutForm` — mất mã khi rời trang. Thêm field vào
  `CartState` — vi phạm ràng buộc dữ liệu giỏ cũ.

## R7. Đơn hàng cũ

- **Decision**: `Order` thêm `couponCode?: string` và `discount?: number` (tùy chọn). Đơn mới luôn
  ghi `discount` (0 nếu không mã); `couponCode` chỉ ghi khi có. Hiển thị dùng `order.discount ?? 0`;
  `total` đã lưu sẵn nên đơn cũ không cần migrate. `readAll` không đổi.
- **Rationale**: Không cần migration file JSON; đơn cũ hiển thị y như trước.
- **Alternatives**: Script migrate `orders.json` — rủi ro ghi dữ liệu thật, không cần thiết.

## R8. Thứ tự kiểm tra và chuẩn hóa mã

- **Decision**: `normalizeCouponCode = trim().toUpperCase()`; schema giới hạn 1–32 ký tự sau
  trim. Thứ tự: không tồn tại → hết hạn → chưa đạt tối thiểu (FR-009). Mã > 32 ký tự hoặc chỉ
  gồm khoảng trắng ở endpoint validate → `VALIDATION_ERROR` với field `code`; ở đơn hàng → lỗi
  field `couponCode`.
- **Discount**: phần trăm `Math.floor(subtotal * percent / 100)` rồi `min(maxDiscount)`; cố định
  `min(amount, subtotal)`.

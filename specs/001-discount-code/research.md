# Research: Mã giảm giá khi thanh toán

Không còn `NEEDS CLARIFICATION`. Các quyết định thiết kế:

## 1. Client xem trước mã bằng API, không import dữ liệu mã vào bundle
- **Decision**: thêm `POST /api/coupons/validate` nhận `{ couponCode, items }`, trả mức giảm; route chỉ gọi `orderService.previewCoupon`.
- **Rationale**: danh sách mã và quy tắc ở một nơi (server); mã khuyến mãi tương lai không lộ trong JS client; subtotal do server tính từ catalog nên cũng không tin giá client; xem trước và đặt hàng dùng chung một đường tính nên không lệch kết quả.
- **Alternatives**: gọi `evaluateCoupon` trực tiếp ở client (nhanh, không cần mạng, nhưng lộ toàn bộ mã và tin subtotal từ giỏ localStorage); Server Action (khác quy ước hiện tại dùng route handler).

## 2. Thứ tự tính và nơi đặt quy tắc
- **Decision**: `evaluateCoupon(code, subtotal, now)` (thuần, trong `coupons`) trả `{ ok, code, discountAmount }` hoặc `{ ok: false, reason, shortfall? }`. `calculateOrderTotals(lines, method, discount = 0)` giữ `subtotal`, tính `shippingFee` trên subtotal **trước giảm** (theo clarification), `discount = min(discount, subtotal)`, `total = subtotal - discount + shippingFee`.
- **Rationale**: giữ `pricing.ts` là nơi duy nhất cộng tiền (AGENTS.md); không có phụ thuộc vòng.
- **Alternatives**: để `pricing.ts` gọi `evaluateCoupon` (kéo dữ liệu mã vào pricing, khó test).

## 3. Quy tắc tính mức giảm
- Phần trăm: `floor(subtotal * percent / 100)`, rồi `min(…, maxDiscount)`, rồi `min(…, subtotal)`. Cố định: `min(amount, subtotal)`. Kết quả luôn nguyên đồng, không âm.
- **Thứ tự báo lỗi** khi nhiều lý do cùng đúng: không tồn tại → hết hạn → chưa đạt tối thiểu (mỗi lần chỉ báo một lý do, đúng spec FR-008).
- Điều kiện tối thiểu xét `subtotal >= minOrderValue` (đúng bằng thì hợp lệ). Shortfall = `minOrderValue - subtotal`.

## 4. Hết hạn
- **Decision**: lưu `expiresOn: "YYYY-MM-DD"`; mã hết hạn từ 00:00 ngày kế tiếp (UTC+7), tức còn dùng được đến 23:59:59.999 của `expiresOn`. `now` được tiêm vào để test xác định.
- **Rationale**: tránh lệch múi giờ giữa server và khách; không phụ thuộc thư viện ngày.

## 5. Chuẩn hóa mã nhập
- `trim().toUpperCase()` trong `normalizeCouponCode`; Zod giới hạn độ dài (≤ 32), chuỗi rỗng coi như không có mã.

## 6. Mã lỗi và HTTP
- Thêm vào `OrderErrorCode`: `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_ORDER_NOT_MET`, cùng map `HTTP_STATUS_BY_CODE` = 422 (giống `PRODUCT_NOT_FOUND`: dữ liệu hợp lệ về cú pháp nhưng không xử lý được). Thông báo tiếng Việt; lỗi tối thiểu có `details.shortfall` (chuỗi số đồng) và số tiền định dạng bằng `formatCurrency` trong message.
- Mã chưa nhập khi bấm "Áp dụng" được chặn ở client (message tiếng Việt từ Zod), không cần mã lỗi server.

## 7. Lưu trữ và tương thích đơn cũ
- `Order.discount?: { code: string; amount: number }` là trường tùy chọn. `order-repository` đọc JSON thô nên không cần migration; UI chỉ hiển thị dòng giảm giá khi `discount` tồn tại; `total` đã bao gồm giảm giá nên đơn cũ không đổi.
- Giá trị đã lưu không tính lại khi mã đổi (FR-012).

## 8. Hiển thị chi tiết đơn
- Tách khối tổng tiền thành `order-totals.tsx` để test được trường hợp có/không có `discount` mà không phải render cả trang server.

## 9. Hành vi form khi đặt hàng bị từ chối vì mã
- **Decision**: khi `POST /api/orders` trả `COUPON_NOT_FOUND`, `COUPON_EXPIRED` hoặc `COUPON_MIN_ORDER_NOT_MET`, `checkout-form` xóa mã đã áp dụng khỏi state, hiển thị `error.message` (tiếng Việt, dùng `role="alert"`), giữ nguyên mọi giá trị đã nhập và không gửi lại đơn. Trạng thái nút trở về `idle`.
- **Rationale**: theo clarification 2026-11-08; giao diện luôn khớp với những gì server chấp nhận, tránh vòng lặp bấm đặt lại cùng một lỗi.
- **Alternatives**: giữ mã và chỉ báo lỗi (tổng tiền hiển thị lệch server); tự đặt lại không mã (khách không kiểm soát được thay đổi tổng tiền).

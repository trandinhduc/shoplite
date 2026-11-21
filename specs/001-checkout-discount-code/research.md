# Research: Mã giảm giá khi thanh toán

**Feature**: `001-checkout-discount-code` | **Date**: 2026-11-08 | **Plan**: [plan.md](./plan.md)

Technical Context không còn mục NEEDS CLARIFICATION (stack đã được người dùng chỉ định). Tài liệu
này ghi lại các quyết định thiết kế cần chốt trước Phase 1.

## R1. Client kiểm tra mã bằng cách nào

- **Decision**: Thêm route `GET /api/coupons/[code]`. Server chuẩn hóa mã và tra trong
  `src/data/coupons.ts`:
  - tìm thấy: trả định nghĩa của **đúng mã đó**, kể cả khi đã hết hạn;
  - không tìm thấy: trả 404 `COUPON_NOT_FOUND`.

  Client giữ định nghĩa này rồi tự tính số tiền giảm bằng hàm thuần `evaluateCoupon` (dùng chung
  với server), mỗi khi giỏ hàng thay đổi.

- **Rationale**:
  - Danh sách mã không bị đóng gói vào bundle JS. Nếu client import thẳng `src/data/coupons.ts`,
    ai mở DevTools cũng thấy mọi mã khuyến mãi.
  - Sau khi áp dụng, client chỉ cần gọi API một lần. FR-014 (tính lại khi giỏ đổi, tự có hiệu lực
    lại khi đủ tối thiểu) chạy hoàn toàn ở client, nên phản hồi tức thì (SC-001).
  - Logic tính tiền chỉ nằm ở một nơi (Nguyên tắc III). Server vẫn tính lại khi đặt hàng.
- **Alternatives considered**:
  - _Client import trực tiếp dữ liệu mã_: đơn giản nhất nhưng lộ toàn bộ mã. Loại.
  - _`POST /api/coupons/validate` với `{ code, items }`, trả số tiền giảm_: phải gọi lại API mỗi
    lần giỏ đổi. Logic hiển thị phụ thuộc mạng, phức tạp hơn mà không an toàn hơn (đằng nào server
    cũng tính lại khi đặt hàng). Loại.

## R2. Tách logic thuần khỏi dữ liệu mã

- **Decision**: Chia `src/features/coupons/` thành hai file:
  - `coupon-rules.ts`: hàm thuần, không import dữ liệu (`normalizeCouponCode`, `getCouponDeadline`,
    `calculateCouponDiscount`, `evaluateCoupon`, `getCouponErrorMessage`). Client và server đều
    dùng được.
  - `coupon-service.ts`: `findCoupon(code)`, import `src/data/coupons.ts`. Chỉ code server dùng
    (route handler, `order-service`).
- **Rationale**: File client import không được kéo theo dữ liệu mã (lý do ở R1). Cách tách này
  giống hiện có: `pricing.ts` thuần, còn `catalog-service.ts` đọc `src/data/`.
- **Alternatives considered**: Một file duy nhất. Loại vì client import nó sẽ kéo theo cả dữ liệu.

## R3. Tích hợp vào `pricing.ts`

- **Decision**: `calculateOrderTotals(lines, method, discount = 0)` trả
  `{ subtotal, discount, shippingFee, total }`:
  - `shippingFee = calculateShippingFee(subtotal, method)`, tính trên tạm tính **trước** giảm
    (FR-013);
  - `discount` được kẹp trong `[0, subtotal]`;
  - `total = subtotal − discount + shippingFee`.

  `pricing.ts` không biết gì về mã. Phần quy tắc mã nằm ở `coupon-rules.ts`, nó tính ra số tiền
  rồi truyền vào.

- **Rationale**:
  - Tham số mặc định `0` giữ tương thích với mọi chỗ đang gọi (`checkout-summary.tsx`,
    `order-service.ts`, test).
  - Công thức tổng tiền vẫn chỉ nằm ở một nơi.
- **Alternatives considered**: Cho `calculateOrderTotals` nhận `Coupon`. Loại vì `checkout` sẽ phụ
  thuộc ngược vào `coupons`, và hai feature sẽ phụ thuộc vòng (`coupons` cần `subtotal` từ
  `pricing`).

## R4. Hạn dùng và múi giờ

- **Decision**: Dữ liệu lưu `expiresOn: "2026-02-28"` (ngày, không có giờ). Hạn chót
  `getCouponDeadline` = `new Date("2026-02-28T23:59:59.999+07:00")`. Mã hết hạn khi
  `now > deadline`. Mọi hàm nhận `now: Date` làm tham số để test được giá trị biên.
- **Rationale**: Spec quy định hết hạn theo giờ Việt Nam, dùng được hết ngày ghi trên mã. Offset
  `+07:00` cố định vì Việt Nam không có giờ mùa hè. Không cần thêm thư viện, kể cả `dayjs` đang có
  trong `package.json`.
- **Alternatives considered**: Lưu timestamp ISO đầy đủ. Loại vì dữ liệu khó đọc và dễ nhập sai
  giờ.

## R5. Lưu mã đã áp dụng phía client (FR-019)

- **Decision**: Mở rộng `CartState` thành `{ items, couponCode?: string }`. `cartReducer` có thêm
  action `apply-coupon` và `remove-coupon`. Mã bị bỏ khi:
  - `clear` (sau khi đặt hàng thành công);
  - giỏ trở nên trống sau `remove` hoặc `update-quantity`.

  Store chỉ lưu **chuỗi mã**. Định nghĩa mã được lấy lại qua R1 mỗi khi trang thanh toán mở.
  `isCartState` chấp nhận `couponCode` có hoặc không, nên giỏ cũ trong `localStorage` vẫn đọc được.

- **Rationale**:
  - Mã "đi cùng giỏ" đúng như FR-019, tự có đồng bộ giữa các tab và persist sẵn (tận dụng
    `cart-store.ts`).
  - Chỉ lưu mã nên dữ liệu bị sửa trong `localStorage` cũng vô hại.
- **Alternatives considered**:
  - _Một key localStorage riêng trong feature `coupons`_: phải viết thêm store, đồng bộ tab và xử
    lý "giỏ trống thì bỏ mã" qua hai store. Loại.
  - _Lưu cả định nghĩa mã_: dữ liệu cũ và hết hạn nằm lại ở client. Loại.

## R6. Server xử lý mã khi đặt hàng và mã lỗi API

- **Decision**:
  - `placeOrderSchema` thêm `couponCode: z.string().trim().max(32).optional()`.
  - Trong `placeOrder`, sau khi tính `subtotal` từ catalog: `findCoupon` → `evaluateCoupon(coupon,
subtotal, now())`.
  - Nếu kết quả không hợp lệ: ném `OrderError("INVALID_COUPON", message, { couponCode: message,
reason })` với HTTP **422**.
  - Mọi trường tiền khác trong body (như `discount`, `total`) không có trong schema nên bị Zod loại
    bỏ.
- **Rationale**:
  - Một mã lỗi duy nhất, còn `details.reason` (`not_found | expired | below_minimum`) cho client
    biết lý do. `details.couponCode` theo đúng quy ước key của `toFieldErrors`, nên form gắn lỗi
    vào ô mã (FR-012).
  - Chọn 422 vì đồng nhất với `PRODUCT_NOT_FOUND`: dữ liệu đúng cú pháp nhưng không xử lý được.
- **Alternatives considered**: Ba mã lỗi riêng (`COUPON_NOT_FOUND`, `COUPON_EXPIRED`,
  `COUPON_MINIMUM_NOT_MET`). Loại vì làm phình `OrderErrorCode` mà client vẫn chỉ cần message.

## R7. Tương thích đơn hàng cũ

- **Decision**: `Order` thêm `couponCode?: string` và `discount?: number`, cả hai **optional**.
  - Đơn không dùng mã thì không ghi hai trường này.
  - Trang chi tiết hiện dòng giảm giá khi `order.couponCode && order.discount`.
  - `order.total` đã lưu sẵn, không tính lại.
- **Rationale**: Đơn cũ trong `storage/orders.json` không cần migration (FR-016, SC-005).
- **Alternatives considered**: Migration ghi `discount: 0` cho đơn cũ. Loại vì không cần thiết và
  phải đụng vào dữ liệu thật.

## R8. Trạng thái lỗi do server trả về

- **Decision**: Khi `POST /api/orders` trả `INVALID_COUPON`, form lưu `serverCouponError` (message
  từ server). Lỗi này ghi đè kết quả đánh giá phía client cho tới khi khách gỡ mã. Khi
  `serverCouponError` còn đó hoặc kết quả client không hợp lệ: nút "Đặt hàng" bị vô hiệu hóa và
  không trừ tiền.
- **Rationale**: Đồng hồ client có thể lệch so với server. Server là nguồn sự thật (FR-012).
- **Alternatives considered**: Tự gỡ mã khi server báo lỗi. Loại vì trái với câu trả lời Q1
  (Option B).

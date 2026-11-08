# Research: Mã giảm giá khi thanh toán

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-08

Technical Context không còn mục NEEDS CLARIFICATION. Các quyết định bên dưới chốt những điểm thiết kế
mà spec và input của `/speckit-plan` để ngỏ.

## R1. Công thức tiền giảm nằm ở đâu

- **Decision**: Hàm tính tiền giảm (`calculateCouponDiscount`) và việc cộng giảm giá vào tổng
  (`calculateOrderTotals`) nằm trong `src/features/checkout/pricing.ts`. `src/features/coupons/`
  chứa kiểu dữ liệu, chuẩn hóa mã, tra mã và kiểm tra điều kiện (tồn tại, hạn dùng, đơn tối thiểu).
- **Rationale**: Constitution III ghi "Mọi quy tắc tính tiền MUST nằm trong `pricing.ts`". Input của
  `/speckit-plan` đề xuất đặt "tính tiền giảm" trong `features/coupons/` và tích hợp vào `pricing.ts`.
  Cách tách này thỏa cả hai: coupons gọi `pricing.ts`, không nhân bản công thức.
- **Alternatives considered**: Đặt công thức trong `coupons/` rồi `pricing.ts` import lại. Bị loại vì
  công thức tiền sẽ nằm ngoài `pricing.ts`, trái nguyên văn constitution III.

## R2. Client kiểm tra mã bằng cách nào

- **Decision**: Thêm endpoint `POST /api/coupons/validate`. Body nhận `{ code, items: [{ productId, quantity }] }`.
  Server tự tính tạm tính từ catalog, kiểm tra mã, rồi trả về quy tắc của mã đó và số tiền giảm.
  Client dùng quy tắc này để hiển thị tóm tắt bằng `pricing.ts` dùng chung. Mỗi lần giỏ đổi, client
  gọi lại endpoint (R9).
- **Rationale**:
  - Nếu client import thẳng `src/data/coupons.ts` thì toàn bộ danh sách mã (kể cả mã chưa công bố)
    lọt vào bundle JavaScript, ai mở DevTools cũng thấy.
  - Gửi `items` thay vì `subtotal` tuân thủ constitution III: không nhận số tiền từ client, kể cả cho
    bước xem trước.
- **Alternatives considered**:
  - (a) Đánh giá mã hoàn toàn phía client từ dữ liệu tĩnh: nhanh nhất nhưng lộ danh sách mã.
  - (b) Endpoint nhận `subtotal`: đơn giản hơn nhưng tin số tiền từ client.

## R3. Mã lỗi mới và cách báo lỗi

- **Decision**: Tiếp tục dùng `OrderError`, thêm 3 mã vào `OrderErrorCode` và `HTTP_STATUS_BY_CODE`:
  `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_ORDER_NOT_MET`, đều trả **422**, giống
  `PRODUCT_NOT_FOUND` (body hợp lệ về cú pháp nhưng sai về nghiệp vụ). Với `COUPON_MIN_ORDER_NOT_MET`,
  `details` gồm `{ minOrderValue, missingAmount }` dạng chuỗi số, còn `message` đã định dạng sẵn bằng `formatCurrency`.
- **Rationale**: `handleRouteError` chỉ nhận `OrderError`. Constitution III yêu cầu thêm mã mới vào cả
  union lẫn bảng HTTP status. Đây là thay đổi nhỏ nhất (nguyên tắc IV).
- **Alternatives considered**: Tạo `CouponError` riêng và mở rộng `handleRouteError`. Tách biệt hơn
  nhưng thêm một lớp lỗi và một nhánh xử lý mà chưa cần.

## R4. Mã hết hạn lúc đặt hàng (Clarification Q1, FR-015a)

- **Decision**:
  - `placeOrder` vẫn tạo đơn với `discount = 0` và không lưu `couponCode`.
  - Response 201 trả về đơn kèm trường tạm `couponNotice: { code: "COUPON_EXPIRED", couponCode }`.
    Trường này không được lưu vào storage.
  - Client chuyển tới `/orders/{id}?placed=1&couponExpired={CODE}`.
  - Trang chi tiết đơn (Server Component) gọi `getExpiredCouponNotice(rawCode, order.subtotal, now)` trong
    `features/coupons`. Hàm tự validate `rawCode` bằng `couponCodeSchema`, chỉ trả thông báo khi mã
    **thật sự đã hết hạn tại `now`**, và tính `lostDiscount` trên tạm tính của đơn (tiền giảm mà mã lẽ ra mang lại).
- **Rationale**: Spec yêu cầu đơn không lưu mã. Tham số URL là input không tin cậy (constitution III), nên
  phải được validate bằng Zod. Hàm cũng kiểm tra mã đã hết hạn thật; nếu không, ai cũng có thể thêm
  `?couponExpired=SHOPLITE10` vào một đơn để hiện thông báo "hết hạn" giả kèm số tiền giả. Số tiền luôn do
  server tính.
- **Alternatives considered**:
  - Lưu `rejectedCoupon` vào đơn: trái FR-015a ("đơn không lưu mã").
  - Đổi kiểu trả về của `placeOrder` thành `{ order, couponNotice }`: phải sửa mọi test và caller hiện có.

## R5. Tương thích ngược với đơn cũ

- **Decision**: Trong `Order` thêm `couponCode?: string` và `discount?: number` (đều optional).
  Mọi chỗ hiển thị coi `discount ?? 0`. Dòng giảm giá chỉ hiện khi `couponCode` có giá trị và `discount > 0`.
  Không cần migration vì `total` của đơn cũ đã đúng.
- **Rationale**: `storage/orders.json` có thể chứa đơn tạo trước tính năng (FR-017). Repository đọc JSON
  không qua schema, nên trường thiếu chỉ là `undefined`.
- **Alternatives considered**: Bắt buộc `discount: number` kèm migrate file. Phải viết thêm migration
  cho một file học tập, không đáng.

## R6. Hạn dùng và múi giờ

- **Decision**: Lưu `expiresOn: "YYYY-MM-DD"`. Mã hết hạn khi
  `now >= new Date(\`${expiresOn}T00:00:00+07:00\`) + 1 ngày`, tức hết hạn từ 00:00 ngày kế tiếp giờ Việt Nam. `now` được inject để test tất định.
- **Rationale**: Khớp FR-007. Vì offset `+07:00` ghi tường minh, kết quả không phụ thuộc múi giờ của máy chủ hay CI.
- **Alternatives considered**: So sánh chuỗi ngày theo giờ máy chủ: sai khi server chạy UTC.

## R7. Làm tròn, chặn trên, phí giao hàng

- **Decision**:
  - Mã phần trăm: `Math.floor(subtotal * percent / 100)`, rồi lấy `min` với `maxDiscount`.
  - Mã cố định: `min(amount, subtotal)`.
  - Với `subtotal <= 0`, tiền giảm bằng 0.
  - `calculateShippingFee` vẫn nhận tạm tính **trước** giảm giá.
  - `total = subtotal - discount + shippingFee`.
- **Rationale**: Theo FR-009, FR-010, FR-011. Quy tắc phí ship trong constitution giữ nguyên.

## R8. Chuẩn hóa và validate mã đầu vào

- **Decision**: Zod: `couponCode: z.string().trim().toUpperCase().max(32).optional()`. Chuỗi rỗng sau
  `trim` được coi là không gửi mã. Riêng ô nhập phía client báo "Vui lòng nhập mã giảm giá" khi rỗng (FR-013).
  `placeOrderSchema` dùng `z.object` nên bỏ mọi khóa lạ như `discount` hay `total` do client gửi.
  Giá trị không phải chuỗi hoặc dài hơn 32 ký tự bị từ chối (400). Khoảng trắng ở giữa hay ký tự lạ
  không bị sửa nên mã đó rơi vào "không tồn tại" (FR-013). `toUpperCase()` không phụ thuộc ngôn ngữ thiết bị.
- **Rationale**: Theo FR-013 và FR-014. Cùng một schema dùng cho cả client và server (constitution III).

## R9. Giữ mã khi khách đi qua lại giữa giỏ hàng và thanh toán (Clarification Q2 = C, FR-018, FR-020)

- **Decision**:
  - `CartState` thêm `couponCode?: string`. `CartAction` thêm `apply-coupon` (`code`) và `remove-coupon`.
    `clear` xóa luôn mã. `useCart()` trả thêm `couponCode`, `applyCoupon`, `removeCoupon`.
  - Chỉ lưu **chuỗi mã**, không lưu quy tắc hay số tiền. Mã nằm cùng key `shoplite:cart`.
  - Khi trang thanh toán mount, và mỗi khi `items` đổi (kể cả đồng bộ từ tab khác), nếu đang có
    `couponCode` thì client gọi lại `POST /api/coupons/validate`:
    - 200: lấy quy tắc trả về và tính tóm tắt bằng `calculateOrderTotals(lines, method, rule)`.
    - 422 `COUPON_*`: dispatch `remove-coupon` và hiện thông báo `role="status"` với `error.message`
      (đã có lý do và số tiền cần mua thêm).
  - Mã đã gỡ không tự áp dụng lại.
- **Rationale**:
  - Constitution V cấm component đọc localStorage trực tiếp, nên mã phải đi qua `cartStore`/`useCart`.
    Đây cũng là chỗ đã có sẵn đồng bộ giữa các tab.
  - Lưu chỉ mã và luôn hỏi lại server thì mã hết hạn trong lúc nằm ở localStorage cũng bị phát hiện,
    và client không cần giữ hạn dùng hay danh sách mã.
  - `isCartState` chỉ kiểm `items`, nên dữ liệu giỏ cũ (không có `couponCode`) vẫn đọc được.
    Mã có kiểu sai bị bỏ qua.
- **Alternatives considered**:
  - (A) Không giữ mã: bị loại theo lựa chọn của người dùng.
  - (B) Giữ mã và tự áp dụng lại khi đạt lại điều kiện: bị loại theo lựa chọn của người dùng.
  - Lưu mã vào `sessionStorage` riêng trong component: trái constitution V và mất đồng bộ giữa các tab.
  - Lưu cả quy tắc để đánh giá offline: lộ dữ liệu mã và bỏ sót trường hợp mã hết hạn.

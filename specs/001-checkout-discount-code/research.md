# Research: Mã giảm giá khi thanh toán

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-08

Technical Context không còn mục `NEEDS CLARIFICATION`. Stack đã do người dùng chốt (Next.js 16,
TypeScript strict, Zod 4, Tailwind v4, Vitest, Playwright, không thêm dependency/database). Các mục
dưới đây ghi lại những quyết định thiết kế còn mở và lý do.

## R1. Client kiểm tra mã bằng cách nào mà không lộ danh sách mã?

- **Decision**: Thêm Route Handler `POST /api/coupons/validate` nhận `{ code, items }`. Server tra mã
  trong `src/data/coupons.ts`, tự tính tạm tính từ catalog, kiểm tra cả 3 điều kiện rồi trả về
  **quy tắc của đúng mã đó** (`CouponRule`) cùng `subtotal` và `discount`. Client giữ quy tắc này để
  tính lại số tiền giảm ngay tại chỗ khi giỏ hàng thay đổi (FR-017), không cần gọi lại API.
- **Rationale**: Nếu Client Component import thẳng `src/data/coupons.ts`, toàn bộ mã khuyến mãi (kể
  cả mã chưa công bố) sẽ nằm trong JS bundle gửi cho trình duyệt. Endpoint chỉ trả quy tắc của mã
  khách đã biết. Trả về quy tắc giúp tính lại tức thời và tự kích hoạt lại khi tạm tính đạt mức tối
  thiểu (Clarification Q2) mà không cần thêm request.
- **Alternatives considered**:
  - Client import `data/coupons.ts` và tự kiểm tra: đơn giản nhất nhưng lộ mã → loại.
  - Endpoint chỉ trả `{ discount }`, client gọi lại mỗi khi giỏ đổi: nhiều request, phải xử lý race
    và debounce → phức tạp hơn mà không thêm an toàn (server vẫn tính lại lúc đặt hàng).
  - `GET /api/coupons/[code]`: không kiểm tra được tối thiểu nếu không gửi giỏ hàng; lỗi "không tồn
    tại" là 404 trong khi các lỗi khác là 422 → mô hình lỗi không đồng nhất.

## R2. Biểu diễn ngày hết hạn và múi giờ

- **Decision**: Lưu `expiresOn: "YYYY-MM-DD"` (ngày cuối cùng còn hiệu lực, **bao gồm** ngày đó,
  theo giờ Việt Nam). Mốc hết hạn = `new Date(\`${expiresOn}T00:00:00+07:00\`)`+ 1 ngày; mã hết hạn
khi`now >= mốc`. Việt Nam không có giờ mùa hè nên offset `+07:00` cố định là đúng.
- **Rationale**: Khớp cách marketing viết ("hết hạn ngày 28/02/2026") và FR-011; không cần thư viện
  múi giờ; so sánh hai `Date` là xác định, test được bằng `now` inject.
- **Alternatives considered**: Lưu `expiresAt` ISO đầy đủ (dễ viết sai biên 23:59:59); dùng `dayjs`
  timezone plugin (thêm cấu hình, không cần thiết).

## R3. Đặt logic tính tiền ở đâu và tích hợp `pricing.ts` thế nào

- **Decision**:
  - Logic thuần của mã (`normalizeCouponCode`, `getCouponExpiryCutoff`, `calculateCouponDiscount`,
    `evaluateCoupon`, `getCouponErrorMessage`) đặt ở `src/features/coupons/coupon-rules.ts`, **không**
    import dữ liệu mã → an toàn cho client.
  - Tra mã + chuyển lỗi thành `OrderError` + service cho endpoint validate đặt ở
    `src/features/coupons/coupon-service.ts` (import `src/data/coupons.ts`, chỉ dùng phía server).
  - `calculateOrderTotals(lines, method, discount = 0)` trong `pricing.ts` nhận thêm số tiền giảm,
    kẹp vào `[0, subtotal]`, trả `{ subtotal, discount, shippingFee, total }`. Phí ship vẫn tính trên
    `subtotal` trước giảm (FR-010).
- **Rationale**: Một nguồn sự thật cho tổng tiền dùng chung client/server (Constitution III).
  `pricing.ts` không cần biết về mã — chỉ nhận một con số đã được tính; tránh phụ thuộc vòng
  checkout ↔ coupons.
- **Alternatives considered**: Hàm mới `calculateOrderTotalsWithCoupon` (hai đường tính tổng song
  song, dễ lệch); để pricing tự tra mã (kéo dữ liệu mã vào client).

## R4. Làm tròn và giới hạn số tiền giảm

- **Decision**: Phần trăm: `Math.floor(subtotal * percent / 100)`, rồi `min(…, maxDiscount)`. Mọi
  loại: `min(discount, subtotal)`. Toàn bộ là số nguyên VND.
- **Rationale**: FR-007, FR-008. Giá trị lớn nhất (16 sản phẩm × 10 × ~8 triệu) còn rất xa
  `Number.MAX_SAFE_INTEGER`.

## R5. Mã lỗi API

- **Decision**: Thêm vào `OrderErrorCode` ba mã, đều HTTP **422** trong `HTTP_STATUS_BY_CODE`:
  `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_SUBTOTAL_NOT_MET`. Lỗi tối thiểu kèm
  `details: { minSubtotal, shortfall }` (chuỗi số, vì `details` là `Record<string, string>`).
  `message` là câu tiếng Việt hoàn chỉnh, client hiển thị trực tiếp.
- **Rationale**: Cùng mức với `PRODUCT_NOT_FOUND` (422 — yêu cầu đúng định dạng nhưng vi phạm quy
  tắc nghiệp vụ). Mã riêng cho từng lý do để client phân biệt lỗi "dính" (hết hạn, không tồn tại) với
  lỗi tự hồi phục (chưa đạt tối thiểu) theo Clarifications Q1/Q2. Dùng chung cho cả
  `/api/coupons/validate` và `/api/orders`.
- **Alternatives considered**: Một mã `INVALID_COUPON` + `details.reason` (client phải đọc details);
  404 cho mã không tồn tại (không đồng nhất giữa hai endpoint).

## R6. Chống gian lận khi đặt hàng

- **Decision**: `placeOrderSchema` thêm `couponCode` tùy chọn (chuỗi, trim, 1–32 ký tự). Zod
  `z.object` mặc định **bỏ** khóa lạ, nên `discount`/`total` do client tự khai bị loại trước khi vào
  service. `placeOrder` tra mã, `evaluateCoupon` với `now()` (cùng thời điểm làm `createdAt`) và
  subtotal tính từ catalog; lỗi → ném `OrderError`, không lưu đơn. Gửi mảng mã hay kiểu khác chuỗi →
  `VALIDATION_ERROR`.
- **Rationale**: FR-019 → FR-022, Constitution III. Không bao giờ tự bỏ mã (FR-021).

## R7. Trạng thái mã ở client (Clarifications Q1, Q2)

- **Decision**: State trong `CheckoutForm`: `appliedCoupon: { rule: CouponRule; lockedError?: string } | null`.
  Trạng thái hiển thị được **suy ra** mỗi lần render bằng hàm thuần `deriveCouponStatus`:
  - có `lockedError` → `error` (lỗi "dính": hết hạn / không tồn tại lúc đặt hàng) cho đến khi gỡ/thay mã;
  - ngược lại → `evaluateCoupon(rule, subtotal, now)`: hợp lệ → `active` + `discount`; chưa đạt tối
    thiểu → `error` kèm số tiền cần mua thêm, tự hết khi tạm tính đạt lại.
    Khi `POST /api/orders` trả `COUPON_EXPIRED` hoặc `COUPON_NOT_FOUND` → gán `lockedError`. Client luôn
    gửi `couponCode` nếu có mã đang áp dụng (kể cả ở trạng thái lỗi) để server từ chối theo FR-017a.
- **Rationale**: Suy ra thay vì lưu → không có state lệch khi giỏ hàng đổi qua tab khác
  (`useSyncExternalStore`). Hàm thuần test được không cần render.
- **Alternatives considered**: `useReducer` với action "cart-changed" (cần effect đồng bộ, dễ quên
  case); chặn submit ở client khi mã lỗi (vẫn cần server kiểm tra, nên chỉ thêm code).

## R8. Ô nhập mã nằm trong `<form>` đặt hàng

- **Decision**: Nút "Áp dụng" là `type="button"`; Enter trong ô mã gọi `preventDefault()` và kích
  hoạt "Áp dụng" thay vì submit đơn. Ô mã có `<label>`, `aria-invalid` + `aria-describedby` trỏ tới
  thông báo lỗi; vùng thông báo dùng `role="alert"` / `aria-live="polite"`.
- **Rationale**: Tránh đặt hàng ngoài ý muốn; Constitution V (label, aria-invalid, lỗi cạnh trường).

## R9. Đơn hàng cũ

- **Decision**: `Order` thêm `couponCode?: string` và `discount?: number` (tùy chọn). Đơn mới luôn
  có `discount` (0 nếu không dùng mã). Hiển thị dùng `order.discount ?? 0`; chỉ hiện dòng giảm giá khi
  `couponCode` có và `discount > 0`. `total` đã lưu sẵn nên danh sách đơn không cần đổi. Không viết
  migration cho `storage/orders.json`.
- **Rationale**: FR-025, SC-006; repository đọc JSON thô (`as Order[]`), trường thiếu là `undefined`.

## R10. Kiểm thử thời gian

- **Decision**: Unit/route test inject `now` (`createOrderService({ now })`,
  `createCouponService({ now })`) để test biên 23:59:59.999 / 00:00:00 ngày 01/03/2026 (+07:00). E2E
  dùng đồng hồ thật: `TET2026` luôn hết hạn kể từ 01/03/2026 nên ca "mã hết hạn" ổn định.
- **Rationale**: Constitution II (test xác định); không cần fake timer cho dev server.

## R11. Dò mã (brute-force)

- **Decision**: Ngoài phạm vi — không rate-limit. Ghi nhận rủi ro: endpoint validate cho phép thử mã.
- **Rationale**: Spec không yêu cầu; không có hạ tầng (database/cache) để đếm request; Constitution IV.

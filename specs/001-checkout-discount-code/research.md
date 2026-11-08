# Research: Mã giảm giá khi thanh toán

Mọi quyết định dưới đây dùng stack hiện có, không thêm dependency hay database (Nguyên tắc IV).
Không còn mục NEEDS CLARIFICATION nào trong Technical Context.

## R1. Client kiểm tra mã bằng cách nào (không lộ danh sách mã)

- **Decision**: Thêm `POST /api/coupons/validate` nhận `{ code }`. Server tra mã, kiểm tra hết hạn,
  trả về **quy tắc công khai của đúng mã đó** (`CouponRule`: loại, giá trị, mức giảm tối đa, giá trị
  tối thiểu, thời điểm hết hạn). Client dùng hàm thuần dùng chung `evaluateCoupon(rule, subtotal)`
  để tính số tiền giảm / trạng thái "chưa đủ điều kiện" và tính lại ngay khi giỏ thay đổi. Client
  không xét hết hạn: hết hạn chỉ do server xét bằng đồng hồ máy chủ (FR-021, xem R10).
- **Rationale**:
  - Không import `src/data/coupons.ts` vào client → toàn bộ danh sách mã không lọt vào JS bundle.
  - FR-017 yêu cầu tính lại tức thì khi giỏ thay đổi; có `rule` trong tay thì không cần gọi lại API
    mỗi lần đổi số lượng.
  - Con số trên client chỉ để hiển thị; `placeOrder` tự tính lại (Nguyên tắc III, FR-012).
- **Alternatives considered**:
  - Client import thẳng dữ liệu mã (giống `pricing.ts`): đơn giản nhất nhưng lộ mọi mã, kể cả mã
    chưa công bố → loại.
  - Endpoint nhận cả `items` và trả số tiền giảm: phải gọi lại API mỗi lần đổi giỏ, phức tạp hơn
    mà không an toàn hơn (server vẫn tính lại khi đặt hàng) → loại.
  - `GET /api/coupons/:code`: mã nằm trong URL/log; lỗi "chưa hợp lệ" trả 404/422 trên GET kém tự
    nhiên → chọn POST.

## R2. Tách logic thuần và dữ liệu

- **Decision**: `src/features/coupons/` gồm:
  - `coupon-rules.ts` — thuần, **client-safe**, không import dữ liệu: `normalizeCouponCode`,
    `calculateCouponDiscount`, `evaluateCoupon`, `isCouponExpired`.
  - `coupon-service.ts` — **chỉ server**: `findCouponByCode` (đọc `src/data/coupons.ts`),
    `validateCouponCode(code, now)` ném `OrderError`.
  - `components/coupon-field.tsx` — ô nhập + nút "Áp dụng"/"Gỡ mã" (client).
- **Rationale**: Giữ quy ước feature-based (Nguyên tắc I); tách được file nào an toàn cho client.
- **Alternatives**: Đặt tất cả trong `checkout/` → loại theo yêu cầu người dùng (feature riêng).

## R3. Tích hợp vào `pricing.ts`

- **Decision**: `calculateOrderTotals(lines, method, discount = 0)` trả thêm `discount`;
  `OrderTotals = { subtotal, discount, shippingFee, total }`. Phí ship vẫn tính trên `subtotal`
  trước giảm (FR-007). `discount` bị kẹp vào `[0, subtotal]`; `total = subtotal − discount +
  shippingFee`. `pricing.ts` không biết gì về mã — chỉ nhận số tiền giảm.
- **Rationale**: Thay đổi nhỏ, tương thích ngược (tham số mặc định 0) nên các nơi gọi cũ không vỡ.
- **Alternatives**: Truyền `CouponRule` vào `pricing.ts` → tạo phụ thuộc checkout → coupons không
  cần thiết.

## R4. Biểu diễn hết hạn

- **Decision**: Trường `expiresAt` là thời điểm ISO **loại trừ** kèm múi giờ, ví dụ `TET2026`:
  `"2026-03-01T00:00:00+07:00"`. Hết hạn khi `now >= expiresAt`.
- **Rationale**: Dùng được trọn ngày 28/02/2026 giờ Việt Nam; so sánh một phép, test biên dễ
  (`23:59:59.999` hợp lệ, `00:00:00` hết hạn). Không cần `dayjs`.
- **Alternatives**: Lưu `"2026-02-28"` rồi tự cộng ngày/múi giờ → dễ sai lệch UTC.

## R5. Làm tròn và kẹp số tiền giảm

- **Decision**: Phần trăm: `Math.floor(subtotal * percent / 100)`, sau đó `min(maxDiscount)`.
  Cố định: `amount`. Cuối cùng `min(subtotal)`. Mọi giá trị là số nguyên VND.
- **Rationale**: Khớp spec (làm tròn xuống đến đồng, không vượt tạm tính).

## R6. Mã lỗi và HTTP status

- **Decision**: Thêm vào `OrderErrorCode` + `HTTP_STATUS_BY_CODE` (constitution: lỗi nghiệp vụ dùng
  `OrderError`):
  - `COUPON_NOT_FOUND` → 422
  - `COUPON_EXPIRED` → 422
  - `COUPON_MIN_SUBTOTAL_NOT_MET` → 422 (message nêu giá trị tối thiểu và số tiền cần mua thêm)
  - `details: { couponCode: <message> }` để form hiển thị lỗi tại đúng trường (Nguyên tắc V).
- **Rationale**: 422 = dữ liệu hợp lệ về cú pháp nhưng không xử lý được; dùng chung cho cả
  `/api/coupons/validate` và `/api/orders`. Form phân biệt lỗi mã bằng tiền tố `COUPON_`.
- **Alternatives**: 404 cho mã không tồn tại → một code có một status duy nhất trong map, 404 trên
  POST validate gây hiểu nhầm là route không tồn tại.

## R7. Tương thích đơn cũ

- **Decision**: `Order` thêm `couponCode?: string` và `discount?: number` (optional). Đơn cũ không
  có trường → coi `discount = 0`, không hiển thị dòng giảm giá. Không migrate file JSON.
- **Rationale**: FR-016, SC-005; đọc file không qua schema nên trường thiếu là `undefined` an toàn.
- **Alternatives**: Bắt buộc `discount: number` và migrate `orders.json` → vi phạm "không ghi trực
  tiếp storage", thừa.

## R8. Chống gian lận trong payload đặt hàng

- **Decision**: `placeOrderSchema` thêm `couponCode: z.string().trim().max(32).optional()`. Mọi
  trường khác client gửi (`discount`, `total`, `subtotal`…) bị Zod bỏ (strip mặc định). Chuỗi rỗng
  = không dùng mã. Chuẩn hóa hoa/thường bằng `normalizeCouponCode` trong service.
- **Rationale**: FR-012, Nguyên tắc III; test route gửi `discount: 999999`, `total: 1` để chứng
  minh bị bỏ qua.

## R9. Thời gian trong test

- **Decision**: `createOrderService` đã nhận `now`; thêm `findCoupon` (mặc định `findCouponByCode`)
  để test cố định dữ liệu. `validateCouponCode(code, now)` nhận `now` tường minh; route truyền
  `new Date()`, test route dùng `vi.useFakeTimers()`/`vi.setSystemTime`.
- **Rationale**: Test hết hạn quyết định được, không phụ thuộc ngày chạy test.

## R10. Trạng thái mã trên trang thanh toán

- **Decision**: `CheckoutForm` giữ `appliedCoupon: CouponRule | null` trong state. Mỗi lần render
  gọi `evaluateCoupon(rule, subtotal)` →
  `{ status: "applied", discount } | { status: "below_minimum", minSubtotal, shortfall }`.
  Client **không** xét hết hạn (FR-021): đồng hồ máy khách có thể sai, nên hết hạn chỉ do server
  báo (validate hoặc đặt hàng). `below_minimum` → không giảm, hiển thị "cần mua thêm"; bấm
  "Đặt hàng" bị chặn với lỗi tại `couponCode` (FR-017a). Server trả lỗi `COUPON_*` → gỡ mã, hiển
  thị lý do, giữ form (FR-013). Mã không lưu vào giỏ/localStorage (Assumption của spec).
- **Alternatives**: Client tự xét hết hạn bằng `new Date()` → có thể gỡ nhầm mã khi máy khách sai
  giờ → loại.

## R11. Chặn import dữ liệu mã vào client bằng công cụ

- **Decision**: Thêm rule `no-restricted-imports` (có sẵn trong ESLint) vào `eslint.config.mjs`
  cho `src/**/*.tsx`: cấm `@/data/coupons` và `@/features/coupons/coupon-service`, kèm message
  tiếng Việt. Dùng `patterns` với `regex` (`(^|/)data/coupons$`, `(^|/)coupons/coupon-service$`)
  thay vì `paths`, vì `paths` chỉ khớp đúng chuỗi alias và để lọt import tương đối. Route handler (`.ts`) và service phía server không bị ảnh hưởng.
- **Rationale**: FR-020 thành quy tắc được `npm run check` (lint) kiểm tra, không chỉ dựa vào review.
  Không thêm dependency (Nguyên tắc IV).
- **Alternatives**: Package `server-only` → thêm dependency → loại. Chỉ ghi quy ước → dễ quên → loại.

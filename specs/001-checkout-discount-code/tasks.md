---
description: "Task list: Mã giảm giá khi thanh toán"
---

# Tasks: Mã giảm giá khi thanh toán

**Input**: Design documents from `specs/001-checkout-discount-code/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: BẮT BUỘC (constitution nguyên tắc II, NON-NEGOTIABLE). Trong mỗi phase, task test
đứng **trước** task cài đặt; chạy test thấy **fail** rồi mới cài đặt cho pass.

**Organization**: Theo user story. Thứ tự phase: US1 → US2 → US5 (cùng P1) → US3 → US4 (P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1…US5 theo spec.md
- Quy ước (AGENTS.md): import `@/`, file kebab-case, test cạnh file nguồn, text tiếng Việt có
  dấu, tiền qua `formatCurrency`, test không gọi `new Date()`/`crypto.randomUUID` (inject `now`).

---

## Phase 1: Setup

**Purpose**: Nhánh riêng và khung thư mục

- [ ] T001 Tạo nhánh riêng `git switch -c 001-checkout-discount-code` từ nhánh hiện tại (constitution: Quy trình phát triển) và chạy `npm run check` để có baseline xanh
- [ ] T002 Tạo thư mục `src/features/coupons/components/` và `src/app/api/coupons/validate/` (chưa có file)
- [ ] T003 Chạy `npm run check` — phải pass trước khi sang Phase 2

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Kiểu dữ liệu, dữ liệu mã, rule thuần, tính tiền có giảm giá, mã lỗi, schema — dùng
chung cho mọi story

**⚠️ CRITICAL**: Chưa xong phase này thì chưa làm user story nào

### Tests (viết trước, phải fail)

- [ ] T004 [P] Viết `src/features/coupons/coupon-rules.test.ts`: `normalizeCouponCode(" shoplite10 ") === "SHOPLITE10"`; `isCouponExpired` với `expiresOn: "2026-02-28"` → `false` tại `2026-02-28T23:59:59.999+07:00`, `true` tại `2026-03-01T00:00:00+07:00`, mã không có `expiresOn` → luôn `false`; `calculateCouponDiscount`: percent `Math.floor(subtotal * value / 100)` rồi `min(maxDiscount)` (SHOPLITE10: 400_000→40_000, 1_000_000→100_000, 1_000_010→100_000), fixed `min(value, subtotal)`; `evaluateCoupon` theo thứ tự `not_found` → `expired` → `min_subtotal_not_met` → `valid` (SHOPLITE10 299_999 → `{ status: "min_subtotal_not_met", minSubtotal: 300_000, shortfall: 1 }`, 300_000 → valid 30_000; GIAM50K 499_999 → shortfall 1, 500_000 → valid 50_000; TET2026 với `now = 2026-11-08` → `expired` dù subtotal bất kỳ). File này dùng `Coupon` giả, KHÔNG import `src/data/coupons.ts`
- [ ] T005 [P] Viết `src/features/coupons/coupon-catalog.test.ts`: `findCoupon(" shoplite10 ")` trả mã `SHOPLITE10`; `findCoupon("KHONGCO")` → `undefined`; mã dài hơn 32 ký tự → `undefined` (không ném lỗi); bất biến của mảng `coupons`: `code` đã chuẩn hóa và không trùng, "`maxDiscount` chỉ cho `percent`", "`percent`: 1–100; `fixed`: số đồng > 0", `expiresOn` đúng `YYYY-MM-DD`
- [ ] T006 [P] Bổ sung `src/features/checkout/pricing.test.ts`: `calculateOrderTotals(lines, method)` không truyền discount → `discount: 0`, tổng như cũ; truyền discount → `total = subtotal − discount + shippingFee`; discount > subtotal bị kẹp về subtotal, discount âm kẹp về 0; subtotal 520_000 + discount 52_000 + `standard` → `shippingFee: 0`, `total: 468_000` (miễn ship tính trên tiền hàng **trước** giảm); subtotal 499_999 → vẫn tính phí 30_000
- [ ] T007 [P] Bổ sung `src/features/checkout/checkout-schema.test.ts`: `placeOrderSchema` chấp nhận thiếu `couponCode`; `couponCode` được trim; chuỗi rỗng/chỉ khoảng trắng coi như không có mã; > 32 ký tự vẫn qua schema (không giới hạn độ dài ở schema; mã quá dài sẽ ra `COUPON_NOT_FOUND` ở service); `couponCode` sai kiểu (số, mảng) → lỗi field `couponCode`; trường lạ (`discount`, `total`) bị loại khỏi `parsed.data`
- [ ] T008 [P] Viết `src/features/orders/order-errors.test.ts`: `new OrderError("COUPON_NOT_FOUND" | "COUPON_EXPIRED" | "COUPON_MIN_SUBTOTAL_NOT_MET", …).httpStatus === 422`
- [ ] T009 [P] Viết `src/features/coupons/coupon-errors.test.ts`: `toCouponError` map `not_found` → `OrderError("COUPON_NOT_FOUND", "Mã giảm giá không tồn tại")`, `expired` → `("COUPON_EXPIRED", "Mã giảm giá đã hết hạn")`, `min_subtotal_not_met` → `("COUPON_MIN_SUBTOTAL_NOT_MET", "Đơn hàng chưa đạt tối thiểu 500.000 ₫ để dùng mã này. Hãy mua thêm 80.000 ₫.", { minSubtotal: "500000", shortfall: "80000" })` (tiền format bằng `formatCurrency`)

### Implementation

- [ ] T010 [P] Tạo `src/features/coupons/types.ts`: `Coupon { code; type: "percent" | "fixed"; value; maxDiscount?; minSubtotal?; expiresOn? }`, `AppliedCoupon = Coupon`, `CouponEvaluation` (union 4 trạng thái theo data-model.md)
- [ ] T011 Tạo `src/data/coupons.ts` (sau T010): mảng `coupons: Coupon[]` gồm `SHOPLITE10` (percent 10, maxDiscount 100_000, minSubtotal 300_000), `GIAM50K` (fixed 50_000, minSubtotal 500_000), `TET2026` (percent 15, maxDiscount 200_000, expiresOn "2026-02-28")
- [ ] T012 Cài đặt `src/features/coupons/coupon-rules.ts` (sau T010): `normalizeCouponCode`, `isCouponExpired(coupon, now)` so `now >= Date.parse("<ngày kế tiếp>T00:00:00+07:00")`, `calculateCouponDiscount`, `evaluateCoupon(coupon | undefined, subtotal, now)`; chỉ chứa hàm thuần, MUST NOT import `src/data/` và không import `pricing.ts` (file này được client import) → T004 pass
- [ ] T013 Tạo `src/features/coupons/coupon-catalog.ts` (sau T011, T012): `findCoupon(code, list = coupons)` chuẩn hóa mã bằng `normalizeCouponCode`, mã > 32 ký tự → `undefined`; import `src/data/coupons.ts`; chỉ được import từ `coupon-service.ts`, `order-service.ts` và test — MUST NOT import từ code `"use client"` → T005 pass
- [ ] T014 [P] Sửa `src/features/checkout/pricing.ts`: `OrderTotals` thêm `discount`; `calculateOrderTotals(lines, method, discount = 0)` kẹp discount về `[0, subtotal]`, `shippingFee = calculateShippingFee(subtotal, method)` (trước giảm), `total = subtotal − discount + shippingFee`; không import `coupons` → T006 pass
- [ ] T015 [P] Sửa `src/features/checkout/checkout-schema.ts`: `placeOrderSchema` thêm `couponCode` tùy chọn "trim; thiếu hoặc chuỗi rỗng = không dùng mã" (không `.max()` — độ dài do `findCoupon` xử lý) (preprocess chuỗi rỗng → `undefined`); KHÔNG thêm trường tiền → T007 pass
- [ ] T016 [P] Sửa `src/features/orders/order-errors.ts`: thêm `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_SUBTOTAL_NOT_MET` vào `OrderErrorCode` và `HTTP_STATUS_BY_CODE` (422) → T008 pass
- [ ] T017 Tạo `src/features/coupons/coupon-errors.ts` (sau T012, T016): `toCouponError(evaluation)` → T009 pass
- [ ] T018 [P] Sửa `src/features/orders/types.ts`: `Order` thêm `couponCode?: string` ("Mã chuẩn hóa; chỉ có khi đơn dùng mã") và `discount?: number` ("Đơn mới luôn ghi (0 nếu không mã); đơn cũ không có → 0")
- [ ] T019 Chạy `npm run check` — phải pass (test cũ của `pricing`, `checkout-summary` vẫn xanh nhờ tham số mặc định)

**Checkpoint**: Rule thuần và kiểu dữ liệu sẵn sàng

---

## Phase 3: User Story 1 - Áp dụng mã hợp lệ và đặt hàng với giá đã giảm (Priority: P1) 🎯 MVP

**Goal**: Khách nhập mã hợp lệ, thấy ngay số giảm và tổng mới; đặt hàng ra đơn có giảm giá do
server tính.

**Independent Test**: Giỏ 2 × "Chuột không dây SwiftClick" (900.000 ₫) → áp `SHOPLITE10` → thấy
giảm 90.000 ₫, tổng 810.000 ₫ → đặt hàng → đơn lưu `couponCode: "SHOPLITE10"`, `discount: 90000`.

### Tests for User Story 1 (viết trước, phải fail)

- [ ] T020 [P] [US1] Viết `src/features/coupons/coupon-service.test.ts` (happy path): `createCouponService({ findProduct, now: () => FIXED_DATE })`; `validateCoupon({ code: " shoplite10 ", items: [{ productId, quantity }] })` trả `{ coupon, subtotal, discount }` với subtotal tính từ giá catalog (bỏ qua mọi giá client gửi); 300_000 → discount 30_000
- [ ] T021 [P] [US1] Viết `src/app/api/coupons/validate/route.test.ts` (`// @vitest-environment node`, `vi.mock("@/features/coupons/server", …)`): POST hợp lệ → 200 đúng body contracts §1; body không phải JSON → 400 `VALIDATION_ERROR` "Body phải là JSON hợp lệ"
- [ ] T022 [P] [US1] Bổ sung `src/features/orders/order-service.test.ts`: `placeOrder` với `couponCode: "shoplite10"` và subtotal 400_000 → đơn có `couponCode: "SHOPLITE10"`, `discount: 40_000`, `total = 400_000 − 40_000 + 30_000`; subtotal 520_000 + SHOPLITE10 → `shippingFee: 0`, `total: 468_000`; không có mã → `discount: 0`, không có key `couponCode`; dùng `createInMemoryOrderRepository`, `FIXED_DATE`, ID tăng dần, inject `findCoupon`
- [ ] T023 [P] [US1] Viết `src/features/coupons/coupon-store.test.ts`: key `COUPON_STORAGE_KEY = "shoplite:coupon"`; `set`/`clear`/`getSnapshot`; dữ liệu localStorage hỏng hoặc sai shape → `null`; phát sự kiện cho subscriber; KHÔNG đụng `"shoplite:cart"`
- [ ] T024 [P] [US1] Viết `src/features/coupons/components/coupon-field.test.tsx`: có `<label>` "Mã giảm giá" gắn `coupon-input`; gõ mã + nhấn Enter gọi `fetch("/api/coupons/validate")` và KHÔNG submit form cha; nút `coupon-apply` là `type="button"`; 200 → hiển thị `applied-coupon` chứa "SHOPLITE10"
- [ ] T025 [US1] Bổ sung `src/features/checkout/components/checkout-form.test.tsx`: trong test này `cartStore.reset()` rồi thêm `p006` (Chuột không dây SwiftClick, 450.000 ₫) × 2 = 900.000 ₫ (không dùng giỏ `p010` × 2 của `beforeEach`); sau khi áp mã (mock fetch validate 200), tóm tắt có `checkout-discount` "−90.000 ₫" và `checkout-total` 810.000 ₫; submit gửi `couponCode: "SHOPLITE10"` và KHÔNG gửi `discount`/`total`; đặt hàng thành công → giỏ rỗng và `coupon-store` rỗng

### Implementation for User Story 1

- [ ] T026 [P] [US1] Tạo `src/features/coupons/coupon-schema.ts`: `validateCouponSchema = z.object({ code: z.string().trim().min(1, "Vui lòng nhập mã giảm giá"), items: <cùng ràng buộc placeOrderSchema.items> })`
- [ ] T027 [US1] Tạo `src/features/coupons/coupon-service.ts` (sau T026): `createCouponService({ findProduct = getProductById, now = () => new Date(), findCoupon = <từ coupon-catalog> })` với `validateCoupon(input: unknown)` — `safeParse` → `VALIDATION_ERROR` + `toFieldErrors`; tính subtotal từ catalog (`PRODUCT_NOT_FOUND` nếu thiếu, không kiểm tồn kho); `evaluateCoupon`; valid → `{ coupon, subtotal, discount }` → T020 pass
- [ ] T028 [US1] Tạo `src/features/coupons/server.ts`: `export const couponService = createCouponService({})` (chỉ import từ route/server)
- [ ] T029 [US1] Tạo `src/app/api/coupons/validate/route.ts`: `POST` mỏng — `readJsonBody` → `couponService.validateCoupon` → `NextResponse.json(200)`; lỗi qua `handleRouteError`/`jsonError` → T021 pass
- [ ] T030 [US1] Sửa `src/features/orders/order-service.ts`: thêm dep `findCoupon` (mặc định từ `coupon-catalog`); sau bước sản phẩm/tồn kho, nếu có `couponCode` thì `evaluateCoupon(findCoupon(code), subtotal, createdAt)`, valid → `calculateOrderTotals(orderItems, shippingMethod, discount)` và lưu `couponCode` chuẩn hóa + `discount`; không mã → `discount: 0` → T022 pass (nhánh lỗi làm ở US5)
- [ ] T031 [P] [US1] Tạo `src/features/coupons/coupon-store.ts` (theo mẫu `src/features/cart/cart-store.ts`): `COUPON_STORAGE_KEY`, đọc/ghi an toàn, `subscribe`/`getSnapshot`/`set`/`clear`/`reset` (reset chỉ cho test) → T023 pass
- [ ] T032 [US1] Tạo `src/features/coupons/use-applied-coupon.ts` (`"use client"`, sau T031): `useSyncExternalStore` với `coupon-store`; `apply(code, items)` gọi `POST /api/coupons/validate`, 200 → `set(coupon)`; trả `{ coupon, evaluation, discount, apply, remove, pending, error }` với `evaluation = evaluateCoupon(coupon, subtotal, new Date())`
- [ ] T033 [P] [US1] Sửa `src/features/checkout/components/checkout-summary.tsx`: nhận prop `discount` (mặc định 0) và `couponCode?`; truyền vào `calculateOrderTotals`; hiển thị dòng "Giảm giá (MÃ)" `−formatCurrency(discount)` với `data-testid="checkout-discount"` chỉ khi `discount > 0`; giữ nguyên `shipping-fee`, `checkout-total`
- [ ] T034 [US1] Tạo `src/features/coupons/components/coupon-field.tsx` (`"use client"`, sau T032): label "Mã giảm giá", input `coupon-input` (Enter → `preventDefault` + apply), nút "Áp dụng" `coupon-apply` `type="button"`, khối `applied-coupon`; không lồng `<form>` → T024 pass
- [ ] T035 [US1] Sửa `src/features/checkout/components/checkout-form.tsx` (sau T033, T034): gắn `CouponField` cạnh `CheckoutSummary`, truyền `discount`; khi submit gửi `couponCode` nếu mã đang `valid`; thành công → `clear()` giỏ + `remove()` mã → T025 pass
- [ ] T036 [US1] Cập nhật `e2e/shopping-flow.spec.ts`: thêm test "khách hàng áp dụng mã SHOPLITE10 và đặt hàng với giá đã giảm" — thêm 2 × "Chuột không dây SwiftClick" (900.000 ₫) → thanh toán → điền `coupon-input` "shoplite10" → `coupon-apply` → `checkout-discount` chứa "90.000", `shipping-fee` "Miễn phí", `checkout-total` chứa "810.000" → điền thông tin khách → "Đặt hàng" → URL `/orders/SL-…?placed=1`; giữ nguyên 2 test hiện có
- [ ] T037 [US1] Chạy `npm run check` và `npm run test:e2e` — phải pass

**Checkpoint**: MVP — áp mã hợp lệ và đặt hàng có giảm giá

---

## Phase 4: User Story 2 - Thông báo rõ lý do khi mã không hợp lệ (Priority: P1)

**Goal**: Mã không tồn tại / hết hạn / chưa đạt tối thiểu → thông báo tiếng Việt đúng lý do,
gắn với ô nhập mã, tổng không đổi.

**Independent Test**: Nhập `KHONGCO`, `TET2026`, `GIAM50K` (giỏ 420.000 ₫) → lần lượt thấy 3
thông báo, lỗi thứ ba báo cần mua thêm 80.000 ₫.

### Tests for User Story 2 (viết trước, phải fail)

- [ ] T038 [P] [US2] Bổ sung `src/features/coupons/coupon-service.test.ts`: `KHONGCO` → `COUPON_NOT_FOUND`; `TET2026` với `now` sau 2026-02-28 → `COUPON_EXPIRED`; `GIAM50K` subtotal 420_000 → `COUPON_MIN_SUBTOTAL_NOT_MET` details `{ minSubtotal: "500000", shortfall: "80000" }`; 499_999 → shortfall "1"; code rỗng/khoảng trắng → `VALIDATION_ERROR` field `code`; code 33 ký tự → `COUPON_NOT_FOUND` (không phải `VALIDATION_ERROR`); `productId` không tồn tại → `PRODUCT_NOT_FOUND`
- [ ] T039 [P] [US2] Bổ sung `src/app/api/coupons/validate/route.test.ts`: mỗi lỗi trên → đúng HTTP (422/400) và body `{ error: { code, message, details } }` như contracts §1
- [ ] T040 [P] [US2] Bổ sung `src/features/coupons/components/coupon-field.test.tsx`: 422 → `error-couponCode` hiển thị `error.message`, input có `aria-invalid="true"` và `aria-describedby` trỏ tới lỗi, tổng không đổi; ô trống + "Áp dụng" → "Vui lòng nhập mã giảm giá", KHÔNG gọi fetch; lỗi mạng → "Không kết nối được máy chủ, vui lòng thử lại."

### Implementation for User Story 2

- [ ] T041 [US2] Sửa `src/features/coupons/coupon-service.ts`: evaluation không `valid` → `throw toCouponError(evaluation)` → T038, T039 pass
- [ ] T042 [US2] Sửa `src/features/coupons/use-applied-coupon.ts` và `src/features/coupons/components/coupon-field.tsx`: lưu `error` từ body lỗi, hiển thị ở `error-couponCode` với `aria-describedby`; kiểm tra rỗng phía client trước khi gọi API; giữ mã cũ khi lỗi → T040 pass
- [ ] T043 [US2] Chạy `npm run check` — phải pass

**Checkpoint**: US1 + US2 hoạt động độc lập

---

## Phase 5: User Story 5 - Chống gian lận: hệ thống tự xác nhận lại khi đặt hàng (Priority: P1)

**Goal**: Server bỏ qua mọi số tiền client gửi, kiểm lại mã lúc đặt; mã không còn hợp lệ → từ
chối, không lưu đơn; client tự gỡ mã và hiển thị tổng chưa giảm (FR-015).

**Independent Test**: Gửi `POST /api/orders` kèm `discount: 999999, total: 1` → đơn lưu số server
tính; gửi `TET2026` → 422 `COUPON_EXPIRED`, không có đơn nào được lưu.

### Tests for User Story 5 (viết trước, phải fail)

- [ ] T044 [P] [US5] Bổ sung `src/features/orders/order-service.test.ts`: payload kèm `discount: 999_999`, `total: 1`, `subtotal: 0` → đơn lưu `discount`/`total` do server tính; `GIAM50K` với subtotal thực 420_000 → `COUPON_MIN_SUBTOTAL_NOT_MET` và `repository.findAll()` rỗng; `now` = `2026-03-01T00:00:00+07:00` + `TET2026` → `COUPON_EXPIRED`, không lưu; `now` = `2026-02-28T23:59:59+07:00` → hợp lệ; `KHONGCO` → `COUPON_NOT_FOUND`; lỗi tồn kho vẫn được báo trước lỗi mã (thứ tự: schema → sản phẩm/tồn kho → mã)
- [ ] T045 [P] [US5] Bổ sung `src/app/api/orders/route.test.ts`: POST với mã hết hạn → 422 `COUPON_EXPIRED`, body đúng contracts §2; POST với `couponCode` hợp lệ → 201 có `discount`, `couponCode`
- [ ] T046 [P] [US5] Bổ sung `src/features/checkout/components/checkout-form.test.tsx`: mock `POST /api/orders` trả 422 `COUPON_EXPIRED` → `role="alert"` và `error-couponCode` hiển thị "Mã giảm giá đã hết hạn", `applied-coupon` biến mất, `checkout-discount` biến mất, `checkout-total` về tổng chưa giảm, `push` không được gọi; bấm "Đặt hàng" lần nữa → body KHÔNG có `couponCode`

### Implementation for User Story 5

- [ ] T047 [US5] Sửa `src/features/orders/order-service.ts`: evaluation không `valid` → `throw toCouponError(evaluation)` trước `repository.save` → T044, T045 pass
- [ ] T048 [US5] Sửa `src/features/checkout/components/checkout-form.tsx`: response lỗi có `error.code` bắt đầu bằng `COUPON_` → `remove()` mã, đặt `submitError` và lỗi ở `error-couponCode`, `status` về `"idle"` → T046 pass
- [ ] T049 [US5] Chạy `npm run check` — phải pass

**Checkpoint**: Mọi story P1 xong

---

## Phase 6: User Story 3 - Gỡ mã, đổi mã và giữ đúng một mã mỗi đơn (Priority: P2)

**Goal**: Gỡ mã, thay mã, giữ mã cũ khi mã mới lỗi; trạng thái "chưa đủ điều kiện" khi giỏ dưới
ngưỡng và tự áp dụng lại khi đạt (FR-011–FR-013).

**Independent Test**: Áp `GIAM50K` với giỏ 600.000 ₫ → về `/cart` giảm còn 450.000 ₫ → quay lại:
`coupon-ineligible` báo cần mua thêm 50.000 ₫; tăng lại ≥ 500.000 ₫ → tự giảm 50.000 ₫.

### Tests for User Story 3 (viết trước, phải fail)

- [ ] T050 [P] [US3] Bổ sung `src/features/coupons/components/coupon-field.test.tsx`: `coupon-remove` → mã bị gỡ, `checkout-discount` biến mất; áp `SHOPLITE10` rồi `GIAM50K` (giỏ 600_000) → chỉ còn `GIAM50K`; áp mã mới bị 422 → mã cũ vẫn ở `applied-coupon`
- [ ] T051 [P] [US3] Bổ sung `src/features/checkout/components/checkout-form.test.tsx`: `coupon-store` có `GIAM50K`, giỏ 450_000 → hiển thị `coupon-ineligible` chứa "50.000", không có `checkout-discount`; `cartStore.dispatch` tăng giỏ lên ≥ 500_000 → `checkout-discount` "−50.000 ₫" xuất hiện mà không gọi lại fetch; ở trạng thái ineligible bấm "Đặt hàng" → body KHÔNG có `couponCode`; mở trang với mã đã lưu → gọi lại `/api/coupons/validate` một lần để làm mới: `COUPON_EXPIRED` hoặc `COUPON_NOT_FOUND` → gỡ mã + hiển thị lý do; mở trang với `GIAM50K` đã lưu, giỏ 450_000, server trả `COUPON_MIN_SUBTOTAL_NOT_MET` → mã KHÔNG bị gỡ, không hiển thị `error-couponCode`, vẫn hiển thị `coupon-ineligible`

### Implementation for User Story 3

- [ ] T052 [US3] Sửa `src/features/coupons/use-applied-coupon.ts`: `apply` thành công thay thế mã cũ, lỗi giữ mã cũ; `remove()`; khi mount mà store có mã → gọi validate lại một lần: `COUPON_NOT_FOUND`/`COUPON_EXPIRED` → `remove()` + `error`; `COUPON_MIN_SUBTOTAL_NOT_MET` → giữ mã, không đặt `error` (trạng thái `ineligible` do `evaluateCoupon` ở client quyết định, FR-013)
- [ ] T053 [US3] Sửa `src/features/coupons/components/coupon-field.tsx`: nút "Gỡ mã" `coupon-remove`; khi `evaluation.status === "min_subtotal_not_met"` hiển thị `coupon-ineligible` "Mã chưa đủ điều kiện: đơn tối thiểu {formatCurrency(minSubtotal)}, mua thêm {formatCurrency(shortfall)}" → T050 pass
- [ ] T054 [US3] Sửa `src/features/checkout/components/checkout-form.tsx`: chỉ gửi `couponCode` khi `evaluation.status === "valid"`; `discount` truyền cho `CheckoutSummary` = 0 khi ineligible → T051 pass
- [ ] T055 [US3] Chạy `npm run check` — phải pass

---

## Phase 7: User Story 4 - Xem mã và số tiền giảm trong chi tiết đơn hàng (Priority: P2)

**Goal**: Trang chi tiết đơn hiển thị mã và số giảm; đơn cũ không có trường giảm giá vẫn đúng.

**Independent Test**: Mở đơn có `GIAM50K` → dòng "Giảm giá (GIAM50K)" −50.000 ₫; mở đơn cũ
(không có `discount`/`couponCode`) → không có dòng giảm giá, tổng như đã lưu.

### Tests for User Story 4 (viết trước, phải fail)

- [ ] T056 [P] [US4] Viết `src/features/orders/components/order-totals.test.tsx`: đơn có `discount: 50_000, couponCode: "GIAM50K"` → `order-discount` chứa "GIAM50K" và "−50.000 ₫"; đơn cũ không có hai trường → không có `order-discount`, "Tạm tính"/"Phí giao hàng"/"Tổng cộng" đúng giá trị đã lưu; `discount: 0` → không có dòng giảm giá
- [ ] T057 [P] [US4] Bổ sung `src/features/orders/order-repository.test.ts` (`// @vitest-environment node`, thư mục tạm `mkdtemp`): file JSON chứa đơn cũ không có `discount`/`couponCode` đọc ra nguyên vẹn, không lỗi

### Implementation for User Story 4

- [ ] T058 [US4] Tạo `src/features/orders/components/order-totals.tsx` (Server Component, không `"use client"`): nhận `order`, `const discount = order.discount ?? 0`, hiển thị Tạm tính / Giảm giá (chỉ khi `discount > 0`, `data-testid="order-discount"`) / Phí giao hàng / Tổng cộng bằng `formatCurrency` → T056 pass
- [ ] T059 [US4] Sửa `src/app/orders/[id]/page.tsx`: thay khối `<dl>` tổng tiền bằng `<OrderTotals order={order} />`; page giữ mỏng
- [ ] T060 [US4] Bổ sung kịch bản SHOPLITE10 trong `e2e/shopping-flow.spec.ts` (từ T036): trên trang chi tiết đơn, `order-discount` chứa "SHOPLITE10" và "90.000", tổng chứa "810.000"
- [ ] T061 [US4] Chạy `npm run check` và `npm run test:e2e` — phải pass

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T062 [P] Cập nhật `AGENTS.md`: codemap (mục 3) thêm hàng "Mã giảm giá" (`src/features/coupons/`, `src/data/coupons.ts`, `api/coupons/validate`), luồng đặt hàng có bước kiểm mã; quy tắc nghiệp vụ (mục 5): một mã mỗi đơn, giảm trên tiền hàng, làm tròn xuống, miễn ship tính trước giảm, hết hạn theo giờ VN, mã không hợp lệ lúc đặt → 422 + không lưu; `data-testid` mới (mục 6); key `"shoplite:coupon"` (mục 1)
- [ ] T063 [P] Rà `specs/001-checkout-discount-code/checklists/security.md` cùng người review; mục nào dẫn tới thay đổi yêu cầu thì sửa spec trước (ưu tiên CHK015 mâu thuẫn "mã quá dài": spec Edge Cases ↔ contracts §1)
- [ ] T064 Chạy các kịch bản curl và kiểm tra thủ công trong `specs/001-checkout-discount-code/quickstart.md` với `ORDERS_FILE` trỏ tới file tạm (không ghi `storage/orders.json`)
- [ ] T065 Chạy `npm run format:check` (sửa bằng `npm run format` nếu fail)
- [ ] T066 Chạy `npm run check` và `npm run test:e2e` — phải pass trước khi mở PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)** → **Foundational (P2)** → chặn mọi user story
- **US1 (Phase 3)**: sau Foundational. Tạo service, route, store, `CouponField`, tích hợp form — nền cho các story UI còn lại
- **US2 (Phase 4)**: sau US1 (mở rộng `coupon-service`, `coupon-field`)
- **US5 (Phase 5)**: sau Foundational cho phần server (T044, T045, T047 chỉ cần T030); phần client (T046, T048) cần US1
- **US3 (Phase 6)**: sau US1 (và nên sau US2 vì dùng chung hiển thị lỗi)
- **US4 (Phase 7)**: phần server-side (T056–T059) chỉ cần Foundational (T018) — làm song song được với US1; T060 cần T036
- **Polish**: sau mọi story mong muốn

### Within Each Story

Test viết trước và fail → schema/types → service → route → hook/store → component → tích hợp
form → `npm run check`.

### Parallel Opportunities

- Foundational: T004–T009 song song; sau đó T010, T014, T015, T016, T018 song song
- US1: T020–T024 song song; T026, T031, T033 song song
- US2: T038–T040 song song
- US5: T044–T046 song song
- US4: T056, T057 song song; cả phase có thể chạy song song với US1–US3 (khác file)

## Parallel Example: User Story 1

```bash
# Test viết trước (song song):
T020 src/features/coupons/coupon-service.test.ts
T021 src/app/api/coupons/validate/route.test.ts
T022 src/features/orders/order-service.test.ts
T023 src/features/coupons/coupon-store.test.ts
T024 src/features/coupons/components/coupon-field.test.tsx

# Cài đặt độc lập (song song):
T026 src/features/coupons/coupon-schema.ts
T031 src/features/coupons/coupon-store.ts
T033 src/features/checkout/components/checkout-summary.tsx
```

## Implementation Strategy

### MVP First (US1)

1. Phase 1 → Phase 2 → Phase 3
2. **Dừng và kiểm tra**: `npm run check`, `npm run test:e2e`, kịch bản SHOPLITE10
3. Demo được: áp mã hợp lệ, đặt đơn có giảm giá do server tính

### Incremental Delivery

1. - US2 → thông báo lỗi rõ ràng (đủ cho marketing chạy chương trình)
2. - US5 → chống gian lận đầy đủ (bắt buộc trước khi phát hành thật)
3. - US3 → gỡ/đổi mã, trạng thái "chưa đủ điều kiện"
4. - US4 → hiển thị trong chi tiết đơn
5. Polish → AGENTS.md, checklist bảo mật, format, E2E

## Notes

- Mỗi phase kết thúc bằng `npm run check`; phase đổi luồng mua hàng chạy thêm `npm run test:e2e`
- Test ghi file dùng `mkdtemp(path.join(tmpdir(), …))`, không ghi `storage/`
- Không import `node:fs`, `features/*/server.ts`, `order-repository.ts` trong code `"use client"`
- Commit sau mỗi task hoặc nhóm task logic; không commit `storage/orders.json`
- E2E: dùng `e2e/shopping-flow.spec.ts` theo yêu cầu (plan.md đã cập nhật, bỏ `e2e/coupon-flow.spec.ts`)

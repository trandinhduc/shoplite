---
description: "Task list cho tính năng mã giảm giá khi thanh toán"
---

# Tasks: Mã giảm giá khi thanh toán

**Input**: Design documents from `/specs/001-checkout-coupon/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Bắt buộc theo TDD (yêu cầu của người dùng + constitution nguyên tắc II). Trong mỗi phase, task
viết test đứng trước task cài đặt; test MUST chạy và fail trước khi viết code.

**Organization**: Mỗi user story một phase; task cuối của mỗi phase là `npm run check`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: User story trong spec.md (US1-US4)
- Mọi đường dẫn tính từ gốc repo; test đặt cạnh file (`*.test.ts(x)`), route/service test có
  `// @vitest-environment node` ở dòng đầu, không gọi mạng thật (`vi.stubGlobal("fetch", ...)`).

---

## Phase 1: Setup

**Purpose**: Xác nhận baseline và chốt contract trước khi viết test

- [X] T001 Bổ sung `specs/001-checkout-coupon/contracts/api.md`: response 200 của `POST /api/coupons/validate` trả `coupon` gồm `code`, `type`, `value`, `maxDiscount?`, `minOrderValue?`, `expiresOn?` (client cần `expiresOn` để tự kiểm tra hết hạn, research R7); body lỗi mẫu cho 3 mã lỗi coupon với `details` là số nguyên chưa định dạng dạng chuỗi (`"minOrderValue": "500000"`, `"amountNeeded": "50000"`); `400 VALIDATION_ERROR` với `details.code = "Vui lòng nhập mã giảm giá"` khi mã rỗng/chỉ khoảng trắng, `details.code` khi dài hơn 32 ký tự hoặc không phải chuỗi; thứ tự kiểm tra: body/schema → sản phẩm & tồn kho → mã (không tồn tại → hết hạn → chưa đạt tối thiểu)
- [X] T002 Chạy `npm run check` để xác nhận baseline xanh trước khi sửa code

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Quy tắc mã, dữ liệu mã, tính tiền có giảm giá, schema, mã lỗi, kiểu Order - mọi user story đều cần

**⚠️ CRITICAL**: Chưa xong phase này thì chưa làm user story nào

### Tests (viết trước, phải fail)

- [X] T003 [P] Viết `src/features/coupons/coupon-rules.test.ts`: `normalizeCouponCode(" giam50k ")` → `"GIAM50K"` (quy tắc `input.trim().toUpperCase()`); `calculateCouponDiscount`: percent = `min(round(subtotal * value / 100), maxDiscount)`, fixed = `value`, rồi kẹp `min(discount, subtotal)` - gồm SHOPLITE10 với 300.000 → 30.000, 999.990 → 99.999 (dưới mức tối đa), 1.000.000 → 100.000 (bằng), 1.500.000 → 100.000 (trên, không phải 150.000), GIAM50K với 30.000 → 30.000; `isCouponExpired` với `expiresOn: "2026-02-28"`: `2026-02-28T23:59:59.999+07:00` → chưa hết hạn, `2026-03-01T00:00:00+07:00` → hết hạn; `checkCouponEligibility`: 299.999 với SHOPLITE10 → `{ ok: false, reason: "min-order-not-met", minOrderValue: 300000, amountNeeded: 1 }`, 300.000 → `{ ok: true, discount: 30000 }`, 300.001 → `{ ok: true, discount: 30000 }`, mã vừa hết hạn vừa chưa đủ tối thiểu → `reason: "expired"` (hết hạn kiểm tra trước)
- [X] T004 [P] Mở rộng `src/features/checkout/pricing.test.ts` cho `calculateOrderTotals(lines, method, discount)`: không truyền `discount` → kết quả như cũ và `discount: 0`; tạm tính 500.000, giảm 50.000, `standard` → `shippingFee` 30.000, `total` 480.000; tạm tính 560.000, giảm 50.000 → `shippingFee` 0, `total` 510.000; biên tạm tính sau giảm 499.999 (tính phí) / 500.000 / 500.001 (miễn phí); `discount` lớn hơn tạm tính → kẹp bằng tạm tính, `total` không âm; `discount` âm → coi như 0; `express` vẫn 60.000
- [X] T005 [P] Mở rộng `src/features/checkout/checkout-schema.test.ts`: `placeOrderSchema` nhận `couponCode: z.string().trim().max(32).optional()` (thiếu, `""`, `" SHOPLITE10 "` hợp lệ; 33 ký tự và số `123` bị từ chối với key lỗi `couponCode`); `couponValidationSchema` mới gồm `code` (trim, 1-32 ký tự, rỗng → "Vui lòng nhập mã giảm giá") và `items` giống hệt `placeOrderSchema.shape.items`
- [X] T006 [P] Viết `src/features/coupons/coupon-service.test.ts` (`// @vitest-environment node`): `validateCoupon(code, subtotal, now)` trả `{ coupon, discount }` khi hợp lệ; ném `OrderError` `COUPON_NOT_FOUND` với message `Mã giảm giá "KHONGCO" không tồn tại`, `COUPON_EXPIRED` với `Mã giảm giá "TET2026" đã hết hạn`, `COUPON_MIN_ORDER_NOT_MET` với `details` `{ minOrderValue: "500000", amountNeeded: "50000" }` cho GIAM50K + 450.000; `httpStatus` của cả 3 là 422; mã được chuẩn hóa trước khi tra

### Implementation

- [X] T007 [P] Tạo `src/features/coupons/coupon-rules.ts`: kiểu `Coupon` (`code: string` viết hoa; `type: "percent" | "fixed"`; `value: number` - percent 1-100, fixed > 0; `maxDiscount?: number` chỉ với percent; `minOrderValue?: number` so sánh `subtotal >= minOrderValue`; `expiresOn?: string` dạng `YYYY-MM-DD`), kiểu `AppliedCoupon { code, rule }`, và các hàm thuần `normalizeCouponCode`, `isCouponExpired` (`now > new Date(\`${expiresOn}T23:59:59.999+07:00\`)`), `calculateCouponDiscount`, `checkCouponEligibility`; file MUST NOT import `src/data/coupons.ts` (dùng chung client/server)
- [X] T008 [P] Tạo `src/data/coupons.ts`: `SHOPLITE10` (percent, 10, `maxDiscount` 100_000, `minOrderValue` 300_000), `GIAM50K` (fixed, 50_000, `minOrderValue` 500_000), `TET2026` (percent, 15, `maxDiscount` 200_000, `expiresOn: "2026-02-28"`)
- [X] T009 Sửa `src/features/checkout/pricing.ts`: `OrderTotals` thêm `discount`; `calculateOrderTotals(lines, method, discount = 0)` kẹp `discount` trong `[0, subtotal]`, `shippingFee = calculateShippingFee(subtotal - discount, method)`, `total = subtotal - discount + shippingFee` (FR-005, FR-017)
- [X] T010 [P] Sửa `src/features/checkout/checkout-schema.ts`: thêm `couponCode` vào `placeOrderSchema` và export `couponValidationSchema` như mô tả ở T005
- [X] T011 [P] Sửa `src/features/orders/order-errors.ts`: thêm `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_ORDER_NOT_MET` vào `OrderErrorCode`, cả 3 map 422 trong `HTTP_STATUS_BY_CODE`
- [X] T012 [P] Sửa `src/features/orders/types.ts`: `Order` thêm `couponCode?: string` và `discount?: number` (tùy chọn để đơn cũ trong `storage/orders.json` vẫn hợp lệ)
- [X] T013 Tạo `src/features/coupons/coupon-service.ts` (chỉ import từ server): tra mã trong `src/data/coupons.ts` sau `normalizeCouponCode`, gọi `checkCouponEligibility`, ném `OrderError` như T006; message tiền dùng `formatCurrency`
- [X] T014 Chạy `npm run check` (T003-T006 phải pass)

**Checkpoint**: Quy tắc mã + tính tiền có giảm giá sẵn sàng; chưa có thay đổi giao diện

---

## Phase 3: User Story 1 - Áp dụng mã giảm giá hợp lệ khi thanh toán (Priority: P1) 🎯 MVP

**Goal**: Khách nhập mã hợp lệ, thấy ngay giảm giá/phí ship/tổng mới; đặt hàng với tổng đã giảm do server tính

**Independent Test**: 2 × `p010` (300.000 ₫) → thanh toán → `SHOPLITE10` → giảm 30.000 ₫, ship 30.000 ₫, tổng 300.000 ₫ → đặt hàng → đơn có `discount: 30000`, `couponCode: "SHOPLITE10"`

### Tests for User Story 1 (viết trước, phải fail)

- [X] T015 [P] [US1] Viết `src/app/api/coupons/validate/route.test.ts` (`// @vitest-environment node`): `POST` `{ code: " giam50k ", items: [{ productId: "p006", quantity: 2 }] }` → 200 `{ coupon: { code: "GIAM50K", type: "fixed", value: 50000, minOrderValue: 500000 }, subtotal: 900000, discount: 50000 }`; response chỉ chứa quy tắc của mã đã gửi (không có mã khác); body không phải JSON → 400 `VALIDATION_ERROR`
- [X] T016 [P] [US1] Mở rộng `src/features/orders/order-service.test.ts`: `placeOrder` với `couponCode: "shoplite10"` + `p010` × 2 → `discount` 30.000, `shippingFee` 30.000, `total` 300.000, `couponCode: "SHOPLITE10"`; không có `couponCode` → `discount: 0`, không có `couponCode`; input kèm `discount: 999999`, `total: 0` bị bỏ qua
- [X] T017 [P] [US1] Mở rộng `src/app/api/orders/route.test.ts`: `POST` có `couponCode: "SHOPLITE10"` → 201 với `discount` và `couponCode` trong body
- [X] T018 [P] [US1] Viết `src/features/coupons/coupon-store.test.ts` theo mẫu `src/features/cart/cart-store.test.ts`: lưu/đọc/xóa `AppliedCoupon` ở key `shoplite:coupon`; JSON hỏng hoặc sai kiểu → `null`; `getServerSnapshot()` → `null`; sự kiện `storage` đồng bộ giữa tab
- [X] T019 [P] [US1] Viết `src/features/coupons/components/coupon-field.test.tsx`: có ô với label "Mã giảm giá" và nút "Áp dụng" (`type="button"`); nhấn Enter trong ô không submit form cha; stub `fetch` trả 200 → mã được lưu vào `couponStore` và hiển thị mã đã áp dụng; khi đang chờ, nút bị vô hiệu hóa và hiện "Đang kiểm tra…"
- [X] T020 [US1] Mở rộng `src/features/checkout/components/checkout-form.test.tsx`: giỏ `p010` × 2 + `couponStore` có SHOPLITE10 → tóm tắt có dòng "Giảm giá" `-30.000 ₫`, `checkout-total` 300.000 ₫; submit gửi `couponCode: "SHOPLITE10"` trong body `POST /api/orders`; đặt hàng thành công → `couponStore` rỗng

### Implementation for User Story 1

- [X] T021 [US1] Tạo `src/app/api/coupons/validate/route.ts`: `readJsonBody` → `couponValidationSchema.safeParse` (lỗi → 400 `VALIDATION_ERROR` + `toFieldErrors`) → tính tạm tính bằng `getProductById` + `calculateSubtotal` (không thấy sản phẩm → `PRODUCT_NOT_FOUND`) → `validateCoupon(code, subtotal, new Date())` → 200 `{ coupon, subtotal, discount }`; mọi lỗi qua `handleRouteError`
- [X] T022 [US1] Sửa `src/features/orders/order-service.ts`: sau khi dựng `orderItems`, nếu `couponCode` khác rỗng thì `validateCoupon(couponCode, calculateSubtotal(orderItems), now())`; truyền `discount` vào `calculateOrderTotals(orderItems, shippingMethod, discount)`; lưu `couponCode` (đã chuẩn hóa) và `discount` vào `Order`
- [X] T023 [P] [US1] Tạo `src/features/coupons/coupon-store.ts` theo pattern `src/features/cart/cart-store.ts` (key `shoplite:coupon`, `getSnapshot`, `getServerSnapshot`, `subscribe`, `set`, `clear`, `reset` cho test)
- [X] T024 [US1] Tạo `src/features/coupons/use-applied-coupon.ts`: `useAppliedCoupon(items: CartItem[], subtotal: number)` dùng `useSyncExternalStore(couponStore...)`, trả `{ applied: AppliedCoupon | null, discount, status: "idle" | "checking", error: string | null, notice: string | null, apply(code), remove() }`; `apply` gọi `POST /api/coupons/validate` với `items` (`productId`, `quantity`), thành công thì `couponStore.set({ code, rule })`; `discount = applied ? calculateCouponDiscount(applied.rule, subtotal) : 0`
- [X] T025 [US1] Tạo `src/features/coupons/components/coupon-field.tsx` (`"use client"`): props `{ applied, status, error, notice, onApply(code), onRemove() }` (lấy từ kết quả `useAppliedCoupon`); ô nhập có label, nút "Áp dụng" `type="button"`, Enter gọi `onApply` và `preventDefault`, trạng thái "Đang kiểm tra…"
- [X] T026 [US1] Sửa `src/features/checkout/components/checkout-summary.tsx`: nhận thêm prop `coupon` (kết quả `useAppliedCoupon`), render `<CouponField>` với các trường của `coupon`, dòng "Giảm giá (CODE)" `-{formatCurrency(discount)}` khi `discount > 0`, tổng tính bằng `calculateOrderTotals(..., discount)`
- [X] T027 [US1] Sửa `src/features/checkout/components/checkout-form.tsx`: gọi `useAppliedCoupon(items, subtotal)` (trước các nhánh return sớm), truyền `coupon` cho `CheckoutSummary`, thêm `couponCode` vào body `POST /api/orders`, gọi `couponStore.clear()` khi đặt hàng thành công
- [X] T028 [US1] Chạy `npm run check`

**Checkpoint**: Áp mã hợp lệ và đặt hàng có giảm giá hoạt động; đây là MVP

---

## Phase 4: User Story 2 - Biết rõ lý do khi mã không dùng được (Priority: P2)

**Goal**: Báo đúng lý do (không tồn tại / hết hạn / chưa đủ tối thiểu + số tiền cần mua thêm / ô trống); tự gỡ mã khi không còn hợp lệ (FR-011, FR-016, FR-018)

**Independent Test**: `KHONGCO`, `TET2026`, `GIAM50K` với 1 × `p006` (450.000 ₫) lần lượt báo đúng lý do, tổng không đổi; giảm giỏ dưới tối thiểu thì mã tự gỡ

### Tests for User Story 2 (viết trước, phải fail)

- [X] T029 [P] [US2] Mở rộng `src/app/api/coupons/validate/route.test.ts`: `KHONGCO` → 422 `COUPON_NOT_FOUND`; `TET2026` → 422 `COUPON_EXPIRED`; `GIAM50K` + 1 × `p006` → 422 `COUPON_MIN_ORDER_NOT_MET` với `details` `{ minOrderValue: "500000", amountNeeded: "50000" }`; `code: "   "` → 400 với `details.code` "Vui lòng nhập mã giảm giá"; `code` 33 ký tự hoặc `123` → 400; `productId` không tồn tại → 422 `PRODUCT_NOT_FOUND`
- [X] T030 [P] [US2] Mở rộng `src/features/orders/order-service.test.ts`: mỗi mã lỗi coupon → `placeOrder` ném đúng `OrderError` và `repository.findAll()` vẫn rỗng (SC-004); `TET2026` với `now` = `2026-02-28T16:59:59.999Z` được chấp nhận, `2026-02-28T17:00:00.000Z` bị từ chối (hết hạn theo giờ server, `+07:00`)
- [X] T031 [P] [US2] Mở rộng `src/features/coupons/components/coupon-field.test.tsx`: lỗi hiện dưới ô với `role="alert"`, nối bằng `aria-describedby`; lỗi chưa đủ tối thiểu hiện "500.000 ₫" và "50.000 ₫"; ô trống → "Vui lòng nhập mã giảm giá" và không gọi `fetch`
- [X] T032 [US2] Mở rộng `src/features/checkout/components/checkout-form.test.tsx`: FR-016 - đã áp SHOPLITE10 với `p010` × 2, `cartStore.dispatch` giảm còn 1 → mã tự gỡ, hiện "mua thêm 150.000 ₫"; tăng lại 2 → mã không tự áp lại; FR-018 - `couponStore` có sẵn mã khi mở trang → gọi `POST /api/coupons/validate` đúng 1 lần, trả 422 → mã bị gỡ kèm lý do; FR-011 - `POST /api/orders` trả 422 `COUPON_EXPIRED` → không chuyển trang, mã bị gỡ, hiện lý do, tổng cập nhật

### Implementation for User Story 2

- [X] T033 [US2] Sửa `src/features/coupons/components/coupon-field.tsx`: hiện lỗi/thông báo dưới ô (`role="alert"`, `aria-describedby`), chặn gửi khi ô trống
- [X] T034 [US2] Sửa `src/features/coupons/use-applied-coupon.ts`: mỗi lần render chạy `checkCouponEligibility(rule, subtotal, new Date())`, không đạt thì `couponStore.clear()` và đặt `notice` (giá trị tối thiểu + số tiền cần mua thêm); lần hiển thị đầu gọi lại `POST /api/coupons/validate` một lần nếu có mã đã lưu
- [X] T035 [US2] Sửa `src/features/checkout/components/checkout-form.tsx`: khi `POST /api/orders` trả `error.code` bắt đầu bằng `COUPON_`, gọi `couponStore.clear()`, hiện `error.message`, giữ `status` "idle"
- [X] T036 [US2] Chạy `npm run check`

**Checkpoint**: US1 + US2 hoạt động độc lập

---

## Phase 5: User Story 3 - Gỡ hoặc thay mã đã áp dụng (Priority: P3)

**Goal**: Gỡ mã về tổng gốc; áp mã mới thay mã cũ (FR-008, FR-009)

**Independent Test**: Áp SHOPLITE10 → "Gỡ mã" → tổng về như cũ; áp lại rồi áp GIAM50K (tạm tính 600.000 ₫) → chỉ còn GIAM50K, giảm 50.000 ₫

### Tests for User Story 3 (viết trước, phải fail)

- [X] T037 [P] [US3] Mở rộng `src/features/coupons/components/coupon-field.test.tsx`: nút "Gỡ mã" xóa `couponStore`, dòng "Giảm giá" biến mất; áp mã thứ hai thay mã thứ nhất
- [X] T038 [P] [US3] Mở rộng `src/features/coupons/coupon-store.test.ts`: `set` lần hai ghi đè mã cũ, luôn chỉ lưu tối đa một mã

### Implementation for User Story 3

- [X] T039 [US3] Sửa `src/features/coupons/components/coupon-field.tsx`: khi đã có mã, hiện mã + nút "Gỡ mã" (`type="button"`) và vẫn cho nhập mã khác để thay
- [X] T040 [US3] Chạy `npm run check`

---

## Phase 6: User Story 4 - Xem mã đã dùng trong chi tiết đơn hàng (Priority: P3)

**Goal**: Trang chi tiết đơn hiện "Giảm giá (CODE)" và số tiền giảm; đơn cũ hiển thị như trước (FR-012)

**Independent Test**: Đơn có GIAM50K hiện dòng giảm giá `-50.000 ₫`; đơn cũ trong `storage/orders.json` không có dòng giảm giá, tổng không đổi

### Tests for User Story 4 (viết trước, phải fail)

- [X] T041 [P] [US4] Viết `src/features/orders/components/order-totals.test.tsx`: đơn có `couponCode: "GIAM50K"`, `discount: 50000` → hiện "Giảm giá (GIAM50K)" và "-50.000 ₫"; đơn cũ không có `discount`/`couponCode` → không có dòng giảm giá, hiện đúng `subtotal`, `shippingFee`, `total`; `discount: 0` → không có dòng giảm giá
- [X] T042 [P] [US4] Mở rộng `src/features/orders/order-repository.test.ts`: file JSON chứa đơn kiểu cũ (chỉ `subtotal`, `shippingFee`, `total`) đọc lại được qua `findById`, `discount` là `undefined`

### Implementation for User Story 4

- [X] T043 [US4] Tạo `src/features/orders/components/order-totals.tsx`: tách khối `<dl>` tạm tính / giảm giá / phí giao hàng / tổng cộng từ trang chi tiết, dùng `order.discount ?? 0`, dòng giảm giá chỉ hiện khi `> 0`
- [X] T044 [US4] Sửa `src/app/orders/[id]/page.tsx`: thay khối `<dl>` bằng `<OrderTotals order={order} />`
- [X] T045 [US4] Chạy `npm run check`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T046 Sửa `playwright.config.ts`: thêm `webServer.env: { ORDERS_FILE: "test-results/e2e-orders.json" }` để E2E không ghi vào `storage/orders.json` (constitution nguyên tắc II); ghi chú: phải tắt `npm run dev` đang chạy trước vì `reuseExistingServer` sẽ dùng lại server không có env này
- [X] T047 Thêm test vào `e2e/shopping-flow.spec.ts`: `test("áp dụng mã SHOPLITE10 khi thanh toán", ...)` - vào `/products/chuot-khong-day-swiftclick` (450.000 ₫), "Thêm vào giỏ", vào thanh toán, nhập `shoplite10` vào ô "Mã giảm giá", bấm "Áp dụng" → thấy "-45.000 ₫", phí ship 30.000 ₫ (tạm tính sau giảm 405.000 ₫), `checkout-total` 435.000 ₫ → điền thông tin như test hiện có → "Đặt hàng" → trang chi tiết đơn có "SHOPLITE10" và "-45.000 ₫"
- [X] T048 [P] Cập nhật `AGENTS.md`: thêm dòng Coupons vào bảng Codemap (`features/coupons`, `coupon-rules.ts`, `coupon-service.ts`, `coupon-store.ts`), luồng áp mã, quy tắc ngưỡng miễn phí ship so với tạm tính sau giảm, cấm import `src/data/coupons.ts` / `coupon-service.ts` từ Client Component
- [X] T049 Chạy `npm run test:e2e` (đổi luồng thanh toán - Definition of Done)
- [ ] T050 Đi qua 6 kịch bản thủ công trong `specs/001-checkout-coupon/quickstart.md`, ghi nhận áp mã → tổng mới hiển thị dưới 1 giây (SC-001)
- [X] T051 Chạy `npm run check`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → các user story
- **US1 (Phase 3)**: chỉ phụ thuộc Phase 2
- **US2 (Phase 4)**: phụ thuộc US1 (sửa tiếp `coupon-field.tsx`, `use-applied-coupon.ts`, `checkout-form.tsx` do US1 tạo)
- **US3 (Phase 5)**: phụ thuộc US1 (`coupon-field.tsx`, `coupon-store.ts`); độc lập với US2
- **US4 (Phase 6)**: chỉ phụ thuộc Phase 2 (`Order` có `discount`/`couponCode`); làm song song được với US1
- **Polish (Phase 7)**: sau tất cả; T047 cần T046, US1 và US4

### Within Each User Story

- Test viết trước và phải fail → kiểu/dữ liệu → service → route → component → tích hợp → `npm run check`

### Parallel Opportunities

- Phase 2: T003-T006 song song; T007, T008, T010, T011, T012 song song (T009 sau T004; T013 sau T007, T008, T011)
- US1: T015-T019 song song; T023 song song với T021/T022
- US4 có thể làm song song với US1 sau Phase 2
- Không chạy song song các task cùng sửa `checkout-form.tsx`, `coupon-field.tsx` hoặc cùng file test

---

## Parallel Example: Phase 2

```bash
Task: "Viết src/features/coupons/coupon-rules.test.ts"
Task: "Mở rộng src/features/checkout/pricing.test.ts"
Task: "Mở rộng src/features/checkout/checkout-schema.test.ts"
Task: "Viết src/features/coupons/coupon-service.test.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Viết src/app/api/coupons/validate/route.test.ts"
Task: "Mở rộng src/features/orders/order-service.test.ts"
Task: "Mở rộng src/app/api/orders/route.test.ts"
Task: "Viết src/features/coupons/coupon-store.test.ts"
Task: "Viết src/features/coupons/components/coupon-field.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2
2. Phase 3 (US1) → **STOP and VALIDATE** theo Independent Test của US1
3. Demo: áp SHOPLITE10 / GIAM50K và đặt hàng có giảm giá

### Incremental Delivery

1. Setup + Foundational → quy tắc tính tiền có giảm giá
2. US1 → MVP
3. US2 → thông báo lỗi + tự gỡ mã
4. US3 → gỡ/thay mã
5. US4 → chi tiết đơn (có thể làm sớm, song song US1)
6. Polish → E2E SHOPLITE10, AGENTS.md, quickstart

### Ngoài phạm vi tasks này

- Các mục chưa đạt trong `checklists/security.md` (ví dụ CHK003 giới hạn số lần thử mã, CHK005 giá đổi giữa
  lúc áp và lúc đặt) chưa có trong spec nên không có task; cần bổ sung spec trước nếu muốn làm.

---

## Phase 8: Security hardening (từ `checklists/security.md`)

**Purpose**: Bổ sung các yêu cầu còn thiếu trong checklist bảo mật (CHK001-CHK035) vào spec/contract và code

- [X] T052 [P] Viết test trước: `normalizeCouponCode("ｓｈｏｐｌｉｔｅ１０")` → `"SHOPLITE10"` trong `src/features/coupons/coupon-rules.test.ts`; schema từ chối mã có khoảng trắng giữa, dấu, ký tự điều khiển (`"Mã giảm giá chỉ gồm chữ và số"`) và quá 50 dòng `items` trong `src/features/checkout/checkout-schema.test.ts` (FR-014, FR-019)
- [X] T053 [P] Viết test dữ liệu mã khởi tạo trong `src/data/coupons.test.ts` (mã duy nhất, `^[A-Z0-9]{1,32}$`, percent 1-100 có `maxDiscount`, fixed > 0, `expiresOn` hợp lệ) (FR-013)
- [X] T054 [P] Viết test hủy đơn có mã vẫn giữ `couponCode` và `discount` trong `src/features/orders/order-service.test.ts` (FR-012)
- [X] T055 Sửa `normalizeCouponCode` trong `src/features/coupons/coupon-rules.ts` thêm `.normalize("NFKC")`; sửa `src/features/checkout/checkout-schema.ts`: `normalizedCouponCodeSchema` (transform chuẩn hóa → `max(32)` → `regex(/^[A-Z0-9]*$/)`) dùng cho `couponCode` và `code`, `items` tối đa 50 dòng
- [X] T056 Cập nhật `spec.md` (FR-004, FR-011, FR-012, FR-013, FR-014, FR-018, FR-019, SC-003, SC-004, Assumptions), `contracts/api.md`, `data-model.md`
- [X] T057 Chạy `npm run check`

---

## Phase 9: Convergence

- [ ] T058 CRITICAL: Đặt `reuseExistingServer: false` trong `playwright.config.ts` để E2E không dùng lại `npm run dev` đang chạy (không có `ORDERS_FILE`) và ghi vào `storage/orders.json` per Constitution II (contradicts)
- [ ] T059 Sau khi người dùng xác nhận, xóa 2 đơn E2E `SL-20261108-C2A0D3` và `SL-20261108-C921B2` khỏi `storage/orders.json`, giữ nguyên các đơn khác per Constitution II (contradicts)


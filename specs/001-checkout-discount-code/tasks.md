---
description: "Danh sách task cài đặt tính năng mã giảm giá khi thanh toán"
---

# Tasks: Mã giảm giá khi thanh toán

**Input**: Design documents from `/specs/001-checkout-discount-code/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: BẮT BUỘC theo TDD (yêu cầu của người dùng và Nguyên tắc II của constitution).

- Trong mỗi phase, task viết test đứng **trước** task cài đặt.
- Chạy test mới, xác nhận **fail** (đỏ), rồi mới cài đặt cho tới khi pass (xanh).
- Task cuối của mỗi phase là `npm run check`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4 trong spec.md)
- Đường dẫn tính từ thư mục gốc repo. Alias `@/` trỏ tới `src/`.

## Quy ước chung cho mọi task

- **Text:** text giao diện và thông báo bằng tiếng Việt, đúng như contracts/ui.md và contracts/api.md. Số tiền luôn qua `formatCurrency`.
- **Thời gian:** hàm phụ thuộc thời gian nhận `now: Date` làm tham số. Test không phụ thuộc ngày thật.
- **Test dùng file hoặc route:** thêm `// @vitest-environment node`. Route test mock `@/features/orders/server` bằng `createOrderService({ repository: createInMemoryOrderRepository() })`. Test MUST NOT ghi vào `storage/`.
- **Component test gọi `fetch`:** mock theo URL, phân biệt `GET /api/coupons/…` và `POST /api/orders`. Các test hiện có trong `checkout-form.test.tsx` phải tiếp tục pass.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Chuẩn bị nhánh và xác nhận baseline xanh

- [ ] T001 Tạo và chuyển sang nhánh tính năng `001-checkout-discount-code` (`git switch -c 001-checkout-discount-code`) theo mục Quy trình phát triển của `.specify/memory/constitution.md`
- [ ] T002 Chạy `npm run check` trên code hiện tại, ghi nhận baseline pass (hiện là 12 file / 83 test) trước khi sửa

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Quy tắc mã thuần, dữ liệu mã, và tính tiền có giảm giá. Mọi user story đều cần phần này.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (viết trước, phải FAIL)

- [ ] T003 [P] Viết test cho quy tắc mã trong `src/features/coupons/coupon-rules.test.ts`:
  - `normalizeCouponCode`: `" shoplite10 "` → `"SHOPLITE10"`; chuỗi chỉ có khoảng trắng → `""`.
  - `getCouponDeadline("2026-02-28")` = `2026-02-28T23:59:59.999+07:00`.
  - `calculateCouponDiscount` và `evaluateCoupon(coupon | undefined, subtotal, now)` phủ **đủ bảng giá trị biên** trong data-model.md:
    - 299 999 → `below_minimum`, shortfall 1; 300 000 → ok, 30 000;
    - 1 000 000 và 1 500 000 → 100 000;
    - 15% của 333 333 → 49 999 (làm tròn xuống);
    - fixed 50 000 với subtotal 30 000 → 30 000;
    - `TET2026` lúc `2026-02-28T23:59:59.999+07:00` chưa hết hạn, lúc `2026-03-01T00:00:00+07:00` → `expired`;
    - hết hạn được kiểm tra trước tối thiểu;
    - `undefined` → `not_found`;
    - luôn có `0 ≤ discount ≤ subtotal`.
  - `getCouponErrorMessage`:
    - `not_found` → "Mã giảm giá không tồn tại";
    - `expired` → "Mã giảm giá đã hết hạn";
    - `below_minimum` với shortfall 50 000, mã `GIAM50K` → "Mua thêm 50.000 ₫ để sử dụng mã GIAM50K" (qua `formatCurrency`);
    - message dùng mã chuẩn hóa từ dữ liệu, không dùng chuỗi thô khách nhập.
  - `couponCodeSchema` (test trong `src/features/coupons/coupon-schema.test.ts`):
    - `" shoplite10 "` parse ra `"shoplite10"` (đã trim);
    - `""` và `"   "` → lỗi "Vui lòng nhập mã giảm giá";
    - 33 ký tự → lỗi "Mã giảm giá không hợp lệ";
    - số hoặc `null` → lỗi.
- [ ] T004 [P] Viết test trong `src/features/coupons/coupon-service.test.ts`:
  - `findCoupon` không phân biệt hoa/thường và khoảng trắng; mã lạ → `undefined`.
  - `lookupCoupon(code)` → `{ ok: true, coupon }` với mã tồn tại (kể cả đã hết hạn); mã lạ →
    `{ ok: false, code: "COUPON_NOT_FOUND", message: "Mã giảm giá không tồn tại" }`. Hàm chuẩn hóa
    mã qua `normalizeCouponCode`.
  - Kiểm tra tính toàn vẹn của `coupons` trong `src/data/coupons.ts`:
    - `code` viết HOA, không khoảng trắng, duy nhất;
    - `percent` có `value` nguyên 1–100 và `maxDiscount > 0`; `fixed` có `value > 0` và không có `maxDiscount`;
    - `minSubtotal ≥ 0`; `expiresOn` đúng dạng `YYYY-MM-DD`;
    - có đủ 3 mã của FR-017 với đúng giá trị.
- [ ] T005 [P] Bổ sung test cho `calculateOrderTotals(lines, method, discount)` trong `src/features/checkout/pricing.test.ts`:
  - không truyền discount → `discount: 0`, kết quả như cũ;
  - `total = subtotal − discount + shippingFee`;
  - discount được kẹp trong `[0, subtotal]` (âm → 0, lớn hơn subtotal → subtotal);
  - **FR-013**: subtotal 520 000, discount 52 000, `standard` → `shippingFee 0`, `total 468 000`;
  - subtotal 499 999 có discount → vẫn tính phí 30 000.

### Implementation

- [ ] T006 [P] Tạo `src/features/coupons/types.ts` và `src/features/coupons/coupon-schema.ts` theo data-model.md:
  - `COUPON_TYPES = ["percent", "fixed"] as const`;
  - `Coupon` là discriminated union theo `type`: `percent` bắt buộc `maxDiscount`; `fixed` không có `maxDiscount`; cả hai có `minSubtotal?` và `expiresOn?: string` ("`YYYY-MM-DD`, dùng được đến 23:59:59.999 +07:00 của ngày này");
  - `CouponEvaluation` gồm `{ ok: true, coupon, discount }` hoặc `{ ok: false, reason: "not_found" | "expired" | "below_minimum", coupon?, shortfall? }`;
  - `coupon-schema.ts` export `couponCodeSchema = z.string().trim().min(1, "Vui lòng nhập mã giảm giá").max(32, "Mã giảm giá không hợp lệ")`. Đây là nguồn duy nhất cho ràng buộc định dạng mã: route `GET /api/coupons/[code]` và `placeOrderSchema` đều dùng lại nó (Nguyên tắc III: mọi input validate bằng Zod).

  Làm cho phần test `couponCodeSchema` của T003 pass.
- [ ] T007 Cài đặt `src/features/coupons/coupon-rules.ts` (hàm thuần, **không** import `src/data/`):
  - `normalizeCouponCode`, `getCouponDeadline`, `calculateCouponDiscount`, `evaluateCoupon`;
  - `getCouponErrorMessage(evaluation)` theo bảng message ở contracts/api.md (dùng `formatCurrency` từ `@/lib/format`, dùng `coupon.code` chuẩn hóa);
  - thứ tự đánh giá: không tồn tại → hết hạn → dưới tối thiểu → ok;
  - công thức: percent `min(floor(subtotal × value / 100), maxDiscount)`, fixed `value`, sau đó `min(…, subtotal)`.

  Làm cho T003 pass. (phụ thuộc T006)

- [ ] T008 [P] Tạo `src/data/coupons.ts` export `coupons: Coupon[]` đúng FR-017:
  - `SHOPLITE10`: percent 10, maxDiscount 100_000, minSubtotal 300_000;
  - `GIAM50K`: fixed 50_000, minSubtotal 500_000;
  - `TET2026`: percent 15, maxDiscount 200_000, expiresOn `"2026-02-28"`.

  Kèm comment tiếng Việt giống `src/data/products.ts`. (phụ thuộc T006)

- [ ] T009 Cài đặt `findCoupon(code: string): Coupon | undefined` và `lookupCoupon(code)` trong `src/features/coupons/coupon-service.ts`. Cả hai chuẩn hóa mã bằng `normalizeCouponCode` rồi tra `coupons`; `lookupCoupon` trả kết quả dạng `{ ok, coupon }` hoặc `{ ok: false, code: "COUPON_NOT_FOUND", message }` để route chỉ việc ánh xạ sang HTTP. Ghi comment: chỉ import file này từ code server. Làm cho T004 pass. (phụ thuộc T007, T008)
- [ ] T010 [P] Sửa `src/features/checkout/pricing.ts`:
  - `OrderTotals` thêm `discount`;
  - `calculateOrderTotals(lines, method, discount = 0)` kẹp discount trong `[0, subtotal]`, tính `shippingFee` theo `subtotal` **trước** giảm, `total = subtotal − discount + shippingFee`;
  - cập nhật JSDoc.

  Làm cho T005 pass mà không phá test cũ.

- [ ] T011 Chạy `npm run check`, phải pass

**Checkpoint**: Quy tắc mã và tính tiền đã sẵn sàng, các user story có thể bắt đầu.

---

## Phase 3: User Story 1 - Áp dụng mã hợp lệ và đặt hàng với giá đã giảm (Priority: P1) 🎯 MVP

**Goal**: Khách áp dụng mã hợp lệ ở `/checkout`, thấy dòng giảm giá và tổng mới. Server tự kiểm tra và tính lại khi đặt hàng, rồi lưu `couponCode` và `discount` vào đơn.

**Independent Test**: Giỏ 400 000đ + `SHOPLITE10` → tóm tắt hiện `Giảm giá (SHOPLITE10)` −40 000đ. Đặt hàng → response và đơn đã lưu có `discount: 40000` và tổng đã trừ.

### Tests for User Story 1 (viết trước, phải FAIL) ⚠️

- [ ] T012 [P] [US1] Viết route test `src/app/api/coupons/[code]/route.test.ts` (`@vitest-environment node`) theo contracts/api.md:
  - `GET /api/coupons/shoplite10` → 200 `{ coupon: { code: "SHOPLITE10", … } }`;
  - `TET2026` → 200 (kể cả khi đã hết hạn);
  - `KHONGCO` → 404 `COUPON_NOT_FOUND` "Mã giảm giá không tồn tại";
  - mã chỉ có khoảng trắng → 400 `VALIDATION_ERROR` "Vui lòng nhập mã giảm giá"; dài hơn 32 ký tự → 400 `VALIDATION_ERROR` "Mã giảm giá không hợp lệ".
- [ ] T013 [P] [US1] Bổ sung test `placeOrderSchema` trong `src/features/checkout/checkout-schema.test.ts`: `couponCode` tùy chọn, được trim, chuỗi rỗng hợp lệ, dài hơn 32 ký tự → lỗi tại key `couponCode`, kiểu không phải string → lỗi. Thêm test: các trường `discount` và `total` client gửi không có trong dữ liệu sau khi parse.
- [ ] T014 [P] [US1] Bổ sung test trong `src/features/orders/order-service.test.ts`. Inject `findCoupon` và `now` cố định qua `createOrderService`.
  - Đơn với `couponCode: " shoplite10 "`, tạm tính 400 000 → `couponCode: "SHOPLITE10"`, `discount: 40000`, `total` = 400 000 − 40 000 + phí ship.
  - Body có thêm `discount: 999999, total: 1` → bị bỏ qua.
  - FR-013: 520 000 + `SHOPLITE10` + standard → `shippingFee 0`, `total 468000`.
  - Không có mã hoặc `couponCode: ""` → đơn **không** có `couponCode` và `discount`.
  - Mã không tồn tại, mã hết hạn (`now` sau `2026-02-28T23:59:59.999+07:00`), hoặc dưới tối thiểu → ném `OrderError` code `INVALID_COUPON`, `httpStatus 422`, `details.reason` đúng và `details.couponCode` là message tiếng Việt. Repository **không** được gọi `save`.
  - Lỗi tồn kho được ưu tiên trước lỗi mã (thứ tự trong contracts/api.md).
- [ ] T015 [P] [US1] Bổ sung test `POST /api/orders` trong `src/app/api/orders/route.test.ts`: 201 khi có `couponCode: "SHOPLITE10"` (response có `couponCode` và `discount`); 422 `INVALID_COUPON` với `TET2026`.
- [ ] T016 [P] [US1] Bổ sung test trong `src/features/cart/cart-reducer.test.ts` theo bảng chuyển trạng thái ở data-model.md:
  - `apply-coupon` lưu mã đã chuẩn hóa; áp dụng mã thứ hai thì thay mã cũ (chỉ giữ 1);
  - `remove-coupon` xóa mã; `clear` → `EMPTY_CART`;
  - `remove` hoặc `update-quantity` làm giỏ rỗng → bỏ `couponCode`;
  - thay đổi khác giữ nguyên `couponCode`.
- [ ] T017 [P] [US1] Bổ sung test trong `src/features/cart/cart-store.test.ts`: giỏ cũ trong localStorage không có `couponCode` vẫn đọc được; `couponCode` không phải string thì bị bỏ qua nhưng **giữ** `items`; `apply-coupon` được lưu vào localStorage.
- [ ] T018 [P] [US1] Viết component test `src/features/coupons/components/coupon-field.test.tsx` cho luồng hợp lệ theo contracts/ui.md:
  - có label "Mã giảm giá" gắn với input `id="couponCode"`;
  - nhập `shoplite10` rồi bấm "Áp dụng" → gọi `onApply("SHOPLITE10")`;
  - nhấn Enter trong input cũng áp dụng và **không** submit form cha;
  - khi đang kiểm tra, nút "Áp dụng" disabled và có `aria-busy`;
  - khi có mã hợp lệ, hiện chip mã và ẩn input.
- [ ] T019 [P] [US1] Bổ sung test trong `src/features/checkout/components/checkout-form.test.tsx` (mock `fetch` theo URL):
  - áp dụng `SHOPLITE10` với giỏ 400 000 → `discount-amount` hiện "−40.000 ₫" và `checkout-total` đã trừ;
  - khi submit, body `POST /api/orders` có `couponCode: "SHOPLITE10"` và **không** có trường tiền;
  - đặt hàng thành công → giỏ và mã bị xóa;
  - mở trang khi giỏ đã có `couponCode` (FR-019) → tự gọi `GET /api/coupons/SHOPLITE10` và hiện dòng giảm giá.

### Implementation for User Story 1

- [ ] T020 [P] [US1] Sửa `src/features/orders/types.ts`: `Order` thêm `couponCode?: string` ("Mã đã chuẩn hóa. Chỉ có khi đơn dùng mã") và `discount?: number` ("> 0, chỉ có khi đơn dùng mã"). Ghi comment về bất biến cùng có/cùng không, và đơn cũ không có hai trường này.
- [ ] T021 [P] [US1] Sửa `src/features/orders/order-errors.ts`: thêm `"INVALID_COUPON"` vào `OrderErrorCode` và `INVALID_COUPON: 422` vào `HTTP_STATUS_BY_CODE`.
- [ ] T022 [P] [US1] Sửa `src/features/checkout/checkout-schema.ts`: `placeOrderSchema` thêm `couponCode: couponCodeSchema.optional().or(z.literal(""))`, import từ `@/features/coupons/coupon-schema`. Chuỗi rỗng hợp lệ và nghĩa là không dùng mã. Làm cho T013 pass.
- [ ] T023 [US1] Sửa `src/features/orders/order-service.ts`:
  - `OrderServiceDeps` thêm `findCoupon?: (code: string) => Coupon | undefined`, mặc định import từ `@/features/coupons/coupon-service`;
  - sau khi dựng `orderItems`: nếu `normalizeCouponCode(couponCode)` khác rỗng thì gọi `evaluateCoupon(findCoupon(code), subtotal, now())`;
  - nếu kết quả không ok: ném `OrderError("INVALID_COUPON", message, { couponCode: message, reason })`, với message lấy từ `getCouponErrorMessage`;
  - nếu ok: gọi `calculateOrderTotals(orderItems, shippingMethod, discount)` và gắn `couponCode` + `discount` vào đơn.

  Làm cho T014 và T015 pass. (phụ thuộc T020–T022)

- [ ] T024 [P] [US1] Tạo route mỏng `src/app/api/coupons/[code]/route.ts`: `GET(_req, ctx: RouteContext<"/api/coupons/[code]">)`:
  - `const parsed = couponCodeSchema.safeParse((await ctx.params).code)`; lỗi → `jsonError(400, "VALIDATION_ERROR", <message của issue đầu tiên>)`;
  - hợp lệ → `lookupCoupon(parsed.data)`; `ok: false` → `jsonError(404, result.code, result.message)`; `ok: true` → `NextResponse.json({ coupon })`;
  - route không chứa quy tắc chuẩn hóa hay tra cứu (Nguyên tắc I). Không có endpoint liệt kê mã.

  Làm cho T012 pass. (phụ thuộc T006, T009)
- [ ] T025 [US1] Sửa `src/features/cart/types.ts` và `src/features/cart/cart-reducer.ts`:
  - `CartState` thêm `couponCode?: string`;
  - `CartAction` thêm `{ type: "apply-coupon"; code: string }` và `{ type: "remove-coupon" }`;
  - xử lý theo bảng chuyển trạng thái (bỏ mã khi `items` trở nên rỗng);
  - cart không import feature `coupons` (tự `trim().toUpperCase()` hoặc nhận mã đã chuẩn hóa).

  Làm cho T016 pass.

- [ ] T026 [US1] Sửa `src/features/cart/cart-store.ts` (`isCartState`: chấp nhận `couponCode` tùy chọn, bỏ trường này nếu không phải string) và `src/features/cart/use-cart.ts` (trả thêm `couponCode`, `applyCoupon(code)`, `removeCoupon()`). Làm cho T017 pass. (phụ thuộc T025)
- [ ] T027 [P] [US1] Tạo `src/features/coupons/components/coupon-field.tsx` (`"use client"`):
  - props: trạng thái mã hiện tại, `onApply(code)`, `onRemove()`, `pending`, `error?`;
  - input có label "Mã giảm giá"; nút "Áp dụng"; Enter áp dụng bằng `preventDefault`, không submit form;
  - chip mã khi đã áp dụng; dùng `Button` và `cn` sẵn có.

  Làm cho T018 pass.

- [ ] T028 [P] [US1] Sửa `src/features/checkout/components/checkout-summary.tsx`: nhận thêm prop `coupon?: { code: string; discount: number }`, truyền `discount` vào `calculateOrderTotals`. Thêm dòng `Giảm giá ({CODE})` / `−{formatCurrency(discount)}` với `data-testid="discount-amount"`, đặt giữa "Tạm tính" và "Phí giao hàng", chỉ hiện khi discount > 0.
- [ ] T029 [US1] Sửa `src/features/checkout/components/checkout-form.tsx`:
  - đọc `couponCode` từ `useCart`;
  - khi có mã: gọi `GET /api/coupons/{encodeURIComponent(code)}` (lúc mở trang và khi áp dụng mã mới), lưu định nghĩa mã vào state;
  - tính `evaluateCoupon(coupon, subtotal, new Date())` mỗi lần render hoặc khi giỏ đổi;
  - render `CouponField` và truyền `coupon` hợp lệ vào `CheckoutSummary`;
  - gửi `couponCode` trong body `POST /api/orders`; sau khi thành công, `clear()` đã bỏ cả mã.

  Làm cho T019 pass. (phụ thuộc T026–T028)

- [ ] T030 [US1] Chạy `npm run check`, phải pass

**Checkpoint**: Áp dụng mã hợp lệ và đặt hàng có giảm giá hoạt động trọn vẹn (MVP).

---

## Phase 4: User Story 2 - Thông báo rõ ràng khi mã không hợp lệ (Priority: P1)

**Goal**: Hiện đúng một trong ba lý do (không tồn tại / hết hạn / thiếu X đ) tại ô mã. Mã lỗi vẫn được giữ và khóa nút đặt hàng; mã tự có hiệu lực lại khi đủ tối thiểu (FR-012, FR-014).

**Independent Test**: `KHONGCO`, `TET2026`, `GIAM50K` (giỏ 450 000) lần lượt hiện đúng thông báo, tổng tiền không đổi. Giảm giỏ dưới tối thiểu → mã hiện lỗi và nút "Đặt hàng" bị khóa. Tăng lại → mã có hiệu lực.

### Tests for User Story 2 (viết trước, phải FAIL) ⚠️

> T031 và T034 (test và cài đặt `getCouponErrorMessage`) đã được gộp vào T003/T007 ở Phase 2. Số
> thứ tự được giữ nguyên để không đổi các tham chiếu khác.

- [ ] T032 [P] [US2] Bổ sung test trạng thái lỗi trong `src/features/coupons/components/coupon-field.test.tsx`:
  - bấm "Áp dụng" khi input rỗng → "Vui lòng nhập mã giảm giá", không gọi `onApply`;
  - prop `error` khi chưa có mã → thông báo `role="alert"` dưới input và input có `aria-invalid="true"`;
  - prop `error` khi đã có mã → chip mã + thông báo `data-testid="coupon-error"`.
- [ ] T033 [P] [US2] Bổ sung test trong `src/features/checkout/components/checkout-form.test.tsx`:
  - `GET` trả 404 → hiện "Mã giảm giá không tồn tại" và mã **không** được lưu vào giỏ;
  - lỗi mạng → "Không kiểm tra được mã giảm giá, vui lòng thử lại.";
  - `TET2026` (định nghĩa hết hạn) → mã được lưu, hiện "Mã giảm giá đã hết hạn", không có `discount-amount`, nút "Đặt hàng" disabled;
  - kịch bản 6–7 của spec: `GIAM50K` với giỏ 600 000 hợp lệ; giảm số lượng qua `cartStore.dispatch` xuống 450 000 → lỗi "Mua thêm 50.000 ₫…" và nút disabled; tăng lại ≥ 500 000 → dòng giảm 50 000 trở lại và nút enabled, **không** gọi lại `GET`;
  - `POST /api/orders` trả 422 `INVALID_COUPON` → message hiện ở `coupon-error` (không ở lỗi chung của form), mã vẫn giữ, nút disabled.

### Implementation for User Story 2

- [ ] T035 [US2] Bổ sung trạng thái lỗi cho `src/features/coupons/components/coupon-field.tsx` theo bảng "Trạng thái" ở contracts/ui.md: lỗi khi nhập (`aria-invalid`, `role="alert"`, `aria-describedby`), lỗi khi đã có mã (`data-testid="coupon-error"`), và validate input rỗng. Làm cho T032 pass.
- [ ] T036 [US2] Sửa `src/features/checkout/components/checkout-form.tsx`:
  - phân biệt kết quả `GET`: 404 → không `applyCoupon`, hiện lỗi; lỗi mạng → hiện lỗi mạng; 200 → `applyCoupon`;
  - suy ra lỗi từ `evaluateCoupon` (hết hạn / dưới tối thiểu) mỗi khi giỏ đổi;
  - thêm state `serverCouponError`: set khi `POST` trả `INVALID_COUPON` (`body.error.details.couponCode`), ghi đè kết quả phía client, xóa khi gỡ mã;
  - disable nút "Đặt hàng" khi mã đang lỗi (research R8).

  Làm cho T033 pass. (phụ thuộc T007, T035)

- [ ] T037 [US2] Chạy `npm run check`, phải pass

**Checkpoint**: US1 và US2 hoạt động độc lập; mọi trường hợp mã lỗi có thông báo đúng.

---

## Phase 5: User Story 3 - Gỡ hoặc thay mã đã áp dụng (Priority: P2)

**Goal**: Khách gỡ được mã (tổng về như chưa giảm). Mỗi đơn chỉ giữ tối đa một mã.

**Independent Test**: Áp dụng `SHOPLITE10` → gỡ → tổng về ban đầu → áp dụng `GIAM50K` → tóm tắt chỉ có một mã.

### Tests for User Story 3 (viết trước, phải FAIL) ⚠️

- [ ] T038 [P] [US3] Bổ sung test trong `src/features/coupons/components/coupon-field.test.tsx`: khi đã có mã, có nút `aria-label="Gỡ mã giảm giá {CODE}"` và bấm thì gọi `onRemove`; không có input thứ hai để áp dụng thêm mã.
- [ ] T039 [P] [US3] Bổ sung test trong `src/features/checkout/components/checkout-form.test.tsx`:
  - gỡ `SHOPLITE10` → mất `discount-amount`, `checkout-total` = tạm tính + phí ship, `couponCode` trong cart store bị xóa;
  - gỡ mã đang có `serverCouponError` → lỗi biến mất và nút "Đặt hàng" enabled;
  - sau khi gỡ, áp dụng `GIAM50K` → chỉ có một dòng giảm giá.

### Implementation for User Story 3

- [ ] T040 [US3] Hoàn thiện nút "Gỡ mã" trong `src/features/coupons/components/coupon-field.tsx` (icon `X` từ lucide-react, `aria-label` đúng contracts/ui.md, input xuất hiện lại sau khi gỡ). Làm cho T038 pass.
- [ ] T041 [US3] Nối `onRemove` trong `src/features/checkout/components/checkout-form.tsx`: gọi `removeCoupon()`, reset định nghĩa mã đã lấy và `serverCouponError`. Làm cho T039 pass. (phụ thuộc T040)
- [ ] T042 [US3] Chạy `npm run check`, phải pass

**Checkpoint**: Khách tự quản lý được mã; US1–US3 cùng hoạt động.

---

## Phase 6: User Story 4 - Xem mã đã dùng trong chi tiết đơn hàng (Priority: P2)

**Goal**: Trang `/orders/[id]` hiện `Giảm giá ({CODE})` cho đơn có mã. Đơn cũ hiển thị như trước.

**Independent Test**: Đơn có `GIAM50K` hiện dòng −50 000đ; đơn không mã và đơn cũ (không có trường `couponCode`/`discount`) không có dòng này và không lỗi.

### Tests for User Story 4 (viết trước, phải FAIL) ⚠️

- [ ] T043 [P] [US4] Viết component test `src/features/orders/components/order-totals.test.tsx`:
  - đơn có `couponCode: "GIAM50K", discount: 50000` → `order-discount-amount` hiện "−50.000 ₫" giữa "Tạm tính" và "Phí giao hàng", "Tổng cộng" = `order.total`;
  - đơn có dạng cũ (object không có hai trường) → không có `order-discount-amount`, "Miễn phí" khi `shippingFee` 0.
- [ ] T044 [P] [US4] Bổ sung test trong `src/features/orders/order-repository.test.ts` (thư mục tạm, `@vitest-environment node`): đọc một file JSON chứa đơn kiểu cũ (không có `couponCode`/`discount`) cùng một đơn mới có mã → cả hai được trả về nguyên vẹn, và `save` đơn mới không làm thay đổi đơn cũ.

### Implementation for User Story 4

- [ ] T045 [US4] Tạo `src/features/orders/components/order-totals.tsx` (Server Component, không `"use client"`). Tách khối `<dl>` tổng tiền từ `src/app/orders/[id]/page.tsx`, thêm dòng giảm giá theo contracts/ui.md, chỉ khi `order.couponCode && order.discount`. Làm cho T043 pass.
- [ ] T046 [US4] Sửa `src/app/orders/[id]/page.tsx` để dùng `<OrderTotals order={order} />`. Giữ nguyên các phần khác, kể cả đoạn chuyển khoản dùng `order.total`. (phụ thuộc T045)
- [ ] T047 [US4] Chạy `npm run check`, phải pass

**Checkpoint**: Cả 4 user story hoàn tất và kiểm thử được độc lập.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E, tài liệu, định dạng, kiểm chứng cuối

- [ ] T048 [P] Thêm một kịch bản mới vào `e2e/shopping-flow.spec.ts` (giữ nguyên 2 test hiện có), tên `"khách hàng áp dụng mã SHOPLITE10 và đặt hàng với giá đã giảm"`:
  - thêm 2 × "Chuột không dây SwiftClick" (tạm tính 900 000đ) như test đầu, rồi vào `/checkout`;
  - `getByLabel("Mã giảm giá")` nhập `shoplite10` → bấm "Áp dụng";
  - SC-001: `await expect(page.getByTestId("discount-amount")).toContainText("90.000", { timeout: 1000 })`;
  - kỳ vọng `discount-amount` chứa "90.000", `shipping-fee` là "Miễn phí", `checkout-total` chứa "810.000";
  - điền form và đặt hàng → trang chi tiết đơn có `order-discount-amount` chứa "90.000" và tổng "810.000";
  - `cart-count` không còn.
- [ ] T049 [P] Cập nhật `README.md`:
  - bảng API: thêm `GET /api/coupons/:code`; `POST /api/orders` thêm `couponCode`;
  - mục quy tắc nghiệp vụ: mã giảm giá, mỗi đơn một mã, phí ship tính trước giảm;
  - ví dụ curl có `couponCode`.

  Theo Definition of Done trong `AGENTS.md`.

- [ ] T050 [P] Cập nhật `AGENTS.md`:
  - codemap thêm dòng `coupons` (`coupon-rules.ts`, `coupon-service.ts`, `src/data/coupons.ts`);
  - luồng đặt hàng thêm bước đánh giá mã;
  - mục quy tắc nghiệp vụ thêm quy tắc mã giảm giá.
- [ ] T051 Chạy `npm run format`, xác nhận `npm run format:check` pass
- [ ] T052 Chạy `npm run test:e2e`, cả 3 kịch bản trong `e2e/shopping-flow.spec.ts` phải pass (lần đầu: `npx playwright install chromium`)
- [ ] T053 Đi qua 7 bước kiểm tra giao diện và bảng kiểm tra API trong `specs/001-checkout-discount-code/quickstart.md`, ghi lại bước nào không đạt
- [ ] T054 Chạy `npm run check` lần cuối, phải pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: không phụ thuộc gì.
- **Foundational (Phase 2)**: sau Phase 1. **Chặn** mọi user story.
- **US1 (Phase 3)**: sau Phase 2. Đây là MVP.
- **US2 (Phase 4)**: sau Phase 2. Về logic có thể làm song song với US1, nhưng vì cùng sửa `checkout-form.tsx`, `coupon-field.tsx` và các file test tương ứng nên **nên làm sau US1**.
- **US3 (Phase 5)**: sau US1 (cần `CouponField` và cart actions). Có thể làm song song với US2 nếu chia người, nhưng cùng file nên làm tuần tự.
- **US4 (Phase 6)**: chỉ cần Phase 2 và T020 (`Order` có `couponCode`/`discount`). **Độc lập về file** với US2/US3, nên có thể làm song song.
- **Polish (Phase 7)**: sau tất cả user story.

### Within Each User Story

- Test (task có [P] đầu phase) viết trước và phải FAIL.
- Types và schema → service → route và component → tích hợp vào `checkout-form.tsx` → `npm run check`.

### Task-level dependencies chính

- T007 ← T006; T008 ← T006; T009 ← T007, T008
- T023 ← T020, T021, T022, T009, T010
- T026 ← T025; T029 ← T026, T027, T028, T024
- T024 ← T006, T009; T036 ← T007, T035; T041 ← T040; T046 ← T045

### Parallel Opportunities

- Phase 2: T003, T004, T005 song song; sau đó T006, T010 song song; T008 song song với T007.
- Phase 3: toàn bộ test T012–T019 song song (khác file); sau đó T020, T021, T022, T024, T027, T028 song song.
- US4 (T043–T047) chạy song song với US2/US3.
- Phase 7: T048, T049, T050 song song.

---

## Parallel Example: User Story 1

```bash
# Bước 1 – viết test song song (đều phải FAIL):
T012 src/app/api/coupons/[code]/route.test.ts
T013 src/features/checkout/checkout-schema.test.ts
T014 src/features/orders/order-service.test.ts
T016 src/features/cart/cart-reducer.test.ts
T018 src/features/coupons/components/coupon-field.test.tsx

# Bước 2 – cài đặt song song các file độc lập:
T020 src/features/orders/types.ts
T021 src/features/orders/order-errors.ts
T022 src/features/checkout/checkout-schema.ts
T024 src/app/api/coupons/[code]/route.ts
T027 src/features/coupons/components/coupon-field.tsx
T028 src/features/checkout/components/checkout-summary.tsx

# Bước 3 – tuần tự: T023 → T025 → T026 → T029 → T030 (npm run check)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → Phase 2 (quy tắc mã và tính tiền có test biên).
2. Phase 3 (US1) → **dừng lại và kiểm chứng**: áp dụng `SHOPLITE10`, đặt hàng, xem response.
3. Lúc này server đã từ chối mã không hợp lệ (T023), nên MVP an toàn về tiền dù UI lỗi chưa hoàn thiện.

### Incremental Delivery

1. US1: đặt hàng có giảm giá (MVP).
2. US2: thông báo lỗi, giữ mã lỗi, tự có hiệu lực lại.
3. US3: gỡ hoặc thay mã.
4. US4: hiển thị trong chi tiết đơn (có thể làm song song từ sau Phase 2).
5. Polish: e2e `SHOPLITE10`, README, AGENTS.md, format, quickstart.

### Notes

- [P] = khác file và không phụ thuộc task chưa xong.
- Xác nhận test FAIL trước khi cài đặt. Commit sau mỗi phase (khi `npm run check` xanh).
- Plan có liệt kê `e2e/coupon-flow.spec.ts`. Theo yêu cầu người dùng, kịch bản e2e được thêm vào `e2e/shopping-flow.spec.ts` (T048) thay vì tạo file mới.
- Các mục `[Gap]` trong `checklists/security.md` (CHK002, CHK004, CHK010, CHK019) vẫn chưa được đưa vào spec. Các task trên đã phủ phần kỹ thuật tương ứng (không có endpoint liệt kê mã, kiểm tra lại mã đọc từ localStorage, giới hạn 32 ký tự), nhưng reviewer nên chốt trước `/speckit-implement`.

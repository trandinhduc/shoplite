---
description: "Danh sách task triển khai tính năng mã giảm giá khi thanh toán (TDD)"
---

# Tasks: Mã giảm giá khi thanh toán

**Input**: Tài liệu thiết kế trong `specs/001-checkout-discount-code/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: BẮT BUỘC, theo TDD (constitution Nguyên tắc II, yêu cầu của người dùng). Trong mỗi phase, task viết test (unit cho logic, component/route test cho UI và API) đứng **trước** task cài đặt; có một task chạy test để xác nhận **FAIL (đỏ)** trước khi viết code. Task cuối của mỗi phase là `npm run check`.

**Organization**: Task nhóm theo user story. Thứ tự phase theo độ ưu tiên: P1 (US1 → US2 → US5), rồi P2 (US3 → US4). Nhãn `[USn]` giữ đúng số thứ tự trong spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Chạy song song được (khác file, không phụ thuộc task chưa xong trong cùng phase)
- **[Story]**: User story của task (US1…US5)
- Mọi đường dẫn tính từ gốc repo

## Quy ước chung cho mọi task

- Tên test viết tiếng Việt, mô tả hành vi (`.claude/rules/testing.md`). Component test ưu tiên `getByRole` / `getByLabelText`; `getByTestId` chỉ dùng cho các `data-testid` có trong contract (`checkout-discount`, `shipping-fee`, `checkout-total`, `order-discount`).
- So sánh chuỗi tiền tệ bằng `formatCurrency(...)` từ `src/lib/format.ts` hoặc regex số (`/40\.000/`), không gõ cứng ký tự `₫` / khoảng trắng.
- Không gọi mạng thật: `vi.stubGlobal("fetch", ...)`, phân nhánh theo URL (`/api/coupons/validate` và `/api/orders`). Không ghi vào `storage/orders.json`.
- Test component dựng giỏ bằng `cartStore.reset()` rồi `cartStore.dispatch({ type: "add", item: toCartItem(getProductById(id)!), quantity })`. Giá tham chiếu: `p001` 1.290.000, `p006` 450.000, `p007` 250.000, `p010` 150.000. Lưu ý `beforeEach` hiện có trong `checkout-form.test.tsx` thêm `p010 × 2` (= 300.000): test mới phải tự `reset()` và dựng giỏ riêng.
- `src/features/coupons/coupon-catalog.ts` và `src/data/coupons.ts` **chỉ** được import từ server (`src/app/api/**`, `order-service.ts`). File `"use client"` chỉ được import `coupon-service.ts`, `coupon-schema.ts`, `types.ts`.
- Text UI, thông báo lỗi, comment nghiệp vụ: tiếng Việt. Tên biến/hàm/type: tiếng Anh. File kebab-case, component named export.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tạo type và dữ liệu tĩnh cho feature `coupons`. Không có logic nên không cần test trước.

- [x] T001 Tạo `src/features/coupons/types.ts` (không `"use client"`) với: `CouponDefinition` là discriminated union đúng như data-model §1 — `{ code: string; type: "percent"; value: number; maxDiscount: number; minSubtotal?: number; expiresOn?: string }` | `{ code: string; type: "fixed"; value: number; minSubtotal?: number; expiresOn?: string }` (comment ràng buộc: `code` "Chữ HOA, không khoảng trắng, duy nhất trong danh sách"; `percent`: "số nguyên 1–100"; `fixed`: "số tiền > 0"; `maxDiscount` "> 0. Bắt buộc với `percent`, không có với `fixed`"; `minSubtotal` "≥ 0; thiếu = không có ngưỡng"; `expiresOn` dạng `YYYY-MM-DD`, "Hiệu lực đến 23:59:59.999 giờ VN (+07:00) của ngày đó; thiếu = không hết hạn"); `CouponErrorReason = "COUPON_NOT_FOUND" | "COUPON_EXPIRED" | "COUPON_MIN_SUBTOTAL_NOT_MET"`; `CouponAvailability = { ok: true; coupon } | { ok: false; reason: "COUPON_NOT_FOUND" } | { ok: false; reason: "COUPON_EXPIRED"; coupon }`; `CouponEvaluation` đúng như data-model §2 (nhánh `COUPON_MIN_SUBTOTAL_NOT_MET` có `coupon`, `minSubtotal`, `shortfall`); `CouponEvaluationFailure = Extract<CouponEvaluation, { ok: false }>`; `CouponThresholdResult = { ok: true; coupon; discount } | Extract<CouponEvaluation, { reason: "COUPON_MIN_SUBTOTAL_NOT_MET" }>`
- [x] T002 [P] Tạo `src/data/coupons.ts` export `COUPONS: readonly CouponDefinition[]` đúng bảng FR-022: `{ code: "SHOPLITE10", type: "percent", value: 10, maxDiscount: 100_000, minSubtotal: 300_000 }`, `{ code: "GIAM50K", type: "fixed", value: 50_000, minSubtotal: 500_000 }`, `{ code: "TET2026", type: "percent", value: 15, maxDiscount: 200_000, expiresOn: "2026-02-28" }` (comment tiếng Việt: chỉ import từ server)
- [x] T003 Chạy `npm run check` và sửa đến khi pass (lint + typecheck + test)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Logic thuần dùng chung cho mọi story — tính giảm giá, chuẩn hóa mã, phí ship sau giảm, schema, mã lỗi, mở rộng type `Order`.

**⚠️ CRITICAL**: Chưa xong phase này thì chưa làm user story nào.

### Tests (viết TRƯỚC, phải FAIL) ⚠️

- [x] T004 [P] Tạo `src/features/coupons/coupon-service.test.ts` (jsdom mặc định) dùng coupon định nghĩa ngay trong test (không import `src/data/coupons.ts`), gồm: `normalizeCouponCode(" shoplite10 ") === "SHOPLITE10"`; `couponExpiryInstant("2026-02-28")` bằng `new Date("2026-02-28T23:59:59.999+07:00")`; `isCouponExpired` với `now` = `2026-02-28T12:00:00+07:00` (false), `2026-02-28T23:59:59.999+07:00` (false — đúng hạn chót vẫn dùng được), `2026-03-01T00:00:00.000+07:00` (true), coupon không có `expiresOn` (luôn false); `calculateCouponDiscount` loại percent 10%/max 100.000: subtotal 999.990 → 99.999, 1.000.000 → 100.000, 1.000.010 → 100.000 (dưới/bằng/trên mức tối đa); làm tròn xuống: 10% của 333.335 → 33.333; loại fixed 50.000 không ngưỡng với subtotal 30.000 → 30.000 (discount ≤ subtotal); `evaluateCoupon(undefined, …)` → `{ ok: false, reason: "COUPON_NOT_FOUND" }`; ngưỡng 300.000: subtotal 299.999 → `COUPON_MIN_SUBTOTAL_NOT_MET` với `minSubtotal: 300000, shortfall: 1`; 300.000 → ok discount 30.000; 300.001 → ok discount 30.000; ngưỡng 500.000 với fixed 50.000: 450.000 → shortfall 50.000, 500.000 → ok 50.000; thứ tự ưu tiên FR-014: coupon vừa hết hạn vừa dưới ngưỡng → chỉ trả `COUPON_EXPIRED`; `checkCouponAvailability(coupon | undefined, now)` trả NOT_FOUND / EXPIRED / ok mà không xét ngưỡng; `evaluateCouponThreshold` với coupon có `expiresOn: "2020-01-01"` và tạm tính đạt ngưỡng → `ok: true` (không xét hạn dùng), dưới ngưỡng → `COUPON_MIN_SUBTOTAL_NOT_MET`; `evaluateCoupon` cho cùng kết quả với `evaluateCouponThreshold` khi mã còn hạn; `couponErrorMessage` trả đúng: "Mã giảm giá không tồn tại", "Mã giảm giá đã hết hạn", và `` `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500000)}. Mua thêm ${formatCurrency(50000)} để dùng mã này.` ``
- [x] T005 [P] Tạo `src/features/coupons/coupon-catalog.test.ts`: `findCoupon(" giam50k ")` trả định nghĩa `GIAM50K`; `findCoupon("KHONGCO")` trả `undefined`; kiểm tra toàn vẹn dữ liệu `COUPONS`: mọi `code` là chữ HOA không khoảng trắng và duy nhất, `percent` có `value` nguyên 1–100 và `maxDiscount > 0`, `fixed` có `value > 0` và không có `maxDiscount`; ba mã khớp đúng bảng FR-022
- [x] T006 [P] Tạo `src/features/coupons/coupon-schema.test.ts` cho `validateCouponSchema`: `{ code: " shoplite10 " }` hợp lệ và trim thành `"shoplite10"`; `{ code: "" }` và `{ code: "   " }` lỗi với message "Vui lòng nhập mã giảm giá" (kiểm qua `toFieldErrors` → `details.code`); chuỗi 33 ký tự lỗi; chuỗi đúng 32 ký tự hợp lệ; thiếu `code` lỗi
- [x] T007 [P] Bổ sung `src/features/checkout/pricing.test.ts` (giữ nguyên mọi test cũ) cho `calculateOrderTotals(lines, method, discount)`: không truyền `discount` → kết quả như cũ và `discount: 0`; tạm tính 520.000 standard, discount 50.000 → `{ subtotal: 520000, discount: 50000, shippingFee: 30000, total: 500000 }`; 550.000 − 50.000 → ship 0, total 500.000; biên tạm tính sau giảm 499.999 → ship 30.000, 500.000 → 0, 500.001 → 0; `express` có discount vẫn 60.000; discount > subtotal bị kẹp về subtotal (total = ship); discount âm bị kẹp về 0
- [x] T008 [P] Bổ sung `src/features/checkout/checkout-schema.test.ts` cho `placeOrderSchema`: `couponCode: " SHOPLITE10 "` được trim; không có `couponCode` vẫn hợp lệ; `couponCode` 33 ký tự lỗi; payload chứa `discount`, `total`, `subtotal` và `items[].unitPrice` → kết quả parse KHÔNG có các khóa này (FR-016)
- [x] T009 [P] Tạo `src/features/orders/order-errors.test.ts`: `new OrderError("COUPON_NOT_FOUND" | "COUPON_EXPIRED" | "COUPON_MIN_SUBTOTAL_NOT_MET", …).httpStatus === 422`; `couponOrderError(failure, "GIAM50K")` với failure `COUPON_MIN_SUBTOTAL_NOT_MET` (minSubtotal 500.000, shortfall 50.000) trả `OrderError` có `code` đúng, `message` bằng `couponErrorMessage(failure)`, `details` = `{ couponCode: "GIAM50K", minSubtotal: "500000", shortfall: "50000" }` (chuỗi số); với NOT_FOUND / EXPIRED thì `details` chỉ có `{ couponCode }`; các mã cũ giữ nguyên status (400/422/409/404/409)
- [x] T010 Chạy `npx vitest run src/features/coupons src/features/checkout/pricing.test.ts src/features/checkout/checkout-schema.test.ts src/features/orders/order-errors.test.ts` và xác nhận các test mới FAIL (đỏ); test cũ vẫn xanh

### Implementation

- [x] T011 Tạo `src/features/coupons/coupon-service.ts` (thuần, không `"use client"`, không import `src/data/`): `normalizeCouponCode` (trim + `toUpperCase`), `couponExpiryInstant(expiresOn)` = `new Date(\`${expiresOn}T23:59:59.999+07:00\`)`, `isCouponExpired(coupon, now)` (`now > expiryInstant`), `calculateCouponDiscount(coupon, subtotal)`=`Math.min(raw, subtotal)`với`raw = fixed ? value : Math.min(Math.floor(subtotal * value / 100), maxDiscount)`, `checkCouponAvailability(coupon | undefined, now)`, `evaluateCouponThreshold(coupon, subtotal)`(chỉ ngưỡng + tính tiền, không xét hạn),`evaluateCoupon(coupon | undefined, subtotal, now)`=`checkCouponAvailability`+`evaluateCouponThreshold`, theo thứ tự tồn tại → hết hạn → ngưỡng (`subtotal < minSubtotal`→ shortfall =`minSubtotal − subtotal`), `couponErrorMessage(failure)`dùng`formatCurrency`; làm T004 xanh
- [x] T012 [P] Tạo `src/features/coupons/coupon-schema.ts`: `validateCouponSchema = z.object({ code: z.string().trim().min(1, "Vui lòng nhập mã giảm giá").max(32) })` và `type ValidateCouponInput = z.infer<…>`; làm T006 xanh
- [x] T013 [P] Sửa `src/features/checkout/pricing.ts`: `calculateOrderTotals(lines, method, discount = 0)` kẹp `discount` vào `[0, subtotal]`, `shippingFee = calculateShippingFee(subtotal − discount, method)`, `total = subtotal − discount + shippingFee`, thêm `discount` vào `OrderTotals`; KHÔNG import coupons; không đổi `SHIPPING_OPTIONS` / `FREE_SHIPPING_THRESHOLD`; làm T007 xanh
- [x] T014 [P] Sửa `src/features/checkout/checkout-schema.ts`: thêm `couponCode: z.string().trim().max(32).optional()` vào `placeOrderSchema` (comment: chuỗi rỗng sau trim coi như không có mã); KHÔNG thêm trường tiền; làm T008 xanh
- [x] T015 [P] Sửa `src/features/orders/types.ts`: thêm `discount?: number` (comment: "Đơn mới luôn ghi (0 nếu không dùng mã). Đơn cũ: thiếu, đọc là `?? 0`") và `coupon?: { code: string; discount: number }` (comment: "Snapshot lúc đặt (FR-019); chỉ có khi đơn dùng mã") vào `Order`
- [x] T016 [P] Tạo `src/features/coupons/coupon-catalog.ts` (sau T011): `findCoupon(code: string): CouponDefinition | undefined` chuẩn hóa bằng `normalizeCouponCode` rồi tra `COUPONS`; comment tiếng Việt "chỉ import từ server"; làm T005 xanh
- [x] T017 [P] Sửa `src/features/orders/order-errors.ts` (sau T011): thêm `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_SUBTOTAL_NOT_MET` vào `OrderErrorCode` và `HTTP_STATUS_BY_CODE` (đều **422**); export `couponOrderError(failure: CouponEvaluationFailure | Extract<CouponAvailability, { ok: false }>, couponCode: string): OrderError`; làm T009 xanh
- [x] T018 Chạy `npm run check` và sửa đến khi pass

**Checkpoint**: Logic thuần sẵn sàng — bắt đầu các user story.

---

## Phase 3: User Story 1 - Áp dụng mã hợp lệ và đặt hàng với giá đã giảm (Priority: P1) 🎯 MVP

**Goal**: Khách nhập mã hợp lệ, bấm "Áp dụng", thấy dòng "Giảm giá (MÃ)", phí ship và tổng mới; đặt hàng thì server tính lại và lưu `discount` + `coupon`.

**Independent Test**: Giỏ `p010` + `p007` (400.000) → áp `SHOPLITE10` → thấy giảm 40.000, ship 30.000, tổng 390.000 → đặt hàng → response 201 có `discount: 40000`, `coupon: { code: "SHOPLITE10", discount: 40000 }`.

### Tests for User Story 1 (viết TRƯỚC, phải FAIL) ⚠️

- [x] T019 [P] [US1] Bổ sung `src/features/orders/order-service.test.ts` (dùng `createInMemoryOrderRepository`, `now` và `generateId` cố định, inject `findCoupon` trả coupon trong test): `couponCode: "shoplite10"` với 1 × sản phẩm giá 1.290.000 → đơn lưu `subtotal 1290000, discount 100000, shippingFee 0, total 1190000, coupon { code: "SHOPLITE10", discount: 100000 }`; tạm tính 400.000 → `discount 40000, shippingFee 30000, total 390000`; GIAM50K với tạm tính 520.000 standard → `shippingFee 30000, total 500000`; không có `couponCode` → `discount: 0` và không có khóa `coupon` (hồi quy); `couponCode: "   "` → như không có mã; bất biến `total === subtotal − discount + shippingFee`
- [x] T020 [P] [US1] Bổ sung `src/app/api/orders/route.test.ts` (giữ `// @vitest-environment node` và `vi.mock("@/features/orders/server", …)` với repository in-memory): POST với `couponCode: "SHOPLITE10"`, `items: [{ productId: "p001", quantity: 1 }]` → 201, `discount === 100_000`, `total === 1_190_000`, `coupon.code === "SHOPLITE10"`; POST không `couponCode` → 201, `discount === 0`, không có `coupon`
- [x] T021 [P] [US1] Tạo `src/app/api/coupons/validate/route.test.ts` với dòng đầu `// @vitest-environment node`: POST `{ code: " shoplite10 " }` → 200, body `{ coupon: { code: "SHOPLITE10", type: "percent", value: 10, maxDiscount: 100000, minSubtotal: 300000 } }`; body chỉ có khóa `coupon` và `coupon` không phải mảng (không lộ danh sách mã)
- [x] T022 [P] [US1] Tạo `src/features/coupons/components/coupon-field.test.tsx`: `getByLabelText("Mã giảm giá")` tồn tại; gõ "shoplite10" rồi bấm `getByRole("button", { name: "Áp dụng" })` gọi `onApply("shoplite10")`; nhấn Enter trong ô gọi `onApply` và KHÔNG kích hoạt `onSubmit` của `<form>` bao ngoài (spy); `pending = true` → nút disabled với chữ "Đang kiểm tra…"; nút "Áp dụng" có `type="button"`
- [x] T023 [P] [US1] Tạo `src/features/checkout/components/checkout-summary.test.tsx`: `discount = 0` → không có `checkout-discount`; items tổng 520.000, `standard`, `discount = 50000`, `couponCode = "GIAM50K"` → `checkout-discount` chứa "Giảm giá (GIAM50K)" và `−${formatCurrency(50000)}`, `shipping-fee` 30.000, `checkout-total` 500.000; items 550.000 → `shipping-fee` "Miễn phí", total 500.000; dòng giảm giá nằm giữa "Tạm tính" và "Phí giao hàng"
- [x] T024 [P] [US1] Bổ sung `src/features/checkout/components/checkout-form.test.tsx` (fetch stub phân nhánh URL; validate trả 200 `{ coupon }` đúng định nghĩa): giỏ `p010` + `p007` (400.000), gõ "shoplite10" + "Áp dụng" → fetch `/api/coupons/validate` với body `{ code: "shoplite10" }`, hiện "Giảm giá (SHOPLITE10)" −40.000, `shipping-fee` 30.000, `checkout-total` 390.000; giỏ `p001` + `p007` (1.540.000) → giảm 100.000 (mức tối đa); giỏ `p010 × 2` + `p007` (550.000) + `GIAM50K` → giảm 50.000, ship "Miễn phí", tổng 500.000; thẻ phương thức giao hàng tiêu chuẩn hiển thị phí khớp với tóm tắt (tính trên tạm tính sau giảm); điền form và bấm "Đặt hàng" → body POST `/api/orders` có `couponCode: "SHOPLITE10"` và KHÔNG có `discount` / `total` / `subtotal`; 201 → `push("/orders/{id}?placed=1")`
- [x] T025 [US1] Chạy `npx vitest run src/features/orders/order-service.test.ts src/app/api src/features/coupons src/features/checkout/components` và xác nhận các test US1 mới FAIL (đỏ)

### Implementation for User Story 1

- [x] T026 [P] [US1] Sửa `src/features/orders/order-service.ts`: thêm `findCoupon?: (code: string) => CouponDefinition | undefined` vào `OrderServiceDeps` (mặc định `findCoupon` từ `@/features/coupons/coupon-catalog`); trong `placeOrder` sau khi tính `subtotal` từ catalog: nếu `couponCode` khác rỗng → `evaluateCoupon(findCoupon(couponCode), subtotal, now())`; nhánh `ok: true` → `calculateOrderTotals(orderItems, shippingMethod, evaluation.discount)` và lưu `discount`, `coupon: { code: evaluation.coupon.code, discount }`; không có mã → `discount: 0`, không có `coupon` (nhánh `ok: false` làm ở T044); KHÔNG đọc tiền từ input; làm T019, T020 xanh
- [x] T027 [P] [US1] Tạo `src/app/api/coupons/validate/route.ts` (route mỏng, không `"use client"`): `POST` → `readJsonBody` → `validateCouponSchema.safeParse` → `findCoupon` → `checkCouponAvailability(coupon, new Date())` → `ok` trả `NextResponse.json({ coupon }, { status: 200 })`; bọc trong `try/catch` gọi `handleRouteError`; làm T021 xanh (nhánh lỗi làm ở T036)
- [x] T028 [P] [US1] Tạo `src/features/coupons/components/coupon-field.tsx` (`"use client"`, named export `CouponField`, props `{ appliedCode, evaluation, error, pending, onApply(code), onRemove() }` — component chỉ hiển thị, state ở `CheckoutForm`): `<label htmlFor="couponCode">Mã giảm giá</label>`, `<input id="couponCode">`, nút `Button` `type="button"` "Áp dụng" / "Đang kiểm tra…" khi `pending`; Enter trong ô gọi `preventDefault()` rồi `onApply`; làm T022 xanh
- [x] T029 [P] [US1] Sửa `src/features/checkout/components/checkout-summary.tsx`: thêm props `discount: number` và `couponCode?: string`; dùng `calculateOrderTotals(items, shippingMethod, discount)`; khi `discount > 0` render dòng "Giảm giá ({couponCode})" / `−{formatCurrency(discount)}` với `data-testid="checkout-discount"` giữa "Tạm tính" và "Phí giao hàng"; làm T023 xanh
- [x] T030 [US1] Sửa `src/features/checkout/components/checkout-form.tsx` (sau T028, T029): state `appliedCoupon: CouponDefinition | null`, `couponPending`; `handleApplyCoupon(code)` gọi `fetch("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code }) })`, 200 → lưu `coupon`; mỗi render tính `evaluation = appliedCoupon ? evaluateCouponThreshold(appliedCoupon, subtotal) : null` (client KHÔNG dùng `new Date()` để quyết định hạn dùng — hạn dùng do server kiểm tra) và `discount = evaluation?.ok ? evaluation.discount : 0`; đặt `CouponField` ngay trên `CheckoutSummary` trong cột tóm tắt; truyền `discount`/`couponCode` cho `CheckoutSummary`; đổi thẻ phương thức giao hàng sang `calculateShippingFee(subtotal − discount, method)`; payload POST `/api/orders` thêm `couponCode: appliedCoupon.code` khi `evaluation.ok`; chỉ import `coupon-service`, `coupon-schema`, `types` (KHÔNG import `coupon-catalog` / `src/data/coupons.ts`); làm T024 xanh
- [x] T031 [US1] Chạy `npm run check` và sửa đến khi pass

**Checkpoint**: Áp mã hợp lệ và đặt hàng có giảm giá chạy được độc lập.

---

## Phase 4: User Story 2 - Thông báo rõ lý do khi mã không hợp lệ (Priority: P1)

**Goal**: Mã không dùng được → thông báo tiếng Việt đúng một lý do, cạnh ô mã, tổng tiền không đổi.

**Independent Test**: Lần lượt áp `KHONGCO`, `TET2026`, `GIAM50K` với giỏ `p006` (450.000) → thấy "Mã giảm giá không tồn tại", "Mã giảm giá đã hết hạn", "Đơn hàng chưa đạt giá trị tối thiểu 500.000 ₫. Mua thêm 50.000 ₫ để dùng mã này."; tổng tiền không đổi.

### Tests for User Story 2 (viết TRƯỚC, phải FAIL) ⚠️

- [x] T032 [P] [US2] Bổ sung `src/app/api/coupons/validate/route.test.ts`: `{ code: "KHONGCO" }` → 422 `error.code === "COUPON_NOT_FOUND"`, `error.message === "Mã giảm giá không tồn tại"`, `error.details.couponCode === "KHONGCO"`; `TET2026` → 422 `COUPON_EXPIRED` "Mã giảm giá đã hết hạn"; biên hết hạn dùng `vi.useFakeTimers({ toFake: ["Date"] })` + `vi.setSystemTime`: `2026-02-28T23:59:59.999+07:00` → 200, `2026-03-01T00:00:00.000+07:00` → 422 (khôi phục `vi.useRealTimers()` sau test); `{ code: "   " }` → 400 `VALIDATION_ERROR` với `details.code === "Vui lòng nhập mã giảm giá"`; mã 33 ký tự → 400; body không phải JSON → 400 "Body phải là JSON hợp lệ"
- [x] T033 [P] [US2] Bổ sung `src/features/coupons/components/coupon-field.test.tsx`: prop `error = "Mã giảm giá không tồn tại"` → `getByRole("alert")` chứa đúng text, ô mã có `aria-invalid="true"` và `aria-describedby` trỏ tới `id` của alert; `error = null` → không có alert, `aria-invalid` không bật
- [x] T034 [P] [US2] Bổ sung `src/features/checkout/components/checkout-form.test.tsx`: validate trả 422 `COUPON_NOT_FOUND` → alert "Mã giảm giá không tồn tại", không có `checkout-discount`, `checkout-total` không đổi; 422 `COUPON_EXPIRED` → "Mã giảm giá đã hết hạn"; giỏ `p006` (450.000) + validate 200 `GIAM50K` → alert `` `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500000)}. Mua thêm ${formatCurrency(50000)} để dùng mã này.` ``, mã KHÔNG được lưu (không có nút "Gỡ mã", không có dòng giảm giá); giỏ `p007 × 2` (đúng 500.000) + `GIAM50K` → được áp (giảm 50.000, ship 30.000, tổng 480.000); ô trống hoặc chỉ khoảng trắng + "Áp dụng" → alert "Vui lòng nhập mã giảm giá" và fetch KHÔNG được gọi; fetch reject (lỗi mạng) → alert thông báo chung tiếng Việt, không treo trạng thái "Đang kiểm tra…"
- [x] T035 [US2] Chạy `npx vitest run src/app/api/coupons src/features/coupons/components src/features/checkout/components` và xác nhận các test US2 mới FAIL (đỏ)

### Implementation for User Story 2

- [x] T036 [P] [US2] Sửa `src/app/api/coupons/validate/route.ts`: `safeParse` lỗi → throw `OrderError("VALIDATION_ERROR", "Vui lòng nhập mã giảm giá", toFieldErrors(error))`; `checkCouponAvailability` `ok: false` → throw `couponOrderError(result, normalizeCouponCode(code))`; mọi lỗi đi qua `handleRouteError` (shape `{ error: { code, message, details } }`); làm T032 xanh
- [x] T037 [P] [US2] Sửa `src/features/coupons/components/coupon-field.tsx`: render `error` dưới ô mã trong phần tử `role="alert"` có `id="couponCode-error"`; input `aria-invalid={Boolean(error)}` và `aria-describedby="couponCode-error"` khi có lỗi; làm T033 xanh
- [x] T038 [US2] Sửa `src/features/checkout/components/checkout-form.tsx` (sau T037): state `couponError`; trước khi gọi API, `validateCouponSchema.safeParse({ code })` — lỗi thì hiện message, không fetch; response lỗi đọc `ApiErrorBody` → `couponError = error.message`; 200 → chạy `evaluateCouponThreshold(coupon, subtotal)`, nếu `COUPON_MIN_SUBTOTAL_NOT_MET` thì hiện `couponErrorMessage` và KHÔNG lưu mã; fetch reject → thông báo chung tiếng Việt; luôn tắt `couponPending` trong `finally`; làm T034 xanh
- [x] T039 [US2] Chạy `npm run check` và sửa đến khi pass

**Checkpoint**: US1 + US2 chạy độc lập; mọi lý do lỗi hiển thị đúng.

---

## Phase 5: User Story 5 - Chống gian lận: hệ thống tự xác nhận khi đặt hàng (Priority: P1)

**Goal**: Khi đặt hàng, server kiểm tra lại mã theo giờ server và tạm tính từ catalog, bỏ qua mọi con số tiền client gửi, từ chối đơn khi mã không còn hợp lệ.

**Independent Test**: POST `/api/orders` kèm `couponCode: "SHOPLITE10"`, `discount: 999999`, `total: 1` → 201 với `discount: 100000`, `total: 1190000`; POST với `TET2026` → 422 `COUPON_EXPIRED`, không có đơn nào được lưu.

### Tests for User Story 5 (viết TRƯỚC, phải FAIL) ⚠️

- [x] T040 [P] [US5] Bổ sung `src/features/orders/order-service.test.ts`: `couponCode: "KHONGCO"` → throw `OrderError` `COUPON_NOT_FOUND`, `details.couponCode === "KHONGCO"`, repository rỗng; `TET2026` với `now` = `2026-03-01T00:01:00+07:00` → `COUPON_EXPIRED`, không lưu; `TET2026` với `now` = `2026-02-28T23:58:00+07:00` và tạm tính 1.290.000 → thành công, `discount 193500` (15%, dưới mức tối đa 200.000); `GIAM50K` với tạm tính 450.000 → `COUPON_MIN_SUBTOTAL_NOT_MET`, `details` = `{ couponCode: "GIAM50K", minSubtotal: "500000", shortfall: "50000" }`, không lưu; input chứa `discount: 500000`, `total: 1`, `subtotal: 1`, `items[].unitPrice: 1` cùng `SHOPLITE10` → đơn chỉ giảm theo quy tắc mã (FR-016, US5 kịch bản 1); thứ tự kiểm tra: tồn kho không đủ + mã không tồn tại → `INSUFFICIENT_STOCK` (sản phẩm/tồn kho kiểm trước mã)
- [x] T041 [P] [US5] Bổ sung `src/app/api/orders/route.test.ts`: POST `SHOPLITE10` + `p001 × 1` kèm `discount: 999_999, total: 1` → 201, `discount === 100_000`, `total === 1_190_000`; 422 `COUPON_NOT_FOUND` (`KHONGCO`); 422 `COUPON_EXPIRED` (`TET2026`); 422 `COUPON_MIN_SUBTOTAL_NOT_MET` (`GIAM50K` + `p006 × 1`) có `error.details.shortfall === "50000"` và `error.details.minSubtotal === "500000"`
- [x] T042 [P] [US5] Bổ sung `src/features/checkout/components/checkout-form.test.tsx`: áp `SHOPLITE10` thành công ở giỏ 400.000 (validate stub 200), POST `/api/orders` stub 422 `{ error: { code: "COUPON_EXPIRED", message: "Mã giảm giá đã hết hạn", details: { couponCode: "SHOPLITE10" } } }` (giả lập mã hết hạn giữa lúc áp và lúc đặt) → alert "Mã giảm giá đã hết hạn" hiển thị trong vùng ô mã (không phải `submitError` chung), mã vẫn được giữ: `getByTestId("checkout-discount")` vẫn chứa "SHOPLITE10" và −40.000 (nút "Gỡ mã" kiểm ở T048(g)), `push` KHÔNG được gọi, giỏ hàng không bị xóa; tương tự với `COUPON_MIN_SUBTOTAL_NOT_MET` hiện đúng message server trả; lỗi không phải `COUPON_*` (ví dụ `INSUFFICIENT_STOCK`) vẫn hiện ở `submitError` như cũ
- [x] T043 [US5] Chạy `npx vitest run src/features/orders/order-service.test.ts src/app/api/orders src/features/checkout/components` và xác nhận các test US5 mới FAIL (đỏ)

### Implementation for User Story 5

- [x] T044 [US5] Sửa `src/features/orders/order-service.ts`: nhánh `evaluation.ok === false` → `throw couponOrderError(evaluation, normalizeCouponCode(couponCode))` TRƯỚC `repository.save` (không âm thầm đặt đơn không giảm giá — FR-018); giữ thứ tự `mergeItems` → sản phẩm/tồn kho → mã; chỉ throw `OrderError`, không throw `Error` thường; làm T040, T041 xanh
- [x] T045 [P] [US5] Sửa `src/features/checkout/components/checkout-form.tsx`: khi POST `/api/orders` trả lỗi có `error.code.startsWith("COUPON_")` → `setCouponError(error.message)`, GIỮ `appliedCoupon` (không tự gỡ — Q1), không gọi `clear()` / `push`; lỗi khác giữ luồng `submitError` hiện có; làm T042 xanh
- [x] T046 [US5] Chạy `npm run check` và sửa đến khi pass

**Checkpoint**: Toàn bộ P1 xong (US1 + US2 + US5) — server là nguồn sự thật về tiền.

---

## Phase 6: User Story 3 - Gỡ mã và đổi mã (Priority: P2)

**Goal**: Gỡ mã về giá gốc; áp mã mới thành công thì thay mã cũ, thất bại thì giữ mã cũ; giỏ đổi dưới ngưỡng thì mã tạm ngưng và tự có hiệu lực lại; đặt hàng khi tạm ngưng bị chặn; mã được giữ trong phiên (`sessionStorage`, chỉ chuỗi mã) khi tải lại trang hoặc quay về giỏ rồi vào lại (Q4).

**Independent Test**: Áp `SHOPLITE10` → "Gỡ mã" → tổng về giá gốc → áp `GIAM50K` → chỉ `GIAM50K` có hiệu lực.

### Tests for User Story 3 (viết TRƯỚC, phải FAIL) ⚠️

- [x] T047 [P] [US3] Bổ sung `src/features/coupons/components/coupon-field.test.tsx`: `appliedCode = "SHOPLITE10"` → hiện tên mã và `getByRole("button", { name: "Gỡ mã" })` (`type="button"`), bấm gọi `onRemove`; `evaluation` là `COUPON_MIN_SUBTOTAL_NOT_MET` (tạm ngưng) → mã vẫn hiển thị cùng nút "Gỡ mã" và alert `couponErrorMessage(evaluation)`
- [x] T048 [P] [US3] Bổ sung `src/features/checkout/components/checkout-form.test.tsx`: (a) áp `SHOPLITE10` ở giỏ 400.000 rồi "Gỡ mã" → không còn `checkout-discount`, `checkout-total` về 430.000, POST sau đó không có `couponCode`; (b) áp `SHOPLITE10` rồi áp thành công `GIAM50K` (giỏ `p006` + `p010` = 600.000) → chỉ có "Giảm giá (GIAM50K)" −50.000, POST gửi `couponCode: "GIAM50K"`; (c) đang có `SHOPLITE10`, áp `KHONGCO` (422) → alert lỗi, `SHOPLITE10` và số tiền giảm giữ nguyên; (d) áp `GIAM50K` ở 600.000, rồi `act(() => cartStore.dispatch(remove p010))` còn 450.000 → mã vẫn hiển thị, không có dòng giảm giá, alert `` `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500000)}. Mua thêm ${formatCurrency(50000)} để dùng mã này.` ``, `checkout-total` = 480.000 (450.000 + ship 30.000); (e) thêm lại `p010` → mã tự có hiệu lực (giảm 50.000) không cần bấm "Áp dụng"; (f) đang tạm ngưng, điền form hợp lệ và bấm "Đặt hàng" → fetch `/api/orders` KHÔNG được gọi, alert cần mua thêm hiển thị, mã vẫn giữ; (g) sau lỗi server `COUPON_EXPIRED` (stub giống T042, mã `SHOPLITE10`), nút "Gỡ mã" hiển thị; bấm "Gỡ mã" rồi "Đặt hàng" → POST lần hai không có `couponCode`, 201 → `push` (US5 kịch bản 4); (h) giữ trong phiên (FR-023, US3 kịch bản 7): áp `GIAM50K` ở 600.000 → `sessionStorage.getItem("shoplite:coupon") === "GIAM50K"` (chỉ chuỗi mã, không có số tiền) → `unmount()` → bỏ `p010` (còn 450.000) → render lại → validate được gọi lại với `{ code: "GIAM50K" }`, mã hiển thị ở trạng thái tạm ngưng với alert "Mua thêm …50.000…" (KHÔNG bị từ chối như lúc áp mới); (i) mount với `sessionStorage` = `"KHONGCO"` và validate trả 422 → alert "Mã giảm giá không tồn tại", không có mã đang áp, key bị xóa; (j) "Gỡ mã" → key bị xóa; đặt hàng 201 → key bị xóa. Thêm `sessionStorage.clear()` vào `beforeEach` (vitest.setup chỉ xóa `localStorage`)
- [x] T049 [US3] Chạy `npx vitest run src/features/coupons/components src/features/checkout/components` và xác nhận các test US3 mới FAIL (đỏ)

### Implementation for User Story 3

- [x] T050 [P] [US3] Sửa `src/features/coupons/components/coupon-field.tsx`: khi có `appliedCode` hiện tên mã + nút `Button` `type="button"` "Gỡ mã" gọi `onRemove`; khi `evaluation` là tạm ngưng hiện `couponErrorMessage(evaluation)` trong vùng `role="alert"` (dùng chung `id="couponCode-error"`); ưu tiên hiển thị `error` (lỗi áp mã / lỗi server) nếu có; làm T047 xanh
- [x] T051 [US3] Sửa `src/features/checkout/components/checkout-form.tsx` (sau T050): `handleRemoveCoupon` đặt `appliedCoupon = null` và xóa `couponError`; áp mã mới chỉ thay `appliedCoupon` khi thành công (thất bại giữ mã cũ — FR-005); xóa `couponError` khi áp thành công; truyền `evaluation` cho `CouponField` để hiện trạng thái tạm ngưng (tính lại mỗi render theo `subtotal` từ `useCart` nên tự có hiệu lực lại — FR-006); trong submit, nếu `appliedCoupon` và `evaluation.ok === false` → chặn, không fetch, hiện lại thông báo cạnh ô mã; giữ trong phiên (FR-023): áp thành công → `sessionStorage.setItem("shoplite:coupon", coupon.code)`, gỡ mã / đặt hàng 201 → `removeItem`; `useEffect` khi mount đọc key và gọi lại `/api/coupons/validate` — 200 thì khôi phục `appliedCoupon` kể cả khi dưới ngưỡng (tạm ngưng, khác với lúc áp mới ở T038), 422 thì xóa key và hiện `error.message`; mọi truy cập `sessionStorage` bọc `try/catch`, chỉ lưu chuỗi mã (không lưu tiền); làm T048 xanh
- [x] T052 [US3] Chạy `npm run check` và sửa đến khi pass

**Checkpoint**: US1, US2, US3, US5 cùng hoạt động.

---

## Phase 7: User Story 4 - Xem mã và số tiền giảm trong chi tiết đơn hàng (Priority: P2)

**Goal**: Trang chi tiết đơn hiển thị mã và số tiền giảm (snapshot), đơn không mã và đơn cũ hiển thị như hiện tại.

**Independent Test**: Mở chi tiết một đơn có `coupon: { code: "GIAM50K", discount: 50000 }` → thấy "Giảm giá (GIAM50K)" −50.000 và tổng đã trừ.

### Tests for User Story 4 (viết TRƯỚC, phải FAIL) ⚠️

- [x] T053 [P] [US4] Tạo `src/app/orders/[id]/page.test.tsx`: `vi.mock("@/features/orders/server", …)` để `orderService.getOrder` trả đơn dựng sẵn; `vi.mock("next/navigation", …)` (`useRouter`, `notFound`); render bằng `render(await OrderDetailPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }))`; đơn có `discount: 50000, coupon: { code: "GIAM50K", discount: 50000 }` → `getByTestId("order-discount")` chứa "Giảm giá (GIAM50K)" và `−${formatCurrency(50000)}`, tổng cộng = `total` đã lưu; đơn `discount: 0` không có `coupon` → không có `order-discount`; đơn cũ thiếu cả `discount` lẫn `coupon` → render không lỗi, không có `order-discount`; đơn có `coupon.code = "MADAXOA"` (không có trong `COUPONS`) vẫn hiển thị đúng mã và số tiền snapshot (US4 kịch bản 3)
- [x] T054 [P] [US4] Bổ sung `src/features/orders/order-repository.test.ts` (giữ `// @vitest-environment node`, `mkdtemp(os.tmpdir())` + `rm`): `save` đơn có `discount` và `coupon` rồi đọc lại bằng `findById` / `findAll` → hai trường giữ nguyên; đơn JSON cũ không có hai trường vẫn đọc được (FR-019, FR-021)
- [x] T055 [US4] Chạy `npx vitest run "src/app/orders" src/features/orders/order-repository.test.ts` và xác nhận các test US4 mới FAIL (đỏ) (test repository có thể đã xanh vì interface không đổi — ghi nhận và tiếp tục)

### Implementation for User Story 4

- [x] T056 [US4] Sửa `src/app/orders/[id]/page.tsx`: khi `order.coupon` có, thêm dòng `<dt>Giảm giá ({order.coupon.code})</dt><dd>−{formatCurrency(order.coupon.discount)}</dd>` với `data-testid="order-discount"` giữa "Tạm tính" và "Phí giao hàng"; không tính lại từ catalog mã; giữ `export const dynamic = "force-dynamic"`, không thêm `"use client"`; làm T053 xanh
- [x] T057 [US4] Chạy `npm run check` và sửa đến khi pass

**Checkpoint**: Tất cả user story hoàn chỉnh và kiểm chứng độc lập.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E, tài liệu, kiểm tra ràng buộc kiến trúc, xác nhận cuối.

- [x] T058 Bổ sung test mới vào `e2e/shopping-flow.spec.ts` (giữ nguyên 2 test hiện có): `test("khách hàng áp mã SHOPLITE10 và đặt hàng với giá đã giảm", …)` — `page.goto("/products/tai-nghe-khong-day-soundmax-pro")` → `getByTestId("purchase-panel")` bấm "Thêm vào giỏ" → mở giỏ → "Tiến hành thanh toán" → `getByLabel("Mã giảm giá").fill("shoplite10")` → bấm "Áp dụng" → `expect(getByTestId("checkout-discount")).toContainText("SHOPLITE10")` và `"100.000"`, `shipping-fee` "Miễn phí", `checkout-total` `"1.190.000"` → điền Họ và tên / Số điện thoại / Địa chỉ giao hàng → "Đặt hàng" → URL `/orders/SL-…?placed=1` → `getByTestId("order-discount")` chứa "SHOPLITE10" và "100.000", tổng cộng chứa "1.190.000"
- [x] T059 Chạy `npm run test:e2e` và xác nhận toàn bộ `e2e/shopping-flow.spec.ts` (cả kịch bản cũ và kịch bản SHOPLITE10) pass (bắt buộc vì đổi luồng đặt hàng)
- [x] T060 [P] Cập nhật `AGENTS.md`: mục 1 thêm key `sessionStorage["shoplite:coupon"]` (chỉ lưu chuỗi mã đã áp, giữ trong phiên — FR-023) cạnh dòng `localStorage["shoplite:cart"]`; mục 3 codemap thêm dòng Coupons (`src/features/coupons/`: `coupon-service.ts`, `coupon-catalog.ts`, `coupon-schema.ts`, `components/coupon-field.tsx`; `src/data/coupons.ts`), thêm `api/coupons/validate/route.ts` vào dòng API, cập nhật Luồng 2 (payload có `couponCode`, `evaluateCoupon` trước `calculateOrderTotals`); mục 5 thêm: ngưỡng miễn ship xét trên tạm tính **sau giảm**, mỗi đơn tối đa một mã, lỗi `COUPON_*` → 422; mục 7 thêm: không import `coupon-catalog` / `src/data/coupons.ts` từ file `"use client"`, không lưu số tiền giảm/tổng tiền vào `sessionStorage`, client không xét hạn dùng bằng giờ máy khách
- [x] T061 [P] Cập nhật `README.md`: mô tả tính năng mã giảm giá, bảng 3 mã ban đầu, endpoint `POST /api/coupons/validate`, trường `couponCode` của `POST /api/orders`, quy tắc ship sau giảm và ghi chú dòng "Miễn phí giao hàng cho đơn từ 500.000 ₫" ở trang chủ/footer (rủi ro 2 trong plan)
- [x] T062 [P] Rà soát ràng buộc: `grep -rln '"use client"' src | xargs grep -l "coupon-catalog\|data/coupons\|orders/server"` phải rỗng; không hardcode `50_000` / `500_000` / `300_000` / `30_000` trong component (`src/features/**/components/`, `src/app/**/page.tsx`); route `src/app/api/coupons/validate/route.ts` không chứa quy tắc nghiệp vụ
- [x] T063 Chạy kịch bản thủ công và curl trong `specs/001-checkout-discount-code/quickstart.md` (mục 2, 3) trên `npm run dev`; sau đó xóa các đơn thử khỏi `storage/orders.json`
- [x] T064 Chạy `npm run format`
- [x] T065 Chạy `npm run check` lần cuối và sửa đến khi pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: không phụ thuộc.
- **Foundational (Phase 2)**: sau Setup — CHẶN mọi user story.
- **US1 (Phase 3)**: sau Foundational.
- **US2 (Phase 4)**: sau US1 (mở rộng `validate/route.ts`, `coupon-field.tsx`, `checkout-form.tsx` do US1 tạo).
- **US5 (Phase 5)**: sau US1 (mở rộng nhánh lỗi trong `order-service.ts`). Phần server (T040, T041, T044) độc lập với US2 và có thể làm song song US2; phần `checkout-form` (T042, T045) nên làm sau US2 vì cùng file.
- **US3 (Phase 6)**: sau US2 và US5 (dùng `couponError`, xử lý lỗi `COUPON_*` từ server ở kịch bản (g)).
- **US4 (Phase 7)**: chỉ cần Foundational (T015 type `Order`) để làm; nghiệm thu đầy đủ cần US1 (đơn có `coupon` thật). Có thể làm song song với US2/US3/US5 vì chỉ chạm `page.tsx`, `page.test.tsx`, `order-repository.test.ts`.
- **Polish (Phase 8)**: sau khi xong các story mong muốn; T058/T059 cần US1 + US4.

### User Story Dependencies

```text
Setup → Foundational ─┬─▶ US1 ─┬─▶ US2 ─┐
                      │        └─▶ US5 ─┴─▶ US3 ─┐
                      └─▶ US4 (song song được) ───┴─▶ Polish (E2E, docs)
```

### Within Each User Story

- Test viết trước → chạy xác nhận FAIL → cài đặt → `npm run check`.
- Logic thuần / service trước route; component con (`CouponField`, `CheckoutSummary`) trước `CheckoutForm`.
- Không xóa hoặc làm yếu test hiện có để code pass.

### Parallel Opportunities

- Phase 1: T002 song song T001.
- Phase 2: T004–T009 (6 file test khác nhau) song song; T012–T015 song song với T011; T016, T017 song song với nhau sau T011.
- US1: T019–T024 (6 file test) song song; T026–T029 song song; T030 sau T028 + T029.
- US2: T032–T034 song song; T036 ∥ T037.
- US5: T040–T042 song song; T045 ∥ T044.
- US3: T047 ∥ T048.
- US4: T053 ∥ T054; cả phase song song được với US2/US5 (khác file).
- Polish: T060, T061, T062 song song.

---

## Parallel Example: User Story 1

```bash
# Viết toàn bộ test US1 cùng lúc (6 file khác nhau):
Task: "T019 order-service.test.ts — placeOrder với SHOPLITE10 / GIAM50K / không mã"
Task: "T020 src/app/api/orders/route.test.ts — 201 có discount, 201 không mã"
Task: "T021 src/app/api/coupons/validate/route.test.ts — 200 với ' shoplite10 '"
Task: "T022 coupon-field.test.tsx — label, Áp dụng, Enter không submit form, pending"
Task: "T023 checkout-summary.test.tsx — dòng Giảm giá, ship sau giảm"
Task: "T024 checkout-form.test.tsx — áp mã, tổng mới, payload couponCode"

# Sau T025 (xác nhận đỏ), cài đặt song song:
Task: "T026 order-service.ts — findCoupon + evaluateCoupon + snapshot"
Task: "T027 api/coupons/validate/route.ts — nhánh 200"
Task: "T028 coupon-field.tsx"
Task: "T029 checkout-summary.tsx"
# rồi T030 checkout-form.tsx, T031 npm run check
```

---

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2 (nền tảng).
2. Phase 3 (US1) → `npm run check` → kiểm tra theo Independent Test của US1.
3. **Khuyến nghị MVP phát hành được = US1 + US2 + US5** (cả ba P1): US1 một mình chưa từ chối mã không hợp lệ ở server (nhánh `ok: false` nằm ở T044), nên chưa đạt FR-018 / nguyên tắc "server là nguồn sự thật về tiền".

### Incremental Delivery

1. Setup + Foundational → logic thuần xanh.
2. US1 → demo áp mã + đặt hàng có giảm giá.
3. US2 → thông báo lỗi rõ ràng.
4. US5 → server từ chối mã không hợp lệ, bỏ qua tiền client → **phát hành MVP**.
5. US3 → gỡ / đổi mã, tạm ngưng khi giỏ đổi.
6. US4 → hiển thị ở chi tiết đơn.
7. Polish → E2E SHOPLITE10, tài liệu, format, check cuối.

### Parallel Team Strategy

- Sau Foundational: Dev A làm US1 → US2 → US3 (luồng client), Dev B làm US4 ngay và phần server của US5 (T040, T041, T044) sau T026.

---

## Notes

- [P] = khác file, không phụ thuộc task chưa xong.
- Mỗi phase kết thúc bằng `npm run check`; commit sau mỗi phase xanh.
- Q4 đã chốt "giữ trong phiên": chỉ chuỗi mã ở `sessionStorage["shoplite:coupon"]` (T048(h–j), T051); không lưu tiền, không dùng `localStorage`.
- Client chỉ dùng `evaluateCouponThreshold` (không xét hạn dùng bằng giờ máy khách); `evaluateCoupon` có `now` chỉ dùng ở server.
- Tránh: import dữ liệu mã vào client, thêm trường tiền vào `placeOrderSchema`, throw `Error` thường trong `order-service.ts`, đổi interface `OrderRepository`.

---

## Phase 9: Convergence

- [x] T066 Xóa 2 đơn thử còn sót trong `storage/orders.json` (`fullName` "Nguyễn Văn Test" và "Nguyễn Văn Mã", tạo lúc chạy quickstart), giữ nguyên đơn seed ban đầu, để file khớp với `HEAD` per T063 (partial)

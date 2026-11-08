---

description: "Task list: Mã giảm giá khi thanh toán"
---

# Tasks: Mã giảm giá khi thanh toán

**Input**: Design documents from `/specs/001-checkout-discount-code/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: TDD bắt buộc (Constitution II + yêu cầu người dùng). Trong mỗi phase, task viết test đứng
TRƯỚC task cài đặt và test MUST chạy **đỏ** trước khi cài đặt. Test logic → unit; UI → component
test (Testing Library); API → route test (`// @vitest-environment node`, repository in-memory).
Tên test, text hiển thị, comment viết bằng tiếng Việt.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

## Path Conventions

Next.js một project: `src/features/<feature>/`, `src/app/` (route mỏng), `src/data/`, `e2e/`.

## Quy ước chung cho mọi task

- Không hard-code `500_000`, `30_000`, `10`… — import từ `pricing.ts` / `cart-reducer.ts`.
- Client Component MUST NOT import `src/data/coupons.ts`, `coupon-service.ts`, `features/orders/server.ts`.
- Lỗi nghiệp vụ dùng `OrderError`; response lỗi dạng `ApiErrorBody`.
- Tiền hiển thị qua `formatCurrency`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Xác nhận baseline xanh trước khi thay đổi

- [ ] T001 Chạy `npm run check` trên nhánh hiện tại (repo root) để xác nhận baseline pass; nếu fail, ghi lại test/lint đang lỗi sẵn trước khi bắt đầu

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Kiểu dữ liệu, dữ liệu mã, quy tắc tính giảm giá thuần, mở rộng `pricing`, mã lỗi và `Order` — mọi user story đều cần

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (viết trước, phải đỏ)

- [ ] T002 [P] Viết unit test cho quy tắc mã trong `src/features/coupons/coupon-rules.test.ts`:
  - `normalizeCouponCode(" shoplite10 ")` → `"SHOPLITE10"`.
  - `calculateCouponDiscount` loại `percent`: `min(floor(subtotal × percent / 100), maxDiscount)`. Biên với `SHOPLITE10`: 300.000→30.000, 333.333→33.333, 999.999→99.999, 1.000.000→100.000, 1.000.001→100.000.
  - Loại `fixed`: `amount`. Sau cùng `min(kết quả, subtotal)`, không âm (ví dụ fixed 50.000 với subtotal 20.000 → 20.000).
  - `isCouponExpired`: hết hạn khi `now >= expiresAt`. Với `TET2026`: `2026-02-28T23:59:59.999+07:00` còn hạn, `2026-03-01T00:00:00+07:00` hết hạn; mã không có `expiresAt` không bao giờ hết hạn.
  - `evaluateCoupon(rule, subtotal)` KHÔNG nhận `now` và KHÔNG xét hết hạn (FR-021): chỉ trả `below_minimum` hoặc `applied`. Mã `TET2026` với subtotal bất kỳ vẫn ra `applied` (hết hạn chỉ xét bằng `isCouponExpired` ở server).
  - Biên tối thiểu `subtotal >= minSubtotal`: `SHOPLITE10` 299.999 → `{ status: "below_minimum", minSubtotal: 300000, shortfall: 1 }`; 300.000 → `applied`. `GIAM50K` 420.000 → `shortfall` 80.000.
- [ ] T003 [P] Viết unit test kiểm tra dữ liệu `src/data/coupons.ts` trong `src/features/coupons/coupon-data.test.ts`:
  - Mã duy nhất, đã chuẩn hóa (in hoa, không khoảng trắng).
  - `percent` có `percent` "(1–100)" và `maxDiscount` "(> 0)"; `fixed` có `amount` "(> 0)"; `minSubtotal` "(≥ 0)" nếu có.
  - Đúng 3 mã theo FR-018: `SHOPLITE10` percent 10 / maxDiscount 100_000 / minSubtotal 300_000; `GIAM50K` fixed 50_000 / minSubtotal 500_000; `TET2026` percent 15 / maxDiscount 200_000 / expiresAt `"2026-03-01T00:00:00+07:00"`.
- [ ] T004 [P] Cập nhật test trong `src/features/checkout/pricing.test.ts`:
  - `calculateOrderTotals(lines, method)` trả `discount: 0` (sửa các `toEqual` cũ).
  - `calculateOrderTotals(lines, method, discount)`: `total = subtotal − discount + shippingFee`; `discount` bị kẹp vào `[0, subtotal]`.
  - Phí ship xét trên subtotal TRƯỚC giảm: 500.000 + giảm 50.000 + standard → ship 0, total 450.000; 520.000 + 50.000 → total 470.000. Dùng `FREE_SHIPPING_THRESHOLD`, không hard-code.
- [ ] T005 [P] Thêm test vào `src/features/orders/order-service.test.ts`: `placeOrder` không có `couponCode` → order trả về và order lưu trong repository KHÔNG có key `discount` và `couponCode` (`expect(order).not.toHaveProperty("discount")`), `subtotal`/`shippingFee`/`total` giữ như cũ. Test phải đỏ sau T009 (vì `calculateOrderTotals` trả thêm `discount`).

### Implementation

- [ ] T006 [P] Tạo kiểu trong `src/features/coupons/types.ts`:
  - `COUPON_TYPES = ["percent", "fixed"] as const`.
  - `CouponRule` là union phân biệt theo `type`: `code: string`; `percent` + `maxDiscount` cho `percent`; `amount` cho `fixed`; `minSubtotal?: number`; `expiresAt?: string` (ISO, loại trừ).
  - `CouponEvaluation = { status: "applied"; discount } | { status: "below_minimum"; minSubtotal; shortfall }` (không có trạng thái hết hạn — FR-021).
- [ ] T007 Tạo dữ liệu tĩnh 3 mã trong `src/data/coupons.ts` (kiểu `CouponRule[]`, comment tiếng Việt ghi rõ file chỉ dùng phía server), sau đó chạy T003 cho xanh
- [ ] T008 Cài đặt `normalizeCouponCode`, `calculateCouponDiscount`, `isCouponExpired`, `evaluateCoupon` trong `src/features/coupons/coupon-rules.ts`:
  - Hàm thuần, client-safe, KHÔNG import `src/data/`.
  - Chạy T002 cho xanh.
- [ ] T009 Mở rộng `src/features/checkout/pricing.ts`:
  - `OrderTotals` thêm `discount: number`.
  - Thêm tham số `discount = 0` cho `calculateOrderTotals`, kẹp vào `[0, subtotal]`.
  - Phí ship vẫn tính bằng `calculateShippingFee(subtotal, method)`.
  - Chạy T004 cho xanh.
- [ ] T010 [P] Thêm `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_SUBTOTAL_NOT_MET` vào `OrderErrorCode` và `HTTP_STATUS_BY_CODE` (cả ba → 422) trong `src/features/orders/order-errors.ts`
- [ ] T011 [P] Thêm `couponCode?: string` ("Mã đã chuẩn hóa; chỉ có khi đơn dùng mã") và `discount?: number` ("chỉ có khi đơn dùng mã (> 0)") vào `Order` trong `src/features/orders/types.ts`
- [ ] T012 [P] Thêm rule `no-restricted-imports` vào `eslint.config.mjs` cho `files: ["src/**/*.tsx"]`, dùng `patterns` với `regex` (ESLint 9) để chặn cả alias lẫn đường dẫn tương đối: `(^|/)data/coupons$` và `(^|/)coupons/coupon-service$`, message tiếng Việt "Không import dữ liệu/dịch vụ mã giảm giá vào component (FR-020)" (research R11):
  - Kiểm chứng: tạm thêm lần lượt `import { coupons } from "@/data/coupons"` và một import tương đối (ví dụ `../../../data/coupons`) vào một component, chạy `npx eslint <file>` thấy lỗi cả hai, rồi xóa import.
- [ ] T013 Sửa `src/features/orders/order-service.ts`:
  - Hiện tại hàm đang spread toàn bộ `calculateOrderTotals`. Sửa để đơn không dùng mã KHÔNG có trường `discount`: chỉ gán `subtotal`, `shippingFee`, `total` (giữ đúng định dạng cũ, theo contracts/orders.md).
  - Chạy T005 cho xanh và `npx vitest run src/features/orders` để chắc test cũ vẫn xanh.
- [ ] T014 Chạy `npm run check` — phải pass trước khi sang user story

**Checkpoint**: Foundation ready — quy tắc mã và tổng tiền có discount đã được test

---

## Phase 3: User Story 1 - Áp dụng mã hợp lệ và đặt hàng (Priority: P1) 🎯 MVP

**Goal**:
- Khách nhập mã hợp lệ, thấy ngay số tiền giảm và tổng mới.
- Đặt hàng tạo đơn với `couponCode`/`discount` do server tự tính.
- Bỏ qua mọi số tiền client gửi.
- Server từ chối mã không tồn tại / hết hạn / chưa đạt tối thiểu bằng `OrderError` `COUPON_*` (422) và không tạo đơn (phần server của FR-009, FR-013).

**Independent Test**:
- Giỏ 2 × p006 (900.000), áp dụng ` shoplite10 ` → tóm tắt hiện giảm 90.000, tổng 810.000.
- Đặt hàng → đơn có `couponCode: "SHOPLITE10"`, `discount: 90000`, `total: 810000`.
- Gửi kèm `discount: 999999, total: 1` vẫn ra đúng số trên.

### Tests for User Story 1 (viết trước, phải đỏ)

- [ ] T015 [P] [US1] Viết unit test trong `src/features/coupons/coupon-service.test.ts`:
  - `findCouponByCode` tìm được theo mã đã chuẩn hóa.
  - `validateCouponCode(" giam50k ", now)` trả `CouponRule` của `GIAM50K`.
- [ ] T016 [P] [US1] Viết route test trong `src/app/api/coupons/validate/route.test.ts` (`// @vitest-environment node`):
  - `POST { code: "SHOPLITE10" }` → 200 `{ coupon: { code, type, percent, maxDiscount, minSubtotal } }`.
  - `" giam50k "` → 200 với `code: "GIAM50K"`.
- [ ] T017 [P] [US1] Thêm test trong `src/features/checkout/checkout-schema.test.ts`:
  - `placeOrderSchema` chấp nhận `couponCode` tùy chọn ("`string?` (trim, ≤ 32 ký tự)"); 33 ký tự → lỗi.
  - Trường `discount`/`total`/`subtotal` client gửi bị loại khỏi `parsed.data`.
  - `couponCode` sai kiểu → lỗi: mảng `["SHOPLITE10", "GIAM50K"]`, số `123`, `null`, object `{}`.
- [ ] T018 [P] [US1] Thêm test `placeOrder` trong `src/features/orders/order-service.test.ts`, inject `findCoupon` và `now`:
  - 2 × p006 + `"shoplite10"` → `couponCode: "SHOPLITE10"`, `discount: 90000`, `shippingFee: 0`, `total: 810000`.
  - p003 (2.450.000) + SHOPLITE10 → `discount: 100000`.
  - Input kèm `discount: 999999, total: 1` → bị bỏ qua.
  - `couponCode: ""` và `couponCode: "   "` → tạo đơn bình thường, không giảm giá, không có key `discount`/`couponCode` (contracts/orders.md: rỗng = không dùng mã).
- [ ] T019 [P] [US1] Thêm case vào `src/app/api/orders/route.test.ts` (repository in-memory theo mock hiện có):
  - 201 với `couponCode: "shoplite10"` → `discount`/`total` đúng.
  - 201 khi body có `discount: 999999, total: 1` → server tự tính.
  - 400 `VALIDATION_ERROR` khi `couponCode` là mảng / số / `null` / object hoặc > 32 ký tự; `GET /api/orders` không có đơn mới.
- [ ] T020 [P] [US1] Viết component test cho `src/features/coupons/components/coupon-field.test.tsx` (mock `fetch`):
  - Có `<label>` "Mã giảm giá" gắn với input, có nút "Áp dụng".
  - Áp dụng thành công → gọi `onApplied(rule)` với rule nhận từ `/api/coupons/validate`.
  - Hiện "Đã áp dụng mã SHOPLITE10".
- [ ] T021 [P] [US1] Thêm test trong `src/features/checkout/components/checkout-form.test.tsx` (mock `fetch` cho validate và orders):
  - Áp dụng SHOPLITE10 với giỏ 900.000 → `checkout-discount` hiển thị "-90.000 ₫", `checkout-total` hiển thị 810.000 ₫.
  - Submit gửi body có `couponCode: "SHOPLITE10"` và KHÔNG có `discount`/`total`.
- [ ] T022 [US1] Thêm test lỗi vào `src/features/coupons/coupon-service.test.ts`:
  - `validateCouponCode("KHONGCO")` → `COUPON_NOT_FOUND`.
  - `TET2026` với `now = 2026-03-01T00:00:00+07:00` → `COUPON_EXPIRED`; với `2026-02-28T23:59:59.999+07:00` → hợp lệ.
  - `toCouponError` cho `below_minimum` → `COUPON_MIN_SUBTOTAL_NOT_MET`, message có "500.000 ₫" và "80.000 ₫".
  - Mọi lỗi có `details.couponCode` và `httpStatus` 422.
- [ ] T023 [US1] Thêm case lỗi vào `src/app/api/coupons/validate/route.test.ts`, dùng `vi.useFakeTimers()` + `vi.setSystemTime` cho case hết hạn:
  - 422 `COUPON_NOT_FOUND`.
  - 422 `COUPON_EXPIRED`.
  - 400 `VALIDATION_ERROR` khi body không phải JSON, khi `code` rỗng hoặc chỉ có khoảng trắng, khi `code` không phải string.
- [ ] T024 [US1] Thêm test vào `src/features/orders/order-service.test.ts`:
  - `placeOrder` với `KHONGCO` / `TET2026` (inject `now` sau hạn) / `GIAM50K` + 1 × p006 → ném đúng `COUPON_*`.
  - Repository không lưu đơn nào.
- [ ] T025 [US1] Thêm case vào `src/app/api/orders/route.test.ts`: 422 cho từng mã `COUPON_*`, body lỗi đúng dạng `ApiErrorBody` có `details.couponCode`, `GET /api/orders` không có đơn mới

### Implementation for User Story 1

- [ ] T026 [US1] Cài đặt `src/features/coupons/coupon-service.ts`. Chỉ dùng phía server; comment ghi rõ không import vào client.
  - `findCouponByCode(code, coupons = couponsData)`.
  - `validateCouponCode(code, now)`: chuẩn hóa → tìm mã → kiểm tra hết hạn. Ném `OrderError` `COUPON_NOT_FOUND` / `COUPON_EXPIRED` kèm `details: { couponCode: message }`.
  - `toCouponError(code, evaluation)`: chuyển `CouponEvaluation` `below_minimum` thành `OrderError` `COUPON_MIN_SUBTOTAL_NOT_MET`.
  - Message tiếng Việt theo data-model (dùng `formatCurrency`): `Mã giảm giá "ABC" không tồn tại`; `Mã giảm giá "TET2026" đã hết hạn`; `Mã GIAM50K áp dụng cho đơn từ 500.000 ₫, bạn cần mua thêm 80.000 ₫`.
  - Chạy T015, T022 cho xanh.
- [ ] T027 [US1] Tạo route mỏng `src/app/api/coupons/validate/route.ts` (`POST`):
  - `readJsonBody`: JSON hỏng, `code` không phải string, hoặc rỗng sau trim → `jsonError(400, "VALIDATION_ERROR", …, { code: "Vui lòng nhập mã giảm giá" })`.
  - `validateCouponCode(code, new Date())` → `NextResponse.json({ coupon })`; lỗi → `handleRouteError`.
  - Chạy T016, T023 cho xanh.
- [ ] T028 [US1] Thêm `couponCode: z.string().trim().max(32).optional()` vào `placeOrderSchema` trong `src/features/checkout/checkout-schema.ts` (message lỗi tiếng Việt), chạy T017 cho xanh
- [ ] T029 [US1] Cập nhật `placeOrder` trong `src/features/orders/order-service.ts`:
  - Thêm dep `findCoupon` (mặc định `findCouponByCode`).
  - Nếu `couponCode` khác rỗng: chuẩn hóa → tìm mã → `isCouponExpired(rule, now())` (đồng hồ server) → `evaluateCoupon(rule, subtotal)`, với subtotal tính từ giá catalog sau khi gộp dòng.
  - Trạng thái `applied` → `calculateOrderTotals(items, method, discount)`, gán `couponCode` và `discount` vào order.
  - Mọi nhánh lỗi ném TRƯỚC `repository.save`: không tìm thấy → `COUPON_NOT_FOUND`; `isCouponExpired` → `COUPON_EXPIRED`; `below_minimum` → `toCouponError(...)`.
  - Chạy T018, T019, T024, T025 cho xanh.
- [ ] T030 [P] [US1] Tạo `src/features/coupons/components/coupon-field.tsx` (`"use client"`):
  - Input có `id="couponCode"` và `<label>` "Mã giảm giá", nút "Áp dụng".
  - Gọi `POST /api/coupons/validate`; khi thành công → `onApplied(rule)`.
  - Hiển thị trạng thái đã áp dụng (`role="status"`).
  - Props: `subtotal`, `appliedCode`, `evaluation`, `error`, `onApplied`, `onRemove`.
  - Chạy T020 cho xanh.
- [ ] T031 [US1] Cập nhật `src/features/checkout/components/checkout-summary.tsx`:
  - Nhận prop `coupon?: { code: string; evaluation: CouponEvaluation }`.
  - Khi `applied`: thêm dòng "Giảm giá (CODE)" với `data-testid="checkout-discount"` hiển thị `-formatCurrency(discount)`.
  - `calculateOrderTotals(..., discount)`.
- [ ] T032 [US1] Cập nhật `src/features/checkout/components/checkout-form.tsx`:
  - State `appliedCoupon: CouponRule | null`.
  - `evaluation = evaluateCoupon(appliedCoupon, subtotal)` (không dùng giờ máy khách — FR-021) (import từ `coupon-rules.ts`, KHÔNG từ `coupon-service.ts`).
  - Render `CouponField` trong cột tóm tắt (truyền `subtotal` từ `useCart`), truyền `coupon` cho `CheckoutSummary`.
  - Thêm `couponCode` vào body POST khi có mã.
  - Chạy T021 cho xanh.
- [ ] T033 [US1] Chạy `npm run check` — phải pass

**Checkpoint**: US1 hoạt động độc lập — MVP có thể demo

---

## Phase 4: User Story 2 - Thông báo rõ khi mã không hợp lệ (Priority: P1)

**Goal** (phần giao diện; phần server đã làm ở US1):
- Hiển thị đúng lý do tại ô mã: không tồn tại / hết hạn / chưa đạt tối thiểu kèm số tiền cần mua thêm / ô trống.
- Mã mất hiệu lực lúc đặt hàng → gỡ mã, giữ form (FR-013, kịch bản 5 của US2).

**Independent Test**:
- Nhập `KHONGCO`, `TET2026`, `GIAM50K` với giỏ 450.000, và bấm khi ô trống → mỗi lần đúng thông báo, tổng không đổi.
- Đặt hàng khi server trả `COUPON_EXPIRED` → không tạo đơn, mã bị gỡ, form giữ nguyên.

### Tests for User Story 2 (viết trước, phải đỏ)

- [ ] T034 [P] [US2] Thêm test vào `src/features/coupons/components/coupon-field.test.tsx`:
  - Bấm "Áp dụng" khi ô trống → "Vui lòng nhập mã giảm giá", không gọi `fetch`.
  - Server trả 422 → hiển thị `details.couponCode` dưới input, `aria-invalid="true"`, lỗi liên kết qua `aria-describedby`.
  - Prop `subtotal = 450000`, validate trả 200 cho GIAM50K → KHÔNG gọi `onApplied`, hiển thị "cần mua thêm 50.000 ₫" (FR-017).
- [ ] T035 [P] [US2] Thêm test vào `src/features/checkout/components/checkout-form.test.tsx`:
  - Áp dụng GIAM50K khi giỏ 450.000 → không áp dụng, hiện "cần mua thêm 50.000 ₫", tổng không đổi.
  - POST `/api/orders` trả 422 `COUPON_EXPIRED` → không chuyển trang, dòng giảm giá biến mất, lỗi hiện tại ô mã, các ô họ tên/SĐT/địa chỉ giữ nguyên giá trị.

### Implementation for User Story 2

- [ ] T036 [US2] Cập nhật `src/features/coupons/components/coupon-field.tsx`:
  - Kiểm tra ô trống phía client.
  - Hiển thị lỗi với `aria-invalid`, `aria-describedby="couponCode-error"`, `data-testid="error-couponCode"`.
  - Khi validate OK: tính `evaluateCoupon(rule, subtotal)` với prop `subtotal`; nếu `below_minimum` → KHÔNG gọi `onApplied`, hiển thị message "cần mua thêm" (dùng `formatCurrency`).
  - Chạy T034 cho xanh.
- [ ] T037 [US2] Cập nhật `src/features/checkout/components/checkout-form.tsx`. Khi response lỗi có `error.code` bắt đầu bằng `COUPON_`:
  - `setAppliedCoupon(null)`.
  - Đặt lỗi ô mã từ `details.couponCode`.
  - `status` về `idle`, giữ `values`.
  - Chạy T035 cho xanh.
- [ ] T038 [US2] Chạy `npm run check` — phải pass

**Checkpoint**: US1 + US2 hoạt động độc lập

---

## Phase 5: User Story 3 - Gỡ/thay mã và trạng thái "chưa đủ điều kiện" (Priority: P2)

**Goal**:
- Gỡ mã (FR-011); mã mới thay mã cũ (FR-010).
- Giỏ đổi → tính lại ngay; dưới tối thiểu → giữ mã ở trạng thái "chưa đủ điều kiện", tự có hiệu lực lại khi đạt (FR-017).
- Chặn đặt hàng khi đang chờ (FR-017a).

**Independent Test**:
- Áp dụng GIAM50K với giỏ 900.000 → giỏ đổi còn 450.000: thấy "chưa đủ điều kiện, cần mua thêm 50.000 ₫", không có dòng giảm.
- Giỏ về 900.000 → tự giảm 50.000.
- Bấm "Đặt hàng" khi đang chờ → không gọi `/api/orders`.
- "Gỡ mã" → tổng trở về ban đầu.

### Tests for User Story 3 (viết trước, phải đỏ)

- [ ] T039 [P] [US3] Thêm test vào `src/features/coupons/components/coupon-field.test.tsx`:
  - Khi có `appliedCode` → hiển thị nút "Gỡ mã" và gọi `onRemove`.
  - Khi `evaluation.status === "below_minimum"` → hiển thị "Mã GIAM50K chưa đủ điều kiện, cần mua thêm 50.000 ₫" (`role="status"`).
- [ ] T040 [P] [US3] Thêm test vào `src/features/checkout/components/checkout-form.test.tsx` (thay đổi giỏ bằng `cartStore.dispatch` + `cartStore.reset()` trong `beforeEach`):
  - (a) Gỡ mã → `checkout-discount` biến mất, tổng về ban đầu.
  - (b) Áp dụng SHOPLITE10 rồi GIAM50K → chỉ còn GIAM50K.
  - (c) Giỏ giảm dưới 500.000 → trạng thái chờ, không có dòng giảm; tăng lại → dòng giảm quay lại mà không gọi lại validate.
  - (d) Submit khi chờ → không gọi `fetch("/api/orders")`, lỗi ô mã "Vui lòng mua thêm … hoặc gỡ mã".
  - (e) Tạm tính 400.000 → 300.000 với SHOPLITE10 → giảm từ 40.000 xuống 30.000.
  - (f) FR-021: đã áp dụng `TET2026` (validate được mock trả 200), rồi `vi.setSystemTime` sang sau hạn → mã vẫn hiển thị và vẫn giảm; chỉ khi POST `/api/orders` trả `COUPON_EXPIRED` mới bị gỡ.

### Implementation for User Story 3

- [ ] T041 [US3] Cập nhật `src/features/coupons/components/coupon-field.tsx`:
  - Khi đã có mã: hiển thị mã + nút "Gỡ mã" (gọi `onRemove`).
  - Hiển thị thông báo trạng thái `below_minimum` (`role="status"`, `aria-live="polite"`).
  - Áp dụng mã mới thay mã cũ.
  - Chạy T039 cho xanh.
- [ ] T042 [US3] Cập nhật `src/features/checkout/components/checkout-summary.tsx`: khi `below_minimum` không có dòng giảm và tổng không giảm (không có nhánh hết hạn phía client — FR-021)
- [ ] T043 [US3] Cập nhật `src/features/checkout/components/checkout-form.tsx`:
  - `onRemove` → `setAppliedCoupon(null)` và xóa lỗi ô mã.
  - Đánh giá lại theo `subtotal` mỗi lần render (giỏ đổi qua `useCart`).
  - Trong `handleSubmit`: nếu `evaluation.status === "below_minimum"` → đặt lỗi ô mã và `return` trước khi `fetch`.
  - Chạy T040 cho xanh.
- [ ] T044 [US3] Chạy `npm run check` — phải pass

**Checkpoint**: US1–US3 hoạt động độc lập

---

## Phase 6: User Story 4 - Mã đã dùng trong chi tiết đơn hàng (Priority: P2)

**Goal**:
- Trang `/orders/[id]` hiển thị "Giảm giá (CODE)" và số tiền khi đơn có dùng mã.
- Đơn không mã và đơn cũ (thiếu trường) hiển thị như trước (FR-015, FR-016).

**Independent Test**:
- Seed repository in-memory với 1 đơn có `couponCode: "GIAM50K", discount: 50000` và 1 đơn cũ không có hai trường.
- Mở chi tiết từng đơn: đơn thứ nhất có dòng giảm, đơn cũ không có.

### Tests for User Story 4 (viết trước, phải đỏ)

- [ ] T045 [P] [US4] Viết component test cho `src/features/orders/components/order-totals.test.tsx`:
  - Đơn có `couponCode`/`discount` → hiển thị "Giảm giá (GIAM50K)" và "-50.000 ₫" (`data-testid="order-discount"`).
  - Đơn `discount` thiếu hoặc 0 → không có dòng giảm.
  - Tổng hiển thị đúng `order.total` đã lưu (không tính lại).
- [ ] T046 [P] [US4] Thêm test vào `src/features/orders/order-service.test.ts`:
  - `getOrder` / `listOrders` với repository seed đơn cũ (không có `couponCode`/`discount`) trả nguyên trạng.
  - `cancelOrder` đơn có mã giữ nguyên `couponCode`, `discount`, `total`.

### Implementation for User Story 4

- [ ] T047 [US4] Tách khối tạm tính/phí giao hàng/tổng cộng của trang chi tiết thành Server Component `src/features/orders/components/order-totals.tsx`:
  - Thêm dòng giảm giá khi `(order.discount ?? 0) > 0`.
  - Dùng `formatCurrency`.
  - Chạy T045 cho xanh.
- [ ] T048 [US4] Dùng `OrderTotals` component trong `src/app/orders/[id]/page.tsx` thay cho `<dl>` hiện tại (trang chỉ hiển thị, không thêm logic), chạy T046 và kiểm tra tay một đơn cũ trong `storage/orders.json` nếu có
- [ ] T049 [US4] Chạy `npm run check` — phải pass

**Checkpoint**: Tất cả user story hoạt động độc lập

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E, tài liệu, format, xác nhận cuối

- [ ] T050 Thêm test mới vào `e2e/shopping-flow.spec.ts`: `test("khách hàng áp dụng mã SHOPLITE10 và đặt hàng được giảm giá", …)`. Các bước:
  - Thêm 2 × "Chuột không dây SwiftClick" (2 × 450.000 = 900.000).
  - Tới `/checkout`, điền "Mã giảm giá" ` shoplite10 `, bấm "Áp dụng".
  - Kỳ vọng `checkout-discount` chứa "90.000", `checkout-total` chứa "810.000", phí giao hàng "Miễn phí".
  - Điền họ tên, SĐT, địa chỉ → bấm "Đặt hàng".
  - Ở trang chi tiết đơn: thấy "Đặt hàng thành công!", `order-discount` chứa "SHOPLITE10" và "90.000", tổng "810.000".
- [ ] T051 [P] Cập nhật `README.md`:
  - Thêm `POST /api/coupons/validate` vào bảng API, ví dụ `couponCode` trong curl tạo đơn.
  - Quy tắc mã giảm giá vào "Quy tắc nghiệp vụ chính".
- [ ] T052 [P] Cập nhật `AGENTS.md`:
  - Thêm dòng codemap "Coupons" (`src/features/coupons/`: `coupon-rules.ts` client-safe, `coupon-service.ts` server-only, `src/data/coupons.ts`).
  - Thêm bước áp mã vào "Luồng đặt hàng".
  - Thêm quy tắc mã vào mục 5 và cấm import `coupon-service.ts`/`src/data/coupons.ts` vào Client Component ở mục 7.
- [ ] T053 Chạy các kịch bản trong `specs/001-checkout-discount-code/quickstart.md` (mục 2 và 3) bằng `npm run dev`, ghi lại kết quả lệch nếu có. Kiểm tra thêm SC-001: dùng tab Network của DevTools, từ lúc bấm "Áp dụng" đến khi tổng tiền mới hiện ra phải dưới 1 giây
- [ ] T054 Rà lại mục Constitution Check trong `specs/001-checkout-discount-code/plan.md` với code đã viết (5 nguyên tắc trong `.specify/memory/constitution.md`), ghi kết quả vào mô tả PR theo yêu cầu "Review/PR MUST xác nhận tuân thủ constitution"
- [ ] T055 Chạy `npm run format` rồi `npm run test:e2e` — phải pass (thay đổi luồng đặt hàng)
- [ ] T056 Chạy `npm run check` — phải pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** chặn mọi user story.
- **US1 (Phase 3)**: phụ thuộc Phase 2. Tạo `coupon-service.ts`, route validate, `CouponField`, wiring form.
- **US2 (Phase 4)**: phụ thuộc US1 (server đã trả `COUPON_*`). Chỉ còn phần giao diện: `CouponField` và `checkout-form.tsx` hiển thị lỗi.
- **US3 (Phase 5)**: phụ thuộc US1 (`CouponField`, state `appliedCoupon`). Độc lập với US2 về logic nhưng sửa chung `checkout-form.tsx`, nên làm tuần tự sau US2.
- **US4 (Phase 6)**: chỉ phụ thuộc Phase 2 (`Order` có trường mới) → có thể làm song song với US1–US3 (khác file hoàn toàn).
- **Polish (Phase 7)**: sau tất cả; T050 cần US1 + US4.

### Story completion order

```text
Phase 1 → Phase 2 ─┬─> US1 → US2 → US3 ─┐
                   └─> US4 ──────────────┴─> Polish
```

### Within Each User Story

- Test (đỏ) → cài đặt → test xanh → `npm run check`.
- Service/route trước UI; `coupon-rules.ts` (Phase 2) trước mọi nơi dùng `evaluateCoupon`.

### Parallel Opportunities

- Phase 2: T002, T003, T004, T005 (test, khác file) song song; T006, T010, T011, T012 song song.
- US1: T015–T021 (7 file test khác nhau) song song; T022–T025 viết sau, mỗi task cùng file với T015/T016/T018/T019 nên không [P]; T030 song song với T026–T029.
- US2: T034, T035 song song.
- US3: T039, T040 song song.
- US4: T045, T046 song song; toàn bộ US4 song song với US1–US3.
- Polish: T051, T052 song song.

---

## Parallel Example: User Story 1

```text
# Viết toàn bộ test US1 cùng lúc (khác file):
T015 src/features/coupons/coupon-service.test.ts
T016 src/app/api/coupons/validate/route.test.ts
T017 src/features/checkout/checkout-schema.test.ts
T018 src/features/orders/order-service.test.ts
T019 src/app/api/orders/route.test.ts
T020 src/features/coupons/components/coupon-field.test.tsx
T021 src/features/checkout/components/checkout-form.test.tsx

# Tiếp theo (cùng file với test ở trên): T022 (sau T015), T023 (sau T016), T024 (sau T018), T025 (sau T019)

# Sau đó: T026 → T027 (route cần service); T028 → T029 (service cần schema); T030 song song; T031 → T032
```

## Parallel Example: User Story 4 (song song với US1)

```text
T045 src/features/orders/components/order-totals.test.tsx
T046 src/features/orders/order-service.test.ts   # lưu ý: cùng file với T018/T024 → không chạy cùng lúc với chúng
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2.
2. Phase 3 (US1) → **STOP & VALIDATE**: áp mã hợp lệ, đặt hàng, server tự tính, `npm run check` xanh.
3. Demo được giá trị cốt lõi (khách nhận ưu đãi). Server đã từ chối đúng mã sai; giao diện hiển thị lỗi chi tiết ở US2.

### Incremental Delivery

1. Foundation → US1 (MVP) → US2 (hiển thị lỗi trên giao diện + gỡ mã khi đặt hàng bị từ chối) → US3 (gỡ/thay mã, trạng thái chờ) → US4 (hiển thị trong đơn) → Polish (E2E SHOPLITE10, tài liệu).
2. Mỗi story kết thúc bằng `npm run check` xanh và không phá story trước.

### Notes

- [P] = khác file, không phụ thuộc task chưa xong. Các task cùng sửa `order-service.test.ts` hoặc `checkout-form.test.tsx` không được chạy song song với nhau.
- Theo CLAUDE.md: tính năng chạm > 3 file → trình bày kế hoạch (plan mode) trước khi `/speckit-implement`.
- Checklist `checklists/security.md` chưa được duyệt; `/speckit-implement` sẽ đọc trạng thái checklist.
- Commit sau mỗi checkpoint.

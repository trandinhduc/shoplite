---
description: "Task list: Mã giảm giá khi thanh toán"
---

# Tasks: Mã giảm giá khi thanh toán

**Input**: Design documents from `/specs/001-checkout-discount-code/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: BẮT BUỘC, theo TDD (Constitution II + yêu cầu người dùng). Trong mỗi phase, task viết test đứng **trước** task cài đặt; test phải chạy **fail** (Red) trước khi cài đặt (Green). Unit test cho logic, component test (Testing Library) cho UI, route test cho API. Test service/route dùng `// @vitest-environment node`, inject `now`, không ghi vào `storage/`.

**Organization**: Một phase cho mỗi user story, theo thứ tự ưu tiên: US1 → US2 → US5 (P1), rồi US3 → US4 (P2). Task cuối của **mọi** phase là `npm run check`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1…US5, ánh xạ tới User Story trong spec.md
- Đường dẫn tính từ gốc repo; alias `@/*` → `src/*`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tạo feature `coupons` và các kiểu dữ liệu dùng chung. Không có logic, nên không có test.

- [X] T001 Tạo `src/features/coupons/types.ts` theo data-model.md §1–2. Gồm:
  - `COUPON_TYPES = ["percentage", "fixed"] as const` và `CouponType`.
  - `Coupon` là union phân biệt theo `type`:
    - `percentage`: có `value` (1–100) và `maxDiscount` bắt buộc;
    - `fixed`: có `value > 0`, không có `maxDiscount`.
  - Trường tùy chọn: `minSubtotal?: number`, `expiresOn?: string` ("YYYY-MM-DD", ngày cuối còn hiệu lực, bao gồm ngày đó, giờ Việt Nam).
  - `CouponRule` là alias của `Coupon` (hình dạng công khai trả cho client).
  - `CouponEvaluation`:
    `{ ok: true; code; discount } | { ok: false; reason: "NOT_FOUND" } | { ok: false; reason: "EXPIRED"; code } | { ok: false; reason: "MIN_SUBTOTAL_NOT_MET"; code; minSubtotal; shortfall }`.
  - JSDoc tiếng Việt.
- [X] T002 Chạy `npm run check`, đảm bảo pass trước khi sang Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Quy tắc thuần của mã, dữ liệu mã, schema mã và công thức tổng tiền có giảm giá. Mọi user story đều cần phần này.

**⚠️ CRITICAL**: Chưa bắt đầu user story nào trước khi phase này xong.

### Tests (viết trước, phải FAIL)

- [X] T003 [P] Viết `src/features/coupons/coupon-rules.test.ts` cho các hàm thuần sau.
  - **`normalizeCouponCode`**: `" shoplite10 "` → `"SHOPLITE10"`.
  - **`getCouponExpiryCutoff("2026-02-28")`** trả về thời điểm `2026-03-01T00:00:00+07:00`.
  - **`calculateCouponDiscount`**:
    - phần trăm làm tròn xuống: 10% của 333_333 = 33_333;
    - trần `maxDiscount`: 1_000_000 → 100_000, và 1_000_010 → 100_000 với SHOPLITE10;
    - mã `fixed` không vượt subtotal.
  - **`evaluateCoupon(coupon | undefined, subtotal, now)`**:
    - thứ tự kiểm tra: tồn tại → còn hạn → tối thiểu;
    - biên tối thiểu: `minSubtotal − 1` → `MIN_SUBTOTAL_NOT_MET` với `shortfall` = 1; `= minSubtotal` → ok;
    - biên hạn: now = `2026-02-28T23:59:59.999+07:00` → ok; `2026-03-01T00:00:00+07:00` → `EXPIRED`.
  - **`getCouponErrorMessage`** trả đúng 3 câu tiếng Việt ở data-model.md §2, số tiền qua `formatCurrency`.
  - **`deriveCouponStatus(appliedCoupon, subtotal, now)`** theo data-model.md §6:
    - `null` → `none`;
    - mã hợp lệ → `active` + `discount`;
    - dưới tối thiểu → `error` kèm số tiền cần mua thêm;
    - subtotal đạt lại tối thiểu → `active`;
    - có `lockedError` → `error` bất kể subtotal.
- [X] T004 [P] Viết test schema (spec FR-004, Edge Cases "Mã sai định dạng"):
  - `src/features/coupons/coupon-schema.test.ts` cho `couponCodeSchema`, tức `z.string().trim().min(1).max(COUPON_CODE_MAX_LENGTH)` với `COUPON_CODE_MAX_LENGTH = 32`. Ca kiểm: trim; chuỗi rỗng hoặc chỉ khoảng trắng → lỗi; 32 ký tự → ok; 33 ký tự → lỗi; số hoặc mảng → lỗi.
  - Thêm vào `src/features/checkout/checkout-schema.test.ts` test cho `validateCouponSchema`: dạng `{ code, items }`, `items` giống `placeOrderSchema.items` (≥ 1 dòng, `quantity ∈ [1, MAX_QUANTITY_PER_ITEM]`).
- [X] T005 [P] Viết `src/features/coupons/coupon-data.test.ts`, kiểm dữ liệu `src/data/coupons.ts`:
  - mã duy nhất, và `code === normalizeCouponCode(code)`;
  - `percentage` có `maxDiscount > 0` và `0 < value <= 100`; `fixed` có `value > 0`;
  - đúng 3 mã ở FR-003: SHOPLITE10, GIAM50K, TET2026 (`expiresOn: "2026-02-28"`).
- [X] T006 [P] Sửa `src/features/checkout/pricing.test.ts` cho `calculateOrderTotals(lines, method, discount = 0)`:
  - Không truyền `discount` → kết quả có `discount: 0`; sửa `toEqual` hiện có thành `{ subtotal: 350_000, discount: 0, shippingFee: 30_000, total: 380_000 }`.
  - `discount` bị kẹp vào `[0, subtotal]`; `total = subtotal − discount + shippingFee`.
  - Phí ship tính trên subtotal **trước** giảm: subtotal = `FREE_SHIPPING_THRESHOLD` + discount 50_000 + `standard` → vẫn miễn phí.
  - Dùng hằng số đã export, không hard-code.

### Implementation

- [X] T007 [P] Cài đặt `src/features/coupons/coupon-rules.ts` cho pass T003:
  - các hàm `normalizeCouponCode`, `getCouponExpiryCutoff`, `isCouponExpired`, `calculateCouponDiscount`, `evaluateCoupon`, `getCouponErrorMessage`, `deriveCouponStatus`;
  - kiểu `AppliedCoupon = { rule: CouponRule; lockedError?: string }`.

  File này KHÔNG được import `src/data/coupons.ts` (phải an toàn cho client, xem research R1).

- [X] T008 [P] Cài đặt schema cho pass T004:
  - `src/features/coupons/coupon-schema.ts` chỉ chứa `COUPON_CODE_MAX_LENGTH = 32` và `couponCodeSchema`, thông báo lỗi tiếng Việt ("Vui lòng nhập mã giảm giá", "Mã giảm giá tối đa 32 ký tự"). File này KHÔNG import từ `@/features/checkout`, để tránh vòng import.
  - Trong `src/features/checkout/checkout-schema.ts`: tách `orderItemsSchema` ra và dùng lại trong `placeOrderSchema`; thêm `validateCouponSchema = z.object({ code: couponCodeSchema, items: orderItemsSchema })`. Chiều import chỉ một hướng: `checkout-schema` → `coupon-schema`.
- [X] T009 [P] Tạo `src/data/coupons.ts` (`export const coupons: Coupon[]`) cho pass T005:
  - SHOPLITE10: `percentage`, 10, `maxDiscount` 100_000, `minSubtotal` 300_000;
  - GIAM50K: `fixed`, 50_000, `minSubtotal` 500_000;
  - TET2026: `percentage`, 15, `maxDiscount` 200_000, `expiresOn` "2026-02-28".

  Thêm comment tiếng Việt: chỉ import phía server.

- [X] T010 [P] Sửa `src/features/checkout/pricing.ts` cho pass T006:
  - thêm `discount` vào `OrderTotals`;
  - `calculateOrderTotals(lines, method, discount = 0)` kẹp discount vào `[0, subtotal]`, tính `shippingFee` từ subtotal trước giảm;
  - cập nhật JSDoc.
- [X] T011 Sửa `src/features/orders/types.ts`: thêm vào `Order` hai trường `couponCode?: string` và `discount?: number`. JSDoc ghi rõ: đơn cũ không có các trường này, coi như 0 (FR-025).
- [X] T012 Chạy `npm run check`, đảm bảo pass.

**Checkpoint**: Quy tắc mã và công thức tổng tiền đã sẵn sàng, có test. Bắt đầu được các user story.

---

## Phase 3: User Story 1 - Áp dụng mã hợp lệ và đặt hàng với giá đã giảm (Priority: P1) 🎯 MVP

**Goal**: Khách nhập mã hợp lệ, thấy ngay dòng giảm giá và tổng mới, đặt hàng thành công với số tiền giảm do server tính.

**Independent Test**: Giỏ 450_000 (p006) → áp `shoplite10` → tóm tắt "Giảm giá (SHOPLITE10) −45.000 ₫", tổng 435.000 ₫ → đặt hàng → API trả `discount: 45000`, `couponCode: "SHOPLITE10"`, `total: 435000`.

### Tests for User Story 1 (viết trước, phải FAIL)

- [X] T013 [P] [US1] Viết `src/features/coupons/coupon-service.test.ts` (`// @vitest-environment node`), phần thành công. Inject `findProduct` và `now` vào `createCouponService`.
  - `findCouponByCode(" shoplite10 ")` → coupon SHOPLITE10.
  - `validateCoupon({ code, items })` lấy giá từ catalog và trả `{ coupon: CouponRule, subtotal, discount }`. Ca kiểm:
    - p006 × 1 → subtotal 450_000, discount 45_000;
    - 2_000_000 → discount 100_000;
    - GIAM50K với 600_000 → 50_000.
- [X] T014 [P] [US1] Viết `src/app/api/coupons/validate/route.test.ts` (`// @vitest-environment node`), mock `@/features/coupons/coupon-service` để `couponService` dùng `now` cố định. Kiểm:
  - `POST` với `{ code: " shoplite10 ", items: [{ productId: "p006", quantity: 1 }] }` → 200, body khớp contracts/coupons-validate.md;
  - body 200 chỉ có đúng 3 khóa `coupon`, `subtotal`, `discount`, và `coupon.code === "SHOPLITE10"`, tức không trả danh sách mã (FR-022a).
- [X] T015 [P] [US1] Sửa `src/features/checkout/checkout-schema.test.ts` cho `placeOrderSchema`:
  - không có `couponCode` → hợp lệ;
  - `" shoplite10 "` → `parsed.data.couponCode === "shoplite10"` (schema chỉ trim, service mới chuẩn hóa hoa/thường);
  - `couponCode` là `""`, `"   "`, chuỗi 33 ký tự, số `10`, hoặc mảng `["A","B"]` → lỗi, có `toFieldErrors(...)["couponCode"]`.
- [X] T016 [P] [US1] Sửa `src/features/orders/order-service.test.ts`, test `placeOrder` có `couponCode: "SHOPLITE10"`:
  - đơn lưu `couponCode: "SHOPLITE10"`, `discount` đúng, `total = subtotal − discount + shippingFee`;
  - `shippingFee` tính trên subtotal trước giảm;
  - không có mã → `discount: 0` và không có `couponCode`;
  - `couponCode` được chuẩn hóa (`"shoplite10"` → `"SHOPLITE10"`);
  - p001 với số lượng vượt tồn kho kèm `couponCode: "KHONGCO"` → ném lỗi có `code === "INSUFFICIENT_STOCK"`, tức tồn kho được kiểm trước mã (FR-022). Đây là test giữ hành vi: pass ngay, vì code hiện tại bỏ qua `couponCode`. Viết trước T023 để T023 không đảo thứ tự kiểm tra;
  - `cancelOrder` một đơn có mã → đơn đã hủy vẫn giữ nguyên `couponCode` và `discount` (FR-023, test giữ hành vi).
- [X] T017 [P] [US1] Sửa `src/app/api/orders/route.test.ts`: `POST` kèm `couponCode: "SHOPLITE10"` với p006 × 1, kiểu `express` → 201 với `discount: 45000`, `couponCode: "SHOPLITE10"`, `total: 465000`.
- [X] T018 [P] [US1] Viết `src/features/coupons/components/coupon-field.test.tsx` theo contracts/checkout-ui.md. Kiểm:
  - ô có nhãn "Mã giảm giá" (`id="couponCode"`);
  - nút "Áp dụng" là `type="button"`;
  - bấm "Áp dụng" hoặc Enter trong ô thì gọi `onApply(code)` và KHÔNG submit form cha;
  - khi đang chờ thì nút bị vô hiệu với nhãn "Đang kiểm tra…";
  - khi đã có mã, hiện `data-testid="applied-coupon"` chứa mã.
- [X] T019 [US1] Sửa `src/features/checkout/components/checkout-form.test.tsx`, mock `fetch`:
  - `/api/coupons/validate` trả 200 → tóm tắt có `data-testid="checkout-discount"` "Giảm giá (SHOPLITE10)" "−45.000 ₫", `checkout-total` giảm tương ứng;
  - submit → body `POST /api/orders` có `couponCode: "SHOPLITE10"` và KHÔNG có trường tiền nào.

### Implementation for User Story 1

- [X] T020 [US1] Cài đặt `src/features/coupons/coupon-service.ts`, file duy nhất được import `src/data/coupons.ts`:
  - `findCouponByCode(code, list = coupons)`;
  - `createCouponService({ findCoupon = findCouponByCode, findProduct = getProductById, now })` với `validateCoupon(input)`: `validateCouponSchema.safeParse` (import từ `@/features/checkout/checkout-schema`) → tính subtotal từ catalog → `evaluateCoupon` → trả `{ coupon, subtotal, discount }`;
  - `export const couponService = createCouponService({})`;
  - tạm thời ở US1: nếu `safeParse` thất bại, sản phẩm không tồn tại, hoặc `evaluateCoupon` trả `ok: false`, thì `throw new Error("Chưa xử lý: <lý do>")`, và route trả 500. US2 (T033) thay đoạn này bằng `OrderError`, nhờ vậy T028 và T029 chắc chắn fail trước.

  Mục tiêu: pass T013.

- [X] T021 [US1] Tạo route mỏng `src/app/api/coupons/validate/route.ts`:
  - `POST` → `readJsonBody`; nếu `undefined` thì `jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ")`;
  - gọi `couponService.validateCoupon(body)` → `NextResponse.json(result)`;
  - bọc `try/catch` → `handleRouteError`.

  Mục tiêu: pass T014.

- [X] T022 [US1] Sửa `src/features/checkout/checkout-schema.ts`: thêm `couponCode: couponCodeSchema.optional()` vào `placeOrderSchema`. Mục tiêu: pass T015.
- [X] T023 [US1] Sửa `src/features/orders/order-service.ts`:
  - thêm dep `findCoupon?` (mặc định `findCouponByCode`);
  - trong `placeOrder`, sau khi dựng `orderItems` thì tính subtotal → nếu có `couponCode` thì `evaluateCoupon(findCoupon(code), subtotal, createdAt)` (dùng chung mốc `now()` với `createdAt`) → `calculateOrderTotals(orderItems, shippingMethod, discount)`;
  - lưu `couponCode` (đã chuẩn hóa) khi có mã;
  - tạm thời ở US1: khi `evaluateCoupon` trả `ok: false` thì `throw new Error(...)` trước `repository.save`. Tuyệt đối không tạo đơn với `discount = 0` (FR-021). US5 (T040) thay bằng `toCouponError`.

  Mục tiêu: pass T016, T017.

- [X] T024 [P] [US1] Sửa `src/features/checkout/components/checkout-summary.tsx`:
  - nhận thêm prop `discount?: number` và `couponCode?: string`, truyền `discount` vào `calculateOrderTotals`;
  - khi `discount > 0`, hiện dòng `data-testid="checkout-discount"` "Giảm giá ({couponCode})" "−{formatCurrency(discount)}" giữa "Tạm tính" và "Phí giao hàng".
- [X] T025 [P] [US1] Tạo `src/features/coupons/components/coupon-field.tsx` (`"use client"`):
  - props `{ applied, status, pending, message, onApply, onRemove }`;
  - Enter gọi `preventDefault()` rồi `onApply`;
  - nhãn và `aria-*` theo contracts/checkout-ui.md.

  Mục tiêu: pass T018.

- [X] T026 [US1] Sửa `src/features/checkout/components/checkout-form.tsx`:
  - thêm state `appliedCoupon: AppliedCoupon | null`;
  - `handleApplyCoupon` gọi `POST /api/coupons/validate` với `{ code, items }`, khi 200 thì lưu `{ rule: body.coupon }`;
  - mỗi lần render, tính `deriveCouponStatus(appliedCoupon, subtotal, new Date())` và chỉ truyền `discount` vào `CheckoutSummary` khi trạng thái là `active`;
  - render `CouponField` ở cột phải, phía trên `CheckoutSummary`;
  - khi submit, gửi kèm `couponCode` nếu `appliedCoupon !== null`;
  - chỉ import `coupon-rules`, `types` và `@/features/checkout/checkout-schema`, KHÔNG import `coupon-service` hay `@/data/coupons` (FR-022a).

  Mục tiêu: pass T019.

- [X] T027 [US1] Chạy `npm run check`, đảm bảo pass.

**Checkpoint**: MVP: áp mã hợp lệ và đặt hàng có giảm giá chạy được end-to-end.

---

## Phase 4: User Story 2 - Thông báo rõ lý do khi mã không hợp lệ (Priority: P1)

**Goal**: Mã không tồn tại, hết hạn hoặc chưa đạt tối thiểu đều có thông báo tiếng Việt cạnh ô mã. Mã đã áp dụng mà tạm tính rơi dưới tối thiểu thì chuyển sang trạng thái lỗi, và tự có hiệu lực lại khi tạm tính đạt mức (Clarification Q2).

**Independent Test**: Nhập `KHONGCO`, `TET2026`, rồi `GIAM50K` với giỏ 450_000. Mỗi lần hiện đúng lý do, ô mã có `aria-invalid`, tổng không đổi.

### Tests for User Story 2 (viết trước, phải FAIL)

- [X] T028 [P] [US2] Bổ sung `src/features/coupons/coupon-service.test.ts`. `validateCoupon` ném `OrderError`:
  - `COUPON_NOT_FOUND` với `KHONGCO`, và với mã đúng độ dài nhưng có ký tự lạ: `"SHOP LITE10"` (khoảng trắng ở giữa), `"GIẢM50K"` (có dấu) (spec Edge Cases "Mã sai định dạng");
  - `COUPON_EXPIRED` với `TET2026` khi now = `2026-03-01T00:00:00+07:00`, còn now = `2026-02-28T23:59:59.999+07:00` thì hợp lệ;
  - `COUPON_MIN_SUBTOTAL_NOT_MET` với GIAM50K + p006, `details: { minSubtotal: "500000", shortfall: "50000" }`, message đúng data-model.md §2;
  - `PRODUCT_NOT_FOUND` khi `productId` lạ;
  - `VALIDATION_ERROR` + `details["code"]` khi mã rỗng hoặc dài 33 ký tự.
- [X] T029 [P] [US2] Bổ sung `src/app/api/coupons/validate/route.test.ts`:
  - 422 cho 3 mã lỗi `COUPON_*`;
  - 400 khi body không phải JSON hoặc sai schema;
  - body lỗi luôn là `ApiErrorBody`.
- [X] T030 [P] [US2] Bổ sung `src/features/coupons/components/coupon-field.test.tsx`:
  - ô trống hoặc chỉ khoảng trắng mà bấm "Áp dụng" → "Vui lòng nhập mã giảm giá" và không gọi `onApply`;
  - nhập 33 ký tự rồi bấm "Áp dụng" → "Mã giảm giá tối đa 32 ký tự" và không gọi `onApply` (spec Edge Cases "Mã sai định dạng");
  - khi có `message` lỗi → `role="alert"` với `id="coupon-message"`, ô mã có `aria-invalid="true"` và `aria-describedby="coupon-message"`.
- [X] T031 [US2] Bổ sung `src/features/checkout/components/checkout-form.test.tsx`:
  - validate trả 422 → hiện `error.message`, tổng không đổi;
  - validate trả 400 với `details: { code: "Mã giảm giá tối đa 32 ký tự" }` → hiện đúng câu đó;
  - đã áp SHOPLITE10 mà áp GIAM50K thất bại → vẫn giữ SHOPLITE10 (FR-016);
  - lỗi mạng → "Không kiểm tra được mã, vui lòng thử lại.";
  - đã áp GIAM50K với giỏ 600_000, sau đó cập nhật giỏ qua `cartStore` còn 450_000 → mã ở trạng thái lỗi kèm "cần mua thêm 50.000 ₫", không có dòng `checkout-discount`; tăng lại ≥ 500_000 → dòng giảm giá xuất hiện lại mà không cần gọi API.

### Implementation for User Story 2

- [X] T032 [US2] Sửa `src/features/orders/order-errors.ts`: thêm `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_SUBTOTAL_NOT_MET` vào `OrderErrorCode`, cả ba map sang **422** trong `HTTP_STATUS_BY_CODE`.
- [X] T033 [US2] Sửa `src/features/coupons/coupon-service.ts`:
  - thêm `toCouponError(evaluation)` chuyển `CouponEvaluation` lỗi thành `OrderError` với message từ `getCouponErrorMessage`; lỗi tối thiểu kèm `details` `{ minSubtotal, shortfall }` dạng chuỗi số;
  - `validateCoupon` ném lỗi đó, ném `VALIDATION_ERROR` + `toFieldErrors` khi sai schema, và ném `PRODUCT_NOT_FOUND` khi sản phẩm lạ.

  Mục tiêu: pass T028, T029.

- [X] T034 [P] [US2] Sửa `src/features/coupons/components/coupon-field.tsx`:
  - trước khi gọi `onApply`, chạy `couponCodeSchema.safeParse` (từ `@/features/coupons/coupon-schema`, file an toàn cho client) và hiện đúng message của schema khi lỗi; không đặt `maxLength` trên ô để thông báo luôn hiện ra;
  - thêm vùng thông báo lỗi/thành công, `aria-invalid`, `aria-describedby`.

  Mục tiêu: pass T030.

- [X] T035 [US2] Sửa `src/features/checkout/components/checkout-form.tsx`:
  - xử lý validate 422/lỗi mạng (giữ mã cũ khi áp mã mới thất bại); khi nhận 400 `VALIDATION_ERROR`, ưu tiên hiện `error.details?.code`, nếu không có thì hiện `error.message`;
  - truyền message từ `deriveCouponStatus` (trạng thái `error` dưới tối thiểu) vào `CouponField`.

  Mục tiêu: pass T031.

- [X] T036 [US2] Chạy `npm run check`, đảm bảo pass.

**Checkpoint**: US1 và US2 đều hoạt động. Mọi lý do lỗi được hiển thị rõ.

---

## Phase 5: User Story 5 - Hệ thống chặn gian lận số tiền giảm (Priority: P1)

**Goal**: Server bỏ qua mọi con số tiền từ client, kiểm tra lại mã lúc đặt hàng và từ chối đơn khi mã không hợp lệ, không bao giờ tự bỏ mã. Client giữ mã ở trạng thái lỗi khi bị từ chối vì hết hạn (Clarification Q1).

**Independent Test**: Gửi `POST /api/orders` kèm `discount`/`total` tự khai → đơn lưu số do server tính. Gửi kèm TET2026 → 422, không có đơn mới.

### Tests for User Story 5 (viết trước, phải FAIL)

- [X] T037 [P] [US5] Bổ sung `src/features/orders/order-service.test.ts`:
  - payload có `discount: 450000, total: 0, subtotal: 1` cùng SHOPLITE10 → các trường này bị bỏ qua;
  - `placeOrder` ném `COUPON_EXPIRED` (now = `2026-03-01T00:00:00+07:00`, TET2026), `COUPON_NOT_FOUND`, `COUPON_MIN_SUBTOTAL_NOT_MET`, và repository vẫn rỗng sau mỗi lần ném;
  - TET2026 với now = `2026-02-28T23:59:59.999+07:00` → tạo đơn;
  - (Các ca kiểu dữ liệu của `couponCode` đã kiểm ở T015, ca tồn kho trước mã đã kiểm ở T016; ở đây không lặp lại.)
- [X] T038 [P] [US5] Bổ sung `src/app/api/orders/route.test.ts`:
  - 422 `COUPON_EXPIRED` / `COUPON_NOT_FOUND` / `COUPON_MIN_SUBTOTAL_NOT_MET`, và `GET /api/orders` không có đơn mới;
  - body gian lận vẫn trả 201 với số do server tính;
  - mock `orderService` với `now` cố định.
- [X] T039 [US5] Bổ sung `src/features/checkout/components/checkout-form.test.tsx`:
  - `POST /api/orders` trả 422 `COUPON_EXPIRED` → thông báo "Mã giảm giá đã hết hạn" ở `coupon-message`, mã vẫn trong `applied-coupon` ở trạng thái lỗi, không có dòng `checkout-discount`, giỏ không bị xóa, không chuyển trang;
  - bấm "Đặt hàng" lần nữa → request vẫn gửi `couponCode` (Story 5 #5).

### Implementation for User Story 5

- [X] T040 [US5] Sửa `src/features/orders/order-service.ts`:
  - khi `evaluateCoupon` trả lỗi thì `throw toCouponError(...)` trước `repository.save`;
  - giữ thứ tự: schema → sản phẩm/tồn kho → mã → tổng → lưu;
  - cập nhật JSDoc `placeOrder`.

  Mục tiêu: pass T037, T038.

- [X] T041 [US5] Sửa `src/features/checkout/components/checkout-form.tsx`: khi đặt hàng nhận lỗi `COUPON_EXPIRED` hoặc `COUPON_NOT_FOUND` thì gán `appliedCoupon.lockedError = error.message`; lỗi `COUPON_MIN_SUBTOTAL_NOT_MET` thì để `deriveCouponStatus` tự suy ra. Mục tiêu: pass T039.
- [X] T042 [US5] Chạy `npm run check`, đảm bảo pass.

**Checkpoint**: Mọi quy tắc tiền được server xác nhận. Cả 3 story P1 hoàn tất.

---

## Phase 6: User Story 3 - Gỡ hoặc thay mã đã áp dụng (Priority: P2)

**Goal**: Khách gỡ mã để về tổng gốc, hoặc thay bằng mã khác. Thay mã thành công thì xóa lỗi đang khóa.

**Independent Test**: Áp SHOPLITE10 → "Gỡ mã" → tổng về ban đầu. Áp SHOPLITE10 rồi GIAM50K (giỏ 600_000) → chỉ còn GIAM50K.

### Tests for User Story 3 (viết trước, phải FAIL)

- [X] T043 [P] [US3] Bổ sung `src/features/coupons/components/coupon-field.test.tsx`: nút "Gỡ mã" chỉ hiện khi có mã đang áp dụng; bấm thì gọi `onRemove` và ô mã sẵn sàng nhập mới.
- [X] T044 [US3] Bổ sung `src/features/checkout/components/checkout-form.test.tsx`:
  - "Gỡ mã" → không còn `checkout-discount` và `applied-coupon`, `checkout-total` về giá trị chưa giảm, lần submit sau không gửi `couponCode`;
  - áp GIAM50K thành công khi đang có SHOPLITE10 → chỉ còn GIAM50K;
  - đang có `lockedError` (sau 422 hết hạn) → "Gỡ mã" rồi đặt hàng thì gửi body không có `couponCode` (Story 5 #4).

### Implementation for User Story 3

- [X] T045 [P] [US3] Sửa `src/features/coupons/components/coupon-field.tsx`: thêm nút "Gỡ mã" (`type="button"`, có tên truy cập được), reset ô nhập sau khi áp dụng thành công. Mục tiêu: pass T043.
- [X] T046 [US3] Sửa `src/features/checkout/components/checkout-form.tsx`: `handleRemoveCoupon` gán `appliedCoupon = null`; áp mã mới thành công thì thay hẳn `appliedCoupon`, bỏ `lockedError`. Mục tiêu: pass T044.
- [X] T047 [US3] Chạy `npm run check`, đảm bảo pass.

**Checkpoint**: Khách tự kiểm soát được mã đang dùng.

---

## Phase 7: User Story 4 - Xem mã và số tiền giảm trong chi tiết đơn hàng (Priority: P2)

**Goal**: Trang chi tiết đơn hiển thị mã đã dùng và số tiền được giảm. Đơn cũ không có các trường này vẫn hiển thị như trước.

**Independent Test**: Render khối tổng của một đơn có `couponCode: "GIAM50K", discount: 50000` → có dòng "Giảm giá (GIAM50K) −50.000 ₫". Đơn cũ không có `discount`/`couponCode` → không có dòng giảm giá, tổng giữ nguyên.

### Tests for User Story 4 (viết trước, phải FAIL)

- [X] T048 [P] [US4] Viết `src/features/orders/components/order-totals.test.tsx`:
  - thứ tự các dòng: Tạm tính → Giảm giá ({couponCode}) `data-testid="order-discount"` → Phí giao hàng ("Miễn phí" khi 0) → Tổng cộng (`order.total` đã lưu, không tính lại);
  - đơn cũ (fixture không có `discount`/`couponCode`) → không có `order-discount`;
  - `discount: 0` → không có `order-discount`.

### Implementation for User Story 4

- [X] T049 [US4] Tạo `src/features/orders/components/order-totals.tsx` (Server Component, không `"use client"`): nhận `order: Order`, dùng `order.discount ?? 0`, chỉ hiện dòng giảm giá khi có `couponCode` và `discount > 0`, tiền qua `formatCurrency`. Mục tiêu: pass T048.
- [X] T050 [US4] Sửa `src/app/orders/[id]/page.tsx`: thay khối `<dl>` tổng tiền bằng `<OrderTotals order={order} />`; hướng dẫn chuyển khoản vẫn dùng `order.total`.
- [X] T051 [US4] Chạy `npm run check`, đảm bảo pass.

**Checkpoint**: Cả 5 user story đã hoàn tất.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E cho luồng mua hàng, tài liệu, format, và kiểm chứng cuối.

- [X] T052 Sửa `e2e/shopping-flow.spec.ts`: thêm một `test(...)` mới "khách hàng dùng mã SHOPLITE10 khi thanh toán", giữ nguyên test hiện có. Kịch bản:
  1. Thêm 1 "Chuột không dây SwiftClick" (450.000 ₫) vào giỏ, rồi vào `/checkout`.
  2. Nhập `TET2026` → "Áp dụng" → thấy "Mã giảm giá đã hết hạn".
  3. Nhập `shoplite10` → "Áp dụng" → `checkout-discount` chứa "45.000", `checkout-total` chứa "435.000".
  4. Điền thông tin nhận hàng, bấm "Đặt hàng" → URL `/orders/SL-…?placed=1`; `order-discount` chứa "SHOPLITE10" và "45.000"; tổng "435.000".
  5. Bấm "Tất cả đơn hàng" → dòng `order-row` của đơn vừa đặt chứa "435.000" (tổng sau giảm, Story 4 #3).
- [X] T053 [P] Cập nhật `AGENTS.md`:
  - mục 3 (Codemap): thêm hàng Coupons (`src/features/coupons/`: `coupon-rules.ts`, `coupon-service.ts`, `coupon-schema.ts`; `src/data/coupons.ts`; `api/coupons/validate/route.ts`) và bước tra mã trong "Luồng đặt hàng";
  - mục 4: thêm 3 mã lỗi `COUPON_*` 422;
  - mục 5: quy tắc mã giảm giá (phí ship theo subtotal trước giảm, một mã mỗi đơn);
  - mục 7: "Không import `@/data/coupons` hay `@/features/coupons/coupon-service` vào Client Component".
- [X] T054 Rà soát thủ công (FR-022a): grep cho thấy chỉ `coupon-service.ts` import `@/data/coupons`, và không file `"use client"` nào import `coupon-service`, `@/data/coupons` hay `@/features/orders/server`. Không hard-code `300_000`, `500_000`, `100_000` ngoài `src/data/coupons.ts` và test fixtures.
- [X] T055 Chạy `npm run format`.
- [X] T056 Chạy `npm run test:e2e` (đụng luồng mua hàng, bắt buộc theo Constitution II), đảm bảo pass.
- [X] T057 Thực hiện các bước API và UI trong [quickstart.md](./quickstart.md) với `ORDERS_FILE` trỏ tới file tạm, đối chiếu kết quả.
- [X] T058 Chạy `npm run check`, đảm bảo pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → chặn mọi user story.
- **US1 (Phase 3)**: cần Phase 2. Tạo `coupon-service`, route validate, `CouponField`, tích hợp `CheckoutForm` và `placeOrder`.
- **US2 (Phase 4)**: cần US1 (mở rộng `coupon-service`, `CouponField`, `CheckoutForm`).
- **US5 (Phase 5)**: cần US1 (`placeOrder` có mã) và US2 (`toCouponError`, mã lỗi `COUPON_*`).
- **US3 (Phase 6)**: cần US1. Ca "gỡ mã sau lỗi khóa" (một phần T044) cần US5.
- **US4 (Phase 7)**: cần Phase 2 (`Order.discount`/`couponCode`); để có dữ liệu thật thì cần US1. Test T048 dùng fixture nên làm song song với Phase 3–6 được.
- **Polish (Phase 8)**: cần mọi story.

### Thứ tự story

```text
Setup → Foundational → US1 (MVP) → US2 → US5 → US3
                                 ↘ US4 (song song từ sau Foundational, nếu có người)
                                                      → Polish
```

### Trong mỗi story

- Test (T0xx) viết trước và FAIL → model/service → route → component → tích hợp `CheckoutForm` → `npm run check`.
- Các task cùng sửa `checkout-form.tsx`, `checkout-form.test.tsx`, `coupon-service.ts`, `order-service.ts` hay `coupon-field.tsx` KHÔNG được chạy song song với nhau, nên không đánh [P].

---

## Parallel Example

### Phase 2

```text
# Test (song song, khác file):
T003 coupon-rules.test.ts | T004 coupon-schema.test.ts | T005 coupon-data.test.ts | T006 pricing.test.ts
# Cài đặt (song song):
T007 coupon-rules.ts | T008 coupon-schema.ts | T009 data/coupons.ts | T010 pricing.ts
```

### User Story 1

```text
# Test (song song):
T013 coupon-service.test.ts | T014 validate/route.test.ts | T015 checkout-schema.test.ts
T016 order-service.test.ts  | T017 orders/route.test.ts  | T018 coupon-field.test.tsx
# Cài đặt song song được:
T024 checkout-summary.tsx | T025 coupon-field.tsx   (sau đó T026 checkout-form.tsx)
```

### User Story 2 / 5 / 3

```text
US2: T028 | T029 | T030 (test song song) ; T034 song song với T032→T033
US5: T037 | T038 (test song song)
US3: T043 song song với phần cài đặt T046 của người khác ; T045 song song với T044
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 → Phase 2 → Phase 3 (US1).
2. **Dừng và kiểm chứng**: áp SHOPLITE10, đặt hàng, đơn có `discount` đúng. Lúc này server đã tính lại tiền nhưng chưa từ chối mã lỗi lúc đặt hàng, nên **chưa phát hành** khi chưa xong US5.

### Mức phát hành được tối thiểu

US1 + US2 + US5, tức cả 3 story P1. Chống gian lận là bắt buộc trước khi lên production.

### Incremental Delivery

1. Setup + Foundational → nền tảng.
2. US1 → demo nội bộ.
3. US2 → thông báo lỗi đầy đủ.
4. US5 → phát hành được.
5. US3 → gỡ/thay mã.
6. US4 → hiển thị trong chi tiết đơn.
7. Polish → e2e, tài liệu.

---

## Notes

- [P] = khác file, không phụ thuộc task chưa xong.
- Mỗi task test phải được chạy và quan sát FAIL trước task cài đặt tương ứng (Red → Green → Refactor).
- Kết thúc mỗi phase bằng `npm run check` xanh. Commit sau mỗi phase, không commit `storage/`.
- Spec đã chốt định dạng mã (FR-004, Edge Cases "Mã sai định dạng"), không lộ danh sách mã (FR-022a) và nguồn thời gian (FR-022b). Reviewer cần rà lại [checklists/security.md](./checklists/security.md) trước Phase 3.

---

## Phase 9: Convergence

- [X] T059 CRITICAL: Bỏ track `storage/orders.json` khỏi git bằng `git rm --cached storage/orders.json` trong một commit riêng (giữ nguyên file trên máy) để `.gitignore` có tác dụng và không còn dữ liệu đơn hàng trong repo per Constitution, Ràng buộc kỹ thuật "MUST NOT commit `storage/`" (contradicts)
- [X] T060 Thêm vùng `aria-live="polite"` trong `src/features/coupons/components/coupon-field.tsx` để trình đọc màn hình báo khi áp mã thành công (ví dụ "Đã áp dụng mã SHOPLITE10"), viết test trước trong `coupon-field.test.tsx`, rồi chạy `npm run check` per contracts/checkout-ui.md (thông báo thành công) và Constitution V (partial)
- [X] T061 Chạy lại [quickstart.md](./quickstart.md) trên dev server riêng với `ORDERS_FILE` trỏ tới file tạm (không dùng kho đơn mặc định), và thực hiện trên trình duyệt các bước giao diện 2, 4, 5, 6, 8 per T057 (partial)

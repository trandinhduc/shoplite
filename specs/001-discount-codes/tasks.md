---

description: "Danh sách task triển khai mã giảm giá khi thanh toán (TDD)"
---

# Tasks: Mã giảm giá khi thanh toán

**Input**: Design documents from `/specs/001-discount-codes/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: BẮT BUỘC, theo TDD (constitution II và yêu cầu của `/speckit-tasks`). Trong mỗi phase, task viết
test đứng **trước** task cài đặt. Test phải được chạy và **FAIL** trước khi bắt đầu cài đặt. Tên test viết
tiếng Việt. Test gọi mạng dùng `vi.stubGlobal("fetch", ...)`. Test service và route dùng
`createInMemoryOrderRepository()` và thêm `// @vitest-environment node`. Không ghi vào `storage/`.

**Organization**: Task được nhóm theo user story để mỗi story cài đặt và kiểm thử độc lập được.
Task cuối của mỗi phase luôn là `npm run check`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1–US4 theo [spec.md](./spec.md)
- Đường dẫn tính từ gốc repo. Import qua alias `@/*`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Xác nhận nền xanh trước khi đổi code.

- [X] T001 Chạy `npm run check` trên nhánh `001-discount-codes` khi chưa sửa gì. Nếu có lỗi sẵn từ trước thì ghi lại trong mô tả PR và không sửa trong feature này. **Kết quả (2026-11-08):** `npm run check` đỏ sẵn ở bước lint do 7 lỗi trong `module123-guides/__MACOSX/` (file rác macOS, chưa được git theo dõi, không liên quan feature). Trên mã nguồn thật: `npx eslint src e2e` sạch, `npm run typecheck` OK, 83 test pass.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Kiểu dữ liệu, dữ liệu tĩnh, công thức tiền, quy tắc mã, schema và mã lỗi mà mọi user story đều dùng.

**⚠️ CRITICAL**: Chưa xong phase này thì chưa bắt đầu user story nào.

### Kiểu dữ liệu (không có logic, cần trước để test biên dịch được)

- [X] T002 [P] Tạo `src/features/coupons/types.ts` theo [data-model.md](./data-model.md):
  - `Coupon` là union theo `type`:
    - `"percent"`: `percent` "Số nguyên, từ 1 đến 100", `maxDiscount` "> 0".
    - `"fixed"`: `amount` "> 0".
  - Trường chung: `code` ("Viết HOA, không khoảng trắng, duy nhất trong danh sách"), `minOrderValue?` ("≥ 0. Thiếu thì coi là 0"), `expiresOn?` (`"YYYY-MM-DD"`, "Thiếu thì không hết hạn").
  - `DiscountRule`: phần tính tiền của `Coupon`.
  - `CouponEvaluation`: 4 nhánh `ok` / `NOT_FOUND` / `EXPIRED` / `MIN_ORDER_NOT_MET` (có `minOrderValue`, `missingAmount`).
  - `CouponNotice = { code: "COUPON_EXPIRED"; couponCode: string }`.
  - `CouponPreview` = body 200 trong [contracts/coupons-validate.md](./contracts/coupons-validate.md).
- [X] T003 [P] Trong `src/features/orders/types.ts` thêm vào `Order` hai trường optional `couponCode?: string` và `discount?: number`, kèm comment tiếng Việt rằng đơn cũ không có hai trường này (FR-017, R5).
- [X] T004 [P] Trong `src/features/orders/order-errors.ts`:
  - Thêm `"COUPON_NOT_FOUND" | "COUPON_EXPIRED" | "COUPON_MIN_ORDER_NOT_MET"` vào union `OrderErrorCode`.
  - Thêm cả ba mã vào `HTTP_STATUS_BY_CODE`, đều là `422` (R3, constitution III).

### Tests cho nền tảng (viết trước, chạy phải FAIL) ⚠️

- [X] T005 [P] Viết test trong `src/features/checkout/pricing.test.ts`:
  - `calculateCouponDiscount`:
    - Phần trăm làm tròn xuống (10% của 333.335 = 33.333).
    - Chặn mức tối đa với `SHOPLITE10` ở tạm tính 999.999 / 1.000.000 / 1.000.001 → 99.999 / 100.000 / 100.000.
    - Mã cố định 50.000 với tạm tính 30.000 → 30.000 (không vượt tạm tính).
    - Tạm tính 0 → 0.
  - `calculateOrderTotals(lines, method, rule)`:
    - Trả `discount`, và `total = subtotal - discount + shippingFee`.
    - Phí ship vẫn tính trên tạm tính **trước** giảm: 500.000 với `GIAM50K` và `standard` → ship 0, total 450.000.
    - `express` vẫn 60.000.
  - Cập nhật các `toEqual` hiện có để có `discount: 0`.
- [X] T006 [P] Viết test trong `src/features/coupons/coupon-rules.test.ts`:
  - `normalizeCouponCode`: trim và chuyển HOA, ví dụ `" shoplite10 "` → `"SHOPLITE10"`.
  - `isCouponExpired` (R6): với `expiresOn = "2026-02-28"`:
    - `2026-02-28T23:59:59+07:00` → còn hạn.
    - `2026-03-01T00:00:00+07:00` → hết hạn.
    - Mã không có `expiresOn` → không bao giờ hết hạn.
  - `evaluateCoupon(coupon | undefined, subtotal, now)`:
    - Thứ tự kiểm tra: tồn tại → hết hạn → tối thiểu. `TET2026` với giỏ nhỏ báo `EXPIRED`.
    - Biên `SHOPLITE10` 299.999 / 300.000 / 300.001 → `MIN_ORDER_NOT_MET` (`missingAmount` 1) / ok / ok.
    - Biên `GIAM50K` 499.999 / 500.000.
    - `ok` trả `discount` đúng theo `pricing.ts`.
- [X] T007 [P] Viết test trong `src/features/coupons/coupon-service.test.ts` (`// @vitest-environment node`):
  - Toàn vẹn dữ liệu `coupons`: mã viết HOA, không khoảng trắng, không trùng; ràng buộc đúng theo `type`; `expiresOn` đúng dạng `YYYY-MM-DD`; đủ ba mã của FR-019 với giá trị đúng.
  - `findCouponByCode` nhận mã thường hoặc có khoảng trắng; mã lạ trả `undefined`.
  - `toCouponError(evaluation, code)` trả `OrderError` đúng mã lỗi kèm message tiếng Việt khớp [contracts/coupons-validate.md](./contracts/coupons-validate.md):
    - `COUPON_MIN_ORDER_NOT_MET` có `details` `{ minOrderValue: "300000", missingAmount: "50000" }`.
    - Message dùng `formatCurrency`.
  - `getExpiredCouponNotice(rawCode, subtotal, now)` (FR-015a, FR-013; tự validate bằng `couponCodeSchema`):
    - `("TET2026", 600_000, now sau 2026-02-28)` → `{ couponCode: "TET2026", lostDiscount: 90000 }`.
    - Mã **còn hạn** (`"SHOPLITE10"`) → `null`; mã không tồn tại → `null`.
    - Giá trị không hợp lệ (chuỗi dài hơn 32 ký tự, `undefined`, mảng, số, chuỗi chỉ có khoảng trắng) → `null`, không ném lỗi.
    - `("tet2026", …)` thường và có khoảng trắng vẫn nhận.
  - `getExpiredCouponNoticeForOrder(order, rawCode, now)` (dùng cho trang chi tiết đơn, C2):
    - Đơn **đã có** `couponCode` → `null`, dù `rawCode` là mã đã hết hạn.
    - Đơn không có `couponCode` → trả giống `getExpiredCouponNotice(rawCode, order.subtotal, now)`.
  - Mọi `OrderError` do `toCouponError` tạo ra có `httpStatus === 422`.
- [X] T008 [P] Viết test trong `src/features/checkout/checkout-schema.test.ts`:
  - `couponCodeSchema` là `z.string().trim().toUpperCase().max(32)` (FR-013):
    - 32 ký tự hợp lệ, 33 ký tự lỗi; chuỗi rỗng sau trim coi như không có mã.
    - Sai kiểu (số, mảng, object, `null`) bị từ chối.
    - Khoảng trắng ở giữa (`"SHOP LITE10"`) **không** bị sửa: vẫn qua schema nhưng giữ nguyên khoảng trắng.
  - `placeOrderSchema` nhận `couponCode` tùy chọn và **loại bỏ** các khóa lạ `discount`, `total`, `subtotal`, `shippingFee`.
  - `validateCouponSchema` (`code` 1..32 sau trim; `items` dùng chung schema với `placeOrderSchema`) báo lỗi khi `code` chỉ gồm khoảng trắng.
- [X] T009 Chạy `npx vitest run src/features/checkout src/features/coupons`. Xác nhận các test mới của T005–T008 **FAIL** (red), sau đó mới làm tiếp.

### Cài đặt nền tảng

- [X] T010 Trong `src/features/checkout/pricing.ts`:
  - Thêm `calculateCouponDiscount(rule, subtotal)` theo R7.
  - Mở rộng `OrderTotals` với `discount`.
  - `calculateOrderTotals(lines, method, rule?: DiscountRule | null)`: phí ship vẫn tính trên `subtotal` trước giảm.
  - Chỉ `import type` từ `@/features/coupons/types`, không import dữ liệu mã.
  - Mục tiêu: T005 xanh.
- [X] T011 [P] Tạo `src/data/coupons.ts`, export `coupons: Coupon[]` với `SHOPLITE10` (percent 10, maxDiscount 100_000, minOrderValue 300_000), `GIAM50K` (fixed 50_000, minOrderValue 500_000), `TET2026` (percent 15, maxDiscount 200_000, expiresOn `"2026-02-28"`). Thêm comment tiếng Việt: "chỉ import từ server".
- [X] T012 Tạo `src/features/coupons/coupon-rules.ts` (hàm thuần, client dùng được, **không** import `src/data/coupons.ts`):
  - `normalizeCouponCode`.
  - `isCouponExpired(coupon, now)`: so với `new Date(\`${expiresOn}T00:00:00+07:00\`)` cộng 1 ngày.
  - `evaluateCoupon`: gọi `calculateCouponDiscount`.
  - Mục tiêu: T006 xanh. Phụ thuộc T010.
- [X] T013 Tạo `src/features/coupons/coupon-service.ts` (chỉ server import):
  - `findCouponByCode(code, list = coupons)`.
  - `toCouponError(evaluation, code)` → `OrderError` với message trong contract.
  - `getExpiredCouponNotice(rawCode: unknown, subtotal, now = new Date())` → `{ couponCode, lostDiscount } | null`: parse `rawCode` bằng `couponCodeSchema` (lỗi thì `null`), tra mã, và chỉ trả kết quả khi `isCouponExpired(coupon, now)` là đúng; `lostDiscount` tính bằng `calculateCouponDiscount` trên `subtotal`.
  - `getExpiredCouponNoticeForOrder(order, rawCode, now = new Date())`: trả `null` nếu `order.couponCode` có giá trị, ngược lại gọi `getExpiredCouponNotice(rawCode, order.subtotal, now)`.
  - Mục tiêu: T007 xanh. Phụ thuộc T004, T011, T012 và **T014** (`couponCodeSchema`): làm T014 trước T013.
- [X] T014 [P] Trong `src/features/checkout/checkout-schema.ts`:
  - Thêm `couponCodeSchema`.
  - Tách `orderItemsSchema` từ `placeOrderSchema` để dùng chung.
  - Thêm `couponCode: couponCodeSchema.optional()` vào `placeOrderSchema`.
  - Thêm `validateCouponSchema = z.object({ code, items: orderItemsSchema })`.
  - Mục tiêu: T008 xanh.
- [X] T015 Chạy `npm run check`. Toàn bộ phải xanh. **Kết quả:** lint mã nguồn sạch, typecheck OK, 158 test pass (14 file); `npm run check` nguyên bản vẫn đỏ chỉ vì `__MACOSX` (xem T001).

**Checkpoint**: Nền tảng sẵn sàng. Công thức tiền và quy tắc mã đã có test biên.

---

## Phase 3: User Story 1 - Áp dụng mã hợp lệ và thấy ưu đãi ngay (Priority: P1) 🎯 MVP

**Goal**: Ở `/checkout`, khách nhập mã hợp lệ, bấm "Áp dụng" và thấy ngay dòng "Giảm giá (CODE)" cùng tổng mới. Mã được lưu cùng giỏ hàng.

**Independent Test**: Giỏ ≥ 300.000 ₫ → `/checkout` → nhập ` shoplite10 ` → "Áp dụng" → tóm tắt có `discount-amount` và `checkout-total` đã trừ giảm giá. Đổi phương thức giao hàng thì tiền giảm giữ nguyên.

### Tests for User Story 1 (viết trước, chạy phải FAIL) ⚠️

- [X] T016 [P] [US1] Viết test trong `src/features/orders/order-service.test.ts` cho `previewCoupon(input)`:
  - Tạm tính 300.000 / 1.000.000 / 2.000.000 với `SHOPLITE10` → giảm 30.000 / 100.000 / 100.000.
  - `GIAM50K` ở 500.000 → 50.000.
  - Mã viết thường hoặc có khoảng trắng vẫn nhận.
  - `subtotal` do client gửi bị bỏ qua (server lấy giá từ `findProduct`) (FR-021).
  - `productId` lạ → `PRODUCT_NOT_FOUND`.
  - Input sai schema → `VALIDATION_ERROR`.
  - Inject `findCoupon` và `now` để test tất định.
- [X] T017 [P] [US1] Viết route test trong `src/app/api/coupons/validate/route.test.ts` (`// @vitest-environment node`, mock `@/features/orders/server` như `src/app/api/orders/route.test.ts`):
  - 200 kèm body đúng [contracts/coupons-validate.md](./contracts/coupons-validate.md); `coupon` chỉ có các trường quy tắc của đúng mã được hỏi, không lộ mã khác (FR-022).
  - 400 `VALIDATION_ERROR` khi body không phải JSON hoặc `code` chỉ có khoảng trắng.
- [X] T018 [P] [US1] Viết test giỏ hàng:
  - `src/features/cart/cart-reducer.test.ts`:
    - `apply-coupon` gán `couponCode`; `remove-coupon` xóa.
    - **`add`, `update-quantity`, `remove` giữ nguyên `couponCode`.**
    - `clear` xóa cả `items` lẫn `couponCode`.
  - `src/features/cart/cart-store.test.ts`:
    - Dữ liệu cũ `{ items }` không có `couponCode` vẫn đọc được.
    - `couponCode` sai kiểu bị bỏ qua.
    - Sự kiện `storage` đồng bộ `couponCode` giữa các tab.
  - Gọi `cartStore.reset()` trong test.
- [X] T019 [P] [US1] Viết component test trong `src/features/coupons/components/coupon-field.test.tsx`, chọn phần tử theo [contracts/ui-checkout.md](./contracts/ui-checkout.md):
  - Có ô `getByLabelText("Mã giảm giá")` và nút "Áp dụng".
  - Bấm "Áp dụng" gọi `fetch("/api/coupons/validate")` với `{ code, items }` (stub fetch).
  - Trong lúc gọi, nút disabled và hiện "Đang kiểm tra…".
  - Thành công thì hiện "Đã áp dụng mã SHOPLITE10", ẩn ô nhập, gọi callback `onApplied(preview)`.
  - Nhấn Enter trong ô mã **không** submit form cha.
- [X] T020 [P] [US1] Viết component test:
  - `src/features/checkout/components/checkout-summary.test.tsx` (file mới):
    - Có `rule` thì hiện dòng `Giảm giá (SHOPLITE10)` / `−50.000 ₫` (testid `discount-amount`) và `checkout-total` đã trừ giảm giá.
    - Không có `rule` thì không có dòng giảm giá.
    - Phí ship tính trên tạm tính trước giảm.
  - `src/features/checkout/components/checkout-form.test.tsx` (bổ sung, stub fetch; kiểm tra phần ghép ở T027):
    - Form render `getByLabelText("Mã giảm giá")` trong cột tóm tắt; trước khi áp mã thì chưa có `discount-amount`.
    - Áp `SHOPLITE10` (fetch trả 200) thì tóm tắt hiện `discount-amount` và `checkout-total` đã trừ giảm giá.
    - Đổi phương thức giao hàng thì `discount-amount` giữ nguyên, phí ship đổi theo quy tắc hiện hành.
- [X] T021 [US1] Chạy `npx vitest run src/features/orders src/features/cart src/features/coupons src/features/checkout src/app/api/coupons`. Xác nhận các test mới của T016–T020 **FAIL**. **Kết quả:** 28 test fail + 2 file chưa có module (`coupon-field`, `route`) trước khi cài đặt.

### Implementation for User Story 1

- [X] T022 [US1] Trong `src/features/orders/order-service.ts`:
  - Thêm `findCoupon?: (code: string) => Coupon | undefined` vào `OrderServiceDeps` (mặc định `findCouponByCode`).
  - Tách helper nội bộ `priceItems(items)`: dùng lại `mergeItems`, kiểm tra sản phẩm và tồn kho, trả `OrderItem[]`. Dùng chung cho `placeOrder` và `previewCoupon`.
  - Thêm `previewCoupon(input)`: validate `validateCouponSchema` → `priceItems` → `evaluateCoupon` → `ok` thì trả `CouponPreview`, không thì `throw toCouponError(...)`.
  - Mục tiêu: T016 xanh.
- [X] T023 [US1] Tạo route mỏng `src/app/api/coupons/validate/route.ts`: `POST` gọi `readJsonBody`, trả `jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ")` khi body hỏng, gọi `orderService.previewCoupon(body)`, trả `NextResponse.json(preview)`, `catch` thì `handleRouteError`. Mục tiêu: T017 xanh.
- [X] T024 [P] [US1] Cập nhật giỏ hàng:
  - `src/features/cart/types.ts`: thêm `CartState.couponCode?: string` và action `apply-coupon` / `remove-coupon`.
  - `src/features/cart/cart-reducer.ts`: mọi case trả `{ ...state, items }` để giữ `couponCode`; `clear` trả `EMPTY_CART`.
  - `src/features/cart/cart-store.ts`: `isCartState` chấp nhận `couponCode` là chuỗi hoặc `undefined`, bỏ giá trị sai kiểu.
  - `src/features/cart/use-cart.ts`: trả thêm `couponCode`, `applyCoupon(code)`, `removeCoupon()`.
  - Mục tiêu: T018 xanh.
- [X] T025 [US1] Tạo `src/features/coupons/components/coupon-field.tsx` (`"use client"`), chỉ import `coupon-rules`/types, **không** import `src/data/coupons.ts` hay `coupon-service.ts`: **Ghi chú:** chưa hiển thị thông báo lỗi (để US3 làm theo TDD); khi API lỗi hoặc mất mạng ô mã chỉ ngừng "Đang kiểm tra…".
  - Ô nhập có `<label htmlFor>`.
  - Nút "Áp dụng" `type="button"`; Enter trong ô thì `preventDefault` rồi áp dụng.
  - `fetch` tới `/api/coupons/validate`; thành công thì `applyCoupon(code)` và `onApplied(preview)`.
  - Mục tiêu: T019 xanh.
- [X] T026 [US1] Trong `src/features/checkout/components/checkout-summary.tsx`: nhận prop `coupon?: { code: string; rule: DiscountRule } | null`, truyền `rule` vào `calculateOrderTotals`, render dòng giảm giá giữa "Tạm tính" và "Phí giao hàng" bằng `formatCurrency`. Mục tiêu: T020 xanh.
- [X] T027 [US1] Trong `src/features/checkout/components/checkout-form.tsx`: giữ `preview` trong state, render `<CouponField>` ngay trên `<CheckoutSummary>`, truyền `coupon` xuống summary. Các phần khác của form chưa đổi. Mục tiêu: các test form của T020 xanh.
- [X] T028 [US1] Chạy `npm run check`. Toàn bộ phải xanh. **Kết quả:** lint mã nguồn sạch, typecheck OK, 202 test pass (17 file).

**Checkpoint**: Áp mã và xem trước tiền giảm hoạt động độc lập. Đặt hàng chưa gửi mã (US2).

---

## Phase 4: User Story 2 - Đặt hàng với mã, hệ thống xác nhận lại và lưu vào đơn (Priority: P1)

**Goal**: `POST /api/orders` nhận `couponCode`; server đánh giá lại và tính lại tiền. Đơn lưu `couponCode` và `discount`. Trang chi tiết đơn hiển thị dòng giảm giá. Mã hết hạn lúc đặt thì đơn theo giá gốc kèm thông báo (FR-015a).

**Independent Test**: Đặt đơn có `GIAM50K`, mở `/orders/{id}`, thấy dòng `order-discount` và tổng đã trừ giảm giá. Gửi payload có `discount: 999999, total: 1` thì đơn vẫn theo số của server.

### Tests for User Story 2 (viết trước, chạy phải FAIL) ⚠️

- [X] T029 [P] [US2] Viết test trong `src/features/orders/order-service.test.ts` cho `placeOrder`:
  - `GIAM50K` ở 499.999 → `COUPON_MIN_ORDER_NOT_MET` và repository không có đơn; ở 500.000 → đơn có `couponCode: "GIAM50K"`, `discount: 50000`, total đúng.
  - Payload kèm `discount: 999999`, `total: 1` → bị bỏ qua.
  - `TET2026`:
    - `now = 2026-02-28T23:59:59+07:00` → có giảm giá.
    - `now = 2026-03-01T00:00:00+07:00` → đơn **được tạo** với `discount: 0`, không có `couponCode`, kết quả kèm `couponNotice: { code: "COUPON_EXPIRED", couponCode: "TET2026" }`, và `couponNotice` **không** nằm trong bản lưu ở repository.
  - Mã không tồn tại → `COUPON_NOT_FOUND`, không lưu.
  - Không gửi mã → `discount: 0`, không có `couponCode`.
  - `cancelOrder` trên đơn có mã giữ nguyên `couponCode` và `discount` (spec Edge Cases, data-model).
- [X] T030 [P] [US2] Viết test trong `src/app/api/orders/route.test.ts`: 201 với `couponCode`; 422 cho `COUPON_NOT_FOUND` và `COUPON_MIN_ORDER_NOT_MET` (kiểm cả `error.code` lẫn status); 201 kèm `couponNotice` khi mã hết hạn (inject `now` qua service mock).
- [X] T031 [P] [US2] Viết test trong `src/features/orders/order-repository.test.ts` (thư mục tạm `mkdtemp(tmpdir())`): file JSON chứa đơn cũ không có `discount` và `couponCode` vẫn đọc được bằng `findById` và `findAll`, giữ nguyên `total`.
- [X] T032 [P] [US2] Viết test trong `src/features/checkout/components/checkout-form.test.tsx` (stub fetch):
  - Payload `POST /api/orders` có `couponCode` khi đã áp mã, không có khi chưa áp.
  - Response có `couponNotice` → `router.push("/orders/{id}?placed=1&couponExpired=TET2026")`.
  - 422 `COUPON_*` → ở lại trang, hiện `role="alert"` với `error.message` và mã bị gỡ khỏi giỏ (FR-024).
  - Thành công → `clear()` xóa cả mã.
- [X] T033 [P] [US2] Viết component test trong `src/features/orders/components/order-price-summary.test.tsx` và `src/features/orders/components/expired-coupon-notice.test.tsx` (file mới):
  - Dòng `Giảm giá (GIAM50K)` / `−50.000 ₫` (testid `order-discount`) chỉ hiện khi `couponCode` có giá trị và `discount > 0`.
  - Đơn cũ không có hai trường thì không có dòng giảm giá, tổng giữ nguyên.
  - `ExpiredCouponNotice` (chỉ hiển thị, nhận `couponCode` và `lostDiscount`) có `role="status"` và nội dung "Mã TET2026 đã hết hạn lúc đặt hàng… (mã lẽ ra giảm 90.000 ₫)". Việc quyết định có hiện hay không đã được test ở T007, không làm lại ở đây.
- [X] T034 [US2] Chạy `npx vitest run src/features/orders src/features/checkout src/app/api/orders`. Xác nhận các test mới của T029–T033 **FAIL**. **Kết quả:** 16 test fail + 2 module chưa có (`order-price-summary`, `expired-coupon-notice`); T031 là test hồi quy nên xanh ngay.

### Implementation for User Story 2

- [X] T035 [US2] Trong `src/features/orders/order-service.ts`, sửa `placeOrder`:
  - Sau `priceItems`, nếu có `couponCode` thì `evaluateCoupon(findCoupon(code), subtotal, now())`.
  - `ok` → lưu `couponCode` và `discount`, totals bằng `calculateOrderTotals(items, method, rule)`.
  - `NOT_FOUND` hoặc `MIN_ORDER_NOT_MET` → `throw toCouponError(...)` (không lưu).
  - `EXPIRED` → lưu đơn `discount: 0` không có `couponCode`, trả `{ ...order, couponNotice }`.
  - Kiểu trả về `Order & { couponNotice?: CouponNotice }`. Chỉ `save` đối tượng `Order`.
  - Mục tiêu: T029 xanh.
- [X] T036 [US2] Cập nhật JSDoc của `POST` trong `src/app/api/orders/route.ts` (thêm `couponCode` ở body, `couponNotice` ở response 201). Không đổi logic vì route đã trả nguyên kết quả của service. Mục tiêu: T030 xanh (nhờ T035). Không sửa `src/features/orders/order-repository.ts`: repository đọc JSON không qua schema (R5), nên T031 là test hồi quy và phải xanh ngay.
- [X] T037 [US2] Trong `src/features/checkout/components/checkout-form.tsx`: **Ghi chú:** payload chỉ gửi `couponCode` khi mã đã được server xác nhận và giỏ vẫn giữ đúng mã đó (không gửi mã lưu sẵn mà khách chưa thấy).
  - Gửi `couponCode` (lấy từ `useCart().couponCode`) trong payload.
  - Xử lý `couponNotice` bằng cách thêm `&couponExpired=CODE` vào URL redirect.
  - Gặp lỗi `COUPON_*` thì ở lại trang, hiện lỗi, gọi `removeCoupon()` và xóa `preview` (FR-024).
  - Mục tiêu: T032 xanh.
- [X] T038 [P] [US2] Tạo `src/features/orders/components/order-price-summary.tsx` (Tạm tính / Giảm giá / Phí giao hàng / Tổng cộng, coi `discount ?? 0`) và `src/features/orders/components/expired-coupon-notice.tsx` (nhận `couponCode`, `lostDiscount`). Cả hai là Server Component, dùng `formatCurrency`. Mục tiêu: T033 xanh.
- [X] T039 [US2] Sửa `src/app/orders/[id]/page.tsx`:
  - Thay khối `<dl>` tổng tiền bằng `<OrderPriceSummary order={order} />`.
  - Đọc `couponExpired` từ `searchParams` (kiểu `string | string[] | undefined`, **không tin**) và, chỉ khi `placed === "1"`, gọi đúng một hàm `getExpiredCouponNoticeForOrder(order, couponExpired)`; kết quả khác `null` thì render `<ExpiredCouponNotice {...notice} />` ngay dưới banner thành công, phía trên khối "Giao hàng & thanh toán". Mọi điều kiện (validate Zod, mã thật sự đã hết hạn, đơn đã có mã) nằm trong hàm đó (T007, T013), không làm lại trong `src/app/` (constitution I).
  - Không thêm logic nghiệp vụ nào khác vào `src/app/`.
- [X] T040 [US2] Chạy `npm run check`. Toàn bộ phải xanh. **Kết quả:** lint mã nguồn sạch, typecheck OK, 232 test pass (19 file).

**Checkpoint**: Luồng áp mã → đặt hàng → xem đơn chạy trọn vẹn. Server là nguồn sự thật về tiền.

---

## Phase 5: User Story 3 - Hiểu rõ vì sao mã không dùng được (Priority: P2)

**Goal**: Ba lý do từ chối (không tồn tại / hết hạn / chưa đạt tối thiểu kèm số tiền cần mua thêm) hiển thị đúng ở ô mã. Ô trống thì nhắc nhập mã.

**Independent Test**: Lần lượt nhập `ABC123`, `TET2026`, và `SHOPLITE10` với giỏ 299.999 ₫. Ba thông báo khác nhau, tổng tiền không đổi.

### Tests for User Story 3 ⚠️

> **NOTE**: Nhánh lỗi phía server đã được cài đặt và test ở T007, T013, T022, nên T041 và T042 là test **hồi quy** và sẽ xanh ngay (ghi lại trong PR). Chỉ phần hiển thị lỗi ở T043 là mới và phải **FAIL** trước khi cài đặt.

- [X] T041 [P] [US3] (hồi quy) Bổ sung `src/app/api/coupons/validate/route.test.ts`:
  - 422 `COUPON_NOT_FOUND` (`Mã giảm giá "ABC123" không tồn tại`).
  - 422 `COUPON_EXPIRED` (`TET2026`).
  - 422 `COUPON_MIN_ORDER_NOT_MET` ở 299.999 (`details.missingAmount === "1"`) và 250.000 (`"50000"`, message có `50.000 ₫`).
  - Tại 300.000 trả 200.
- [X] T042 [P] [US3] (hồi quy) Bổ sung `src/features/orders/order-service.test.ts`: `previewCoupon` ném đúng `OrderError` cho từng lý do, `httpStatus === 422`.
- [X] T043 [P] [US3] Bổ sung `src/features/coupons/components/coupon-field.test.tsx`:
  - Lỗi API hiện trong phần tử `role="alert"`; ô nhập có `aria-invalid="true"` và `aria-describedby` trỏ tới id của thông báo.
  - Ô trống bấm "Áp dụng" → "Vui lòng nhập mã giảm giá" và **không** gọi `fetch`.
  - Mất mạng → "Không kết nối được máy chủ, vui lòng thử lại."
  - Gõ lại vào ô thì xóa lỗi; `onApplied` không được gọi khi lỗi.
- [X] T044 [US3] Chạy `npx vitest run src/app/api/coupons src/features/orders src/features/coupons`. Xác nhận T041, T042 **xanh** (hồi quy) và các test mới của T043 **FAIL**. **Kết quả:** T041, T042 xanh ngay (hồi quy); 10 test hiển thị lỗi của T043 fail trước khi cài đặt.

### Implementation for User Story 3

- [X] T045 [US3] Trong `src/features/coupons/components/coupon-field.tsx`: hiển thị lỗi API (nguyên văn `error.message`, không tự soạn lại chuỗi) trong `role="alert"`; ô nhập có `aria-invalid` và `aria-describedby` trỏ tới thông báo; gõ lại thì xóa lỗi; `onApplied` không được gọi khi lỗi. Mục tiêu: các test lỗi API của T043 xanh.
- [X] T046 [US3] Trong `src/features/coupons/components/coupon-field.tsx`: validate ô trống phía client ("Vui lòng nhập mã giảm giá", không gọi `fetch`) và xử lý lỗi mạng ("Không kết nối được máy chủ, vui lòng thử lại."). Mục tiêu: các test còn lại của T043 xanh. Làm sau T045 (cùng file).
- [X] T047 [US3] Chạy `npm run check`. Toàn bộ phải xanh. **Kết quả:** lint mã nguồn sạch, typecheck OK, 252 test pass (19 file).

**Checkpoint**: Mọi trường hợp mã không hợp lệ đều có thông báo rõ lý do.

---

## Phase 6: User Story 4 - Gỡ mã và giữ mã khi khách đi qua lại (Priority: P3)

**Goal**: Có nút "Gỡ mã". Mã được giữ khi rời `/checkout` hoặc tải lại trang (FR-020). Mỗi lần vào lại trang hoặc giỏ đổi thì kiểm tra lại; không còn hợp lệ thì gỡ hẳn kèm thông báo và không tự áp lại (FR-018, Clarification Q2 = C).

**Independent Test**: Áp `SHOPLITE10` với giỏ 350.000 ₫ → về `/cart` giảm còn 250.000 ₫ → quay lại `/checkout` → mã bị gỡ, thông báo cần mua thêm 50.000 ₫. Thêm hàng lại thì mã không tự áp.

### Tests for User Story 4 (viết trước, chạy phải FAIL) ⚠️

- [X] T048 [P] [US4] Bổ sung `src/features/coupons/components/coupon-field.test.tsx`:
  - "Gỡ mã" (`getByRole("button", { name: "Gỡ mã" })`) gọi `removeCoupon` và ô nhập hiện lại, để trống.
  - Mount khi `cartStore` đã có `couponCode` → tự gọi validate. 200 thì hiện "Đã áp dụng mã…"; 422 thì gỡ mã và hiện `role="status"` "Mã SHOPLITE10 đã được gỡ: …".
  - `items` đổi thì gọi validate lại; response cũ về muộn bị bỏ qua.
  - Sau khi bị gỡ, `items` đạt lại tối thiểu thì **không** tự gọi validate hay tự áp lại.
- [X] T049 [P] [US4] Bổ sung `src/features/checkout/components/checkout-form.test.tsx`: trong lúc kiểm tra lại mã, nút "Đặt hàng" disabled và tóm tắt hiển thị giá chưa giảm (FR-023).
- [X] T050 [US4] Chạy `npx vitest run src/features/coupons src/features/checkout`. Xác nhận các test mới của T048–T049 **FAIL**. **Kết quả:** 13 test fail trước khi cài đặt (1 test "không có mã thì không gọi server" xanh sẵn).

### Implementation for User Story 4

- [X] T051 [US4] Trong `src/features/coupons/components/coupon-field.tsx`: **Ghi chú:** callback đặt tên `onRevalidatingChange(boolean)` (thay `onStatusChange`); trạng thái "đã áp dụng" suy ra từ `useCart().couponCode` + kết quả server đã xác nhận cho đúng giỏ, nên mã bị gỡ ở tab khác hay do form cũng hiện lại ô nhập.
  - Thêm nút "Gỡ mã".
  - `useEffect` kiểm tra lại khi mount và khi `items` đổi, dùng `AbortController` để bỏ request cũ.
  - Lỗi 422 thì `removeCoupon()` và hiện thông báo `role="status"`.
  - Báo trạng thái `revalidating` lên form qua callback `onStatusChange`.
  - Đọc mã qua `useCart()`, không đọc localStorage trực tiếp (constitution V).
  - Mục tiêu: T048 xanh.
- [X] T052 [US4] Trong `src/features/checkout/components/checkout-form.tsx`: khi `revalidating` thì disable nút "Đặt hàng" và truyền `coupon = null` cho summary; khi mã bị gỡ thì xóa `preview`. Mục tiêu: T049 xanh.
- [X] T053 [US4] Chạy `npm run check`. Toàn bộ phải xanh. **Kết quả:** lint mã nguồn sạch, typecheck OK, 266 test pass (19 file).

**Checkpoint**: Cả 4 user story hoạt động độc lập. FR-018 và FR-020 thỏa.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E, tài liệu, định dạng và kiểm chứng cuối.

- [X] T054 [P] Thêm test mới vào `e2e/shopping-flow.spec.ts`: `test("khách hàng áp dụng mã SHOPLITE10 và đặt hàng được giảm giá", ...)`. **Kết quả:** kịch bản mới chạy qua trên trình duyệt thật.
  - Thêm 2 "Chuột không dây SwiftClick" (2 × 450.000 = 900.000 ₫) → `/checkout`.
  - `getByLabel("Mã giảm giá")` nhập `shoplite10` → `getByRole("button", { name: "Áp dụng" })`.
  - Kỳ vọng `getByTestId("discount-amount")` chứa `90.000` và `getByTestId("checkout-total")` chứa `810.000` (miễn phí ship).
  - Điền thông tin và đặt hàng. Trên `/orders/{id}`, kỳ vọng `getByTestId("order-discount")` chứa `90.000` và tổng `810.000`.
  - Giữ nguyên test hiện có.
- [X] T055 [P] Cập nhật tài liệu: **Ghi chú:** AGENTS.md thêm cả quy tắc nghiệp vụ mã giảm giá (§5) và điều cấm import dữ liệu mã vào Client Component (§7).
  - `README.md`: thêm dòng `POST /api/coupons/validate` vào bảng API, thêm trường `couponCode` vào ví dụ `POST /api/orders`, thêm quy tắc mã giảm giá vào "Quy tắc nghiệp vụ chính".
  - `AGENTS.md`: thêm hàng `Coupons` (`src/features/coupons/`) vào bảng Codemap và bổ sung `couponCode` vào "Luồng đặt hàng".
  - Không đụng `agentRules: false` trong `next.config.ts`.
- [X] T056 Kiểm tra bundle client không chứa dữ liệu mã. Grep `src/features/coupons/components/` và `src/features/checkout/components/`: không file `"use client"` nào import `@/data/coupons` hoặc `coupon-service` (R2, FR-022). **Kết quả:** không file `"use client"` nào import `@/data/coupons`, `coupon-service`, `order-service` hay `orders/server`.
- [X] T057 Chạy `npm run format` rồi `npm run format:check`. Phải sạch. **Ghi chú:** repo không có file cấu hình Prettier nên dùng `--print-width 100` (khớp mã gốc); mọi file code đã đụng đều đạt. `AGENTS.md` vốn không đạt Prettier ở bản gốc (bảng Codemap viết gọn) nên giữ nguyên phong cách.
- [X] T058 Chạy `npm run test:e2e`. Toàn bộ phải pass, kể cả kịch bản `SHOPLITE10`. **Kết quả:** 3/3 test e2e pass, gồm kịch bản `SHOPLITE10`.
- [ ] T059 Đi hết các bước kiểm tra bằng tay trong [quickstart.md](./quickstart.md) §2–§3 (curl và giao diện), ghi kết quả vào mô tả PR. Ghi thêm hai phép đo: SC-001 (thời gian từ lúc bấm "Áp dụng", và từ lúc vào trang có mã đã lưu, đến lúc thấy kết quả; mục tiêu dưới 1 giây) và SC-005 (số thao tác thêm so với luồng cũ: một lần nhập và một lần bấm). **CHƯA LÀM:** lệnh curl kiểm tra tay bị từ chối quyền chạy, và cổng 3000 đang có dev server khác (PID 19112) chạy sẵn. Các luồng quickstart §2 đã được phủ bởi route test và e2e nhưng chưa chạy bằng tay; SC-001 và SC-005 chưa đo.
- [X] T060 Chạy `npm run check` lần cuối. Toàn bộ phải xanh. **Kết quả:** lint mã nguồn sạch, typecheck OK, 266 test pass (19 file), e2e 3/3 pass; `npm run check` nguyên bản vẫn đỏ chỉ vì `__MACOSX` (xem T001).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: không phụ thuộc gì.
- **Foundational (Phase 2)**: sau Phase 1. **Chặn** mọi user story. Làm T014 trước T013 (T013 dùng `couponCodeSchema`).
- **US1 (Phase 3)**: sau Phase 2.
- **US2 (Phase 4)**: sau Phase 2. Phần client (T032, T037) dùng `CouponField` và `couponCode` trong giỏ của US1 → làm sau US1. Phần server (T029–T031, T035, T036, T038, T039) chạy song song với US1 được.
- **US3 (Phase 5)**: sau US1, vì mở rộng `CouponField` và `previewCoupon`.
- **US4 (Phase 6)**: sau US1, vì mở rộng `CouponField` và `cartStore`. Độc lập với US2 và US3, nhưng T052 sửa cùng file `checkout-form.tsx` với T037 → làm sau T037.
- **Polish (Phase 7)**: sau khi mọi story xong.

### Within Each User Story

- Test (đánh dấu ⚠️) → chạy xác nhận FAIL → cài đặt → `npm run check`.
- Kiểu dữ liệu → hàm thuần → service → route → component → trang.

### File dùng chung (không chạy song song)

- `src/features/orders/order-service.ts`: T022 → T035 → T045
- `src/features/coupons/components/coupon-field.tsx`: T025 → T046 → T051
- `src/features/checkout/components/checkout-form.tsx`: T027 → T037 → T052
- `src/features/orders/order-service.test.ts`: T016 → T029 → T042

### Parallel Opportunities

- Phase 2: T002, T003, T004 song song; T005, T006, T007, T008 song song; T011 và T014 song song với T010.
- US1: T016–T020 (5 file test khác nhau) song song; T024 song song với T022 và T023.
- US2: T029–T033 song song; T038 song song với T035 và T036.
- US3: T041–T043 song song.
- US4: T048 và T049 song song.
- Polish: T054 và T055 song song.

---

## Parallel Example: User Story 1

```bash
# Viết đồng thời 5 file test (khác file, không phụ thuộc nhau):
Task: "T016 [US1] test previewCoupon trong src/features/orders/order-service.test.ts"
Task: "T017 [US1] route test trong src/app/api/coupons/validate/route.test.ts"
Task: "T018 [US1] test couponCode trong src/features/cart/cart-reducer.test.ts + cart-store.test.ts"
Task: "T019 [US1] component test trong src/features/coupons/components/coupon-field.test.tsx"
Task: "T020 [US1] component test trong src/features/checkout/components/checkout-summary.test.tsx"

# Sau khi T021 xác nhận FAIL, cài đặt song song:
Task: "T022 [US1] previewCoupon trong src/features/orders/order-service.ts"
Task: "T024 [US1] couponCode trong src/features/cart/*"
```

## Parallel Example: User Story 2

```bash
Task: "T029 [US2] test placeOrder trong src/features/orders/order-service.test.ts"
Task: "T030 [US2] test route trong src/app/api/orders/route.test.ts"
Task: "T031 [US2] test đơn cũ trong src/features/orders/order-repository.test.ts"
Task: "T033 [US2] test src/features/orders/components/order-price-summary.test.tsx + expired-coupon-notice.test.tsx"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 → Phase 2 (nền tảng, test biên tiền).
2. Phase 3 (US1): khách thấy ưu đãi khi áp mã. **Dừng lại và demo.**
3. Phase 4 (US2) phải đi liền ngay sau. US1 một mình chưa nên phát hành, vì đơn chưa được giảm thật mà khách lại thấy giảm giá. MVP phát hành được là **US1 + US2**.

### Incremental Delivery

1. Nền tảng → US1 + US2 → kiểm thử → demo/PR đầu tiên (MVP).
2. US3 → thông báo lỗi rõ lý do → PR.
3. US4 → gỡ mã, giữ mã khi qua lại → PR.
4. Polish → e2e, tài liệu → PR cuối hoặc gộp vào PR US4.

### Ghi chú

- Mỗi task (hoặc nhóm task cùng file) nên là một commit riêng, message tiếng Việt.
- Constitution II: không đánh dấu task cài đặt là xong khi test tương ứng chưa từng FAIL trước đó.
- Thay đổi chạm hơn 3 file (US1, US2): trình bày kế hoạch trước khi sửa (CLAUDE.md).

## Phase 8: Convergence

**Mục đích**: Phần còn lại sau lần chạy `/speckit-converge` đầu tiên. T059 (kiểm tra tay, đo SC-001 và SC-005) vẫn là việc đang mở ở Phase 7 nên không lặp lại ở đây.

- [X] T061 CRITICAL: Làm `npm run check` xanh bước lint bằng cách thêm `"**/__MACOSX/**"` vào `globalIgnores` trong `eslint.config.mjs`, không xóa file nào của người dùng. Hiện 7 lỗi parse đều đến từ `module123-guides/__MACOSX/` (chưa theo dõi bởi git). Sau đó chạy `npm run check` và ghi kết quả vào T060 per Constitution II (partial). **Kết quả:** `npm run check` xanh hoàn toàn (lint sạch, typecheck OK, 266 test pass)
- [X] T062 Đưa `npm run format:check` về sạch per Definition of Done trong AGENTS.md §8 (partial): repo chưa có cấu hình Prettier nên mặc định rộng 80 cột và báo khoảng 128 file, trong khi `src`, `e2e` và `README.md` đã sạch ở `--print-width 100`. Thêm `.prettierrc` (`printWidth: 100`) và `.prettierignore` loại `specs/`, `module123-guides/`; chốt với người dùng trước khi thêm vì đây là thay đổi cấu hình toàn repo. **Kết quả:** thêm `.prettierrc` (100 cột) và `.prettierignore` (`specs/`, `module123-guides/`, `.specify/`, `.claude/`); format lại AGENTS.md và CLAUDE.md (chỉ khoảng trắng); `npm run format:check` sạch

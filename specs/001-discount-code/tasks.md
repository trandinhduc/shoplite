---
description: "Danh sách task triển khai mã giảm giá khi thanh toán (TDD)"
---

# Tasks: Mã giảm giá khi thanh toán

**Input**: Tài liệu thiết kế trong `/specs/001-discount-code/` (spec.md, plan.md, research.md, data-model.md, contracts/api.md, quickstart.md)

**Prerequisites**: plan.md, spec.md; constitution (`.specify/memory/constitution.md`)

**Tests**: BẮT BUỘC (TDD, Nguyên tắc II). Trong mỗi phase, các task test đứng TRƯỚC task cài đặt; chạy test và xác nhận chúng **fail (đỏ)** trước khi cài đặt, rồi mới làm xanh. Test dùng repository in-memory (`createInMemoryOrderRepository`), không chạm `storage/orders.json`.

**Organization**: gom theo user story; thứ tự phase theo ưu tiên: US1 → US2 → US4 (P1), US3 → US5 (P2).

## Format: `[ID] [P?] [Story] Mô tả kèm đường dẫn file`

- **[P]**: chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1–US5 theo spec.md
- Task cuối mỗi phase luôn là `npm run check` (lint + typecheck + test); phải xanh mới sang phase sau

## Quy ước chung cho mọi task

- Text hiển thị cho người dùng bằng tiếng Việt; số tiền dùng `formatCurrency` (`src/lib/format.ts`).
- Không thêm dependency, không thêm database. Không import `features/orders/server.ts` từ file `"use client"`.
- Mọi tổng tiền chỉ đi qua `calculateOrderTotals` (`src/features/checkout/pricing.ts`).
- Thông báo lỗi mã dùng chung từ `describeCouponFailure` (client và server).

---

## Phase 1: Setup

**Purpose**: chuẩn bị nhánh và baseline xanh

- [x] T001 Xác nhận đang ở nhánh riêng cho tính năng (`001-discount-code`; tạo nếu chưa có, không code trên `main`) và `specs/001-discount-code/spec.md` không còn `[NEEDS CLARIFICATION]`
- [x] T002 [P] Tạo thư mục rỗng `src/features/coupons/components/`
- [x] T003 Chạy `npm run check` để có baseline xanh trước khi sửa (nếu đỏ, dừng và báo cáo, không sửa code không liên quan)

---

## Phase 2: Foundational (chặn mọi user story)

**Purpose**: kiểu dữ liệu, danh sách mã, hàm thuần `evaluateCoupon`, mở rộng `calculateOrderTotals`, schema và mã lỗi dùng chung

**⚠️ CRITICAL**: chưa xong phase này thì chưa làm user story nào

- [x] T004 Tạo `src/features/coupons/types.ts`: `Coupon` (`code: string` viết hoa duy nhất; `type: "percent" | "fixed"`; `value: number`; `maxDiscount?: number` chỉ cho `percent`; `minOrderValue?: number`; `expiresOn?: string` dạng `YYYY-MM-DD`), `CouponEvaluation` (`{ ok: true; code; discountAmount }` | `{ ok: false; reason: "not_found" | "expired" | "min_order_not_met"; shortfall?: number }`), `AppliedDiscount` (`{ code: string; amount: number }`, `amount` số đồng > 0 và ≤ `subtotal`)

### Tests (viết trước, phải đỏ)

- [x] T005 [P] Viết `src/features/coupons/coupon-service.test.ts` cho `normalizeCouponCode`, `findCoupon`, `evaluateCoupon(code, subtotal, now, coupons = COUPONS)` và `describeCouponFailure`, gồm giá trị biên:
  - Chuẩn hóa: `"  shoplite10 "` → `"SHOPLITE10"`.
  - `SHOPLITE10`: subtotal 600.000 → 60.000; 300.000 (đúng tối thiểu) → 30.000; 299.999 → `min_order_not_met` với `shortfall = 1`; 200.000 → `shortfall = 100.000`; 1.000.000 → 100.000 (đúng trần); 2.000.000 → 100.000 (chạm trần); 333.333 → 33.333 (làm tròn xuống).
  - `GIAM50K`: 500.000 → 50.000; 499.999 → `min_order_not_met` `shortfall = 1`.
  - `TET2026`: `now = 2026-02-28T16:59:59.999Z` (23:59:59.999 UTC+7) → hợp lệ; `now = 2026-02-28T17:00:00.000Z` → `expired`.
  - Mã `ABC` → `not_found`.
  - Thứ tự ưu tiên lỗi: dùng danh sách mã tiêm vào có mã vừa hết hạn vừa dưới tối thiểu → `expired` (không phải `min_order_not_met`).
  - Mức giảm không vượt tiền hàng: mã `fixed` 50.000 trên subtotal 30.000 (danh sách tiêm vào, không minOrder) → 30.000; kết quả luôn là số nguyên không âm.
  - `describeCouponFailure`: "Mã giảm giá không tồn tại", "Mã giảm giá đã hết hạn", "Cần mua thêm {formatCurrency(shortfall)} để dùng mã này".
- [x] T006 [P] Viết `src/data/coupons.test.ts`: đúng 3 mã khởi tạo (SHOPLITE10: percent 10, maxDiscount 100.000, minOrderValue 300.000; GIAM50K: fixed 50.000, minOrderValue 500.000; TET2026: percent 15, maxDiscount 200.000, expiresOn `2026-02-28`) và các bất biến: mã viết hoa và duy nhất, `percent` có `value` từ 1 đến 100, `fixed` có `value` > 0, `maxDiscount` chỉ có ở `percent`, `expiresOn` đúng `YYYY-MM-DD`
- [x] T007 [P] Mở rộng `src/features/checkout/pricing.test.ts` cho `calculateOrderTotals(lines, method, discount = 0)`: không truyền tham số giảm giá thì kết quả như cũ và `discountAmount === 0`; kết quả trả về có trường `discountAmount` (số đồng, KHÔNG phải object) và test khẳng định object kết quả không có khóa `discount`; subtotal 600.000 + discount 60.000 + standard → `shippingFee 0`, `total 540.000`; **ngưỡng ship xét trước giảm**: subtotal 520.000 + discount 50.000 → `shippingFee 0`, `total 470.000`; đúng biên subtotal 500.000 + discount 50.000 vẫn miễn phí; subtotal 450.000 + discount 45.000 → `shippingFee 30.000`, `total 435.000`; express không miễn phí dù có giảm; discount lớn hơn subtotal bị chặn ở subtotal (total không âm); discount âm hoặc không nguyên bị xử lý an toàn (coi như 0)
- [x] T008 [P] Mở rộng `src/features/checkout/checkout-schema.test.ts`: `placeOrderSchema` chấp nhận `couponCode` tùy chọn, trim `"  giam50k "`, chuỗi rỗng hoặc chỉ khoảng trắng coi như không có mã, từ chối chuỗi dài hơn 32 ký tự và sai kiểu (số, `null`, mảng), loại bỏ các trường lạ `discount`, `discountAmount`, `total`, `unitPrice` khỏi kết quả parse; `couponCodeInputSchema` (dùng cho ô nhập ở UI) báo "Vui lòng nhập mã giảm giá" khi rỗng hoặc chỉ khoảng trắng và "Mã giảm giá tối đa 32 ký tự" khi dài hơn 32 ký tự (đúng 32 ký tự thì hợp lệ, 33 thì lỗi); khoảng trắng ở giữa mã được giữ nguyên
- [x] T009 [P] Tạo `src/features/orders/order-errors.test.ts`: `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_ORDER_NOT_MET` đều có `httpStatus === 422`; `details` được giữ nguyên (ví dụ `{ shortfall: "100000" }`)

### Cài đặt

- [x] T010 [P] Tạo `src/data/coupons.ts`: xuất `COUPONS: Coupon[]` với 3 mã khởi tạo đúng bảng trong `data-model.md` (chỉ đọc, giống `products.ts`)
- [x] T011 Cài `src/features/coupons/coupon-service.ts` (thuần, không import code server): `normalizeCouponCode` (`trim().toUpperCase()`), `findCoupon`, `evaluateCoupon` (không tồn tại → hết hạn → chưa đủ tối thiểu; hết hạn từ 00:00 ngày kế tiếp UTC+7; phần trăm `floor(subtotal * value / 100)` rồi `min(maxDiscount)` rồi `min(subtotal)`; cố định `min(value, subtotal)`; `subtotal >= minOrderValue` hợp lệ), `describeCouponFailure`; làm T005 và T006 xanh
- [x] T012 [P] Sửa `src/features/checkout/pricing.ts`: `calculateOrderTotals(lines, method, discountAmount = 0)` và `OrderTotals` có thêm trường **`discountAmount: number`** (không đặt tên `discount`, để khi spread vào `Order` không đụng `Order.discount?: AppliedDiscount`); giá trị đã bị chặn trong khoảng `[0, subtotal]`; phí ship tính trên subtotal trước giảm; `total = subtotal - discountAmount + shippingFee`, không âm; làm T007 xanh
- [x] T013 [P] Sửa `src/features/checkout/checkout-schema.ts`: thêm `couponCodeSchema` (`z.string().trim().max(32)`, rỗng → `undefined`) vào `placeOrderSchema` dưới tên `couponCode` (tùy chọn), thêm `couponCodeInputSchema` với message tiếng Việt; không thêm trường giá; làm T008 xanh
- [x] T014 [P] Sửa `src/features/orders/order-errors.ts`: thêm `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_ORDER_NOT_MET` vào `OrderErrorCode` và `HTTP_STATUS_BY_CODE` (đều 422); làm T009 xanh
- [x] T015 Chạy `npm run check` (phải xanh) trước khi sang user story

**Checkpoint**: nền tảng sẵn sàng, các user story bắt đầu được

---

## Phase 3: User Story 1 - Áp dụng mã hợp lệ để được giảm giá (Priority: P1) 🎯 MVP

**Goal**: khách nhập mã hợp lệ ở trang thanh toán, thấy ngay mức giảm và tổng mới, rồi đặt hàng với mức giảm do server tính.

**Independent Test**: giỏ 600.000đ, nhập `shoplite10`, bấm "Áp dụng" → giảm 60.000đ và tổng mới hiển thị; đặt hàng thành công, đơn lưu `discount = { code: "SHOPLITE10", amount: 60000 }`.

### Tests (viết trước, phải đỏ)

- [x] T016 [P] [US1] Tạo `src/features/coupons/components/coupon-input.test.tsx` (Testing Library): ô nhập có `label` "Mã giảm giá", nút "Áp dụng"; props `subtotal`, `applied`, `onApplied`, `onRemoved`; nhập `shoplite10` (chữ thường) với `subtotal = 600000` rồi bấm "Áp dụng" → gọi `onApplied({ code: "SHOPLITE10", amount: 60000 })`; nhập ` giam50k ` với `subtotal = 500000` → `{ code: "GIAM50K", amount: 50000 }`; khi `applied` có giá trị thì hiển thị mã đang áp dụng và số tiền giảm
- [x] T017 [P] [US1] Tạo `src/features/checkout/components/checkout-summary.test.tsx`: có `discount` thì hiển thị dòng "Giảm giá (SHOPLITE10)" với `data-testid="discount-amount"` là `-60.000 ₫` (dùng `formatCurrency`) và tổng mới ở `data-testid="checkout-total"`; không có `discount` thì không có dòng giảm giá
- [x] T018 [P] [US1] Mở rộng `src/features/checkout/components/checkout-form.test.tsx`: sau khi áp dụng `SHOPLITE10`, body `POST /api/orders` chứa `couponCode: "SHOPLITE10"` và KHÔNG chứa `discount`, `discountAmount`, `total`, `unitPrice`; không áp dụng mã thì body không có `couponCode`
- [x] T019 [P] [US1] Mở rộng `src/features/orders/order-service.test.ts` (repository in-memory, `findProduct` giả, `now` cố định): `placeOrder` với `couponCode: "shoplite10"` và subtotal 600.000 → `order.discount = { code: "SHOPLITE10", amount: 60000 }`, `total` khớp `calculateOrderTotals`; không có mã → không có khóa `discount`; mức giảm lấy từ giá catalog, không từ dữ liệu client
- [x] T020 [P] [US1] Mở rộng `src/app/api/orders/route.test.ts`: `POST` có `couponCode` hợp lệ → `201`, body có `discount` và `total` đúng; không có `couponCode` → response như cũ

### Cài đặt

- [x] T021 [P] [US1] Sửa `src/features/orders/types.ts`: thêm `discount?: AppliedDiscount` vào `Order` (tùy chọn để đơn cũ vẫn hợp lệ)
- [x] T022 [US1] Sửa `src/features/orders/order-service.ts`: `placeOrder` đọc `couponCode` từ dữ liệu đã parse, tính subtotal từ dòng hàng lấy từ catalog, gọi `evaluateCoupon(code, subtotal, now())`; mã hợp lệ thì tính `totals = calculateOrderTotals(orderItems, shippingMethod, result.discountAmount)`, rồi dựng `Order` bằng cách gán TƯỜNG MINH `subtotal`, `shippingFee`, `total` từ `totals` (không spread `...totals` vào `Order`, vì `totals.discountAmount` không phải trường của `Order`) và chỉ khi có mã mới gán `order.discount = { code: result.code, amount: totals.discountAmount }` (không có mã thì không có khóa `discount`); mã không hợp lệ thì throw `OrderError` với code `COUPON_*` tương ứng, message từ `describeCouponFailure`, `details.shortfall` (chuỗi số đồng) khi thiếu tối thiểu (làm T019, T020 xanh)
- [x] T023 [P] [US1] Tạo `src/features/coupons/components/coupon-input.tsx` (`"use client"`): trạng thái ô nhập, gọi `evaluateCoupon` trực tiếp (không gọi API), gọi `onApplied` khi hợp lệ, hiển thị mã đang áp dụng và số tiền giảm; `label` "Mã giảm giá" gắn với input; làm T016 xanh
- [x] T024 [P] [US1] Sửa `src/features/checkout/components/checkout-summary.tsx`: nhận `discount?: AppliedDiscount | null`, truyền `discount?.amount ?? 0` làm tham số `discountAmount` của `calculateOrderTotals`, thêm dòng "Giảm giá (mã)" với `data-testid="discount-amount"`; làm T017 xanh
- [x] T025 [US1] Sửa `src/features/checkout/components/checkout-form.tsx`: giữ state mã đã áp dụng, render `CouponInput` trong khu tóm tắt, truyền `discount` cho `CheckoutSummary`, gửi `couponCode` trong body khi có mã; làm T018 xanh
- [x] T026 [US1] Chạy `npm run check` (phải xanh)

**Checkpoint**: US1 chạy độc lập, là bản MVP dùng được

---

## Phase 4: User Story 2 - Hiểu rõ vì sao mã không dùng được (Priority: P1)

**Goal**: mã không hợp lệ hiển thị đúng một lý do tiếng Việt, tóm tắt đơn không đổi.

**Independent Test**: lần lượt nhập `ABC`, `TET2026`, `SHOPLITE10` với tiền hàng 200.000đ và để trống → mỗi trường hợp một thông báo đúng.

### Tests (viết trước, phải đỏ)

- [x] T027 [P] [US2] Mở rộng `src/features/coupons/components/coupon-input.test.tsx` (dùng `vi.setSystemTime("2026-11-08")` cho xác định): `ABC` → "Mã giảm giá không tồn tại"; `TET2026` → "Mã giảm giá đã hết hạn"; `SHOPLITE10` với `subtotal = 200000` → "Cần mua thêm 100.000 ₫ để dùng mã này"; để trống hoặc chỉ khoảng trắng → "Vui lòng nhập mã giảm giá"; nhập 33 ký tự → "Mã giảm giá tối đa 32 ký tự" (không phải "không tồn tại"); với `subtotal = 0` (giỏ rỗng) nút "Áp dụng" bị `disabled` và `onApplied` không bao giờ được gọi; mọi thông báo lỗi không chứa nguyên văn chuỗi người dùng nhập (ví dụ nhập `<b>x</b>` thì thông báo không chứa `<b>`); `onApplied` không được gọi ở cả 4 ca; lỗi hiển thị ngay cạnh ô nhập, `aria-invalid="true"` và `aria-describedby` trỏ tới phần tử lỗi
- [x] T028 [P] [US2] Mở rộng `src/features/checkout/components/checkout-form.test.tsx`: sau khi nhập mã sai, tổng tiền trong `data-testid="checkout-total"` không đổi và không có dòng giảm giá; khi giỏ rỗng chỉ hiển thị EmptyState "Chưa có sản phẩm để thanh toán" và KHÔNG có ô "Mã giảm giá" hay nút "Áp dụng"

### Cài đặt

- [x] T029 [US2] Sửa `src/features/coupons/components/coupon-input.tsx`: validate ô nhập bằng `couponCodeInputSchema`, hiển thị `describeCouponFailure(...)` khi `evaluateCoupon` không hợp lệ, dùng `data-testid="error-couponCode"` giống các field hiện có, thiết lập `aria-invalid`/`aria-describedby`, xóa lỗi khi người dùng gõ lại; vô hiệu hóa nút "Áp dụng" khi `subtotal <= 0`; làm T027, T028 xanh
- [x] T030 [US2] Chạy `npm run check` (phải xanh)

**Checkpoint**: US1 và US2 chạy độc lập

---

## Phase 5: User Story 4 - Hệ thống xác nhận lại giảm giá khi đặt hàng (Priority: P1)

**Goal**: server tự kiểm tra lại mã và tính lại mọi số tiền, bỏ qua số liệu client; mã hết hạn hoặc không đủ điều kiện lúc đặt thì đơn bị từ chối và form tự gỡ mã.

**Independent Test**: gửi `POST /api/orders` kèm `discount`/`total` tự điền hoặc mã không đủ điều kiện → đơn không bao giờ lưu mức giảm sai.

> Lưu ý: một phần đường từ chối đã được cài ở T022; các test server dưới đây khóa chặt hành vi (có thể xanh ngay), còn test của form (T033) là hành vi mới và phải đỏ trước.

### Tests (viết trước)

- [x] T031 [P] [US4] Mở rộng `src/features/orders/order-service.test.ts` (repository in-memory, `findProduct` giả để kiểm soát giá, `now` tiêm vào):
  - `TET2026` với `now = 2026-02-28T16:59:59.999Z` được nhận, với `2026-02-28T17:00:00.000Z` bị `COUPON_EXPIRED`.
  - Tiền hàng đúng 300.000 với `SHOPLITE10` được nhận; 299.999 → `COUPON_MIN_ORDER_NOT_MET` với `details.shortfall === "1"`; mã `ABC` → `COUPON_NOT_FOUND`.
  - Khi bị từ chối, `repository.findAll()` vẫn rỗng (không lưu đơn dở).
  - Payload có thêm `discount`, `discountAmount`, `total`, `unitPrice` giả → bị bỏ qua, `order.discount.amount` và `total` do server tính.
  - `couponCode` dài hơn 32 ký tự → `VALIDATION_ERROR`.
  - Cùng sản phẩm ở hai dòng được gộp trước khi tính tiền hàng và xét tối thiểu.
  - Đơn `standard` 520.000 + `GIAM50K` → `shippingFee 0`, `total 470.000`; `express` vẫn tính phí.
  - FR-012 (bất biến): sau khi đặt, `getOrder` ở thời điểm `now` sau ngày hết hạn của mã (hoặc sau khi giá catalog đổi) vẫn trả `discount` và `total` y như lúc đặt; `cancelOrder` giữ nguyên `discount`.
  - Giá đổi giữa lúc xem trước và lúc đặt: cùng `couponCode` `SHOPLITE10` với `findProduct` trả giá 600.000 rồi 700.000 cho hai lần `placeOrder` thì mức giảm lần lượt là 60.000 và 70.000 (tính trên giá hiện hành); nếu giá hạ làm tiền hàng xuống 299.999 thì `COUPON_MIN_ORDER_NOT_MET` và không lưu đơn.
  - Giỏ rỗng (`items: []`) kèm `couponCode: "SHOPLITE10"` → `VALIDATION_ERROR` ("Giỏ hàng đang trống") ngay từ bước validate, không đánh giá mã, `repository.findAll()` vẫn rỗng.
  - `couponCode` chỉ khoảng trắng (`"   "`) → đặt hàng bình thường như không có mã; mã có khoảng trắng ở giữa (`"SHOP LITE10"`) → `COUPON_NOT_FOUND`; thông báo lỗi không chứa nguyên văn mã đã nhập.
- [x] T032 [P] [US4] Mở rộng `src/app/api/orders/route.test.ts`: mỗi lỗi mã trả `422` với `error.code`, `error.message` tiếng Việt và `details.shortfall` (cho thiếu tối thiểu) theo `contracts/api.md`; `couponCode` quá dài hoặc sai kiểu → `400 VALIDATION_ERROR`; payload có `discount`/`total` tự điền vẫn cho kết quả do server tính; `PATCH /api/orders/:id` (hủy đơn) không làm đổi `discount` của đơn; `couponCode` 33 ký tự → `400 VALIDATION_ERROR`; `items: []` kèm `couponCode` hợp lệ → `400 VALIDATION_ERROR` với `details.items` = "Giỏ hàng đang trống" và không có đơn nào được tạo
- [x] T033 [P] [US4] Mở rộng `src/features/checkout/components/checkout-form.test.tsx`: khi `POST /api/orders` trả `422 COUPON_EXPIRED` hoặc `COUPON_MIN_ORDER_NOT_MET` thì dòng giảm giá biến mất, tổng trở về giá gốc, hiển thị `error.message` ở `role="alert"`, mọi giá trị đã nhập còn nguyên, `fetch` chỉ được gọi một lần (không tự đặt lại), nút "Đặt hàng" bật lại; lỗi khác (ví dụ `INSUFFICIENT_STOCK`) thì KHÔNG gỡ mã

### Cài đặt

- [x] T034 [US4] Rà và chỉnh `src/features/orders/order-service.ts` để T031, T032 xanh (kiểm tra thứ tự: validate schema → dựng dòng hàng từ catalog và gộp trùng → `evaluateCoupon` → tính tiền → `repository.save`; không lưu gì khi lỗi)
- [x] T035 [US4] Sửa `src/features/checkout/components/checkout-form.tsx`: khi response lỗi có `error.code` bắt đầu bằng `COUPON_`, xóa mã đã áp dụng, hiển thị message, giữ state form, không tự gửi lại; làm T033 xanh
- [x] T036 [US4] Chạy `npm run check` (phải xanh)

**Checkpoint**: các story P1 hoàn chỉnh, bản phát hành đầu tiên có thể dừng ở đây

---

## Phase 6: User Story 3 - Gỡ hoặc đổi mã đã áp dụng (Priority: P2)

**Goal**: khách gỡ mã để về giá gốc hoặc đổi sang mã khác; chỉ một mã tại một thời điểm.

**Independent Test**: áp dụng `GIAM50K`, gỡ → tổng về giá gốc; áp dụng `SHOPLITE10` → chỉ còn một dòng giảm giá.

### Tests (viết trước, phải đỏ)

- [x] T037 [P] [US3] Mở rộng `src/features/coupons/components/coupon-input.test.tsx`: khi đã áp dụng có nút "Gỡ mã" gọi `onRemoved`; áp dụng mã hợp lệ khác gọi `onApplied` với mã mới; áp dụng mã không hợp lệ không gọi `onApplied` và không gọi `onRemoved` (mã đang áp dụng được giữ nguyên)
- [x] T038 [P] [US3] Mở rộng `src/features/checkout/components/checkout-form.test.tsx`: gỡ mã → dòng giảm giá biến mất và tổng về giá gốc; đổi `GIAM50K` sang `SHOPLITE10` → đúng một dòng giảm giá; giỏ đổi làm tiền hàng thấp hơn mức tối thiểu của mã đang áp dụng → mã tự bị gỡ kèm thông báo "Cần mua thêm …"

### Cài đặt

- [x] T039 [US3] Sửa `src/features/coupons/components/coupon-input.tsx`: nút "Gỡ mã" (có nhãn truy cập được, thao tác được bằng bàn phím); làm T037 xanh
- [x] T040 [US3] Sửa `src/features/checkout/components/checkout-form.tsx`: xử lý `onRemoved`, thay thế mã khi áp dụng mã mới, và `useEffect` đánh giá lại mã đang áp dụng mỗi khi `subtotal` đổi (tự gỡ và báo lý do nếu không còn đạt); làm T038 xanh
- [x] T041 [US3] Chạy `npm run check` (phải xanh)

**Checkpoint**: US3 chạy độc lập

---

## Phase 7: User Story 5 - Xem mã đã dùng trong chi tiết đơn hàng (Priority: P2)

**Goal**: trang chi tiết đơn hiển thị mã và số tiền giảm; đơn cũ không có `discount` vẫn hiển thị bình thường.

**Independent Test**: đặt đơn có `GIAM50K` rồi mở chi tiết → thấy mã, số tiền giảm, tổng khớp; mở đơn cũ → không có dòng giảm giá, không lỗi.

### Tests (viết trước, phải đỏ)

- [x] T042 [P] [US5] Tạo `src/features/orders/components/order-totals.test.tsx`: đơn có `discount` hiển thị "Giảm giá (GIAM50K)" với `-50.000 ₫` và tổng khớp; đơn không có `discount` (đơn cũ) không có dòng giảm giá và tổng không đổi; phí ship 0 hiển thị "Miễn phí"
- [x] T043 [P] [US5] Mở rộng `src/features/orders/order-repository.test.ts` (file tạm): đọc được đơn JSON cũ không có `discount` (không lỗi, không thêm khóa); đơn có `discount` ghi rồi đọc lại giữ nguyên `code` và `amount`

### Cài đặt

- [x] T044 [P] [US5] Tạo `src/features/orders/components/order-totals.tsx`: khối tạm tính, giảm giá (chỉ khi `order.discount` tồn tại), phí giao hàng, tổng cộng, chuyển từ `src/app/orders/[id]/page.tsx`; làm T042 xanh
- [x] T045 [US5] Sửa `src/app/orders/[id]/page.tsx`: dùng `OrderTotals` thay khối tổng tiền cũ; làm T043 xanh nếu cần chỉnh repository
- [x] T046 [US5] Chạy `npm run check` (phải xanh)

**Checkpoint**: tất cả user story hoàn chỉnh

---

## Phase 8: E2E & hoàn thiện

**Purpose**: kiểm chứng luồng thanh toán đầu-cuối (bắt buộc vì đổi luồng thanh toán, AGENTS.md §8) và cập nhật tài liệu

- [x] T047 Cập nhật `e2e/shopping-flow.spec.ts`: thêm một test mới dùng mã `SHOPLITE10` — thêm 1 "Chuột không dây SwiftClick" (450.000₫) vào giỏ, vào thanh toán, điền thông tin nhận hàng, nhập `shoplite10` vào ô "Mã giảm giá" và bấm "Áp dụng"; kiểm `data-testid="discount-amount"` chứa `45.000` và `data-testid="checkout-total"` chứa `435.000` (450.000 − 45.000 + 30.000 phí ship); đặt hàng; ở trang chi tiết đơn thấy `SHOPLITE10` và `45.000`; không sửa test hiện có
- [x] T048 Chạy `npm run test:e2e` (cần `npx playwright install chromium` lần đầu); phải xanh
- [x] T049 [P] Cập nhật `AGENTS.md` (codemap: thêm hàng "Mã giảm giá" với `src/features/coupons/`, `src/data/coupons.ts`; mục §5: quy tắc giảm giá, ngưỡng ship xét trước giảm, các mã lỗi `COUPON_*`) và `README.md` (bảng tính năng/API nếu có liên quan)
- [x] T050 [P] Đi lại `specs/001-discount-code/quickstart.md` (mục 2 và 3) trên `npm run dev` và ghi lại kết quả; ghi chú các mục `[Gap]` của `checklists/security.md` còn mở
- [x] T051 Chạy `npm run check` lần cuối (phải xanh) trước khi commit

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → các story → Phase 8.** Phase 2 chặn mọi story.
- **Trong Phase 2:** T004 → (T005–T009 song song, phải đỏ) → (T010, T012, T013, T014 song song; T011 sau T004 và T010) → T015.
- **US1 (P1)** chỉ phụ thuộc Phase 2. **US2** phụ thuộc US1 (dùng `coupon-input.tsx`, `checkout-form.tsx`). **US4** phụ thuộc US1 (đường `placeOrder`, form). **US3** phụ thuộc US1 và US2 (cùng file component). **US5** phụ thuộc US1 (`Order.discount`), độc lập với US2, US3, US4.
- **Cùng file nên KHÔNG song song:** `coupon-input.tsx` (T023, T029, T039), `checkout-form.tsx` (T025, T035, T040), `order-service.ts` (T022, T034), `coupon-input.test.tsx` và `checkout-form.test.tsx` giữa các phase.
- Trong mỗi story: test → xác nhận đỏ → cài đặt → `npm run check`.

## Parallel Examples

```text
# Phase 2, nhóm test (khác file):
T005 coupon-service.test.ts | T006 data/coupons.test.ts | T007 pricing.test.ts | T008 checkout-schema.test.ts | T009 order-errors.test.ts

# US1, nhóm test:
T016 coupon-input.test.tsx | T017 checkout-summary.test.tsx | T018 checkout-form.test.tsx | T019 order-service.test.ts | T020 route.test.ts

# US1, nhóm cài đặt (sau khi test đỏ):
T021 orders/types.ts | T023 coupon-input.tsx | T024 checkout-summary.tsx   (T022, T025 làm tuần tự sau)

# Sau US1, hai người có thể làm song song:
US5 (T042–T046)  ||  US2 rồi US3 (UI)  ||  US4 (server, T031–T032 trước)
```

## Implementation Strategy

- **MVP**: Phase 1 + Phase 2 + US1 (T001–T026): áp dụng mã hợp lệ và đặt đơn với mức giảm do server tính. Dừng, chạy `npm run check` và thử tay theo quickstart.
- **Phát hành tối thiểu an toàn**: MVP + US2 + US4 (cả ba đều P1). Đây là mức nên có trước khi cho người dùng thật dùng, vì có thông báo lỗi rõ và khóa chặt gian lận.
- **Tăng dần**: thêm US3 (gỡ/đổi mã), US5 (chi tiết đơn), rồi Phase 8.
- Mỗi phase kết thúc bằng `npm run check` xanh; không sang phase kế khi còn đỏ.

## Ghi chú

- Mục `[Gap]` trong `checklists/security.md` (độ dài/ký tự mã, đặt hàng lặp, chống dò mã, ghi log từ chối) chưa có yêu cầu trong spec; task chỉ cài giới hạn 32 ký tự và Zod trim như plan. Nếu cần thêm, làm rõ spec trước rồi bổ sung task.
- Đánh dấu `[x]` khi hoàn thành từng task.

---

## Phase 9: Convergence

- [x] T052 Chỉ ghi `order.discount` khi `amount > 0`: trong `src/features/orders/order-service.ts` bỏ qua `discount` khi `evaluateCoupon` trả `discountAmount === 0`, và thêm test ở `src/features/orders/order-service.test.ts` (dùng `findProduct` giả hoặc danh sách mã tiêm vào cho ca mức giảm bằng 0, đơn không có khóa `discount`) per data-model.md `AppliedDiscount.amount > 0` (partial)
- [x] T053 Đi qua `specs/001-discount-code/quickstart.md` mục 2 (các bước 1–10) trên `npm run dev` bằng trình duyệt thật và ghi kết quả vào mục "Kết quả kiểm tra" của quickstart per T050 (partial)

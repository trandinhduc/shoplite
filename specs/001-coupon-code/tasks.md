# Tasks: Mã giảm giá khi thanh toán (Coupon Code)

**Input**: Design documents from `/specs/001-coupon-code/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`).  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`.  
**TDD Rule (Constitution II)**: Mọi user story bắt buộc phải có task viết test (unit / component / route test) đứng TRƯỚC task cài đặt.  
**Quality Gate**: Task cuối cùng của mỗi Phase là chạy `npm run check` (lint + typecheck + unit tests).

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Có thể chạy song song (khác file, không có sự phụ thuộc lẫn nhau).
- **[Story]**: Thuộc User Story nào (`[US1]`, `[US2]`, `[US3]`).
- Mọi task đều có đường dẫn file cụ thể.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Khởi tạo cấu trúc module và dữ liệu tĩnh danh mục mã giảm giá.

- [ ] T001 [P] Tạo danh mục mã giảm giá tĩnh ban đầu (`SHOPLITE10`, `GIAM50K`, `TET2026`) trong `src/data/coupons.ts`
- [ ] T002 [P] Định nghĩa kiểu dữ liệu `Coupon`, `AppliedCoupon`, `ValidateCouponResult`, `CouponErrorCode` trong `src/features/coupons/types.ts`
- [ ] T003 Kiểm tra chất lượng code Phase 1: chạy `npm run check`

---

## Phase 2: Foundational (Core Logic & Schemas)

**Purpose**: Xây dựng nền tảng hàm thuần, Zod schema và tích hợp vào quy tắc tính tiền dùng chung trước khi triển khai các User Story.

- [ ] T004 [P] Định nghĩa schema Zod xác thực mã giảm giá `validateCouponSchema` trong `src/features/coupons/coupon-schema.ts`
- [ ] T005 [P] Viết unit tests TDD cho các hàm thuần `normalizeCouponCode`, `findCouponByCode`, `calculateDiscount` trong `src/features/coupons/coupon-service.test.ts`
- [ ] T006 Cài đặt các hàm thuần `normalizeCouponCode`, `findCouponByCode`, `calculateDiscount` trong `src/features/coupons/coupon-service.ts`
- [ ] T007 [P] Viết unit tests TDD cho `calculateOrderTotals` khi nhận thêm coupon trong `src/features/checkout/pricing.test.ts`
- [ ] T008 Cập nhật `calculateOrderTotals` và kiểu `OrderTotals` nhận `coupon?: AppliedCoupon | null` trong `src/features/checkout/pricing.ts`
- [ ] T009 Kiểm tra chất lượng code Phase 2: chạy `npm run check`

**Checkpoint**: Nền tảng dữ liệu và logic tính tiền hoàn tất - sẵn sàng bắt đầu triển khai User Stories.

---

## Phase 3: User Story 1 - Áp dụng mã hợp lệ và xem trước số tiền giảm (Priority: P1) 🎯 MVP

**Goal**: Khách hàng tại trang `/checkout` có thể nhập mã hợp lệ (`SHOPLITE10`, `GIAM50K`), xem số tiền giảm được khấu trừ ngay lập tức vào tổng thanh toán, và có thể bấm "Gỡ bỏ" để hủy mã. (Bao phủ `FR-001`, `FR-002`, `FR-003`, `FR-005`, `FR-006`, `FR-009`, `FR-010`, `FR-011`, `FR-012`).

**Independent Test**: Thêm sản phẩm vào giỏ, đi tới `/checkout`, nhập mã `SHOPLITE10` và bấm "Áp dụng", xác nhận dòng giảm giá hiển thị `-100.000 ₫`, tổng tiền giảm 100.000 ₫; sau đó bấm nút "Gỡ bỏ" để phục hồi tổng tiền ban đầu.

### Tests for User Story 1 (TDD - Viết trước khi code) ⚠️
- [ ] T010 [P] [US1] Viết unit tests TDD cho hàm `validateCoupon` (mã hợp lệ, tính giảm % có trần, giảm tiền cố định) trong `src/features/coupons/coupon-service.test.ts`
- [ ] T011 [P] [US1] Viết route test TDD cho API handler `POST /api/coupons/validate` (trường hợp mã hợp lệ) trong `src/app/api/coupons/validate/route.test.ts`
- [ ] T012 [P] [US1] Viết component test TDD cho `CouponInput` (nhập mã, trigger áp dụng, hiển thị mã đang áp dụng và nút gỡ bỏ) trong `src/features/coupons/components/coupon-input.test.tsx`
- [ ] T013 [P] [US1] Viết component test TDD cho `CheckoutSummary` (hiển thị dòng giảm giá khi có coupon) trong `src/features/checkout/components/checkout-summary.test.tsx`

### Implementation for User Story 1
- [ ] T014 [US1] Cài đặt hàm `validateCoupon` cho trường hợp hợp lệ trong `src/features/coupons/coupon-service.ts`
- [ ] T015 [US1] Cài đặt API route handler mỏng `POST /api/coupons/validate` trong `src/app/api/coupons/validate/route.ts`
- [ ] T016 [US1] Cài đặt component `CouponInput` với ô nhập, nút "Áp dụng", trạng thái đã áp dụng và nút "Gỡ bỏ" trong `src/features/coupons/components/coupon-input.tsx`
- [ ] T017 [US1] Cập nhật component `CheckoutSummary` để hiển thị dòng giảm giá `-formatCurrency(discount)` trong `src/features/checkout/components/checkout-summary.tsx`
- [ ] T018 [US1] Tích hợp `CouponInput` vào `CheckoutForm`, quản lý client state `appliedCoupon`, tính toán lại tổng tiền khi áp dụng/gỡ mã trong `src/features/checkout/components/checkout-form.tsx`
- [ ] T019 [US1] Kiểm tra chất lượng code Phase 3: chạy `npm run check`

**Checkpoint**: User Story 1 (MVP) đã hoàn chỉnh và có thể kiểm thử độc lập trực tiếp trên trình duyệt.

---

## Phase 4: User Story 2 - Thông báo lỗi rõ ràng khi mã không hợp lệ hoặc không đủ điều kiện (Priority: P2)

**Goal**: Khi khách hàng nhập mã không tồn tại, mã hết hạn (`TET2026`), hoặc giỏ hàng chưa đạt giá trị tối thiểu, hệ thống hiển thị thông báo lỗi cụ thể bằng tiếng Việt (nêu rõ số tiền cần mua thêm). Tự động gỡ mã kèm thông báo khi giỏ hàng bị sửa làm giảm tạm tính dưới mức tối thiểu. (Bao phủ `FR-003`, `FR-004`, `FR-009`).

**Independent Test**: Nhập lần lượt `KHONGTONTAI`, `TET2026`, và mã có điều kiện với giỏ hàng dưới ngưỡng; xác nhận thông điệp lỗi tiếng Việt chính xác. Thử xóa bớt hàng trong giỏ rồi quay lại checkout để kiểm tra tự động hủy mã.

### Tests for User Story 2 (TDD - Viết trước khi code) ⚠️
- [ ] T020 [P] [US2] Viết unit tests TDD cho `validateCoupon` với các case lỗi (mã không tồn tại, mã hết hạn theo múi giờ VN, đơn chưa đủ giá trị tối thiểu tính số tiền cần mua thêm) trong `src/features/coupons/coupon-service.test.ts`
- [ ] T021 [P] [US2] Bổ sung test route TDD cho `POST /api/coupons/validate` trả về HTTP 422 kèm mã lỗi `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_ORDER_NOT_MET` trong `src/app/api/coupons/validate/route.test.ts`
- [ ] T022 [P] [US2] Bổ sung component test TDD cho `CouponInput` hiển thị thông báo lỗi và `aria-invalid` trong `src/features/coupons/components/coupon-input.test.tsx`
- [ ] T023 [P] [US2] Viết unit test cho logic tự động hủy mã và hiển thị thông báo lý do khi tạm tính giỏ hàng thay đổi trong `src/features/checkout/components/checkout-form.test.tsx`

### Implementation for User Story 2
- [ ] T024 [US2] Hoàn thiện kiểm tra lỗi (mã không tồn tại, hết hạn, chưa đủ giá trị tối thiểu) trong `validateCoupon` (`src/features/coupons/coupon-service.ts`)
- [ ] T025 [US2] Cập nhật `POST /api/coupons/validate` trả về format lỗi chuẩn `{ error: { code, message, details } }` trong `src/app/api/coupons/validate/route.ts`
- [ ] T026 [US2] Cập nhật `CouponInput` render thông điệp lỗi tiếng Việt và accessibility tags (`aria-describedby`, `role="alert"`) trong `src/features/coupons/components/coupon-input.tsx`
- [ ] T027 [US2] Cài đặt hiệu ứng kiểm tra lại điều kiện mã khi `subtotal` giỏ hàng thay đổi; tự động hủy mã và hiện thông báo nếu đơn không còn đủ giá trị tối thiểu trong `src/features/checkout/components/checkout-form.tsx`
- [ ] T028 [US2] Kiểm tra chất lượng code Phase 4: chạy `npm run check`

**Checkpoint**: User Stories 1 và 2 đều hoạt động độc lập và hoàn tất toàn bộ luồng phản hồi người dùng.

---

## Phase 5: User Story 3 - Lưu trữ mã vào đơn hàng và bảo vệ chống gian lận (Priority: P3)

**Goal**: Khi khách hàng đặt hàng, server độc lập tính toán lại toàn bộ tiền giảm giá từ catalog gốc, từ chối đơn hàng nếu mã hết hạn tại thời điểm bấm đặt hàng (chuyển mã sang trạng thái `[đã hết hạn]`, yêu cầu khách tự gỡ mã). Lưu mã và số tiền giảm vĩnh viễn vào đơn hàng; hiển thị minh bạch tại `/orders/[id]`; bảo đảm tương thích ngược với đơn hàng cũ. (Bao phủ `FR-007`, `FR-008`, `FR-010`, `FR-012`).

**Independent Test**: Đặt một đơn hàng có áp dụng mã `SHOPLITE10`, mở `/orders/[id]` xác nhận dòng giảm giá; gửi yêu cầu API giả lập với số tiền giảm sai lệch để kiểm chứng server tính toán lại; mở một đơn hàng cũ trong hệ thống xác nhận không bị lỗi hiển thị.

### Tests for User Story 3 (TDD - Viết trước khi code) ⚠️
- [ ] T029 [P] [US3] Viết unit tests TDD cho `orderService.placeOrder` nhận `couponCode`, tự tra cứu catalog, tính lại discount, lưu đơn và xử lý mã hết hạn lúc đặt hàng trong `src/features/orders/order-service.test.ts`
- [ ] T030 [P] [US3] Viết route test TDD cho `POST /api/orders` với payload có `couponCode` và kiểm tra chống can thiệp giá từ client trong `src/app/api/orders/route.test.ts`
- [ ] T031 [P] [US3] Viết component/page test TDD cho trang chi tiết đơn hàng `src/app/orders/[id]/page.test.tsx` (kiểm tra cả đơn có giảm giá và đơn cũ không có trường giảm giá)

### Implementation for User Story 3
- [ ] T032 [US3] Mở rộng schema `placeOrderSchema` tiếp nhận trường tùy chọn `couponCode: z.string().trim().optional()` trong `src/features/checkout/checkout-schema.ts`
- [ ] T033 [US3] Mở rộng kiểu dữ liệu `Order` thêm `couponCode?: string` và `discount?: number` trong `src/features/orders/types.ts`
- [ ] T034 [US3] Cập nhật `orderService.placeOrder` để tự động xác thực mã, tính lại giảm giá từ server catalog, throw lỗi `OrderError` nếu mã không hợp lệ/hết hạn, và lưu `couponCode`, `discount` vào đơn trong `src/features/orders/order-service.ts`
- [ ] T035 [US3] Cập nhật `CheckoutForm` gửi `couponCode` lên `POST /api/orders`; nếu server trả về `COUPON_EXPIRED`, giữ mã trong ô nhập với nhãn `[đã hết hạn]`, khóa nút đặt hàng và yêu cầu bấm "Gỡ mã" trong `src/features/checkout/components/checkout-form.tsx`
- [ ] T036 [US3] Cập nhật trang chi tiết đơn hàng hiển thị dòng `Giảm giá ({order.couponCode}): -{formatCurrency(order.discount)}` khi `order.discount !== undefined && order.discount > 0` trong `src/app/orders/[id]/page.tsx`
- [ ] T037 [US3] Kiểm tra chất lượng code Phase 5: chạy `npm run check`

**Checkpoint**: Cả 3 User Stories hoàn tất 100%, bảo đảm an toàn dữ liệu và tương thích ngược.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Nâng cấp kịch bản kiểm thử End-to-End, thực hiện kiểm thử tự động, và hoàn thiện tài liệu.

- [ ] T038 [P] Thêm kịch bản E2E kiểm thử luồng mua sắm có áp dụng mã `SHOPLITE10` và xác nhận giảm giá tại `/checkout` và `/orders/[id]` trong `e2e/shopping-flow.spec.ts`
- [ ] T039 [P] Thẩm định lại 8 kịch bản kiểm thử thủ công theo hướng dẫn trong `specs/001-coupon-code/quickstart.md`
- [ ] T040 Cập nhật tài liệu `README.md` nếu có endpoint mới `POST /api/coupons/validate`
- [ ] T041 Chạy toàn bộ bộ kiểm thử chất lượng cuối cùng: `npm run check` và `npm run test:e2e`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: Không phụ thuộc, có thể bắt đầu ngay lập tức.
- **Phase 2 (Foundational)**: Phụ thuộc vào Phase 1 hoàn tất. **Chặn toàn bộ các User Story**.
- **Phase 3 (User Story 1 - MVP)**: Phụ thuộc vào Phase 2. Cung cấp luồng giá trị cốt lõi đầu tiên.
- **Phase 4 (User Story 2)**: Phụ thuộc vào Phase 2 và Phase 3. Bổ sung xử lý thông báo lỗi chi tiết.
- **Phase 5 (User Story 3)**: Phụ thuộc vào Phase 2, Phase 3, Phase 4. Hoàn tất lưu trữ server và chống gian lận.
- **Phase 6 (Polish & E2E)**: Phụ thuộc vào toàn bộ các User Story đã hoàn tất.

### Traceability: Functional Requirements Mapping
- **FR-001**: T016, T018 (Ô nhập mã & nút áp dụng tại `/checkout`)
- **FR-002**: T001, T002, T006, T014 (Hỗ trợ 2 loại: phần trăm có trần và cố định)
- **FR-003**: T006, T014, T024 (Kiểm tra 3 điều kiện: tồn tại, hạn dùng, tạm tính tối thiểu)
- **FR-004**: T024, T025, T026, T027 (Thông báo lỗi tiếng Việt cụ thể, số tiền cần mua thêm)
- **FR-005**: T018 (Chỉ cho phép tối đa 01 mã áp dụng đồng thời)
- **FR-006**: T016, T018 (Nút gỡ bỏ mã giảm giá)
- **FR-007**: T033, T034 (Lưu `couponCode` và `discount` vào đơn hàng)
- **FR-008**: T034 (Server độc lập tính toán lại số tiền giảm khi tạo đơn)
- **FR-009**: T006 (Chuẩn hóa trim và uppercase mã)
- **FR-010**: T008, T034 (Khấu trừ vào tạm tính, không trừ phí ship, không làm tổng âm)
- **FR-011**: T008 (Ngưỡng miễn phí vận chuyển tính trên tạm tính trước giảm)
- **FR-012**: T017, T036 (Hiển thị dòng giảm giá ở tóm tắt thanh toán và trang chi tiết đơn hàng)

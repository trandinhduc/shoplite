# Tasks: Mã giảm giá khi thanh toán

**Input**: Design documents from `specs/001-checkout-discount-codes/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/orders.md](./contracts/orders.md), [quickstart.md](./quickstart.md)

**Testing**: TDD is required. For every user story, write the listed unit,
component, route/API, or E2E tests first, verify they fail for the missing
behavior, then implement the story. Do not skip the red phase.

**Stack constraints**: Use the existing Next.js 16 App Router, TypeScript strict,
Zod 4, Tailwind CSS v4, Vitest, Testing Library, and Playwright. Do not add a
dependency or database.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing repository structure and feature design inputs.

- [x] T001 [P] Verify the feature scope and source paths against `specs/001-checkout-discount-codes/spec.md` and `specs/001-checkout-discount-codes/plan.md`
- [x] T002 [P] Verify existing checkout, order, API, and E2E test conventions in `AGENTS.md`, `src/features/checkout/`, `src/features/orders/`, `src/app/api/orders/`, and `e2e/shopping-flow.spec.ts`
- [x] T003 Run `npm run check` for the repository defined by `package.json` and record the baseline result

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared coupon types and test seams before story-specific
behavior is implemented.

**⚠️ CRITICAL**: No user story implementation begins until this phase is complete.

- [x] T004 [P] Define coupon domain types and evaluation result unions in `src/features/coupons/types.ts` for percentage/fixed discounts, validation reasons, and optional expiry/minimum fields
- [x] T005 [P] Add the shared order fixture shape for legacy orders without discount fields in `src/features/orders/order-service.test.ts`
- [x] T006 Run `npm run check` for the repository defined by `package.json` after foundational setup

**Checkpoint**: Shared types and legacy test coverage seams are ready; user
stories can now be implemented independently in priority order.

---

## Phase 3: User Story 1 - Áp dụng và gỡ mã giảm giá (Priority: P1) 🎯 MVP

**Goal**: A customer can apply one valid coupon, see the discount and updated
total immediately, and remove the coupon before placing the order.

**Independent Test**: With a cart meeting `SHOPLITE10` minimum subtotal, apply
the code, verify the capped/percentage discount and total in the summary, then
remove it and verify the original total returns.

### Tests for User Story 1 (write first)

- [x] T007 [P] [US1] Write failing unit tests for coupon normalization, `SHOPLITE10`, `GIAM50K`, `TET2026` definitions, one-coupon selection, and discount calculation in `src/features/coupons/coupon-service.test.ts`
- [x] T008 [P] [US1] Write failing unit tests for subtotal, shipping, discount, and final-total integration in `src/features/checkout/pricing.test.ts`
- [x] T009 [P] [US1] Write failing component tests for applying/removing a coupon, showing discount/total, and preventing a second coupon in `src/features/checkout/components/checkout-form.test.tsx` and `src/features/checkout/components/checkout-summary.test.tsx`

### Implementation for User Story 1

- [x] T010 [P] [US1] Add the three static coupon records with canonical uppercase codes and configured percentage/fixed/minimum/expiry values in `src/data/coupons.ts`
- [x] T011 [US1] Implement pure coupon normalization, lookup, valid evaluation, one-coupon enforcement, and discount calculation in `src/features/coupons/coupon-service.ts`
- [x] T012 [US1] Extend `OrderTotals` and `calculateOrderTotals` in `src/features/checkout/pricing.ts` to apply `subtotal - discountAmount + shippingFee` without negative totals and without discounting shipping
- [x] T013 [US1] Add checkout coupon input state, apply/remove actions, recalculation on cart/shipping changes, and Vietnamese accessible feedback in `src/features/checkout/components/checkout-form.tsx`
- [x] T014 [US1] Render the coupon input result, discount row, and updated total using `formatCurrency()` in `src/features/checkout/components/checkout-summary.tsx`
- [x] T015 Run `npm run check` for the repository defined by `package.json` after User Story 1 implementation

**Checkpoint**: US1 is independently demoable and testable as the MVP.

---

## Phase 4: User Story 2 - Phản hồi mã không hợp lệ (Priority: P1)

**Goal**: Customers receive a clear Vietnamese reason for unknown, expired, or
minimum-subtotal failures, including the amount still needed.

**Independent Test**: Try an unknown code, `TET2026` after expiry, and
`GIAM50K` at 420.000đ; verify the reason, shortfall where applicable, and that
the order total does not change.

### Tests for User Story 2 (write first)

- [x] T016 [P] [US2] Extend failing unit tests for `not_found`, `expired`, `minimum_subtotal`, exact threshold, 1đ shortfall, `Asia/Ho_Chi_Minh` end-of-day expiry, and cart invalidation in `src/features/coupons/coupon-service.test.ts`
- [x] T017 [P] [US2] Extend failing pricing tests for percentage cap, fixed discount greater than subtotal, rounding down to whole VND, and zero/non-negative totals in `src/features/checkout/pricing.test.ts`
- [x] T018 [P] [US2] Extend failing component tests for field-level Vietnamese error messages, minimum shortfall, expired-code feedback, and automatic removal after cart changes in `src/features/checkout/components/checkout-form.test.tsx` and `src/features/checkout/components/checkout-summary.test.tsx`

### Implementation for User Story 2

- [x] T019 [US2] Implement structured coupon evaluation errors, minimum shortfall, and `Asia/Ho_Chi_Minh` inclusive expiry comparison in `src/features/coupons/coupon-service.ts`
- [x] T020 [US2] Apply the specified rounding, cap, minimum-subtotal, and non-negative discount rules in `src/features/checkout/pricing.ts`
- [x] T021 [US2] Connect invalid-coupon results and cart-change invalidation to Vietnamese accessible form/summary feedback in `src/features/checkout/components/checkout-form.tsx` and `src/features/checkout/components/checkout-summary.tsx`
- [x] T022 Run `npm run check` for the repository defined by `package.json` after User Story 2 implementation

**Checkpoint**: US1 and US2 both work independently; invalid inputs never alter
the displayed payable total.

---

## Phase 5: User Story 3 - Đặt hàng và lưu ưu đãi (Priority: P1)

**Goal**: The server revalidates the coupon and totals, persists the confirmed
discount, and shows it in order detail while preserving legacy orders.

**Independent Test**: Submit an order with `SHOPLITE10`, attempt to tamper with
discount/total values, and open the resulting order detail; verify only the
server-calculated discount is stored and displayed.

### Tests for User Story 3 (write first)

- [x] T023 [P] [US3] Write failing route tests for accepted `couponCode`, server-side recalculation, tampered discount/total rejection, invalid-coupon errors, and no-code orders in `src/app/api/orders/route.test.ts`
- [x] T024 [P] [US3] Write failing order-service tests for coupon revalidation at submit time, persisted `discountCode`/`discountAmount`, and legacy orders missing discount fields in `src/features/orders/order-service.test.ts` and `src/features/orders/order-repository.test.ts`
- [x] T025 [P] [US3] Write failing component tests for discount rendering on new orders and unchanged rendering for legacy orders in `src/app/orders/[id]/page.test.tsx`
- [x] T026 [P] [US3] Add a failing Playwright scenario applying `SHOPLITE10`, placing the order, and verifying the discount in `e2e/shopping-flow.spec.ts`

### Implementation for User Story 3

- [x] T027 [US3] Extend the Zod order payload with optional normalized `couponCode` and keep discount amount/subtotal/total out of client input in `src/features/checkout/checkout-schema.ts`
- [x] T028 [US3] Add optional `discountCode` and `discountAmount` order fields with legacy-safe defaults/types in `src/features/orders/types.ts` and `src/features/orders/order-repository.ts`
- [x] T029 [US3] Revalidate coupon code after catalog price/stock resolution, calculate server-owned discount/totals, and persist confirmed fields in `src/features/orders/order-service.ts`
- [x] T030 [US3] Update checkout submission to send only the applied `couponCode`, handle `INVALID_COUPON`, and clear the cart only after a confirmed order in `src/features/checkout/components/checkout-form.tsx`
- [x] T031 [US3] Keep the POST orders route thin while exposing the documented coupon error shape through `src/app/api/orders/route.ts` and `src/features/orders/order-errors.ts`
- [x] T032 [US3] Display optional discount code and discount amount with `formatCurrency()` while preserving orders missing discount fields in `src/app/orders/[id]/page.tsx`
- [x] T033 Run `npm run check` for the repository defined by `package.json` after User Story 3 implementation

**Checkpoint**: All three user stories are independently verifiable; server-owned
money values and legacy order rendering are protected.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, accessibility, E2E validation, and final quality gate.

- [x] T034 [P] Update the API and feature documentation with coupon behavior, initial codes, and backward compatibility in `README.md`
- [x] T035 [P] Review Vietnamese labels, error messages, keyboard access, responsive 390px layout, and `formatCurrency()` usage in `src/features/checkout/components/checkout-form.tsx`, `src/features/checkout/components/checkout-summary.tsx`, and `src/app/orders/[id]/page.tsx`
- [x] T036 [P] Add an acceptance performance check that repeats valid coupon application and verifies at least 95% of runs show the discount and new total within 1 second in `e2e/shopping-flow.spec.ts`
- [x] T037 [P] Run the documented scenarios from `specs/001-checkout-discount-codes/quickstart.md` and record any discrepancies in that file
- [x] T038 Run `npm run check` for the repository defined by `package.json` as the final phase quality gate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies; establishes baseline.
- **Phase 2 Foundational**: Depends on Phase 1; blocks all story work.
- **Phase 3 US1**: Depends on Phase 2; delivers the MVP apply/remove flow.
- **Phase 4 US2**: Depends on US1 coupon/pricing/UI seams; adds failure handling.
- **Phase 5 US3**: Depends on US1 and US2 behavior; adds server persistence and
  E2E order flow.
- **Phase 6 Polish**: Depends on all desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no dependency on another user story.
- **US2 (P1)**: Uses US1 coupon and pricing seams; its tests extend those files.
- **US3 (P1)**: Uses the stable coupon/pricing behavior from US1/US2 and adds
  order/API/detail integration.

### Within Each User Story

1. Write all story tests first and confirm the missing behavior fails.
2. Implement domain/data logic, then pricing/UI/API integration as listed.
3. Run the phase-final `npm run check` before declaring the story complete.

## Parallel Opportunities

- Phase 1: T001 and T002 can run in parallel; T003 follows them.
- Phase 2: T004 and T005 can run in parallel; T006 follows them.
- US1: T007, T008, and T009 can run in parallel; T010 can follow the type setup,
  then T011–T014 follow the failing tests.
- US2: T016, T017, and T018 can run in parallel; T019–T021 follow them.
- US3: T023, T024, T025, and T026 can run in parallel; T027–T032 follow tests.
- Polish: T034, T035, T036, and T037 can run in parallel; T038 is last.

## Parallel Example: User Story 3

```text
Task: T023 route/API tests in src/app/api/orders/route.test.ts
Task: T024 order-service/repository tests in src/features/orders/order-service.test.ts and src/features/orders/order-repository.test.ts
Task: T025 order-detail component tests in src/app/orders/[id]/page.test.tsx
Task: T026 SHOPLITE10 E2E test in e2e/shopping-flow.spec.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Setup and Foundational phases.
2. Write and fail US1 unit/component tests.
3. Implement static codes, pure evaluation, pricing integration, and checkout UI.
4. Run US1 `npm run check` and demo apply/remove.

### Incremental Delivery

1. US1: local apply/remove preview.
2. US2: complete validation/error states and boundary behavior.
3. US3: secure server submit, persistence, legacy order UI, and SHOPLITE10 E2E.
4. Polish: documentation, accessibility/responsive review, quickstart, final check.

## Notes

- `[P]` means the task can run in parallel with other tasks in its group without
  modifying the same unfinished file or depending on incomplete work.
- Every task has a sequential ID, checkbox, required story label in story phases,
  and concrete repository file paths.
- No task adds a dependency, database, admin UI, usage limit, or customer-specific
  coupon behavior.

---

## Phase 7: Convergence

**Purpose**: Close gaps found by comparing the current codebase with the feature
specification, implementation plan, and existing task coverage.

- [x] T039 [P] Create `src/features/coupons/types.ts` and move the shared Coupon/evaluation types out of the service so the implementation matches the planned feature structure per plan: source structure (partial)
- [x] T040 [US1] Centralize discount calculation through the coupon feature and invalidate an applied coupon when the cart subtotal no longer meets its minimum in `src/features/coupons/coupon-service.ts`, `src/features/checkout/pricing.ts`, and `src/features/checkout/components/checkout-form.tsx` per FR-004 and Edge Cases (partial)
- [x] T041 [P] [US2] Complete the failing unit, pricing, and component boundary tests already outlined by T016–T018 in `src/features/coupons/coupon-service.test.ts`, `src/features/checkout/pricing.test.ts`, and checkout component tests per FR-004–FR-011 (missing)
- [x] T042 [US2] Complete invalid-code reasons, minimum shortfall, expiry boundary, rounding/cap, non-negative totals, and Vietnamese feedback already outlined by T019–T021 in the coupon service, pricing, and checkout components per US2 acceptance scenarios (missing)
- [x] T043 [US2] Run the User Story 2 quality gate with `npm run check` from `package.json` per T022 (missing)
- [x] T044 [P] [US3] Complete the route, order-service, legacy-order component, and `SHOPLITE10` E2E tests already outlined by T023–T026 in `src/app/api/orders/route.test.ts`, order tests, `src/app/orders/[id]/page.test.tsx`, and `e2e/shopping-flow.spec.ts` per FR-012–FR-015 (missing)
- [x] T045 [US3] Complete Zod payload validation, optional legacy-safe order fields, server-side coupon revalidation, tamper-resistant totals, checkout submission, API errors, and order-detail display already outlined by T027–T032 in the checkout/order/API files per US3 acceptance scenarios (missing)
- [x] T046 [US3] Run the User Story 3 quality gate with `npm run check` from `package.json` per T033 (missing)
- [x] T047 [P] Complete README, accessibility/responsive review, 95%/1-second E2E performance acceptance, and quickstart validation already outlined by T034–T037 in `README.md`, checkout/order UI, `e2e/shopping-flow.spec.ts`, and `specs/001-checkout-discount-codes/quickstart.md` per SC-001 and SC-005 (missing)
- [x] T048 Run the final feature quality gate with `npm run check` from `package.json` per T038 (missing)

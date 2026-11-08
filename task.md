# Task List – Coupon Code Feature (TDD)

## Phase 1 – Setup
- **T001** Create test scaffolding (`src/features/coupons/__tests__`).
- **T002** Ensure Vitest config picks up `*.test.ts` and `*.test.tsx`.
- **T003** Run baseline `npm run check`.

## Phase 2 – Foundational (Shared Data & Types)  
- **T010** Add static coupon data (`src/data/coupons.ts`).
- **T011** Define `Coupon` type & validation result (`src/features/coupons/types.ts`).
- **T012** Skeleton `coupon-service.ts` with stubs.
- **T013** Add Zod contract for preview request/response (`src/features/checkout/contracts/checkoutPreview.ts`).
- **T014** Export contract from `src/features/checkout/contracts/index.ts`.
- **T015** Lint/type‑check.

## Phase 3 – User Story 1 (US1 – Apply valid coupon) 🎯 MVP
- **T020** `[P]` Unit test: happy path for `SHOPLITE10`.
- **T021** `[P]` Unit test: coupon not found.
- **T022** Implement `findCoupon`.
- **T023** Implement `calculateDiscountAmount`.
- **T024** Implement `validateCoupon`.
- **T025** `[P]` Unit test: discount cap (max 100k).
- **T026** Run `npm run check`.

## Phase 4 – User Story 2 (US2 – Remove coupon)
- **T030** `[P]` Component test for "Gỡ" button.
- **T031** Add "Gỡ" button logic in `CheckoutSummary`.
- **T032** Verify component test passes.
- **T033** Run `npm run check`.

## Phase 5 – User Story 3 (US3 – Single coupon per order)
- **T040** `[P]` Unit test: applying a second coupon replaces the first.
- **T041** Update UI to replace previous coupon.
- **T042** Run `npm run check`.

## Phase 6 – User Story 4 (US4 – Percentage coupon with cap)
- **T050** `[P]` Unit test for cap behavior.
- **T051** Confirm `calculateDiscountAmount` respects cap.
- **T052** Run `npm run check`.

## Phase 7 – User Story 5 (US5 – Fixed‑amount coupon)
- **T060** `[P]` Unit test for `GIAM50K`.
- **T061** Ensure fixed‑amount path works.
- **T062** Run `npm run check`.

## Phase 8 – User Story 6 (US6 – Coupon not found error)
- **T070** `[P]` Component test: show Vietnamese error "Mã giảm giá không tồn tại".
- **T071** UI displays error message from preview.
- **T072** Run `npm run check`.

## Phase 9 – User Story 7 (US7 – Coupon expired error)
- **T080** `[P]` Component test: show "Mã giảm giá đã hết hạn".
- **T081** `validateCoupon` returns `COUPON_EXPIRED`.
- **T082** Run `npm run check`.

## Phase 10 – User Story 8 (US8 – Minimum order not met)
- **T090** `[P]` Component test: show required amount when subtotal < min.
- **T091** `validateCoupon` returns `COUPON_MIN_ORDER_NOT_MET` with `amountNeeded`.
- **T092** Run `npm run check`.

## Phase 11 – User Story 9 (US9 – Anti‑fraud on order placement)
- **T100** `[P]` API test: `POST /api/orders` with valid coupon but subtotal below min → 422 `INVALID_COUPON`.
- **T101** (Optional) Rate‑limit preview endpoint (10 req/min).
- **T102** Run `npm run check`.

## Phase 12 – User Story 10 (US10 – Show coupon in order detail)
- **T110** `[P]` E2E test: after order, detail page displays coupon code and discount.
- **T111** Update order detail page to render these fields.
- **T112** Run Playwright suite.
- **T113** Run `npm run check`.

## Phase 13 – Polish & Cross‑Cutting
- **T120** Add tests for rate‑limit middleware.
- **T121** Add audit‑log in `orderService.placeOrder`.
- **T122** Update `checklists/security.md` if needed.
- **T123** Full CI run (`npm run check`, `npm run format`, `npm run test:e2e`).
- **T124** Commit & push.

---

**Legend**: `[P]` = can run in parallel with other `[P]` tasks in the same phase.

You can now edit, extend, or start ticking off tasks from this `task.md` file.


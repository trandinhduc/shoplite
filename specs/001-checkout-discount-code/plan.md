# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `feat/landv` (spec dir `001-checkout-discount-code`) | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-checkout-discount-code/spec.md`

## Summary

Khách nhập mã ở `/checkout`, client gọi `POST /api/coupons/validate` để nhận quy tắc của đúng mã
đó, rồi dùng hàm thuần dùng chung `evaluateCoupon` để hiển thị ngay số tiền giảm hoặc trạng thái
"chưa đủ điều kiện" (tự tính lại khi giỏ đổi). Khi đặt hàng, client chỉ gửi thêm `couponCode`;
`placeOrder` tự tra mã, kiểm tra hết hạn/tối thiểu, tính `discount` và `total` qua
`calculateOrderTotals(lines, method, discount)` (phí ship vẫn xét trên tạm tính trước giảm), từ
chối bằng `OrderError` `COUPON_*` (422) nếu mã không còn hợp lệ. Đơn lưu thêm `couponCode` và
`discount` (optional — đơn cũ vẫn hiển thị đúng); trang chi tiết đơn hiển thị dòng giảm giá.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js ≥ 22.12

**Primary Dependencies**: Next.js 16 App Router (Turbopack), React 19, Zod 4, Tailwind CSS v4,
lucide-react — **không thêm dependency**

**Storage**: Mã giảm giá: dữ liệu tĩnh `src/data/coupons.ts`. Đơn hàng: `storage/orders.json` qua
`OrderRepository` hiện có (thêm 2 trường optional, không migrate)

**Testing**: Vitest + Testing Library (jsdom; `node` cho route/service), Playwright E2E

**Target Platform**: Trình duyệt hiện đại + Node server (Next.js)

**Project Type**: Web application (Next.js full-stack, một project)

**Performance Goals**: Hiển thị số tiền giảm < 1 giây sau khi bấm "Áp dụng" (SC-001); tính lại
khi giỏ đổi là tức thì (tính trên client, không gọi API)

**Constraints**: Server là nguồn sự thật về tiền; không lộ danh sách mã ra client bundle; số
nguyên VND, làm tròn xuống; hết hạn theo giờ Việt Nam

**Scale/Scope**: 3 mã ban đầu; 1 feature mới (`coupons`), sửa `checkout`, `orders`, 1 route mới,
1 trang

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá | Bằng chứng trong thiết kế |
| ---------- | -------- | ------------------------- |
| I. Kiến trúc theo tính năng | ✅ Pass | Logic ở `src/features/coupons/`; route `api/coupons/validate` chỉ đọc body → `validateCouponCode` → JSON; trang đơn hàng chỉ hiển thị. Client chỉ import `coupon-rules.ts` (thuần), không import `coupon-service.ts`/`src/data/coupons.ts` hay `orders/server.ts` |
| II. Test trước (NON-NEGOTIABLE) | ✅ Pass | Test viết trước cho `coupon-rules` (biên 299.999/300.000, 999.999/1.000.000/1.000.001, làm tròn, `expiresAt` ±1ms, discount ≤ subtotal), `pricing` (discount + ship trước giảm), `placeOrder`, 2 route test in-memory, component test, E2E |
| III. Server là nguồn sự thật về tiền | ✅ Pass | Client chỉ gửi `couponCode`; `placeOrder` tự tra mã + tính lại; Zod strip `discount`/`total`; lỗi `OrderError` `COUPON_*` + `HTTP_STATUS_BY_CODE`; hằng số `FREE_SHIPPING_THRESHOLD` import từ `pricing.ts` |
| IV. Đơn giản trước | ✅ Pass | Không dependency/DB mới; dữ liệu tĩnh như `products.ts`; một endpoint mới (lý do ở research R1) |
| V. Tiếng Việt & dễ tiếp cận | ✅ Pass | Ô mã có `<label>`, lỗi tại trường `couponCode` (`aria-invalid`, `aria-describedby`), thông báo trạng thái `role="status"`/`aria-live`, tiền qua `formatCurrency` |

Không có vi phạm → Complexity Tracking để trống.

**Re-check sau Phase 1**: ✅ vẫn pass. Endpoint `/api/coupons/validate` là bổ sung nhỏ nhất để
không lộ mã (research R1); `Order` mở rộng optional thay vì migrate (R7).

## Project Structure

### Documentation (this feature)

```text
specs/001-checkout-discount-code/
├── plan.md              # File này
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── coupons-validate.md
│   └── orders.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                         # MỚI: SHOPLITE10, GIAM50K, TET2026 (chỉ server)
├── features/
│   ├── coupons/                           # MỚI
│   │   ├── types.ts                       # COUPON_TYPES, CouponRule, CouponEvaluation
│   │   ├── coupon-rules.ts                # thuần, client-safe: normalize/calculate/evaluate/isExpired
│   │   ├── coupon-rules.test.ts
│   │   ├── coupon-service.ts              # chỉ server: findCouponByCode, validateCouponCode, toCouponError
│   │   ├── coupon-service.test.ts         # gồm test tính hợp lệ của dữ liệu coupons.ts
│   │   └── components/
│   │       ├── coupon-field.tsx           # "use client": ô nhập, Áp dụng, Gỡ mã, trạng thái
│   │       └── coupon-field.test.tsx
│   ├── checkout/
│   │   ├── pricing.ts                     # SỬA: OrderTotals.discount, calculateOrderTotals(..., discount)
│   │   ├── pricing.test.ts                # SỬA
│   │   ├── checkout-schema.ts             # SỬA: placeOrderSchema.couponCode
│   │   ├── checkout-schema.test.ts        # SỬA
│   │   └── components/
│   │       ├── checkout-form.tsx          # SỬA: state appliedCoupon, gửi couponCode, xử lý COUPON_*
│   │       ├── checkout-form.test.tsx     # SỬA
│   │       └── checkout-summary.tsx       # SỬA: dòng giảm giá / "chưa đủ điều kiện"
│   └── orders/
│       ├── types.ts                       # SỬA: couponCode?, discount?
│       ├── order-errors.ts                # SỬA: 3 mã COUPON_* → 422
│       ├── order-service.ts               # SỬA: findCoupon dep, áp mã trong placeOrder
│       └── order-service.test.ts          # SỬA
├── app/
│   ├── api/coupons/validate/
│   │   ├── route.ts                       # MỚI (mỏng)
│   │   └── route.test.ts                  # MỚI
│   ├── api/orders/route.test.ts           # SỬA: case mã giảm giá
│   └── orders/[id]/page.tsx               # SỬA: dòng "Giảm giá (MÃ)" khi discount > 0
e2e/
└── shopping-flow.spec.ts                  # SỬA: thêm kịch bản áp mã + đặt hàng + xem chi tiết
```

**Structure Decision**: Giữ cấu trúc Next.js một project hiện tại. Thêm feature `coupons` theo quy
ước `src/features/<feature>/`; tách `coupon-rules.ts` (client-safe) khỏi `coupon-service.ts`
(server, đọc dữ liệu) để danh sách mã không vào client bundle. Thay đổi chạm > 3 file → khi
implement theo CLAUDE.md cần trình bày kế hoạch (plan mode) trước khi sửa.

## Thứ tự triển khai gợi ý (chi tiết ở tasks.md)

1. Types + dữ liệu `coupons.ts` → test `coupon-rules` (đỏ) → hiện thực `coupon-rules.ts`.
2. `pricing.ts` discount (test trước).
3. `order-errors.ts` + `coupon-service.ts` + route `/api/coupons/validate` (test trước).
4. `placeOrderSchema` + `placeOrder` + route test `/api/orders` (test trước).
5. UI: `coupon-field`, `checkout-summary`, `checkout-form` (component test).
6. Trang chi tiết đơn + đơn cũ.
7. E2E, `npm run format`, `npm run check`, `npm run test:e2e`; cập nhật README (API, quy tắc) và
   codemap trong `AGENTS.md`.

## Complexity Tracking

Không có vi phạm constitution cần giải trình.

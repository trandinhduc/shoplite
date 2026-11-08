# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `001-discount-code` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-discount-code/spec.md`

## Summary

Cho khách nhập một mã giảm giá ở trang thanh toán, xem ngay số tiền giảm và tổng mới, gỡ/đổi mã, và
đặt hàng với mức giảm do server tự tính lại. Cách làm: thêm feature mới `src/features/coupons/` chứa
dữ liệu mã tĩnh (`src/data/coupons.ts`) và logic thuần `evaluateCoupon`; mở rộng `calculateOrderTotals`
trong `pricing.ts` nhận số tiền giảm; client xem trước mã bằng cách gọi trực tiếp `evaluateCoupon` (hàm thuần, an toàn cho client) trên dữ liệu
mã tĩnh, không cần API mới; `placeOrder` nhận `couponCode` và tính lại bằng cùng hàm đó. Kết quả xem
trước chỉ để hiển thị, không có hiệu lực: server mới là nguồn sự thật. Phí giao hàng và ngưỡng miễn phí 500.000đ vẫn xét trên tiền hàng trước giảm giá. Khi đặt hàng bị từ chối vì mã (hết hạn hoặc không còn đạt tối thiểu), form tự gỡ mã, hiện lý do và giữ nguyên thông tin đã nhập. `Order` lưu thêm trường tùy chọn
`discount` nên đơn cũ trong `storage/orders.json` vẫn hợp lệ. Không thêm dependency hay database.

## Technical Context

**Language/Version**: TypeScript (strict), Node >= 22.12

**Primary Dependencies**: Next.js 16.4 (App Router, Turbopack), React 19.3, Zod 4, Tailwind CSS v4 (không thêm mới)

**Storage**: dữ liệu mã là TypeScript tĩnh trong `src/data/coupons.ts`; đơn hàng vẫn là file JSON (`storage/orders.json`, `ORDERS_FILE`); giỏ hàng vẫn ở `localStorage`

**Testing**: Vitest 5 + Testing Library (jsdom) cho unit/component/route; Playwright (Chromium) cho e2e

**Target Platform**: Web (server Node + trình duyệt hiện đại)

**Project Type**: web-service (Next.js App Router, monolith)

**Performance Goals**: xem trước mã tức thì, tính tại client không cần gọi mạng (đạt SC-001 < 2 giây); phép tính thuần O(số dòng hàng)

**Constraints**: server là nguồn sự thật về tiền; không thêm trường giá vào payload; tương thích ngược với đơn cũ không có `discount`

**Scale/Scope**: 3 mã tĩnh; không thêm API mới, 1 trường mới trên `POST /api/orders`; ~1 component mới + sửa 3 component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá | Ghi chú |
|-----------|----------|---------|
| I. Kiến trúc theo tính năng | ✅ | Logic ở `src/features/coupons/` và `pricing.ts`; route chỉ gọi `orderService`; component client không import `orders/server.ts` |
| II. Test trước (NON-NEGOTIABLE) | ✅ | Test viết trước cho `evaluateCoupon`, `calculateOrderTotals` (có giảm giá), `placeOrder`; có giá trị biên; dùng repository in-memory; e2e vì đổi luồng thanh toán |
| III. Server là nguồn sự thật về tiền | ✅ | Payload chỉ thêm `couponCode` (không có giá); server tính lại bằng `calculateOrderTotals`; Zod validate; lỗi qua `OrderError`; xem trước ở client chỉ để hiển thị, server luôn tính lại khi đặt hàng |
| IV. Đơn giản trước | ✅ | Không dependency/database mới; dữ liệu tĩnh như `products.ts` |
| V. Tiếng Việt và dễ tiếp cận | ✅ | Thông báo tiếng Việt, `formatCurrency`, ô nhập có `label`, lỗi hiển thị cạnh ô nhập kèm `aria-describedby` |

Kết quả: **PASS**, không có vi phạm cần biện minh. Đánh giá lại sau Phase 1: vẫn PASS (xem Phase 1 bên dưới, không phát sinh dependency hay lớp lưu trữ).

## Project Structure

### Documentation (this feature)

```text
specs/001-discount-code/
├── plan.md              # File này
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── api.md           # Phase 1
├── checklists/requirements.md
└── tasks.md             # Do /speckit-tasks tạo
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                        # MỚI: danh sách mã tĩnh (SHOPLITE10, GIAM50K, TET2026)
├── features/
│   ├── coupons/                          # MỚI
│   │   ├── types.ts                      # Coupon, CouponEvaluation, AppliedDiscount
│   │   ├── coupon-service.ts             # normalizeCouponCode, findCoupon, evaluateCoupon, describeCouponFailure (thuần, không import server)
│   │   ├── coupon-service.test.ts
│   │   └── components/
│   │       ├── coupon-input.tsx          # "use client": ô nhập, Áp dụng, Gỡ; gọi evaluateCoupon trực tiếp
│   │       └── coupon-input.test.tsx
│   ├── checkout/
│   │   ├── pricing.ts                    # SỬA: calculateOrderTotals(lines, method, discountAmount = 0); OrderTotals thêm discountAmount
│   │   ├── pricing.test.ts               # SỬA: thêm ca có giảm giá
│   │   ├── checkout-schema.ts            # SỬA: couponCodeSchema + couponCode trong placeOrderSchema
│   │   └── components/
│   │       ├── checkout-form.tsx         # SỬA: giữ mã đã áp dụng, gửi couponCode; khi đặt hàng bị từ chối vì COUPON_*: gỡ mã, hiện lý do, giữ state form, không tự đặt lại
│   │       ├── checkout-form.test.tsx    # SỬA: ca đặt hàng bị từ chối vì mã hết hạn / không đủ tối thiểu
│   │       └── checkout-summary.tsx      # SỬA: dòng giảm giá
│   └── orders/
│       ├── types.ts                      # SỬA: Order.discount? (tùy chọn, đơn cũ không có)
│       ├── order-errors.ts               # SỬA: 3 mã lỗi COUPON_*
│       ├── order-service.ts              # SỬA: placeOrder nhận couponCode, tính lại bằng evaluateCoupon, throw OrderError COUPON_*
│       ├── order-service.test.ts         # SỬA
│       └── components/
│           ├── order-totals.tsx          # MỚI: tách khối tổng tiền khỏi trang chi tiết
│           └── order-totals.test.tsx
└── app/
    ├── api/
    │   └── orders/route.test.ts          # SỬA: ca couponCode
    └── orders/[id]/page.tsx              # SỬA: dùng OrderTotals

e2e/shopping-flow.spec.ts                 # SỬA: kịch bản áp dụng/gỡ mã, mã hết hạn
```

**Structure Decision**: giữ cấu trúc feature-based hiện có. `coupons` là feature riêng cho dữ liệu và
quy tắc mã; quy tắc cộng/trừ vào tổng tiền vẫn nằm trong `pricing.ts` (nguồn duy nhất cho mọi tổng tiền).
`pricing.ts` không import `coupons`, chỉ nhận số tiền giảm đã tính, nên không có phụ thuộc vòng.

## Complexity Tracking

Không có vi phạm constitution cần biện minh.

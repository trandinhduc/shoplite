# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `feat/ngocdb-acbs-com-vn` (thư mục spec `001-checkout-coupon`) | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-checkout-coupon/spec.md`

## Summary

Khách nhập mã giảm giá ở trang thanh toán, thấy ngay số tiền giảm, phí ship và tổng tiền mới; đơn
lưu mã và số tiền giảm. Mã là dữ liệu tĩnh trong `src/data/coupons.ts`. Quy tắc thuần nằm trong
feature mới `src/features/coupons/` và được tích hợp vào `calculateOrderTotals` trong
`src/features/checkout/pricing.ts`. Client kiểm tra mã qua `POST /api/coupons/validate` (không lộ
danh sách mã), sau đó tính lại cục bộ khi giỏ đổi; `POST /api/orders` nhận `couponCode` và server tự
kiểm tra, tính lại tiền. Đơn cũ không có trường giảm giá vẫn hiển thị như trước.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js >= 22.12

**Primary Dependencies**: Next.js 16 (App Router), React 19, Zod 4, Tailwind CSS v4, lucide-react - không thêm dependency

**Storage**: Mã: mảng tĩnh `src/data/coupons.ts`; mã đã áp dụng: localStorage `shoplite:coupon`; đơn hàng: file JSON hiện có qua `OrderRepository` (không đổi)

**Testing**: Vitest + Testing Library (jsdom; `// @vitest-environment node` cho route/service), Playwright cho E2E

**Target Platform**: Trình duyệt hiện đại + Node server (`next dev` / `next start`)

**Project Type**: Web app Next.js một project (`src/app` + `src/features`)

**Performance Goals**: Áp mã → thấy tổng mới < 1 giây (SC-001); tính lại khi giỏ đổi không gọi mạng

**Constraints**: Server là nguồn sự thật về tiền; không lộ danh sách mã ra client; tương thích đơn cũ; text tiếng Việt

**Scale/Scope**: 3 mã, 1 trang thanh toán, 1 trang chi tiết đơn, 1 endpoint mới, 1 endpoint sửa

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Nguyên tắc                           | Kiểm tra                                                                                                                                                                                                                         | Kết quả              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| I. Kiến trúc theo tính năng          | Logic mã ở `src/features/coupons/`; route `app/api/coupons/validate/route.ts` chỉ parse + gọi service; dữ liệu ở `src/data/`; `coupon-service.ts` (import dữ liệu) chỉ dùng từ server                                            | PASS                 |
| II. Test trước cho nghiệp vụ         | Test viết trước cho `coupon-rules` (biên 299.999/300.000/300.001, maxDiscount 999.990/1.000.000/1.500.000, hết hạn 23:59:59 vs 00:00 hôm sau), `calculateOrderTotals` (ngưỡng ship 499.999/500.000/500.001 sau giảm), `order-service` (3 lỗi coupon, lưu mã), route validate | PASS                 |
| III. Server là nguồn sự thật về tiền | Server tính `subtotal` từ catalog, tự kiểm tra mã lúc đặt hàng; payload chỉ thêm `couponCode`; validate bằng Zod; lỗi qua `OrderError` + `handleRouteError`                                                                      | PASS                 |
| IV. Đơn giản trước                   | Không dependency, không database; dùng lại pattern `cart-store`, `OrderError`, `handleRouteError`; 1 endpoint mới có lý do ở research R2                                                                                         | PASS (có giải thích) |
| V. Tiếng Việt & dễ tiếp cận          | Label "Mã giảm giá", lỗi `role="alert"` nối `aria-describedby`, tiền qua `formatCurrency`                                                                                                                                        | PASS                 |

Ràng buộc kỹ thuật: quy tắc ngưỡng miễn phí ship đổi sang "sau giảm" được spec ghi tường minh
(FR-017, Assumptions) nên hợp lệ; đơn không dùng mã cho kết quả như cũ vì `discount = 0`.

**Re-check sau Phase 1**: data model, contract và quickstart không thêm dependency, không lưu tiền từ
client, không đổi cấu trúc thư mục ngoài feature mới → vẫn PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-checkout-coupon/
├── plan.md              # File này
├── research.md          # Phase 0: R1-R8
├── data-model.md        # Phase 1: Coupon, AppliedCoupon, OrderTotals, Order, PlaceOrderInput
├── quickstart.md        # Phase 1: kịch bản kiểm chứng
├── contracts/api.md     # Phase 1: POST /api/coupons/validate, POST /api/orders, UI contract
└── tasks.md             # Phase 2 (/speckit-tasks - chưa tạo)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                          # MỚI: 3 mã khởi tạo
├── features/
│   ├── coupons/                            # MỚI
│   │   ├── coupon-rules.ts                 # kiểu Coupon + hàm thuần, dùng chung client/server
│   │   ├── coupon-rules.test.ts
│   │   ├── coupon-service.ts               # chỉ server: tra mã + validateCoupon(code, subtotal, now)
│   │   ├── coupon-service.test.ts
│   │   ├── coupon-store.ts                 # client: localStorage shoplite:coupon (pattern cart-store)
│   │   ├── use-applied-coupon.ts           # hook: áp/gỡ, gọi API, tự gỡ khi không còn đủ điều kiện
│   │   └── components/
│   │       ├── coupon-field.tsx            # "use client": ô nhập + Áp dụng / Gỡ mã + lỗi
│   │       └── coupon-field.test.tsx
│   ├── checkout/
│   │   ├── pricing.ts                      # SỬA: calculateOrderTotals(lines, method, discount = 0)
│   │   ├── pricing.test.ts                 # SỬA: thêm case giảm giá + ngưỡng ship sau giảm
│   │   ├── checkout-schema.ts              # SỬA: couponCode tùy chọn; schema cho validate
│   │   └── components/
│   │       ├── checkout-form.tsx           # SỬA: gửi couponCode, xử lý lỗi coupon lúc đặt hàng
│   │       ├── checkout-form.test.tsx      # SỬA
│   │       └── checkout-summary.tsx        # SỬA: dòng Giảm giá, render CouponField
│   └── orders/
│       ├── types.ts                        # SỬA: couponCode?, discount?
│       ├── order-errors.ts                 # SỬA: 3 mã lỗi coupon
│       ├── order-service.ts                # SỬA: kiểm tra mã, truyền discount vào totals
│       └── order-service.test.ts           # SỬA
└── app/
    ├── api/coupons/validate/
    │   ├── route.ts                        # MỚI
    │   └── route.test.ts                   # MỚI
    └── orders/[id]/page.tsx                # SỬA: dòng "Giảm giá (CODE)" khi discount > 0
e2e/
└── shopping-flow.spec.ts                   # SỬA: thêm kịch bản SHOPLITE10
playwright.config.ts                        # SỬA: ORDERS_FILE riêng cho E2E, không ghi vào storage/
```

**Structure Decision**: Giữ cấu trúc một project hiện có. Thêm đúng một feature mới
`src/features/coupons/` và một file dữ liệu `src/data/coupons.ts`; mọi thay đổi khác là sửa file sẵn
có trong `checkout`, `orders`, `app`.

### Luồng dữ liệu

- **Áp mã**: `CouponField` → `useAppliedCoupon.apply(code)` → `POST /api/coupons/validate`
  (`coupon-service.validateCoupon` + catalog) → lưu `{ code, rule }` vào `coupon-store` →
  `CheckoutSummary` gọi `calculateCouponDiscount(rule, subtotal)` → `calculateOrderTotals(..., discount)`.
- **Giỏ đổi / mở lại trang**: `useAppliedCoupon` chạy `checkCouponEligibility(rule, subtotal, now)`
  mỗi lần render; không đạt → xóa store + thông báo (FR-016). Lần đầu hiển thị trang thanh toán gọi
  lại API một lần (FR-018).
- **Đặt hàng**: `CheckoutForm` gửi `couponCode` → `orderService.placeOrder` → `validateCoupon(code,
subtotal, now())` → `calculateOrderTotals(items, method, discount)` → lưu `couponCode`, `discount`.
  Lỗi coupon → không tạo đơn; form gỡ mã và hiện lý do (FR-011).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Không có vi phạm. Endpoint mới `POST /api/coupons/validate` không phải vi phạm nguyên tắc IV, lý do
ghi ở research R2.

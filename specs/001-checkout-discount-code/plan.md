# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `001-checkout-discount-code` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-checkout-discount-code/spec.md`

## Summary

Khách nhập mã giảm giá ở trang thanh toán; hai loại mã (phần trăm có trần, số tiền cố định), có
điều kiện tiền hàng tối thiểu và ngày hết hạn; một mã mỗi đơn. Mã tĩnh trong `src/data/coupons.ts`,
logic thuần trong feature mới `src/features/coupons/`. Client gọi `POST /api/coupons/validate` để
nhận định nghĩa mã rồi tự tính lại bằng cùng hàm thuần khi giỏ đổi. `POST /api/orders` nhận thêm
`couponCode`; server kiểm lại và tính `discount`/`total` qua `calculateOrderTotals` mở rộng.
Đơn lưu `couponCode` + `discount`; đơn cũ không có hai trường này vẫn hiển thị đúng.

## Technical Context

**Language/Version**: TypeScript (strict), Node.js >= 22.12.0

**Primary Dependencies**: Next.js 16.4.2 App Router, React 19.3.0, Zod 4, Tailwind CSS 4,
lucide-react (đã có). Không thêm dependency.

**Storage**: Mã: mảng tĩnh `src/data/coupons.ts`. Đơn: file JSON hiện có (`ORDERS_FILE`). Mã đang
áp dụng phía client: localStorage key mới `"shoplite:coupon"`. Không database.

**Testing**: Vitest 5 + jsdom + Testing Library (unit/component/route), Playwright (E2E)

**Target Platform**: Trình duyệt hiện đại + Node server của Next.js

**Project Type**: Web application (Next.js full-stack, một project)

**Performance Goals**: Hiển thị tổng mới < 1 giây sau "Áp dụng" (SC-001); tính lại khi đổi giỏ
là đồng bộ, không gọi mạng

**Constraints**: Server là nguồn sự thật về tiền; không tin số liệu client; text tiếng Việt;
không đổi `CART_STORAGE_KEY`/`CartState`; giữ mọi `data-testid` hiện có

**Scale/Scope**: 3 mã ban đầu, ~6 file mới, ~10 file sửa

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Nguyên tắc                           | Đánh giá   | Bằng chứng trong thiết kế                                                                                                                                                                                                                               |
| ------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Kiến trúc theo tính năng          | ✅ Pass    | Logic ở `src/features/coupons/`; route `api/coupons/validate` chỉ parse → `couponService.validateCoupon` → `handleRouteError`. Client không import `server.ts`/`node:fs`; `coupons/server.ts` chỉ import từ route.                                      |
| II. Test trước (NON-NEGOTIABLE)      | ✅ Pass    | `tasks.md` sẽ đặt test trước mỗi rule: `evaluateCoupon`, `isCouponExpired`, `calculateOrderTotals` với discount, `placeOrder` với mã, route. Ca biên liệt kê ở [quickstart.md](./quickstart.md). `now` inject qua DI.                                   |
| III. Server là nguồn sự thật         | ✅ Pass    | `placeOrderSchema` chỉ thêm `couponCode` (không trường tiền). Server tính subtotal từ catalog, đánh giá mã theo `now()` server, tính tổng bằng `calculateOrderTotals`. Endpoint validate cũng tính từ giá catalog. Input validate bằng Zod `safeParse`. |
| IV. Đơn giản trước                   | ✅ Pass    | Không dependency/database. Endpoint mới và localStorage key mới được giải trình ở [research.md](./research.md) R2, R6.                                                                                                                                  |
| V. Tiếng Việt & dễ tiếp cận          | ✅ Pass    | Message tiếng Việt; số tiền qua `formatCurrency`; ô mã có `<label>`, lỗi `error-couponCode` + `aria-invalid`/`aria-describedby`; dùng được bằng bàn phím.                                                                                               |
| Quy trình: nhánh riêng               | ⚠️ Cần làm | Đang ở nhánh `toantv`. Phải `git switch -c 001-checkout-discount-code` trước `/speckit-implement`.                                                                                                                                                      |
| Quy trình: spec không còn câu hỏi mở | ✅ Pass    | 3 câu đã chốt trong Clarifications; checklist 16/16.                                                                                                                                                                                                    |

**Re-check sau Phase 1**: không phát sinh vi phạm mới; Complexity Tracking để trống.

## Project Structure

### Documentation (this feature)

```text
specs/001-checkout-discount-code/
├── plan.md              # File này
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/api.md     # Phase 1
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                         # MỚI: mảng Coupon (SHOPLITE10, GIAM50K, TET2026)
├── features/
│   ├── coupons/                           # MỚI
│   │   ├── types.ts                       # Coupon, AppliedCoupon, CouponEvaluation
│   │   ├── coupon-rules.ts                # normalizeCouponCode, findCoupon, isCouponExpired,
│   │   │                                  # calculateCouponDiscount, evaluateCoupon, couponErrorMessage
│   │   ├── coupon-rules.test.ts           # biên: ngưỡng, trần, hết hạn, thứ tự lỗi, dữ liệu
│   │   ├── coupon-errors.ts               # toCouponError(evaluation) -> OrderError COUPON_*
│   │   ├── coupon-schema.ts               # validateCouponSchema (code + items)
│   │   ├── coupon-service.ts              # createCouponService({ findProduct, now, findCoupon })
│   │   ├── coupon-service.test.ts
│   │   ├── server.ts                      # couponService (wiring mặc định)
│   │   ├── coupon-store.ts                # localStorage "shoplite:coupon" (client)
│   │   ├── coupon-store.test.ts
│   │   ├── use-applied-coupon.ts          # hook: applied/ineligible, apply, remove
│   │   └── components/
│   │       ├── coupon-field.tsx           # "use client": ô nhập, Áp dụng, Gỡ mã, lỗi
│   │       └── coupon-field.test.tsx
│   ├── checkout/
│   │   ├── pricing.ts                     # SỬA: calculateOrderTotals(lines, method, discount=0)
│   │   ├── pricing.test.ts                # SỬA: thêm ca discount, miễn ship trước giảm
│   │   ├── checkout-schema.ts             # SỬA: placeOrderSchema.couponCode optional
│   │   ├── checkout-schema.test.ts
│   │   └── components/
│   │       ├── checkout-form.tsx          # SỬA: gắn CouponField, gửi couponCode, xử lý lỗi COUPON_*
│   │       ├── checkout-form.test.tsx
│   │       └── checkout-summary.tsx       # SỬA: nhận discount, dòng checkout-discount
│   └── orders/
│       ├── types.ts                       # SỬA: couponCode?, discount?
│       ├── order-errors.ts                # SỬA: 3 mã COUPON_* (422)
│       ├── order-service.ts               # SỬA: đánh giá mã sau tồn kho, trước tính tổng
│       └── order-service.test.ts          # SỬA: mã hợp lệ/không hợp lệ/gian lận/không lưu khi lỗi
├── app/
│   ├── api/coupons/validate/
│   │   ├── route.ts                       # MỚI: POST
│   │   └── route.test.ts                  # MỚI: // @vitest-environment node, mock server.ts
│   ├── api/orders/route.test.ts           # SỬA: couponCode
│   └── orders/[id]/page.tsx               # SỬA: dòng order-discount khi discount > 0
e2e/
└── coupon-flow.spec.ts                    # MỚI: áp mã, mã hết hạn, đặt hàng, chi tiết đơn
AGENTS.md                                  # SỬA: codemap + quy tắc nghiệp vụ mã giảm giá (mục 3, 5)
```

**Structure Decision**: Giữ project Next.js đơn, feature-based theo nguyên tắc I. `coupons` là
feature độc lập; `checkout` và `orders` phụ thuộc một chiều vào `coupons` (không ngược lại).
`pricing.ts` chỉ nhận con số `discount`, không biết đến mã.

## Thiết kế chi tiết

### Luồng áp dụng mã (client)

`CouponField` (Enter hoặc "Áp dụng") → `useAppliedCoupon().apply(code)` → `fetch POST
/api/coupons/validate { code, items }` → 200: lưu `AppliedCoupon` vào `coupon-store` → render lại;
422: hiển thị `error.message` ở `error-couponCode`, giữ mã cũ (FR-011). Mỗi lần render,
`evaluateCoupon(applied, subtotal, new Date())` cho ra `applied` (có discount) hoặc `ineligible`
(shortfall) → `CheckoutSummary` nhận `discount`.

Lưu ý: ô mã nằm trong `<form>` đặt hàng; Enter trong ô mã MUST `preventDefault` và gọi apply
(không submit đơn). Nút "Áp dụng" là `type="button"`. Không lồng `<form>`.

### Luồng đặt hàng (server)

`placeOrder`: `placeOrderSchema.safeParse` → `mergeItems` → sản phẩm + tồn kho (như cũ) →
nếu có `couponCode`: `evaluateCoupon(findCoupon(code), subtotal, now())`; không `valid` →
`throw toCouponError(evaluation)` (không lưu) → `calculateOrderTotals(items, method, discount)`
→ lưu `couponCode` (chuẩn hóa) và `discount`. `createOrderService` thêm dep `findCoupon`
(mặc định từ `src/data/coupons.ts`) để test dùng mã giả.

### Client khi đặt hàng lỗi `COUPON_*`

`checkout-form.tsx`: nếu `error.code` bắt đầu bằng `COUPON_` → `removeCoupon()`, hiển thị
`error.message` (cả ở `role="alert"` và `error-couponCode`), tóm tắt trở về giá chưa giảm,
khách bấm "Đặt hàng" lần nữa (FR-015). Đặt hàng thành công → `clear()` giỏ + `removeCoupon()`.

### Hiển thị đơn

`orders/[id]/page.tsx`: `const discount = order.discount ?? 0;` hiển thị dòng
"Giảm giá (`couponCode`)" `−formatCurrency(discount)` chỉ khi `discount > 0`. Danh sách đơn
dùng `order.total` đã lưu — không đổi.

### Rủi ro đã biết

- `mergeItems` vẫn có lỗi đã biết (tổng > 10 sau gộp, AGENTS.md mục 5). Tính năng này không sửa,
  nhưng tiền hàng dùng để đánh giá mã lấy **sau** `mergeItems` nên nhất quán với tổng lưu vào đơn.
- Đồng hồ client lệch → client có thể hiển thị mã còn hạn; server từ chối khi đặt và client tự gỡ
  mã (đã có luồng FR-015).

## Complexity Tracking

Không có vi phạm constitution cần giải trình.

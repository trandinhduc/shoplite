# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `001-checkout-discount-code` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-checkout-discount-code/spec.md`

## Summary

Khách nhập một mã giảm giá ở `/checkout`. Mã được lưu cùng giỏ hàng, và tóm tắt đơn hiện ngay số
tiền giảm và tổng tiền mới. Khi đặt hàng, server tự kiểm tra mã và tính lại toàn bộ số tiền.
Đơn hàng lưu `couponCode` và `discount`.

Hướng kỹ thuật:

- **Feature mới `src/features/coupons/`**, gồm:
  - quy tắc thuần `coupon-rules.ts`, client và server dùng chung;
  - `coupon-service.ts`, tra dữ liệu tĩnh `src/data/coupons.ts`, chỉ dùng ở server.
- **Route mỏng `GET /api/coupons/[code]`**: client chỉ lấy định nghĩa của đúng mã đã nhập, nên
  danh sách mã không lộ ra bundle.
- **`pricing.ts`**: `calculateOrderTotals` nhận thêm `discount` (mặc định 0). Phí ship vẫn tính
  theo tạm tính trước giảm.
- **`placeOrder`**: đánh giá lại mã theo `now()`, ném `INVALID_COUPON` (422) nếu mã không còn hợp
  lệ.

Không thêm dependency, không thêm database. Chi tiết các quyết định xem
[research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Node.js ≥ 22.12

**Primary Dependencies**: Next.js 16.4 (App Router, Turbopack), React 19.3, Zod 4, Tailwind CSS v4,
lucide-react. Không thêm package mới.

**Storage**:

- mã giảm giá: mảng tĩnh `src/data/coupons.ts`;
- mã đang áp dụng: `localStorage` (trong `CartState`, key `shoplite:cart`);
- đơn hàng: file JSON qua `OrderRepository` (`ORDERS_FILE`, mặc định `storage/orders.json`).

**Testing**: Vitest 5 + Testing Library (jsdom; route và repository dùng `@vitest-environment
node`), Playwright (chromium)

**Target Platform**: Trình duyệt desktop/mobile hiện đại, server Node.js (`next start`)

**Project Type**: Ứng dụng web full-stack, một project Next.js

**Performance Goals**: Hiện kết quả áp dụng mã trong < 1 giây (SC-001). Tính lại khi giỏ đổi
diễn ra tức thì ở client, không gọi mạng.

**Constraints**:

- server là nguồn sự thật về tiền;
- tương thích ngược với đơn cũ và với giỏ cũ trong `localStorage`;
- hạn dùng tính theo UTC+7;
- text tiếng Việt.

**Scale/Scope**: 3 mã ban đầu, danh sách sửa bằng code. Đụng vào 4 feature (`coupons` mới,
`cart`, `checkout`, `orders`), 1 route mới, 2 trang (`/checkout`, `/orders/[id]`).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Nguyên tắc                           | Đánh giá                                                                                                                                                                                                                                                                                                                                                               | Kết quả                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| I. Kiến trúc theo tính năng          | Logic mã nằm trong `src/features/coupons/`. `app/api/coupons/[code]/route.ts` chỉ chuẩn hóa mã, gọi `findCoupon` và trả JSON. `app/api/orders/route.ts` không đổi; mọi thay đổi nằm trong `order-service`. Dữ liệu tĩnh đặt ở `src/data/`                                                                                                                              | ✅ Pass                          |
| II. Test trước (NON-NEGOTIABLE)      | `tasks.md` MUST xếp test trước code cho: `coupon-rules` (bảng giá trị biên trong data-model), `pricing` (discount + freeship 520.000đ), `cart-reducer` (apply/remove/bỏ mã khi giỏ rỗng), `checkout-schema`, `order-service` (mã hợp lệ, `INVALID_COUPON`, bỏ qua tiền client gửi), route test, component test, e2e. `now` được inject nên test hạn dùng xác định được | ✅ Pass (là ràng buộc cho tasks) |
| III. Server là nguồn sự thật về tiền | `placeOrder` tự tra mã, đánh giá theo `now()` server và tính `calculateOrderTotals(…, discount)`. Body chỉ nhận `couponCode`, Zod loại bỏ trường tiền khác. Lỗi đi qua `OrderError` → `handleRouteError`. Công thức tiền nằm ở `pricing.ts` + `coupon-rules.ts`, client chỉ gọi lại                                                                                    | ✅ Pass                          |
| IV. Đơn giản trước                   | Không có dependency hay database mới. Không dùng `dayjs` (R4). Mã lưu chung trong cart store sẵn có thay vì tạo store mới (R5). Route mới là cách tối thiểu để không lộ danh sách mã (R1)                                                                                                                                                                              | ✅ Pass                          |
| V. Tiếng Việt & dễ tiếp cận          | Mọi message tiếng Việt (contracts/ui.md). Số tiền qua `formatCurrency`. Ô mã có `<label>`, lỗi hiện tại ô mã với `role="alert"` và `aria-invalid`                                                                                                                                                                                                                      | ✅ Pass                          |
| Quy trình                            | Spec không còn `[NEEDS CLARIFICATION]` (đã clarify 4 câu). Nhánh tính năng `001-checkout-discount-code` (xem ghi chú bên dưới)                                                                                                                                                                                                                                         | ⚠️ Cần tạo nhánh                 |

**Ghi chú về nhánh**: Spec Kit xác định feature là `001-checkout-discount-code` (theo
`.specify/feature.json`), nhưng git hiện đang ở nhánh `namtt_acbs`. Constitution yêu cầu mỗi tính
năng có nhánh riêng, nên MUST tạo hoặc chuyển sang nhánh `001-checkout-discount-code` trước
`/speckit-implement`.

**Re-check sau Phase 1**: Thiết kế trong data-model và contracts không phát sinh vi phạm mới. Bảng
Complexity Tracking để trống.

## Project Structure

### Documentation (this feature)

```text
specs/001-checkout-discount-code/
├── plan.md              # File này
├── research.md          # Phase 0: quyết định R1–R8
├── data-model.md        # Phase 1: Coupon, CouponEvaluation, CartState, OrderTotals, Order
├── quickstart.md        # Phase 1: hướng dẫn kiểm chứng
├── contracts/
│   ├── api.md           # GET /api/coupons/:code, POST /api/orders (thêm couponCode, INVALID_COUPON)
│   └── ui.md            # nhãn, text, testid cho CouponField, tóm tắt, chi tiết đơn
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, chưa tạo)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                          # MỚI: SHOPLITE10, GIAM50K, TET2026
├── features/
│   ├── coupons/                            # MỚI
│   │   ├── types.ts                        # Coupon (union theo type), CouponEvaluation, COUPON_TYPES
│   │   ├── coupon-rules.ts                 # thuần: normalizeCouponCode, getCouponDeadline,
│   │   │                                   #   calculateCouponDiscount, evaluateCoupon, getCouponErrorMessage
│   │   ├── coupon-rules.test.ts
│   │   ├── coupon-service.ts               # server: findCoupon (đọc src/data/coupons.ts)
│   │   ├── coupon-service.test.ts
│   │   └── components/
│   │       ├── coupon-field.tsx            # "use client": nhập/áp dụng/gỡ mã, hiện lỗi
│   │       └── coupon-field.test.tsx
│   ├── cart/
│   │   ├── types.ts                        # SỬA: CartState.couponCode?, action apply/remove-coupon
│   │   ├── cart-reducer.ts (+ .test.ts)    # SỬA: xử lý coupon, bỏ mã khi giỏ rỗng
│   │   ├── cart-store.ts (+ .test.ts)      # SỬA: isCartState chấp nhận couponCode tùy chọn
│   │   └── use-cart.ts                     # SỬA: couponCode, applyCoupon, removeCoupon
│   ├── checkout/
│   │   ├── pricing.ts (+ .test.ts)         # SỬA: calculateOrderTotals(lines, method, discount = 0)
│   │   ├── checkout-schema.ts (+ .test.ts) # SỬA: placeOrderSchema.couponCode
│   │   └── components/
│   │       ├── checkout-form.tsx (+ .test.tsx) # SỬA: lấy định nghĩa mã, gửi couponCode, xử lý INVALID_COUPON, khóa nút
│   │       └── checkout-summary.tsx        # SỬA: dòng "Giảm giá (CODE)"
│   └── orders/
│       ├── types.ts                        # SỬA: Order.couponCode?, Order.discount?
│       ├── order-errors.ts                 # SỬA: INVALID_COUPON → 422
│       ├── order-service.ts (+ .test.ts)   # SỬA: inject findCoupon (mặc định từ coupon-service), đánh giá mã
│       └── components/order-totals.tsx     # MỚI (tùy chọn): khối tổng tiền dùng ở trang chi tiết, test được đơn cũ/mới
├── app/
│   ├── api/coupons/[code]/route.ts (+ route.test.ts) # MỚI
│   ├── api/orders/route.test.ts            # SỬA: thêm case couponCode
│   └── orders/[id]/page.tsx                # SỬA: hiển thị dòng giảm giá
e2e/
└── coupon-flow.spec.ts                     # MỚI: áp dụng mã → đặt hàng → chi tiết đơn
```

**Structure Decision**: Giữ cấu trúc một project Next.js theo feature như hiện tại
(`src/app` + `src/features` + `src/data`).

- `coupons` là feature mới, độc lập.
- `checkout` và `orders` phụ thuộc một chiều vào `coupons`: `order-service` dùng `findCoupon` và
  `evaluateCoupon`; `checkout-form` dùng `CouponField` và `evaluateCoupon`.
- `coupons` không import ngược vào `checkout`/`orders`.
- `cart` chỉ lưu chuỗi mã, không import `coupons`.
- Tách khối tổng tiền của trang chi tiết thành `order-totals.tsx` để component test được trường hợp
  đơn cũ. Nếu không tách, dòng giảm giá vẫn có thể thêm trực tiếp vào `page.tsx`.

## Complexity Tracking

Không có vi phạm constitution cần biện minh.

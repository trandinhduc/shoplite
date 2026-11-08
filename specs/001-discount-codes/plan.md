# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `001-discount-codes` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-discount-codes/spec.md`

## Summary

Thêm mã giảm giá vào trang thanh toán. Khách nhập mã, hệ thống kiểm tra mã với giỏ hàng (qua endpoint
xem trước `POST /api/coupons/validate`) và hiển thị ngay tiền giảm cùng tổng mới. Khi đặt hàng,
`POST /api/orders` nhận thêm `couponCode` và server tự đánh giá lại mã, tính lại tiền. Đơn lưu
`couponCode` và `discount`; trang chi tiết đơn hiển thị dòng giảm giá.

Danh sách mã là dữ liệu tĩnh trong `src/data/coupons.ts`. Quy tắc tra mã và kiểm tra điều kiện nằm trong
feature mới `src/features/coupons/`. Công thức tiền giảm nằm trong `src/features/checkout/pricing.ts`,
theo constitution III (xem [research.md](./research.md) R1).

Mã hết hạn lúc đặt hàng: đơn vẫn được tạo nhưng theo giá gốc, kèm thông báo (Clarification Q1, R4).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js >= 22.12

**Primary Dependencies**: Next.js 16.4 (App Router, Turbopack), React 19, Zod 4, Tailwind CSS v4,
lucide-react. **Không thêm dependency mới.**

**Storage**: Mã giảm giá là dữ liệu tĩnh `src/data/coupons.ts`, chỉ server import. Đơn hàng vẫn lưu ở
`storage/orders.json` qua `OrderRepository`, thêm 2 trường optional, không migration. Mã đang áp dụng
phía client lưu dạng chuỗi trong `cartStore` (`CartState.couponCode`, key `shoplite:cart`) và được kiểm tra
lại qua API mỗi lần vào trang thanh toán (R9).

**Testing**: Vitest + Testing Library (jsdom; service và route dùng `// @vitest-environment node`),
Playwright cho e2e.

**Target Platform**: Ứng dụng web Next.js (server Node + trình duyệt hiện đại).

**Project Type**: Web application, một project duy nhất, tổ chức theo feature.

**Performance Goals**: Áp mã hiển thị kết quả dưới 1 giây (SC-001). Đánh giá mã là O(n) trên danh sách
vài mã, không cần cache.

**Constraints**:
- Server không tin số tiền nào từ client, kể cả ở endpoint xem trước.
- Danh sách mã không được lọt vào bundle client.
- Hạn dùng tính theo giờ Việt Nam, không phụ thuộc múi giờ máy chủ.
- Đơn cũ vẫn hiển thị đúng.

**Scale/Scope**: 3 mã ban đầu. Khoảng 1 feature mới, 1 route mới, sửa khoảng 8 file hiện có, 3 trang/
component UI bị ảnh hưởng (checkout form, checkout summary, chi tiết đơn).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá trước Phase 0 | Sau Phase 1 |
| --- | --- | --- |
| **I. Kiến trúc theo tính năng** | Logic trong `src/features/coupons/`. Route mới `src/app/api/coupons/validate/route.ts` chỉ gọi service. Dữ liệu ở `src/data/` | ✅ `coupon-service`/`server.ts` chỉ được import từ server. `CouponField` (client) chỉ import kiểu và hàm thuần, không import `src/data/coupons.ts` |
| **II. Test trước (NON-NEGOTIABLE)** | Mọi quy tắc tiền, giới hạn và hạn dùng có test biên viết trước (liệt kê ở [quickstart.md](./quickstart.md) §1). API có test từng mã lỗi + HTTP status | ✅ Contracts ghi rõ test bắt buộc. `tasks.md` phải đặt task test trước task cài đặt |
| **III. Server là nguồn sự thật về tiền** | Server tính lại `discount`/`total` trong `placeOrder`. Endpoint xem trước nhận `items`, không nhận `subtotal`. Zod cho `couponCode` và body validate. Mã lỗi mới thêm vào cả union lẫn `HTTP_STATUS_BY_CODE` | ✅ Công thức nằm trong `pricing.ts` (R1). Shipping vẫn tính trên tạm tính trước giảm, quy tắc phí ship giữ nguyên |
| **IV. Đơn giản trước** | Không thêm dependency hay database. Dữ liệu tĩnh giống `products.ts` | ✅ Endpoint mới là phần phức tạp duy nhất được thêm, có lý do (R2: không lộ danh sách mã) |
| **V. Tiếng Việt & dễ tiếp cận** | Thông báo lỗi tiếng Việt. Tiền dùng `formatCurrency`. Ô mã có label, lỗi gắn bằng `aria-describedby` | ✅ [contracts/ui-checkout.md](./contracts/ui-checkout.md) chốt label, role, testid |
| Ràng buộc kỹ thuật | Quy tắc giỏ hàng, phí ship và hủy đơn không đổi | ✅ |
| Quy trình | Nhánh riêng `001-discount-codes`. Spec không còn `[NEEDS CLARIFICATION]` | ✅ Hai câu clarify (Q1 = C, Q2 = C) đã ghi vào spec và phản ánh trong R4 và R9 |
| V (bổ sung) | – | ✅ Mã được giữ qua `cartStore`/`useCart`; component không đọc localStorage trực tiếp |

**Kết quả gate**: PASS. Không có vi phạm cần ghi vào Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-discount-codes/
├── plan.md              # File này
├── research.md          # Phase 0: R1–R9
├── data-model.md        # Phase 1: Coupon, CouponEvaluation, OrderTotals, Order
├── quickstart.md        # Phase 1: kịch bản kiểm chứng
├── contracts/
│   ├── coupons-validate.md   # POST /api/coupons/validate (mới)
│   ├── orders-post.md        # POST /api/orders (mở rộng couponCode)
│   └── ui-checkout.md        # Selector UI cho component test / e2e
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks), chưa tạo
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                         # MỚI: SHOPLITE10, GIAM50K, TET2026 (chỉ server import)
├── features/
│   ├── coupons/                           # MỚI
│   │   ├── types.ts                       # Coupon, DiscountRule, CouponEvaluation
│   │   ├── coupon-rules.ts                # normalizeCouponCode, isCouponExpired, evaluateCoupon (thuần, client dùng được)
│   │   ├── coupon-rules.test.ts
│   │   ├── coupon-service.ts              # findCouponByCode, getExpiredCouponNotice (đọc src/data/coupons.ts, chỉ server)
│   │   ├── coupon-service.test.ts         # gồm kiểm tra toàn vẹn dữ liệu tĩnh
│   │   └── components/
│   │       ├── coupon-field.tsx           # "use client": ô mã, Áp dụng, Gỡ mã, thông báo
│   │       └── coupon-field.test.tsx
│   ├── cart/
│   │   ├── types.ts                       # SỬA: CartState.couponCode?, action apply-coupon / remove-coupon
│   │   ├── cart-reducer.ts                # SỬA: xử lý 2 action mới; clear xóa cả mã
│   │   ├── cart-reducer.test.ts           # SỬA
│   │   ├── cart-store.test.ts             # SỬA: đọc giỏ cũ không có couponCode; đồng bộ mã giữa các tab
│   │   └── use-cart.ts                    # SỬA: couponCode, applyCoupon, removeCoupon
│   ├── checkout/
│   │   ├── pricing.ts                     # SỬA: calculateCouponDiscount; calculateOrderTotals(lines, method, rule?) trả thêm discount
│   │   ├── pricing.test.ts                # SỬA: test biên giảm giá; cập nhật toEqual có discount
│   │   ├── checkout-schema.ts             # SỬA: couponCodeSchema, couponCode trong placeOrderSchema, validateCouponSchema
│   │   ├── checkout-schema.test.ts        # SỬA
│   │   └── components/
│   │       ├── checkout-form.tsx          # SỬA: state mã, gửi couponCode, xử lý couponNotice / lỗi COUPON_*
│   │       ├── checkout-form.test.tsx     # SỬA
│   │       └── checkout-summary.tsx       # SỬA: nhận coupon, dòng "Giảm giá (CODE)"
│   └── orders/
│       ├── types.ts                       # SỬA: couponCode?, discount?
│       ├── order-errors.ts                # SỬA: COUPON_NOT_FOUND | COUPON_EXPIRED | COUPON_MIN_ORDER_NOT_MET (422)
│       ├── order-service.ts               # SỬA: findCoupon DI; previewCoupon(input); placeOrder đánh giá mã
│       ├── order-service.test.ts          # SỬA: các nhánh mã + chống gian lận + đơn không mã
│       └── order-repository.test.ts       # SỬA: đọc đơn cũ không có discount
├── app/
│   ├── api/
│   │   ├── coupons/validate/route.ts      # MỚI (mỏng) + route.test.ts
│   │   └── orders/route.test.ts           # SỬA: couponCode, 422 COUPON_*, couponNotice
│   └── orders/[id]/page.tsx               # SỬA: dòng giảm giá + khối thông báo couponExpired
e2e/
└── shopping-flow.spec.ts                  # SỬA/THÊM: áp SHOPLITE10 → đặt hàng → thấy giảm giá ở chi tiết đơn
```

**Structure Decision**: Giữ cấu trúc single project theo feature hiện có. Thêm `src/features/coupons/`
cho logic mã. `orderService` điều phối catalog, coupons và pricing cho cả `placeOrder` lẫn
`previewCoupon`, để dùng lại `mergeItems` và kiểm tra sản phẩm, không nhân bản. Route
`/api/coupons/validate` gọi `orderService.previewCoupon`. `findCoupon` được inject qua
`OrderServiceDeps` (mặc định `findCouponByCode`) để test thay dữ liệu.

## Thứ tự triển khai gợi ý (đầu vào cho `/speckit-tasks`)

1. **Nền tảng**: types + dữ liệu tĩnh + test toàn vẹn. `pricing.ts` (test biên trước).
   `coupon-rules.ts` (test biên trước). Mã lỗi mới.
2. **US1 + US3 (áp mã, thông báo lỗi)**: schema → `previewCoupon` → route validate → `CouponField` +
   `CheckoutSummary`.
3. **US2 (đặt hàng)**: `placeOrder` + route orders → `CheckoutForm` gửi `couponCode` → trang chi tiết đơn
   (dòng giảm giá, thông báo mã hết hạn) → đơn cũ.
4. **US4 (gỡ mã, FR-018, FR-020)**: lưu mã trong `cartStore`, nút "Gỡ mã", kiểm tra lại khi vào lại
   trang thanh toán hoặc giỏ đổi, gỡ hẳn kèm thông báo.
5. **Kết thúc**: e2e, `npm run check`, `npm run format:check`. Cập nhật README (bảng API thêm endpoint
   mới) và codemap trong AGENTS.md.

## Complexity Tracking

Không có vi phạm constitution cần biện minh.

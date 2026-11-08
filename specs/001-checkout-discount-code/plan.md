# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `module2/DatNT` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-checkout-discount-code/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Khách nhập một mã giảm giá ở trang thanh toán, thấy ngay số tiền giảm và tổng mới, có thể gỡ/thay mã;
đơn hàng lưu mã và số tiền giảm, hiển thị ở trang chi tiết đơn. Hai loại mã (phần trăm có trần, số
tiền cố định), điều kiện tối thiểu và ngày hết hạn; ba mã ban đầu là dữ liệu tĩnh.

Cách làm: feature mới `src/features/coupons/` gồm quy tắc thuần (`coupon-rules.ts`, an toàn cho
client) và service phía server (`coupon-service.ts`, tra `src/data/coupons.ts`). `calculateOrderTotals`
nhận thêm `discount` để mọi nơi dùng chung một công thức tổng. Client kiểm tra mã qua endpoint mới
`POST /api/coupons/validate`, endpoint này trả về quy tắc của đúng mã đó để client tự tính lại khi
giỏ đổi, nhờ vậy danh sách mã không bị lộ ra trình duyệt. `POST /api/orders` nhận thêm `couponCode`;
`placeOrder` tra mã và tính lại toàn bộ, không tin số liệu client. Lỗi mã là `OrderError` mới (422).
Chi tiết: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js >= 22.12

**Primary Dependencies**: Next.js 16.4 (App Router, Turbopack), React 19.3, Zod 4, Tailwind CSS v4,
lucide-react, clsx — không thêm dependency

**Storage**: Mã giảm giá: dữ liệu tĩnh `src/data/coupons.ts`. Đơn hàng: file JSON hiện có
(`storage/orders.json`, `ORDERS_FILE`) — thêm 2 trường tùy chọn, không migration. Không database.

**Testing**: Vitest + Testing Library (jsdom; `// @vitest-environment node` cho service/route),
Playwright (chromium) cho e2e

**Target Platform**: Trình duyệt hiện đại + Next.js Node server

**Project Type**: Ứng dụng web Next.js full-stack (một project)

**Performance Goals**: Thấy tổng mới ≤ 1 giây sau khi bấm "Áp dụng" (SC-001); tính lại khi giỏ đổi là
tức thời (không gọi mạng)

**Constraints**: Server là nguồn sự thật về tiền; danh sách mã không xuất hiện trong bundle client;
không hard-code hằng số nghiệp vụ; text tiếng Việt; đơn cũ hiển thị đúng

**Scale/Scope**: 3 mã, 16 sản phẩm; ~6 file mới, ~10 file sửa (xem Project Structure)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Nguyên tắc                                 | Đánh giá trước Phase 0                                                                                                                                                                                                                                                                                   | Sau Phase 1                                                                                                                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Kiến trúc theo tính năng**            | Logic mã trong `src/features/coupons/`; `src/app/api/coupons/validate/route.ts` mỏng (đọc body → service → `handleRouteError`); dữ liệu ở `src/data/`. Server Component trang chi tiết đơn đọc `orderService` trực tiếp. Tên file kebab-case, test cạnh nguồn.                                           | ✅ Giữ nguyên. `coupon-service.ts` (import dữ liệu mã) chỉ dùng từ Route Handler và `order-service`; Client Component chỉ import `coupon-rules.ts`, `types.ts`, `checkout-schema.ts` (FR-022a). |
| **II. Test trước (NON-NEGOTIABLE)**        | Test viết trước cho: `evaluateCoupon`/`calculateCouponDiscount` (biên `minSubtotal − 1`, `= minSubtotal`; trần `maxDiscount`; làm tròn; hết hạn 23:59:59.999 vs 00:00 +07:00), `calculateOrderTotals` có giảm, `placeOrder` với mã, `deriveCouponStatus`, route test, e2e. `now` được inject.            | ✅ Thứ tự Red→Green ghi trong phần "Thứ tự hiện thực" bên dưới; e2e chạy lại vì đụng luồng mua hàng.                                                                                            |
| **III. Server là nguồn sự thật về tiền**   | Client chỉ gửi `couponCode`; Zod loại khóa tiền lạ; `placeOrder` tự tra mã + tính lại; tồn kho vẫn kiểm trước. Lỗi mới thêm vào `OrderErrorCode` + `HTTP_STATUS_BY_CODE`; phản hồi qua `handleRouteError`. Ngưỡng/giá trị mã nằm trong dữ liệu `coupons.ts`, `COUPON_CODE_MAX_LENGTH` là hằng số export. | ✅ `calculateOrderTotals` là công thức duy nhất cho cả client và server. Số tiền client hiển thị chỉ để xem.                                                                                    |
| **IV. Đơn giản trước**                     | Không dependency/database/dịch vụ mới; dữ liệu tĩnh như `products.ts`; một endpoint mới là tối thiểu cần để không lộ mã (R1). Không làm admin, giới hạn lượt, rate-limit (YAGNI).                                                                                                                        | ✅ Không có mục Complexity Tracking.                                                                                                                                                            |
| **V. Tiếng Việt & dễ tiếp cận**            | Thông báo tiếng Việt; tiền qua `formatCurrency`; ô mã có `<label>`, `aria-invalid`, `aria-describedby`; lỗi hiển thị cạnh ô; nút có tên rõ ("Áp dụng", "Gỡ mã").                                                                                                                                         | ✅ Xem [contracts/checkout-ui.md](./contracts/checkout-ui.md).                                                                                                                                  |
| **Ràng buộc kỹ thuật / quy tắc hiện hành** | `MAX_QUANTITY_PER_ITEM`, tồn kho, `SHIPPING_OPTIONS`, `FREE_SHIPPING_THRESHOLD`, hủy chỉ khi `pending` — không đổi. Không ghi `storage/` trong test.                                                                                                                                                     | ✅ Phí ship tính trên subtotal trước giảm (FR-010) nên ngưỡng miễn phí ship không đổi ý nghĩa.                                                                                                  |

**Kết quả gate**: PASS (trước Phase 0 và sau Phase 1). Không có vi phạm cần giải thích.

## Project Structure

### Documentation (this feature)

```text
specs/001-checkout-discount-code/
├── spec.md
├── plan.md              # File này
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── coupons-validate.md
│   ├── orders.md
│   └── checkout-ui.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — chưa tạo)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                          # MỚI  danh sách mã tĩnh (chỉ import phía server)
├── features/
│   ├── coupons/                            # MỚI
│   │   ├── types.ts                        #   COUPON_TYPES, Coupon, CouponRule, CouponEvaluation
│   │   ├── coupon-rules.ts (+ .test.ts)    #   thuần, client-safe: normalize, cutoff, discount, evaluate, message, deriveCouponStatus
│   │   ├── coupon-schema.ts (+ .test.ts)   #   COUPON_CODE_MAX_LENGTH, couponCodeSchema (không import checkout)
│   │   ├── coupon-service.ts (+ .test.ts)  #   server: findCouponByCode, toCouponError, createCouponService().validateCoupon, couponService
│   │   └── components/
│   │       └── coupon-field.tsx (+ .test.tsx)  # "use client": ô mã, Áp dụng, Gỡ mã, thông báo
│   ├── checkout/
│   │   ├── pricing.ts (+ .test.ts)         # SỬA  calculateOrderTotals(lines, method, discount = 0) → + discount
│   │   ├── checkout-schema.ts (+ .test.ts) # SỬA  orderItemsSchema, placeOrderSchema + couponCode, validateCouponSchema
│   │   └── components/
│   │       ├── checkout-form.tsx (+ .test.tsx)  # SỬA  state appliedCoupon, gọi validate, gửi couponCode, xử lý 422 COUPON_*
│   │       └── checkout-summary.tsx        # SỬA  nhận discount/couponCode, dòng giảm giá
│   └── orders/
│       ├── types.ts                        # SỬA  Order.couponCode?, Order.discount?
│       ├── order-errors.ts                 # SỬA  3 mã lỗi COUPON_* → 422
│       ├── order-service.ts (+ .test.ts)   # SỬA  dep findCoupon; tra mã + tính lại trong placeOrder
│       └── components/
│           └── order-totals.tsx            # MỚI  khối tổng tiền đơn (có dòng giảm giá), dùng ở trang chi tiết
├── app/
│   ├── api/coupons/validate/
│   │   ├── route.ts                        # MỚI  POST, mỏng
│   │   └── route.test.ts                   # MỚI
│   ├── api/orders/route.test.ts            # SỬA  thêm ca couponCode / gian lận / mã lỗi
│   └── orders/[id]/page.tsx                # SỬA  dùng OrderTotals
e2e/
└── shopping-flow.spec.ts                   # SỬA  thêm kịch bản dùng mã SHOPLITE10 (giữ test cũ)
AGENTS.md                                   # SỬA  codemap: feature coupons, luồng mã, lỗi mới
```

**Structure Decision**: Giữ cấu trúc một project Next.js feature-based hiện có. Feature mới
`coupons` theo cùng khuôn với `catalog` (dữ liệu ở `src/data/`, service đọc dữ liệu trong feature).
`checkout` và `orders` chỉ được mở rộng ở các điểm tích hợp; không đổi `order-repository.ts`
(đọc/ghi JSON nguyên dạng nên trường mới tự được lưu).

### Thứ tự hiện thực (để `/speckit-tasks` chia nhỏ)

1. **Quy tắc thuần** — test trước: `coupon-rules.test.ts`, `coupon-schema.test.ts`, kiểm dữ liệu
   `coupons.ts` → hiện thực `types.ts`, `coupon-rules.ts`, `coupon-schema.ts`, `data/coupons.ts`.
2. **Tổng tiền** — sửa `pricing.test.ts` (thêm `discount`, kẹp, phí ship theo subtotal trước giảm)
   → sửa `calculateOrderTotals`.
3. **Server** — test `coupon-service.test.ts`, `order-service.test.ts` (mã hợp lệ/hết hạn/tối thiểu/
   không tồn tại, bỏ qua tiền client gửi, tồn kho kiểm trước mã, `now` biên), route test
   validate + orders → hiện thực `order-errors.ts`, `coupon-service.ts`, `order-service.ts`,
   `checkout-schema.ts`, `types.ts`, route `api/coupons/validate`.
4. **Client** — test `deriveCouponStatus` (đã ở bước 1), `coupon-field.test.tsx`,
   `checkout-form.test.tsx` (áp/gỡ/thay mã, Enter không submit, 422 COUPON_EXPIRED → khóa lỗi) →
   hiện thực `coupon-field.tsx`, `checkout-summary.tsx`, `checkout-form.tsx`.
5. **Chi tiết đơn** — `order-totals.tsx` + trang `orders/[id]`; đơn cũ không có dòng giảm giá.
6. **E2E + tài liệu** — kịch bản mới trong `e2e/shopping-flow.spec.ts`, cập nhật `AGENTS.md`; `npm run format`,
   `npm run check`, `npm run test:e2e`.

### Rủi ro & lưu ý

- **Lộ mã qua bundle**: chỉ `coupon-service.ts` được import `src/data/coupons.ts`. Không có
  `server-only` (không thêm dependency) → ghi quy tắc vào AGENTS.md mục 7 và kiểm khi review.
- **Ô mã trong `<form>`**: Enter phải không submit đơn (R8); có test riêng.
- **Test hiện có đổi**: `pricing.test.ts` dùng `toEqual({ subtotal, shippingFee, total })` → cập nhật
  thêm `discount: 0`. Các test khác dùng `toMatchObject` nên không ảnh hưởng.
- **Dò mã**: không rate-limit (ngoài phạm vi, R11).

## Complexity Tracking

Không có vi phạm Constitution — không cần mục này.

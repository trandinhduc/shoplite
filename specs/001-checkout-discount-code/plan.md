# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `daopta` (thư mục feature `001-checkout-discount-code`) | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-checkout-discount-code/spec.md`

## Summary

Khách nhập mã ở trang thanh toán, thấy ngay số tiền giảm, phí ship và tổng mới. Khi đặt hàng, server tự kiểm tra và tính lại toàn bộ. Đơn lưu snapshot mã và số tiền giảm.

Cách làm:

- Feature mới `src/features/coupons/` chứa logic thuần `evaluateCoupon`, dùng chung client/server giống `pricing.ts`.
- Dữ liệu mã tĩnh ở `src/data/coupons.ts`.
- Endpoint mới `POST /api/coupons/validate` chỉ trả định nghĩa của mã được hỏi, nên không lộ danh sách mã.
- `calculateOrderTotals` nhận thêm `discount` và tính phí ship trên tạm tính sau giảm (Q3 = B).
- `POST /api/orders` nhận `couponCode`, không nhận số tiền.
- `Order` thêm `discount?` / `coupon?` optional để đơn cũ vẫn đọc được.

Chi tiết quyết định ở [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js >= 22.12

**Primary Dependencies**: Next.js 16.4 (App Router), React 19.3, Zod 4, Tailwind v4, lucide-react. **Không thêm dependency.**

**Storage**: Mã giảm giá là mảng tĩnh `src/data/coupons.ts`. Đơn hàng vẫn là file JSON `ORDERS_FILE` qua `OrderRepository` (không đổi interface). Mã đã áp dụng ở trang thanh toán là state React; **chỉ chuỗi mã** được lưu ở `sessionStorage["shoplite:coupon"]` để giữ trong phiên (Q4), không lưu tiền. Khi mount, mã được kiểm tra lại qua `/api/coupons/validate`.

**Testing**: Vitest 5 (jsdom mặc định; `// @vitest-environment node` cho route test), Testing Library, Playwright (`e2e/shopping-flow.spec.ts`).

**Target Platform**: Web app Next.js (server Node + trình duyệt hiện đại).

**Project Type**: Web application một khối (Next.js full-stack, feature-based).

**Performance Goals**: Áp mã → thấy tổng mới ≤ 1 giây (SC-001): một lần gọi API tra mảng tĩnh, tính lại khi giỏ đổi chạy ở client không cần mạng.

**Constraints**: Server là nguồn sự thật về tiền; request chỉ chứa ID, số lượng, mã. Text tiếng Việt, tiền qua `formatCurrency`, label và `aria-invalid` cho ô nhập. Đơn cũ không có trường giảm giá phải hiển thị đúng.

**Scale/Scope**: 3 mã ban đầu, quy mô bài lab. Khoảng 15 file mới (9 nguồn + 6 test) và 11 file sửa (xem Project Structure).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Nguyên tắc                               | Đánh giá                | Ghi chú                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **I. Kiến trúc theo tính năng**          | ✅ PASS                 | Logic, component, test trong `src/features/coupons/`. Route `app/api/coupons/validate/route.ts` mỏng: parse → gọi coupons → trả JSON. Quy tắc ship vẫn ở `pricing.ts`; coupons không chép lại. `orders/server.ts` chỉ import từ `app/**`. `coupon-catalog.ts` (đọc `src/data/coupons.ts`) chỉ được import từ server (route, `order-service`), **không** từ file `"use client"`.                                                                                                                                                      |
| **II. Test trước (NON-NEGOTIABLE)**      | ✅ PASS (theo kế hoạch) | Tasks sẽ viết test đỏ trước cho: `evaluateCoupon` (biên ngưỡng dưới/bằng/trên, mức tối đa dưới/bằng/trên, hết hạn trước/đúng/sau 23:59:59.999 VN, làm tròn, discount ≤ subtotal), `calculateOrderTotals` có discount (ship 470.000 → 30.000; 500.000 → 0), `placeOrder` (3 lỗi coupon, bỏ qua tiền client gửi). Không xóa hoặc làm yếu test hiện có; test `calculateOrderTotals` cũ vẫn pass vì `discount = 0` mặc định. E2E phải pass.                                                                                              |
| **III. Server là nguồn sự thật về tiền** | ✅ PASS                 | `placeOrderSchema` chỉ thêm `couponCode` (string), không có trường tiền. Server tính `subtotal` từ catalog, `discount` từ `evaluateCoupon` với `now()` của server, ship và tổng từ `pricing.ts`. Endpoint validate và payload dùng Zod. Hằng số mã ở `src/data/coupons.ts`, không hardcode trong component.                                                                                                                                                                                                                          |
| **IV. Đơn giản trước**                   | ✅ PASS                 | Không dependency, không DB, không abstraction mới ngoài một feature folder. `OrderRepository` giữ nguyên. Một endpoint mới có lý do ở research R1 (không lộ danh sách mã, dùng giờ server); phương án nhỏ hơn (import data vào client) đã cân nhắc và loại. `sessionStorage` chỉ lưu chuỗi mã vì Q4 đã chốt "giữ trong phiên" — nhu cầu có thật để FR-006 dùng được trong luồng thường. `couponOrderError` đặt trong `order-errors.ts` để route validate và `order-service` dùng chung một cách chuyển lỗi, không tạo class lỗi mới. |
| **V. Tiếng Việt và dễ tiếp cận**         | ✅ PASS                 | Ô "Mã giảm giá" có `<label>`, `aria-invalid`, thông báo `role="alert"` cạnh ô; mọi số tiền qua `formatCurrency`; nút có focus state (dùng `Button` sẵn có).                                                                                                                                                                                                                                                                                                                                                                          |
| Quy trình: tài liệu                      | ⚠️ Phải làm             | Đổi contract API và quy tắc phí ship → cập nhật `AGENTS.md` (mục 3 codemap, mục 5 quy tắc nghiệp vụ: ngưỡng miễn ship xét trên tạm tính sau giảm) và `README.md` trong cùng PR.                                                                                                                                                                                                                                                                                                                                                      |
| Quy trình: nhánh                         | ⚠️ Lưu ý                | Đang ở nhánh `daopta`; constitution khuyến nghị `feature/<mô-tả>`. Không chặn plan.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

**Kết quả gate**: PASS, không có vi phạm cần justify. Re-check sau Phase 1: vẫn PASS (data model và contracts không thêm trường tiền vào input, không đổi interface repository).

## Rủi ro / điểm còn mở

1. **Q4 đã chốt: giữ mã trong phiên.** `CheckoutForm` lưu chuỗi mã ở `sessionStorage["shoplite:coupon"]` (bọc try/catch); khi mount gọi lại `/api/coupons/validate`. Nhờ vậy trạng thái _tạm ngưng_ (Q2 = A) xảy ra trong luồng thường: khách về giỏ giảm số lượng rồi quay lại thanh toán. Client **không** kiểm tra hạn dùng bằng đồng hồ máy khách (`evaluateCouponThreshold`); hạn dùng chỉ kiểm tra ở server.
2. **Thay đổi quy tắc ship (Q3 = B)** làm lệch dòng "Miễn phí giao hàng cho đơn từ 500.000 ₫" ở trang chủ và footer với trường hợp có mã. Text vẫn đúng về mặt "đơn" nhưng có thể gây hiểu nhầm; không đổi trong phạm vi này, ghi vào README.
3. **Đơn cũ**: `discount`/`coupon` optional; page dùng `?? 0`. Có test với đơn seed không có hai trường này.

## Project Structure

### Documentation (this feature)

```text
specs/001-checkout-discount-code/
├── spec.md
├── plan.md              # File này
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── api-coupons-validate.md
│   ├── api-orders.md
│   └── ui-checkout-coupon.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                          # MỚI: SHOPLITE10, GIAM50K, TET2026 (CouponDefinition[])
├── features/
│   ├── coupons/                            # MỚI
│   │   ├── types.ts                        # CouponDefinition, CouponEvaluation, CouponErrorReason,
│   │   │                                   # CouponAvailability, CouponThresholdResult, CouponEvaluationFailure
│   │   ├── coupon-service.ts               # thuần: normalizeCouponCode, couponExpiryInstant, isCouponExpired,
│   │   │                                   #        calculateCouponDiscount, checkCouponAvailability,
│   │   │                                   #        evaluateCouponThreshold, evaluateCoupon, couponErrorMessage
│   │   ├── coupon-service.test.ts          # biên ngưỡng / mức tối đa / hết hạn / làm tròn / chuẩn hóa
│   │   ├── coupon-catalog.ts               # findCoupon(code) đọc src/data/coupons.ts — chỉ import từ server
│   │   ├── coupon-catalog.test.ts          # MỚI: findCoupon + toàn vẹn dữ liệu COUPONS
│   │   ├── coupon-schema.ts                # validateCouponSchema (Zod)
│   │   ├── coupon-schema.test.ts           # MỚI: validateCouponSchema
│   │   └── components/
│   │       ├── coupon-field.tsx            # "use client": ô mã, Áp dụng, Gỡ mã, thông báo
│   │       └── coupon-field.test.tsx
│   ├── checkout/
│   │   ├── pricing.ts                      # SỬA: calculateOrderTotals(lines, method, discount = 0) → + discount
│   │   ├── pricing.test.ts                 # SỬA: thêm test ship trên tạm tính sau giảm
│   │   ├── checkout-schema.ts              # SỬA: placeOrderSchema + couponCode optional
│   │   ├── checkout-schema.test.ts         # SỬA: couponCode trim/rỗng; vẫn loại bỏ trường tiền
│   │   └── components/
│   │       ├── checkout-form.tsx           # SỬA: state appliedCoupon, gọi /api/coupons/validate,
│   │       │                               #       gửi couponCode, xử lý lỗi COUPON_*, ship theo subtotal − discount,
│   │       │                               #       giữ chuỗi mã trong sessionStorage["shoplite:coupon"]
│   │       ├── checkout-form.test.tsx      # SỬA: áp/gỡ mã, lỗi, tạm ngưng, lỗi COUPON_* khi đặt, khôi phục mã
│   │       ├── checkout-summary.tsx        # SỬA: props discount, couponCode; dòng "Giảm giá (MÃ)"
│   │       └── checkout-summary.test.tsx   # MỚI: dòng giảm giá, ship sau giảm
│   └── orders/
│       ├── types.ts                        # SỬA: Order.discount?, Order.coupon?
│       ├── order-errors.ts                 # SỬA: 3 mã COUPON_* → 422 + couponOrderError(failure, code)
│       ├── order-errors.test.ts            # MỚI
│       ├── order-repository.test.ts        # SỬA: round-trip discount/coupon, đơn cũ
│       ├── order-service.ts                # SỬA: inject findCoupon; evaluate; lưu snapshot
│       └── order-service.test.ts           # SỬA: test coupon + bỏ qua tiền client
└── app/
    ├── api/
    │   ├── coupons/validate/route.ts       # MỚI: POST, mỏng
    │   ├── coupons/validate/route.test.ts  # MỚI (// @vitest-environment node)
    │   └── orders/route.test.ts            # SỬA: contract couponCode + lỗi mới
    └── orders/[id]/
        ├── page.tsx                        # SỬA: dòng "Giảm giá (MÃ)" khi có order.coupon
        └── page.test.tsx                   # MỚI: dòng giảm giá, đơn không mã, đơn cũ, snapshot

e2e/shopping-flow.spec.ts                   # SỬA: thêm kịch bản đặt hàng với SHOPLITE10
AGENTS.md, README.md                        # SỬA: codemap, quy tắc ship, API mới
```

**Structure Decision**: Giữ cấu trúc Next.js full-stack feature-based hiện có. Thêm đúng một feature `coupons` và một file data. `cart-reducer.ts`, `cart-store.ts` và `cart-summary.tsx` **không đổi** vì giỏ hàng không biết về mã; trang giỏ vẫn hiển thị tiến độ miễn ship theo tạm tính gốc.

Thứ tự triển khai gợi ý (để `/speckit-tasks` chi tiết hóa): coupons thuần (test đỏ → xanh) → `pricing.ts` → `order-errors` + `checkout-schema` + `order-service` → route validate + route orders → `CouponField` + `CheckoutSummary` + `CheckoutForm` → trang chi tiết đơn → E2E → tài liệu.

## Complexity Tracking

Không có vi phạm constitution cần justify.

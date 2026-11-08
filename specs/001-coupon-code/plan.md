# Implementation Plan: Mã giảm giá khi thanh toán (Coupon Code)

**Branch**: `binhna/lab2-speckit` | **Date**: 2026-11-08 | **Spec**: [specs/001-coupon-code/spec.md](spec.md)

**Input**: Feature specification from `/specs/001-coupon-code/spec.md` và định hướng kỹ thuật từ người dùng.

## Summary

Tính năng mã giảm giá (Coupon Code) cho phép người mua nhập mã khuyến mãi tại trang thanh toán (`/checkout`), xem trước số tiền được giảm theo thời gian thực (giảm theo % kèm giới hạn tối đa hoặc giảm tiền cố định), và hoàn tất đơn hàng với số tiền ưu đãi được lưu trữ minh bạch. Phía máy chủ độc lập kiểm tra và tính toán lại toàn bộ tiền giảm giá từ dữ liệu gốc, đảm bảo chống gian lận tuyệt đối (Server-Authoritative Pricing). Danh sách mã được lưu dưới dạng dữ liệu tĩnh (`src/data/coupons.ts`), logic nghiệp vụ thuần đặt trong `src/features/coupons/`, tích hợp trực tiếp vào quy tắc tính tiền dùng chung `src/features/checkout/pricing.ts` và luồng tạo đơn `src/features/orders/order-service.ts`. Đơn hàng cũ không chứa trường giảm giá vẫn hiển thị bình thường.

## Technical Context

- **Language/Version**: TypeScript 5.9 (chế độ `strict: true`), Node.js 22.12+.
- **Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Zod 4. (Tuyệt đối không thêm dependency ngoài).
- **Storage**: Dữ liệu mã tĩnh tại `src/data/coupons.ts`. Đơn hàng lưu tại `storage/orders.json` (JSON file repository hiện có).
- **Testing**: Vitest 5 + React Testing Library cho Unit/Component Test; Playwright 1.64 cho E2E testing.
- **Target Platform**: Web (Desktop & Mobile responsive 390px, trình duyệt hiện đại).
- **Project Type**: Next.js 16 Fullstack Web Application.
- **Performance Goals**: Phản hồi kiểm tra mã giảm giá < 300ms; tính toán giá tức thì ở phía client (< 10ms); thời gian tạo đơn hàng trên server < 200ms.
- **Constraints**: Không sửa `package-lock.json`; không dùng database ngoài; server là nguồn sự thật duy nhất về giá tiền; toàn bộ text tiếng Việt và định dạng tiền qua `formatCurrency`.
- **Scale/Scope**: 1 module feature mới (`src/features/coupons/`), cập nhật 2 feature hiện hữu (`checkout`, `orders`), 1 API endpoint kiểm tra mã (`POST /api/coupons/validate`), mở rộng API tạo đơn (`POST /api/orders`).

## Constitution Check

*GATE: Phải vượt qua trước Phase 0 Research và tái thẩm định sau Phase 1 Design.*

1. **I. Kiến trúc theo tính năng (Feature-Driven Architecture)**:
   - ✅ **PASS**: Toàn bộ logic thuần của mã giảm giá (tra cứu, chuẩn hóa, kiểm tra hợp lệ, tính tiền giảm) được đóng gói độc lập trong `src/features/coupons/`. Route handlers tại `src/app/api/` chỉ đóng vai trò route mỏng tiếp nhận request và chuyển giao cho feature.
2. **II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)**:
   - ✅ **PASS**: Các hàm thuần tính giảm giá, kiểm tra ngưỡng tối thiểu, hạn sử dụng và trường hợp biên (dưới/bằng/trên ngưỡng, giảm vượt quá tiền hàng) được thiết kế test-first trong `src/features/coupons/coupon-service.test.ts` và `pricing.test.ts`. `npm run check` bắt buộc đạt 100%.
3. **III. Server là nguồn sự thật về tiền (Server-Authoritative Pricing)**:
   - ✅ **PASS**: Phía client chỉ gửi `couponCode`. Server tự động tra cứu mã gốc từ `src/data/coupons.ts`, tính toán lại toàn bộ tiền giảm giá và tổng tiền đơn hàng; từ chối đơn hàng nếu mã không hợp lệ hoặc đã hết hạn tại thời điểm bấm đặt hàng.
4. **IV. Đơn giản trước (Simplicity & YAGNI First)**:
   - ✅ **PASS**: Sử dụng danh mục mã tĩnh `src/data/coupons.ts` (giống `products.ts`), không cài thêm thư viện hay tạo database ngoài.
5. **V. Trải nghiệm tiếng Việt và dễ tiếp cận (Vietnamese Localization & Accessibility)**:
   - ✅ **PASS**: Toàn bộ thông báo lỗi và trạng thái hiển thị bằng tiếng Việt; định dạng tiền tệ qua `formatCurrency`; form nhập mã có `<label>` và `aria-invalid` đầy đủ.

## Project Structure

### Documentation (this feature)

```text
specs/001-coupon-code/
├── plan.md              # Kế hoạch triển khai kỹ thuật
├── research.md          # Quyết định kỹ thuật & lý do (Phase 0)
├── data-model.md        # Thực thể dữ liệu & quy tắc validate (Phase 1)
├── quickstart.md        # Kịch bản kiểm thử thủ công từng User Story (Phase 1)
├── contracts/           # Đặc tả hợp đồng API (Phase 1)
│   ├── coupons-validate.md # POST /api/coupons/validate
│   └── orders-post.md      # POST /api/orders (mở rộng nhận couponCode)
└── checklists/          # Checklists thẩm định chất lượng
    ├── requirements.md  # Checklist yêu cầu nghiệp vụ
    └── security.md      # Checklist an toàn & chống gian lận
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                      # [TẠO MỚI] Danh mục mã giảm giá mẫu tĩnh (SHOPLITE10, GIAM50K, TET2026)
├── features/
│   ├── coupons/                        # [TẠO MỚI] Feature module mã giảm giá
│   │   ├── types.ts                    # Entity Coupon, AppliedCoupon, CouponErrorCode
│   │   ├── coupon-service.ts           # Logic thuần: validateCoupon, calculateDiscount, normalizeCouponCode
│   │   ├── coupon-service.test.ts      # Unit tests kiểm tra mọi quy tắc và giá trị biên
│   │   └── components/
│   │       ├── coupon-input.tsx        # UI component nhập mã, hiển thị lỗi và nút gỡ bỏ
│   │       └── coupon-input.test.tsx   # Component test cho CouponInput
│   ├── checkout/
│   │   ├── pricing.ts                  # [CẬP NHẬT] Tích hợp coupon vào calculateOrderTotals
│   │   ├── pricing.test.ts             # [CẬP NHẬT] Test bổ sung tính toán đơn có coupon
│   │   ├── checkout-schema.ts          # [CẬP NHẬT] Thêm couponCode vào placeOrderSchema
│   │   └── components/
│   │       ├── checkout-form.tsx       # [CẬP NHẬT] Quản lý state coupon, truyền vào order payload
│   │       └── checkout-summary.tsx    # [CẬP NHẬT] Nhận coupon, hiển thị dòng giảm giá
│   └── orders/
│       ├── types.ts                    # [CẬP NHẬT] Order thêm couponCode?: string, discount?: number
│       ├── order-service.ts            # [CẬP NHẬT] Validate coupon và tính lại tiền trên server
│       ├── order-service.test.ts       # [CẬP NHẬT] Test server-side coupon validation & pricing
│       └── components/                 # (Giữ nguyên)
├── app/
│   ├── api/
│   │   ├── coupons/
│   │   │   └── validate/
│   │   │       └── route.ts            # [TẠO MỚI] Route mỏng kiểm tra mã trước khi đặt hàng
│   │   │       └── route.test.ts       # [TẠO MỚI] Test API handler POST /api/coupons/validate
│   │   └── orders/
│   │       └── route.ts                # (Giữ nguyên API route)
│   └── orders/
│       └── [id]/
│           └── page.tsx                # [CẬP NHẬT] Hiển thị dòng giảm giá (tương thích đơn cũ)
```

**Structure Decision**: Cấu trúc tuân thủ nghiêm ngặt mô hình Feature-Driven của ShopLite theo `AGENTS.md`. Toàn bộ mã nguồn mới được đặt trong `src/features/coupons/`, dữ liệu mẫu đặt trong `src/data/coupons.ts`, và route handlers tại `src/app/api/` chỉ đóng vai trò route mỏng.

## Complexity Tracking

Không có vi phạm Constitution. Thiết kế tuân thủ 100% nguyên tắc Simplicity & YAGNI First.

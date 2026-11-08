# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `baonv_ai_acbs` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-checkout-discount-codes/spec.md`

## Summary

Thêm feature `coupons` với danh sách mã tĩnh trong `src/data/`, các hàm thuần để
chuẩn hóa/tra mã, kiểm tra điều kiện và tính số tiền giảm. Tích hợp kết quả vào
`src/features/checkout/pricing.ts` để client hiển thị tức thì và server tính lại
khi đặt hàng. Payload đặt hàng chỉ gửi mã; server lấy giá catalog, xác nhận mã,
tính lại giảm giá và tổng tiền, rồi lưu dữ liệu giảm giá optional để tương thích
với các đơn cũ.

Không thêm dependency, database hoặc endpoint kiểm tra mã riêng.

## Technical Context

**Language/Version**: TypeScript strict trên Node.js 22.12+.

**Primary Dependencies**: Next.js 16 App Router, React 19, Zod 4, Tailwind CSS
v4, Vitest + Testing Library và Playwright; dùng các dependency hiện có.

**Storage**: Dữ liệu mã tĩnh trong `src/data/coupons.ts`; đơn hàng tiếp tục lưu
trong file JSON runtime hiện có. Trường giảm giá của `Order` là optional để đọc
được đơn cũ không có các trường này.

**Testing**: Vitest cho logic/schema/service và Testing Library cho checkout/order
UI; Playwright cho luồng thanh toán end-to-end khi có bộ E2E phù hợp.

**Target Platform**: Web ShopLite chạy trên Next.js App Router, desktop và mobile
390px.

**Project Type**: Web application full-stack với route handlers và Server/Client
Components trong cùng repository.

**Performance Goals**: Ít nhất 95% lượt áp dụng mã hợp lệ phải hiển thị số tiền
giảm và tổng tiền mới trong vòng 1 giây sau thao tác "Áp dụng"; việc preview
không tạo thêm network round-trip.

**Constraints**: Server là nguồn sự thật; chỉ nhận coupon code từ client, không
nhận discount amount hoặc total. Mã dùng múi giờ `Asia/Ho_Chi_Minh`, hết hạn
cuối ngày hết hạn. Không thêm dependency/database; mọi UI text bằng tiếng Việt.

**Scale/Scope**: Ba mã khuyến mãi tĩnh ban đầu, tối đa một mã trên đơn; không có
quản trị mã, giới hạn lượt dùng hoặc mã theo khách hàng.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Kiến trúc theo tính năng**: PASS — logic nằm trong `src/features/coupons/`,
  pricing/checkout/orders được mở rộng tại feature tương ứng; route chỉ điều phối.
- **Test trước cho nghiệp vụ**: PASS — plan yêu cầu test biên cho tra mã, ngày hết
  hạn, ngưỡng tối thiểu, phần trăm tối đa, tổng tiền và dữ liệu cũ; `npm run check`
  là quality gate.
- **Server là nguồn sự thật về tiền**: PASS — server bỏ qua mọi số tiền client,
  lấy lại catalog và tính coupon/tổng tiền từ dữ liệu đáng tin cậy; payload dùng
  Zod.
- **Đơn giản trước**: PASS — dùng stack và file JSON hiện tại, không dependency,
  database hoặc endpoint mới ngoài POST orders.
- **Tiếng Việt và dễ tiếp cận**: PASS — form có label/lỗi theo trường, tóm tắt
  dùng `formatCurrency()`, thông báo mã bằng tiếng Việt và kiểm thử role/label.
- **Ràng buộc kỹ thuật**: PASS — giữ giới hạn giỏ hàng, phí ship, API error shape,
  tương thích đơn cũ và không sửa dữ liệu runtime hiện có.

**Gate status**: PASS — không có ngoại lệ cần Complexity Tracking.

## Phase 0: Outline & Research

Research đã giải quyết các điểm thiết kế cần quyết định:

- Danh sách mã là dữ liệu tĩnh, vì phạm vi không có quản trị/lượt dùng và project
  đã dùng dữ liệu tĩnh cho catalog.
- Client dùng cùng hàm thuần để phản hồi tức thì; server gọi lại cùng logic sau
  khi dựng order lines từ catalog. Không tạo API preview coupon riêng.
- Mã được chuẩn hóa bỏ khoảng trắng đầu/cuối và không phân biệt hoa thường.
- Ngày hết hạn lưu dạng ngày lịch `YYYY-MM-DD`, so sánh theo
  `Asia/Ho_Chi_Minh`; ngày hết hạn là ngày cuối cùng còn hiệu lực.
- Giảm giá tính trên subtotal hàng hóa trước phí ship; tổng cuối là subtotal trừ
  discount amount cộng shipping fee, không âm.
- Trường giảm giá trong đơn là optional để dữ liệu cũ đọc được mà không migration.

Chi tiết quyết định và phương án thay thế nằm trong [research.md](./research.md).

## Phase 1: Design & Contracts

### Data model

`Coupon`, `CouponEvaluation`, `OrderTotals` mở rộng và các trường optional của
`Order` được mô tả trong [data-model.md](./data-model.md).

### Contracts

Hợp đồng POST orders, lỗi coupon và hình dạng response được mô tả trong
[contracts/orders.md](./contracts/orders.md). Không tạo endpoint mới.

### Validation guide

Các kịch bản unit/component/API/E2E và kiểm tra tương thích đơn cũ nằm trong
[quickstart.md](./quickstart.md). Chỉ tiêu 95%/1 giây được nghiệm thu bằng một
đo lường lặp lại trong E2E, không chỉ bằng kiểm tra thủ công một lượt.

## Project Structure

### Documentation (this feature)

```text
specs/001-checkout-discount-codes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── orders.md
└── tasks.md                 # tạo bởi $speckit-tasks
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                         # ba mã tĩnh ban đầu
├── features/
│   ├── coupons/
│   │   ├── coupon-service.ts              # lookup, validate, calculate discount
│   │   ├── coupon-service.test.ts
│   │   └── types.ts
│   ├── checkout/
│   │   ├── pricing.ts                      # totals có discount
│   │   ├── pricing.test.ts
│   │   ├── checkout-schema.ts              # couponCode optional
│   │   ├── checkout-schema.test.ts
│   │   └── components/
│   │       ├── checkout-form.tsx           # apply/remove + submit coupon code
│   │       ├── checkout-form.test.tsx
│   │       ├── checkout-summary.tsx         # dòng giảm giá
│   │       └── checkout-summary.test.tsx
│   └── orders/
│       ├── types.ts                        # discount fields optional
│       ├── order-service.ts                # server revalidation
│       ├── order-service.test.ts
│       └── components/order-discount-row.tsx # nếu cần tách UI dùng chung
├── app/
│   ├── api/orders/route.ts                 # route mỏng, giữ POST contract
│   └── orders/[id]/page.tsx                # hiển thị discount có điều kiện
└── data/products.ts
```

**Structure Decision**: Chọn cấu trúc web app hiện có, đặt logic theo feature và
giữ `src/app/` mỏng. `src/data/coupons.ts` chỉ chứa dữ liệu; không đưa nghiệp vụ
coupon vào route hoặc component. Test đặt cạnh file nguồn theo quy ước repository.

## Phase 1 Constitution Re-check

- **Feature architecture**: PASS — mọi logic mới thuộc `coupons`, pricing,
  checkout hoặc orders; route không chứa nghiệp vụ.
- **Test-first**: PASS — design chỉ rõ test thuần, API, component và E2E; bao phủ
  biên 0/đúng ngưỡng/vượt cap/hết hạn và legacy order.
- **Server truth/Zod**: PASS — `couponCode` là input duy nhất liên quan coupon;
  discount và total do server dựng lại sau validation.
- **Simplicity**: PASS — không dependency/database/endpoint mới.
- **Vietnamese/accessibility**: PASS — UI có label, thông báo theo trường,
  `formatCurrency()` và kiểm thử accessible queries.

**Post-design gate status**: PASS.

## Complexity Tracking

Không có vi phạm constitution cần biện minh.

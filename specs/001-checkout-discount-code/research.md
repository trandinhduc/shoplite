# Research: Mã giảm giá khi thanh toán

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-11-08

Không có mục `NEEDS CLARIFICATION` nào trong Technical Context. Stack đã cố định (Next.js 16, TS strict, Zod 4, Tailwind v4, Vitest, Playwright), không thêm dependency hay database. Các quyết định dưới đây đều là quyết định thiết kế trong phạm vi stack đó.

---

## R1. Client kiểm tra mã bằng cách nào?

**Decision**: Thêm endpoint `POST /api/coupons/validate` nhận `{ code }`. Endpoint tra mã và kiểm tra hạn dùng theo đồng hồ server. Nếu mã còn dùng được, endpoint trả về **định nghĩa của đúng mã đó** (loại, giá trị, mức tối đa, đơn tối thiểu). Từ đó client tự tính số tiền giảm và kiểm tra ngưỡng bằng cùng hàm thuần `evaluateCoupon` mà server dùng.

**Rationale**:

- Toàn bộ danh sách mã không bị đóng gói vào bundle trình duyệt. Nếu import thẳng `src/data/coupons.ts` vào client component, ai cũng xem được mọi mã.
- Hạn dùng được kiểm tra bằng giờ server, giống lúc đặt hàng. Đồng hồ máy khách sai giờ cũng không gây khác biệt.
- Client đã có định nghĩa mã nên tính lại được ngay mỗi khi tạm tính đổi (FR-006: tạm ngưng / tự có hiệu lực lại) mà không phải gọi lại API.
- Giống `pricing.ts` hiện nay: một hàm thuần dùng chung cho client và server, và server luôn tính lại.

**Alternatives considered**:

- _Import dữ liệu mã vào client_: không cần API, nhưng lộ toàn bộ mã và dùng giờ máy khách. Loại.
- _Endpoint nhận `{ code, items }` và trả về số tiền giảm_: server tính cả ngưỡng. Nhưng mỗi lần đổi số lượng trong giỏ phải gọi lại API (debounce, trạng thái loading), phức tạp hơn mà không an toàn hơn vì server vẫn tính lại khi đặt hàng. Loại.
- _Server Action_: dự án chưa dùng Server Action; route handler + Zod đúng với quy ước hiện có. Loại.

## R2. Đặt logic mã giảm giá ở đâu, tích hợp `pricing.ts` thế nào?

**Decision**:

- Feature mới `src/features/coupons/` chứa logic thuần: `normalizeCouponCode`, `findCoupon`, `isCouponExpired`, `calculateCouponDiscount`, `evaluateCoupon`.
- `pricing.ts` **không** import coupons. `calculateOrderTotals(lines, method, discount = 0)` nhận thêm số tiền giảm (mặc định 0), trả về thêm `discount`, và tính phí ship trên `subtotal − discount` (FR-012, Q3 = B).
- `order-service.ts` ghép hai phần: tính subtotal → `evaluateCoupon` → `calculateOrderTotals(..., discount)`.

**Rationale**: Mỗi quy tắc chỉ định nghĩa một lần (Nguyên tắc I). Hướng phụ thuộc một chiều `orders → coupons`, `orders → checkout/pricing`, `checkout/components → coupons`, nên không có vòng import. Tham số mặc định `discount = 0` giữ nguyên hành vi của mọi chỗ đang gọi (`checkout-summary`, test hiện có).

**Alternatives considered**: Cho `pricing.ts` import coupons và nhận `couponCode` thì trộn tra dữ liệu vào hàm tính tiền thuần, và pricing phụ thuộc vào data. Loại.

## R3. Biểu diễn ngày hết hạn

**Decision**: Dữ liệu lưu `expiresOn: "2026-02-28"` (ngày, đúng cách nghiệp vụ mô tả). Helper `couponExpiryInstant(expiresOn)` = `new Date(\`${expiresOn}T23:59:59.999+07:00\`)`. Mã hết hạn khi `now > expiryInstant`. Hàm nhận `now: Date` làm tham số để test cố định thời gian.

**Rationale**: Đúng FR-011 (hết ngày theo giờ Việt Nam) mà không cần `dayjs` timezone plugin. Offset `+07:00` cố định vì Việt Nam không dùng giờ mùa hè.

**Alternatives**: Lưu ISO instant (`2026-02-28T16:59:59.999Z`) thì khó đọc và dễ nhập sai. Dùng `dayjs/plugin/timezone` là phức tạp không cần thiết.

## R4. Mã lỗi và cách trả lỗi

**Decision**:

- `evaluateCoupon` **không throw**. Nó trả về discriminated union: `{ ok: true, coupon, discount }` hoặc `{ ok: false, reason: "COUPON_NOT_FOUND" | "COUPON_EXPIRED" | "COUPON_MIN_SUBTOTAL_NOT_MET", minSubtotal?, shortfall? }`, kèm `couponErrorMessage(result)` sinh thông báo tiếng Việt (FR-013).
- Thêm 3 mã vào `OrderErrorCode` / `HTTP_STATUS_BY_CODE`, tất cả **422**. `order-service` chuyển kết quả lỗi thành `OrderError`. `details` có `{ couponCode, minSubtotal, shortfall }` dạng chuỗi số, vì `details` là `Record<string, string>`.
- Route `/api/coupons/validate` cũng throw `OrderError` để dùng chung `handleRouteError` và chung shape `{ error: { code, message, details } }`.

**Rationale**: Client chỉ cần một cách đọc lỗi (`ApiErrorBody`). Lỗi coupon bắt đầu bằng `COUPON_` nên form nhận ra và hiển thị cạnh ô mã (FR-018) thay vì ở `submitError`. 422 phân biệt với 409 (xung đột trạng thái/tồn kho) và 400 (payload sai).

**Alternatives**: Tạo class `CouponError` riêng thì phải sửa `handleRouteError`, thêm một kiểu lỗi nữa mà không có lợi ích rõ. Loại. Trả 200 `{ valid: false }` cho validate thì lệch với quy ước lỗi hiện có. Loại.

## R5. Lưu giảm giá trong Order, tương thích đơn cũ

**Decision**: `Order` thêm `discount?: number` và `coupon?: { code: string; discount: number }`. Đơn mới luôn có `discount` (0 nếu không dùng mã). `coupon` chỉ có khi dùng mã. Code đọc đơn dùng `order.discount ?? 0` và `order.coupon` (optional).

**Rationale**: `storage/orders.json` hiện có đơn không có hai trường này. Để optional thì không cần migration, `OrderRepository` giữ nguyên interface (Nguyên tắc IV), và `total` của đơn cũ vẫn đúng vì nó đã lưu sẵn. Gom `code` + `discount` vào một object `coupon` tránh trạng thái nửa vời (có code mà không có tiền).

**Alternatives**: Bắt buộc các trường và viết migration cho file JSON là thừa với phạm vi dự án. Chỉ lưu `couponCode` rồi tính lại khi xem thì vi phạm snapshot (FR-019). Loại.

## R6. Trạng thái mã ở trang thanh toán

**Decision**: `CheckoutForm` giữ `appliedCoupon: CouponDefinition | null` bằng `useState`. Mỗi lần render, form gọi `evaluateCoupon(appliedCoupon, subtotal, now)` để ra trạng thái _áp dụng_ hoặc _tạm ngưng_. Không lưu vào `localStorage`.

- Áp mã lúc đơn chưa đạt ngưỡng → **từ chối, không lưu** (US2 kịch bản 3).
- Mã đã lưu mà tạm tính tụt dưới ngưỡng → **giữ, tạm ngưng**, tự có hiệu lực lại khi đủ ngưỡng (Q2 = A).
- Đặt hàng khi tạm ngưng → client chặn và hiện lại thông báo; server vẫn từ chối nếu bị gọi thẳng.
- Server trả lỗi `COUPON_*` khi đặt → hiển thị cạnh ô mã, **không gỡ mã** (Q1 = B).

**Rationale**: Câu hỏi Q4 (giữ mã khi tải lại trang) **chưa được trả lời** trong `/speckit-clarify`. Spec hiện ghi trong Assumptions là "không cần giữ khi tải lại", nên plan theo đó: dùng state cục bộ, đơn giản nhất. Nếu sau này chọn giữ mã, chỉ cần thêm lưu `sessionStorage` cho mã (không lưu tiền) trong `CheckoutForm`, không ảnh hưởng server.

## R7. Thứ tự kiểm tra và làm tròn

**Decision**: Thứ tự kiểm tra là tồn tại → hết hạn → ngưỡng (FR-014). Giảm phần trăm = `Math.min(Math.floor(subtotal * percent / 100), maxDiscount)`. Sau đó `Math.min(discount, subtotal)` (FR-009). `percent` là số nguyên.

**Rationale**: Số nguyên VND, không có số thực trôi. Làm tròn xuống có lợi cho cửa hàng và đúng Assumptions.

## R8. Kiểm thử

**Decision**:

- Unit (jsdom mặc định, logic thuần): `coupon-service.test.ts` (biên ngưỡng 299.999 / 300.000 / 300.001; mức tối đa 999.990 / 1.000.000 / 1.000.010 với SHOPLITE10; hết hạn 23:59:59.999 / 00:00:00 ngày 01/03 giờ VN; làm tròn; discount ≤ subtotal; chuẩn hóa mã). Cập nhật `pricing.test.ts` (ship trên tạm tính sau giảm: 470.000 → 30.000; 500.000 → 0).
- Service: `order-service.test.ts`, inject `now`, kiểm tra giá/giảm client gửi bị bỏ qua, 3 lỗi coupon, snapshot `coupon`.
- Route (`// @vitest-environment node`): `src/app/api/coupons/validate/route.test.ts` mới, cập nhật `src/app/api/orders/route.test.ts`.
- Component: `coupon-field.test.tsx` và cập nhật `checkout-form.test.tsx` (`vi.stubGlobal("fetch")`, `getByRole` / `getByLabelText`).
- E2E: thêm 1 kịch bản vào `e2e/shopping-flow.spec.ts` (áp `SHOPLITE10`, đặt hàng, thấy dòng giảm giá ở chi tiết đơn).

`order-service` cần inject `findCoupon` (mặc định tra `src/data/coupons.ts`) để test không phụ thuộc dữ liệu thật khi cần; `now` đã có sẵn.

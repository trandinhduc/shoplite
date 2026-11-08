# Đặc tả Kỹ thuật: Tính năng Mã Giảm Giá khi Thanh Toán (Discount Codes)

- **Mã tính năng:** `FEAT-COUPON-CHECKOUT`
- **Trạng thái:** Đã phê duyệt (Approved)
- **Ngày cập nhật:** 08/11/2026
- **Tuân thủ:** [Hiến chương Dự án ShopLite v1.0.0](file:///.specify/memory/constitution.md)

### Các quyết định kỹ thuật đã thống nhất:
1. **Ngưỡng miễn phí vận chuyển:** Tính trên Tạm tính gốc (`subtotal` ban đầu trước giảm giá).
2. **Cơ chế xác thực khi áp mã:** Tạo API route `POST /api/promotions/validate` phục vụ UI, và server độc lập xác thực lại 100% trong `orderService.placeOrder`.

---

## 1. Bối cảnh & Mục tiêu (Problem Statement & Goals)

### 1.1 Bối cảnh
Hiện tại, khách hàng của ShopLite chỉ có thể thanh toán theo đúng giá trị giỏ hàng và phí vận chuyển mà không có cơ chế áp dụng ưu đãi khuyến mãi. Bộ phận marketing cần triển khai các chương trình kích cầu nhằm tăng tỷ lệ chốt đơn và nâng cao giá trị trung bình mỗi đơn hàng (AOV).

### 1.2 Mục tiêu
- Cung cấp giao diện trực quan tại trang thanh toán (`/checkout`) để khách hàng nhập và kích hoạt mã giảm giá.
- Hỗ trợ 2 mô hình ưu đãi phổ biến: giảm theo % (kèm trần giảm tối đa) và giảm số tiền cố định.
- Hỗ trợ điều kiện đơn hàng tối thiểu (`minOrderValue`) và hạn sử dụng (`expiresAt`).
- Đảm bảo tính toàn vẹn và chống gian lận (Anti-fraud): Server là nguồn sự thật (Source of Truth), tính toán lại 100% số tiền giảm khi tạo đơn.
- Lưu trữ lịch sử mã và số tiền giảm trên từng đơn hàng, hiển thị minh bạch tại trang chi tiết đơn hàng (`/orders/[id]`).

---

## 2. Danh sách User Stories

1. **US1 (Áp dụng mã hợp lệ):** Là khách hàng đang thanh toán, tôi muốn nhập mã giảm giá và bấm "Áp dụng", để được giảm tiền ngay trong bảng tóm tắt đơn hàng.
2. **US2 (Gỡ mã giảm giá):** Là khách hàng đã áp dụng mã, tôi muốn có nút "Gỡ" mã để không dùng mã đó nữa hoặc đổi sang mã khác.
3. **US3 (Một mã mỗi đơn):** Là hệ thống, tôi chỉ cho phép tối đa 1 mã giảm giá trên một đơn hàng; việc áp mã mới sẽ thay thế mã trước đó.
4. **US4 (Giảm theo phần trăm có trần):** Là khách hàng có mã %, tôi được giảm theo tỷ lệ % của giá trị hàng, nhưng số tiền giảm không vượt quá mức trần tối đa quy định của mã.
5. **US5 (Giảm tiền cố định):** Là khách hàng có mã tiền cố định, tôi được giảm đúng số tiền đó (nhưng không vượt quá tổng tiền hàng để tránh âm tiền).
6. **US6 (Báo lỗi mã không tồn tại):** Là khách hàng nhập mã sai, tôi muốn thấy thông báo "Mã giảm giá không tồn tại" để kiểm tra lại.
7. **US7 (Báo lỗi mã hết hạn):** Là khách hàng nhập mã đã quá hạn, tôi muốn thấy thông báo "Mã giảm giá đã hết hạn sử dụng".
8. **US8 (Báo lỗi chưa đạt đơn tối thiểu):** Là khách hàng nhập mã khi giỏ hàng chưa đủ giá trị, tôi muốn thấy thông báo rõ ràng cần mua thêm bao nhiêu tiền để đủ điều kiện.
9. **US9 (Chống gian lận phía máy chủ):** Là hệ thống, khi nhận yêu cầu đặt hàng, tôi phải tự tra cứu mã, tính lại số tiền giảm và từ chối đơn hàng nếu client gửi mã không hợp lệ.
10. **US10 (Xem lại thông tin giảm giá):** Là khách hàng đã đặt hàng thành công, tôi muốn thấy mã giảm giá đã dùng và số tiền được giảm trong trang chi tiết đơn hàng.

---

## 3. Dữ liệu Khuyến Mãi Ban Đầu (Seed Data)

Lưu tại `src/data/promotions.ts`:

| Mã (Code) | Loại (Type) | Giá trị | Trần giảm tối đa | Đơn tối thiểu | Hạn sử dụng | Mô tả |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SHOPLITE10` | `percentage` | 10% | 100.000 ₫ | 300.000 ₫ | Không thời hạn | Giảm 10%, tối đa 100k cho đơn từ 300k |
| `GIAM50K` | `fixed` | 50.000 ₫ | N/A | 500.000 ₫ | Không thời hạn | Giảm 50k cho đơn từ 500k |
| `TET2026` | `percentage` | 15% | 200.000 ₫ | Không yêu cầu | 28/02/2026 23:59:59 | Giảm 15%, tối đa 200k (Dùng để kiểm thử mã hết hạn) |

---

## 4. Mô hình Dữ liệu & Hợp đồng Giao tiếp (Domain Models & Contracts)

### 4.1 Kiểu dữ liệu `Coupon` (`src/features/checkout/promotions.ts`)

```typescript
export type CouponType = "percentage" | "fixed";

export interface Coupon {
  code: string;
  type: CouponType;
  value: number; // Tỷ lệ % (e.g. 10) hoặc số tiền cố định (e.g. 50_000)
  maxDiscount?: number; // Trần giảm tối đa cho mã percentage (VND)
  minOrderValue?: number; // Giá trị tạm tính tối thiểu (VND)
  expiresAt?: string; // Định dạng ISO 8601 hoặc YYYY-MM-DD
  description?: string;
}

export type CouponValidationErrorCode =
  | "COUPON_NOT_FOUND"
  | "COUPON_EXPIRED"
  | "COUPON_MIN_ORDER_NOT_MET";

export type CouponValidationResult =
  | {
      valid: true;
      coupon: Coupon;
      discountAmount: number;
    }
  | {
      valid: false;
      code: CouponValidationErrorCode;
      message: string;
      amountNeeded?: number;
    };
```

### 4.2 Cập nhật `OrderTotals` (`src/features/checkout/pricing.ts`)

```typescript
export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  shippingFee: number;
  total: number;
}
```

- Công thức tính:
  - `subtotal = calculateSubtotal(lines)`
  - `discountAmount = coupon ? calculateDiscountAmount(coupon, subtotal) : 0`
  - `shippingFee = calculateShippingFee(subtotal, method)` *(Lưu ý: freeship tính trên subtotal gốc của hàng hoá)*
  - `total = Math.max(0, subtotal - discountAmount + shippingFee)`

### 4.3 Cập nhật Schema & Order (`src/features/checkout/checkout-schema.ts` & `src/features/orders/types.ts`)

- `placeOrderSchema`: bổ sung trường `couponCode: z.string().trim().toUpperCase().optional()`.
- `Order`:
  - `couponCode?: string;`
  - `discountAmount: number;` (mặc định 0 nếu không có mã).

### 4.4 API Validation Endpoint (`POST /api/promotions/validate`)

- Request Body:
  ```json
  {
    "code": "SHOPLITE10",
    "subtotal": 450000
  }
  ```
- Response 200 (Thành công):
  ```json
  {
    "valid": true,
    "coupon": {
      "code": "SHOPLITE10",
      "type": "percentage",
      "value": 10,
      "maxDiscount": 100000
    },
    "discountAmount": 45000
  }
  ```
- Response 400/422 (Thất bại):
  ```json
  {
    "valid": false,
    "code": "COUPON_MIN_ORDER_NOT_MET",
    "message": "Đơn hàng tối thiểu 500.000 ₫ để áp dụng mã này (cần mua thêm 150.000 ₫)",
    "amountNeeded": 150000
  }
  ```

---

## 5. Quy tắc Kiểm thử & Biên Nghiệp vụ (Boundary Cases & TDD Matrix)

Tuân thủ **Điều I.2 Hiến chương ShopLite**: Phải viết Unit Test trước khi viết mã nguồn.

### 5.1 Các ca kiểm thử cho `validateCoupon`:
1. **Chuẩn hóa chuỗi:** Nhập ` shoplite10 ` hoặc `Shoplite10` -> tự động nhận diện `SHOPLITE10`.
2. **Mã không tồn tại:** Nhập `KHONGCO` -> lỗi `COUPON_NOT_FOUND` ("Mã giảm giá không tồn tại").
3. **Mã hết hạn:** `TET2026` với thời điểm hiện tại `2026-11-08` -> lỗi `COUPON_EXPIRED` ("Mã giảm giá đã hết hạn sử dụng"). Cho phép inject hàm `now()` để test độc lập thời gian.
4. **Đơn tối thiểu (Dưới ngưỡng):** `SHOPLITE10` với subtotal 299.999 ₫ -> lỗi `COUPON_MIN_ORDER_NOT_MET`, `amountNeeded = 1`.
5. **Đơn tối thiểu (Đúng ngưỡng):** `SHOPLITE10` với subtotal 300.000 ₫ -> hợp lệ, giảm 30.000 ₫.
6. **Mã % dưới trần:** `SHOPLITE10` với subtotal 500.000 ₫ -> giảm 50.000 ₫.
7. **Mã % chạm trần:** `SHOPLITE10` với subtotal 1.000.000 ₫ -> giảm đúng 100.000 ₫ (10% của 1tr = 100k).
8. **Mã % vượt trần:** `SHOPLITE10` với subtotal 2.000.000 ₫ -> giảm 100.000 ₫ (thay vì 200.000 ₫).
9. **Mã cố định:** `GIAM50K` với subtotal 500.000 ₫ -> giảm đúng 50.000 ₫.
10. **Không bao giờ âm:** Mã giảm không được làm `subtotal - discountAmount < 0`.

### 5.2 Các ca kiểm thử cho `orderService.placeOrder`:
1. Không gửi `couponCode` -> đơn hàng có `discountAmount = 0`, `couponCode = undefined`.
2. Gửi `couponCode` hợp lệ (`SHOPLITE10`) -> đơn hàng lưu đúng `couponCode` và `discountAmount`, tổng tiền giảm chính xác.
3. Gửi `couponCode` không hợp lệ / hết hạn / không đủ điều kiện -> Ném `OrderError("INVALID_COUPON", ...)`, không tạo đơn hàng.

---

## 6. Kế hoạch Triển khai (Step-by-Step Implementation Plan)

1. **Bước 1 (Data & Domain Logic - TDD):**
   - Tạo file dữ liệu `src/data/promotions.ts`.
   - Viết test `src/features/checkout/promotions.test.ts` (Red).
   - Viết code `src/features/checkout/promotions.ts` (Green).
2. **Bước 2 (Pricing Engine Integration - TDD):**
   - Bổ sung test trong `src/features/checkout/pricing.test.ts` cho `calculateOrderTotals` khi có mã giảm giá (Red).
   - Cập nhật `src/features/checkout/pricing.ts` (Green).
3. **Bước 3 (Order Service & Schema - TDD):**
   - Cập nhật `checkout-schema.ts` (`placeOrderSchema`) và `orders/types.ts`.
   - Cập nhật `order-errors.ts` (thêm mã lỗi `INVALID_COUPON`).
   - Bổ sung test trong `order-service.test.ts` (Red).
   - Cập nhật `order-service.ts` để kiểm tra coupon phía server (Green).
4. **Bước 4 (API Route):**
   - Tạo `src/app/api/promotions/validate/route.ts` hỗ trợ xác thực mã nhanh từ client.
5. **Bước 5 (UI Checkout & Order Detail):**
   - Nâng cấp `src/features/checkout/components/checkout-summary.tsx`:
     - Ô nhập mã + nút "Áp dụng" + trạng thái loading.
     - Hiển thị badge mã đã áp dụng + nút "Gỡ".
     - Hiển thị thông báo lỗi chi tiết khi mã không hợp lệ.
     - Dòng Giảm giá hiển thị màu xanh lá (`text-emerald-600`).
   - Nâng cấp `src/features/checkout/components/checkout-form.tsx` để truyền `couponCode` khi submit đơn hàng.
   - Nâng cấp `src/app/orders/[id]/page.tsx` hiển thị mã và số tiền đã giảm.
6. **Bước 6 (Kiểm tra chất lượng - DoD):**
   - Chạy `npm run check` (lint + typecheck + test) đảm bảo 100% pass.
   - Chạy `npm run format`.

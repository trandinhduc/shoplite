# Data Model: Mã giảm giá khi thanh toán (Coupon Code)

Tài liệu này định nghĩa chi tiết các thực thể dữ liệu (Data Entities), cấu trúc kiểu dữ liệu TypeScript, lược đồ xác thực Zod, và các quy tắc nghiệp vụ biên cho tính năng mã giảm giá.

---

## 1. Thực thể `Coupon` (Dữ liệu danh mục mã)

Đại diện cho một chương trình mã giảm giá được định nghĩa trong danh mục tĩnh `src/data/coupons.ts`.

### TypeScript Interface (`src/features/coupons/types.ts`)

```typescript
export type CouponType = "percentage" | "fixed";

export interface Coupon {
  /** Mã định danh duy nhất, luôn viết HOA, không dấu, không khoảng trắng (VD: "SHOPLITE10") */
  code: string;
  /** Loại giảm giá: "percentage" (theo %) hoặc "fixed" (số tiền cố định) */
  type: CouponType;
  /** Giá trị ưu đãi: % giảm (ví dụ: 10 nghĩa là 10%) hoặc số tiền VND (ví dụ: 50000) */
  value: number;
  /** Số tiền giảm tối đa (VND) áp dụng cho loại "percentage". null hoặc undefined nếu không giới hạn */
  maxDiscount?: number | null;
  /** Giá trị tạm tính tối thiểu của đơn hàng để được áp dụng mã (VND) */
  minOrderValue: number;
  /** Ngày hết hạn theo chuẩn ISO YYYY-MM-DD (hết hạn vào 23:59:59 của ngày này giờ VN). null nếu vô thời hạn */
  expiresAt?: string | null;
  /** Mô tả chi tiết ưu đãi hiển thị cho người dùng */
  description: string;
}
```

### Danh mục mẫu ban đầu (`src/data/coupons.ts`)

```typescript
export const coupons: Coupon[] = [
  {
    code: "SHOPLITE10",
    type: "percentage",
    value: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
    expiresAt: null,
    description: "Giảm 10% tối đa 100.000 ₫ cho đơn từ 300.000 ₫",
  },
  {
    code: "GIAM50K",
    type: "fixed",
    value: 50_000,
    maxDiscount: null,
    minOrderValue: 500_000,
    expiresAt: null,
    description: "Giảm 50.000 ₫ cho đơn từ 500.000 ₫",
  },
  {
    code: "TET2026",
    type: "percentage",
    value: 15,
    maxDiscount: 200_000,
    minOrderValue: 500_000,
    expiresAt: "2026-02-28", // Đã hết hạn (phục vụ kiểm thử mã hết hạn)
    description: "Khuyến mãi Tết 2026 - Giảm 15% tối đa 200.000 ₫ cho đơn từ 500.000 ₫",
  },
];
```

---

## 2. Thực thể `AppliedCoupon` (Mã đã áp dụng trong phiên thanh toán)

Đại diện cho mã giảm giá đã qua kiểm tra hợp lệ và đang được áp dụng vào phiên thanh toán hiện tại của người dùng.

```typescript
export interface AppliedCoupon {
  /** Mã coupon đang áp dụng (đã chuẩn hóa in hoa) */
  code: string;
  /** Số tiền thực tế được khấu trừ vào tạm tính (VND) */
  discountAmount: number;
  /** Mô tả ngắn gọn về ưu đãi */
  description: string;
}
```

---

## 3. Mở rộng `OrderTotals` (`src/features/checkout/pricing.ts`)

Bổ sung trường giảm giá vào cấu trúc kết quả tính toán tiền đơn hàng:

```typescript
export interface OrderTotals {
  /** Tạm tính tiền hàng trước giảm giá */
  subtotal: number;
  /** Phí giao hàng (0 ₫ nếu subtotal >= 500.000 ₫ và chọn giao hàng tiêu chuẩn) */
  shippingFee: number;
  /** Số tiền giảm giá từ coupon (mặc định 0 ₫) */
  discount: number;
  /** Tổng tiền phải thanh toán: Math.max(0, subtotal - discount) + shippingFee */
  total: number;
  /** Mã coupon đã áp dụng (nếu có) */
  couponCode?: string;
}
```

---

## 4. Mở rộng Thực thể `Order` (`src/features/orders/types.ts`)

Đảm bảo lưu trữ thông tin coupon vào đơn hàng vĩnh viễn, đồng thời tương thích ngược 100% với các đơn hàng cũ:

```typescript
export interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomer;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  // --- Các trường mở rộng cho Coupon (optional để tương thích ngược) ---
  /** Mã giảm giá đã áp dụng khi đặt hàng */
  couponCode?: string;
  /** Số tiền được giảm giá thực tế (VND) */
  discount?: number;
}
```

---

## 5. Zod Validation Schemas

### 5.1. Schema Kiểm tra Mã (`src/features/coupons/coupon-schema.ts`)

```typescript
import { z } from "zod";

export const validateCouponSchema = z.object({
  code: z
    .string({ required_error: "Vui lòng nhập mã giảm giá" })
    .trim()
    .min(1, "Vui lòng nhập mã giảm giá")
    .max(30, "Mã giảm giá không hợp lệ"),
  subtotal: z
    .number({ required_error: "Thiếu thông tin tạm tính đơn hàng" })
    .nonnegative("Tạm tính không thể là số âm"),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
```

### 5.2. Mở rộng `placeOrderSchema` (`src/features/checkout/checkout-schema.ts`)

```typescript
export const placeOrderSchema = z.object({
  customer: customerSchema,
  shippingMethod: z.enum(SHIPPING_METHODS),
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
      }),
    )
    .min(1, "Giỏ hàng đang trống"),
  /** Mã giảm giá gửi kèm nếu khách hàng có áp dụng */
  couponCode: z.string().trim().optional(),
});
```

---

## 6. Quy tắc nghiệp vụ & Tính toán biên (Business Rules & Edge Conditions)

1. **Chuẩn hóa mã (`normalizeCouponCode`):**
   - Loại bỏ khoảng trắng đầu/cuối: `.trim()`.
   - Chuyển thành chữ in hoa: `.toUpperCase()`.
   - Ví dụ: `"  shoplite10  "` $\rightarrow$ `"SHOPLITE10"`.
2. **Quy tắc tính số tiền giảm (`calculateDiscount`):**
   - **Loại "percentage":**
     `rawDiscount = Math.round((subtotal * coupon.value) / 100)`
     Nếu có `coupon.maxDiscount`: `discount = Math.min(rawDiscount, coupon.maxDiscount)`
     Khống chế trần: `discount = Math.min(discount, subtotal)`
   - **Loại "fixed":**
     `discount = Math.min(coupon.value, subtotal)`
   - Kết quả không bao giờ âm và không bao giờ vượt quá tạm tính tiền hàng.
3. **Quy tắc phí giao hàng và ngưỡng miễn phí vận chuyển:**
   - Ngưỡng miễn phí vận chuyển (500.000 ₫) MUST tính trên `subtotal` **trước khi giảm giá**.
   - Giảm giá MUST chỉ khấu trừ vào `subtotal`, tuyệt đối không khấu trừ vào `shippingFee`.
   - `total = (subtotal - discount) + shippingFee`.
4. **Quy tắc hết hạn (`isCouponExpired`):**
   - Nếu `expiresAt` là `null` hoặc `undefined`: Không bao giờ hết hạn.
   - Nếu có `expiresAt` (dạng `YYYY-MM-DD`): Thời điểm hết hạn là 23:59:59.999 của ngày đó tính theo múi giờ Việt Nam (`+07:00`).
   - So sánh với thời điểm hiện tại `now` (có thể inject thời gian để test).


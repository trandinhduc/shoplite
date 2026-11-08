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

export interface AppliedCoupon {
  /** Mã coupon đang áp dụng (đã chuẩn hóa in hoa) */
  code: string;
  /** Số tiền thực tế được khấu trừ vào tạm tính (VND) */
  discountAmount: number;
  /** Mô tả ngắn gọn về ưu đãi */
  description: string;
}

export type CouponErrorCode =
  | "COUPON_NOT_FOUND"
  | "COUPON_EXPIRED"
  | "COUPON_MIN_ORDER_NOT_MET"
  | "VALIDATION_ERROR";

export type ValidateCouponResult =
  | {
      valid: true;
      coupon: Coupon;
      discountAmount: number;
    }
  | {
      valid: false;
      error: {
        code: CouponErrorCode;
        message: string;
        details?: Record<string, string>;
      };
    };

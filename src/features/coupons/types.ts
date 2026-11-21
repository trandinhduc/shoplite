// src/features/coupons/types.ts
// Định nghĩa các kiểu dữ liệu cho coupon và kết quả kiểm tra.

export type Coupon = {
  /** Mã giảm giá, ví dụ "SHOPLITE10" */
  code: string;
  /** Loại giảm giá: phần trăm hoặc cố định */
  type: "percentage" | "fixed";
  /** Giá trị giảm (phần trăm hoặc số tiền VND) */
  value: number;
  /** Giảm tối đa (chỉ áp dụng cho kiểu percentage) */
  maxDiscount?: number;
  /** Giá trị đơn tối thiểu để áp dụng coupon */
  minOrderValue?: number;
  /** Mô tả hiển thị cho người dùng */
  description: string;
  /** Ngày hết hạn (ISO string) hoặc null nếu không có hạn */
  expiresAt?: string | null;
  /** Số lần sử dụng tối đa (null = không giới hạn) */
  usageLimit?: number | null;
  /** Số lần đã được sử dụng */
  usedCount?: number;
};

/** Kết quả trả về khi kiểm tra coupon */
export type CouponValidationResult =
  | {
      valid: true;
      coupon: Coupon;
      discountAmount: number;
    }
  | {
      valid: false;
      errorCode: string; // ví dụ: "COUPON_NOT_FOUND", "COUPON_EXPIRED", ...
      message: string;
    };


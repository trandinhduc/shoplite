export const COUPON_TYPES = ["percent", "fixed"] as const;

export type CouponType = (typeof COUPON_TYPES)[number];

interface CouponBase {
  /** Mã viết HOA, không khoảng trắng, duy nhất. */
  code: string;
  /** Điều kiện tạm tính tối thiểu (tính cả giá trị bằng ngưỡng). */
  minSubtotal?: number;
  /** YYYY-MM-DD, dùng được đến 23:59:59.999 +07:00 của ngày này. */
  expiresOn?: string;
}

export interface PercentCoupon extends CouponBase {
  type: "percent";
  /** Phần trăm giảm, số nguyên 1–100. */
  value: number;
  /** Mức giảm tối đa (VND). */
  maxDiscount: number;
}

export interface FixedCoupon extends CouponBase {
  type: "fixed";
  /** Số tiền giảm (VND). */
  value: number;
}

export type Coupon = PercentCoupon | FixedCoupon;

export type CouponInvalidReason = "not_found" | "expired" | "below_minimum";

/** Kết quả kiểm tra một mã với một giỏ hàng tại một thời điểm. */
export type CouponEvaluation =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "expired"; coupon: Coupon }
  | { ok: false; reason: "below_minimum"; coupon: Coupon; shortfall: number };

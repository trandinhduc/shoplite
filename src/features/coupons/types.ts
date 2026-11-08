export const COUPON_TYPES = ["percent", "fixed"] as const;

export type CouponType = (typeof COUPON_TYPES)[number];

interface CouponRuleBase {
  /** Mã đã chuẩn hóa: chữ in hoa, không khoảng trắng. */
  code: string;
  /** Tạm tính tối thiểu để dùng mã; không có = không yêu cầu. */
  minSubtotal?: number;
  /** Thời điểm hết hạn (ISO, loại trừ): hết hạn khi now >= expiresAt. Không có = không hết hạn. */
  expiresAt?: string;
}

export interface PercentCouponRule extends CouponRuleBase {
  type: "percent";
  /** Phần trăm giảm trên tạm tính (1–100). */
  percent: number;
  /** Mức giảm tối đa. */
  maxDiscount: number;
}

export interface FixedCouponRule extends CouponRuleBase {
  type: "fixed";
  /** Số tiền giảm cố định. */
  amount: number;
}

export type CouponRule = PercentCouponRule | FixedCouponRule;

/** Kết quả đánh giá mã theo tạm tính. Không có trạng thái hết hạn: hết hạn chỉ do server xét. */
export type CouponEvaluation =
  | { status: "applied"; discount: number }
  | { status: "below_minimum"; minSubtotal: number; shortfall: number };

export type CouponType = "percent" | "fixed";

/** Mã giảm giá (dữ liệu tĩnh trong src/data/coupons.ts, chỉ đọc). */
export interface Coupon {
  /** Viết hoa, duy nhất; là khóa tra cứu. */
  code: string;
  type: CouponType;
  /** percent: 1–100; fixed: số đồng > 0. */
  value: number;
  /** Trần mức giảm (đồng), chỉ dùng cho loại percent. */
  maxDiscount?: number;
  /** Giá trị đơn tối thiểu, xét trên tiền hàng trước giảm. */
  minOrderValue?: number;
  /** Dùng được đến hết ngày này (YYYY-MM-DD, giờ Việt Nam UTC+7). */
  expiresOn?: string;
}

export type CouponFailureReason = "not_found" | "expired" | "min_order_not_met";

export type CouponEvaluation =
  | { ok: true; code: string; discountAmount: number }
  | { ok: false; reason: CouponFailureReason; shortfall?: number };

/** Giảm giá đã áp dụng, lưu cùng đơn hàng. amount là số đồng > 0 và <= subtotal. */
export interface AppliedDiscount {
  code: string;
  amount: number;
}

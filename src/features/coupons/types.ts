export type CouponKind = "percentage" | "fixed";

export interface Coupon {
  code: string;
  kind: CouponKind;
  value: number;
  maximumDiscount?: number;
  minimumSubtotal: number;
  expiresOn?: string;
}

export type CouponInvalidReason = "not_found" | "expired" | "minimum_subtotal";

export type CouponEvaluation =
  | {
      valid: true;
      coupon: Coupon;
      normalizedCode: string;
      discountAmount: number;
    }
  | {
      valid: false;
      normalizedCode: string;
      reason: CouponInvalidReason;
      message: string;
      minimumShortfall?: number;
    };

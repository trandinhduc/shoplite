/**
 * Định nghĩa mã giảm giá. Mọi số tiền là số nguyên VND.
 *
 * - `code`: chữ HOA, không khoảng trắng, duy nhất trong danh sách.
 * - `value`: với `percent` là số nguyên 1–100; với `fixed` là số tiền > 0.
 * - `maxDiscount`: > 0. Bắt buộc với `percent`, không có với `fixed`.
 * - `minSubtotal`: ≥ 0; thiếu = không có ngưỡng.
 * - `expiresOn`: dạng `YYYY-MM-DD`. Hiệu lực đến 23:59:59.999 giờ VN (+07:00) của ngày đó;
 *   thiếu = không hết hạn.
 */
export type CouponDefinition =
  | {
      code: string;
      type: "percent";
      value: number;
      maxDiscount: number;
      minSubtotal?: number;
      expiresOn?: string;
    }
  | {
      code: string;
      type: "fixed";
      value: number;
      minSubtotal?: number;
      expiresOn?: string;
    };

export type CouponErrorReason =
  "COUPON_NOT_FOUND" | "COUPON_EXPIRED" | "COUPON_MIN_SUBTOTAL_NOT_MET";

/** Kết quả kiểm tra mã có tồn tại và còn hạn hay không (không xét ngưỡng). */
export type CouponAvailability =
  | { ok: true; coupon: CouponDefinition }
  | { ok: false; reason: "COUPON_NOT_FOUND" }
  | { ok: false; reason: "COUPON_EXPIRED"; coupon: CouponDefinition };

export type CouponMinSubtotalNotMet = {
  ok: false;
  reason: "COUPON_MIN_SUBTOTAL_NOT_MET";
  coupon: CouponDefinition;
  minSubtotal: number;
  shortfall: number;
};

/** Kết quả áp mã đầy đủ: tồn tại → hết hạn → ngưỡng (FR-014). */
export type CouponEvaluation =
  | { ok: true; coupon: CouponDefinition; discount: number }
  | { ok: false; reason: "COUPON_NOT_FOUND" }
  | { ok: false; reason: "COUPON_EXPIRED"; coupon: CouponDefinition }
  | CouponMinSubtotalNotMet;

export type CouponEvaluationFailure = Extract<CouponEvaluation, { ok: false }>;

/** Kết quả chỉ xét ngưỡng và tính tiền (client dùng, không xét hạn dùng). */
export type CouponThresholdResult =
  { ok: true; coupon: CouponDefinition; discount: number } | CouponMinSubtotalNotMet;

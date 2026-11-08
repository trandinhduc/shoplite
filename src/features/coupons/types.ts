/** Loại mã giảm giá: theo phần trăm tạm tính hoặc một số tiền cố định. */
export const COUPON_TYPES = ["percentage", "fixed"] as const;

export type CouponType = (typeof COUPON_TYPES)[number];

interface CouponBase {
  /** Mã viết HOA, không khoảng trắng, duy nhất trong danh sách. */
  code: string;
  /** Tạm tính tối thiểu (VND) để dùng mã. Không có = không yêu cầu. */
  minSubtotal?: number;
  /**
   * Ngày cuối cùng mã còn hiệu lực, dạng "YYYY-MM-DD", tính theo giờ Việt Nam
   * và bao gồm cả ngày đó. Không có = không hết hạn.
   */
  expiresOn?: string;
}

/** Giảm `value`% tạm tính, tối đa `maxDiscount` VND. */
export interface PercentageCoupon extends CouponBase {
  type: "percentage";
  /** Phần trăm giảm, trong khoảng (0, 100]. */
  value: number;
  /** Số tiền giảm tối đa (VND). */
  maxDiscount: number;
}

/** Giảm cố định `value` VND. */
export interface FixedCoupon extends CouponBase {
  type: "fixed";
  /** Số tiền giảm (VND), lớn hơn 0. */
  value: number;
}

/** Mã giảm giá do cửa hàng định nghĩa sẵn (dữ liệu tĩnh, chỉ dùng phía server). */
export type Coupon = PercentageCoupon | FixedCoupon;

/**
 * Quy tắc của một mã được trả cho client sau khi áp dụng thành công.
 * Hiện trùng `Coupon`; tách tên để sau này thêm trường nội bộ mà không lộ ra ngoài.
 */
export type CouponRule = Coupon;

/** Lý do một mã không dùng được. */
export type CouponFailureReason = "NOT_FOUND" | "EXPIRED" | "MIN_SUBTOTAL_NOT_MET";

/** Kết quả kiểm tra lỗi của một mã. */
export type CouponFailure =
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "EXPIRED"; code: string }
  | {
      ok: false;
      reason: "MIN_SUBTOTAL_NOT_MET";
      code: string;
      minSubtotal: number;
      /** Số tiền cần mua thêm = minSubtotal − tạm tính (luôn ≥ 1). */
      shortfall: number;
    };

/** Kết quả kiểm tra một mã với một tạm tính tại một thời điểm. */
export type CouponEvaluation = { ok: true; code: string; discount: number } | CouponFailure;

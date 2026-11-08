/** Phần chung của mọi mã giảm giá. Số tiền tính bằng VND (số nguyên). */
interface CouponBase {
  /** Viết HOA, không khoảng trắng, duy nhất trong danh sách. */
  code: string;
  /** Giá trị đơn tối thiểu (so với tạm tính trước giảm giá). Thiếu thì coi là 0. */
  minOrderValue?: number;
  /** Ngày hết hạn dạng YYYY-MM-DD; còn dùng được hết ngày này theo giờ Việt Nam. Thiếu thì không hết hạn. */
  expiresOn?: string;
}

/** Giảm theo phần trăm, luôn có mức giảm tối đa. */
export interface PercentCoupon extends CouponBase {
  type: "percent";
  /** Số nguyên từ 1 đến 100. */
  percent: number;
  /** Lớn hơn 0. */
  maxDiscount: number;
}

/** Giảm một số tiền cố định. */
export interface FixedCoupon extends CouponBase {
  type: "fixed";
  /** Lớn hơn 0. */
  amount: number;
}

export type Coupon = PercentCoupon | FixedCoupon;

/** Phần của mã dùng để tính tiền giảm - `pricing.ts` chỉ phụ thuộc kiểu này. */
export type DiscountRule =
  Pick<PercentCoupon, "type" | "percent" | "maxDiscount"> | Pick<FixedCoupon, "type" | "amount">;

/** Kết quả kiểm tra một mã với một giỏ hàng. Thứ tự kiểm tra: tồn tại → hết hạn → đơn tối thiểu. */
export type CouponEvaluation =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "EXPIRED"; coupon: Coupon }
  | {
      ok: false;
      reason: "MIN_ORDER_NOT_MET";
      coupon: Coupon;
      minOrderValue: number;
      /** Số tiền cần mua thêm để đạt mức tối thiểu (> 0). */
      missingAmount: number;
    };

/** Thông báo kèm response đặt hàng khi mã hết hạn lúc đặt (không lưu vào đơn). */
export interface CouponNotice {
  code: "COUPON_EXPIRED";
  couponCode: string;
}

/** Dữ liệu để trang chi tiết đơn báo "mã đã hết hạn lúc đặt hàng" (luôn do server tính). */
export interface ExpiredCouponNotice {
  couponCode: string;
  /** Số tiền giảm mà mã lẽ ra mang lại cho đơn này. */
  lostDiscount: number;
}

/** Body 200 của POST /api/coupons/validate: chỉ gồm quy tắc của đúng mã được hỏi. */
export interface CouponPreview {
  coupon: DiscountRule & { code: string; minOrderValue?: number };
  subtotal: number;
  discount: number;
}

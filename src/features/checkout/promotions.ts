import { INITIAL_PROMOTIONS, type Coupon } from "@/data/promotions";
import { formatCurrency } from "@/lib/format";

export type { Coupon, CouponType } from "@/data/promotions";

export type CouponValidationErrorCode =
  | "COUPON_NOT_FOUND"
  | "COUPON_EXPIRED"
  | "COUPON_MIN_ORDER_NOT_MET";

export type CouponValidationResult =
  | {
      valid: true;
      coupon: Coupon;
      discountAmount: number;
    }
  | {
      valid: false;
      code: CouponValidationErrorCode;
      message: string;
      amountNeeded?: number;
    };

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function findCoupon(
  code: string,
  coupons: Coupon[] = INITIAL_PROMOTIONS,
): Coupon | undefined {
  const normalized = normalizeCouponCode(code);
  return coupons.find((c) => normalizeCouponCode(c.code) === normalized);
}

export function calculateDiscountAmount(coupon: Coupon, subtotal: number): number {
  if (subtotal <= 0) return 0;

  if (coupon.type === "percentage") {
    const rawDiscount = Math.round((subtotal * coupon.value) / 100);
    const cappedDiscount = coupon.maxDiscount
      ? Math.min(rawDiscount, coupon.maxDiscount)
      : rawDiscount;
    return Math.min(cappedDiscount, subtotal);
  }

  // coupon.type === "fixed"
  return Math.min(coupon.value, subtotal);
}

export interface ValidateCouponOptions {
  coupons?: Coupon[];
  now?: () => Date;
}

export function validateCoupon(
  code: string,
  subtotal: number,
  options: ValidateCouponOptions = {},
): CouponValidationResult {
  const { coupons = INITIAL_PROMOTIONS, now = () => new Date() } = options;
  const coupon = findCoupon(code, coupons);

  if (!coupon) {
    return {
      valid: false,
      code: "COUPON_NOT_FOUND",
      message: "Mã giảm giá không tồn tại",
    };
  }

  if (coupon.expiresAt) {
    const expiryDate = new Date(coupon.expiresAt);
    if (now().getTime() > expiryDate.getTime()) {
      return {
        valid: false,
        code: "COUPON_EXPIRED",
        message: "Mã giảm giá đã hết hạn sử dụng",
      };
    }
  }

  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    const amountNeeded = coupon.minOrderValue - subtotal;
    return {
      valid: false,
      code: "COUPON_MIN_ORDER_NOT_MET",
      message: `Đơn hàng tối thiểu ${formatCurrency(coupon.minOrderValue)} để áp dụng mã này (cần mua thêm ${formatCurrency(amountNeeded)})`,
      amountNeeded,
    };
  }

  const discountAmount = calculateDiscountAmount(coupon, subtotal);

  return {
    valid: true,
    coupon,
    discountAmount,
  };
}


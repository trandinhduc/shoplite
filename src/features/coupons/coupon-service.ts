import { coupons } from "@/data/coupons";
import type { Coupon, CouponEvaluation } from "./types";

export type {
  Coupon,
  CouponEvaluation,
  CouponInvalidReason,
  CouponKind,
} from "./types";

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

function todayInVietnam(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function calculateCouponDiscount(
  coupon: Coupon,
  subtotal: number,
): number {
  const rawDiscount =
    coupon.kind === "percentage"
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value;
  const cappedDiscount =
    coupon.maximumDiscount === undefined
      ? rawDiscount
      : Math.min(rawDiscount, coupon.maximumDiscount);
  return Math.min(Math.max(0, cappedDiscount), Math.max(0, subtotal));
}

export function evaluateCoupon(
  code: string,
  subtotal: number,
  now = new Date(),
): CouponEvaluation {
  const normalizedCode = normalizeCouponCode(code);
  const coupon = coupons.find((item) => item.code === normalizedCode);

  if (!coupon) {
    return {
      valid: false,
      normalizedCode,
      reason: "not_found",
      message: "Mã giảm giá không tồn tại",
    };
  }

  if (coupon.expiresOn && todayInVietnam(now) > coupon.expiresOn) {
    return {
      valid: false,
      normalizedCode,
      reason: "expired",
      message: "Mã giảm giá đã hết hạn",
    };
  }

  if (subtotal < coupon.minimumSubtotal) {
    const minimumShortfall = coupon.minimumSubtotal - subtotal;
    return {
      valid: false,
      normalizedCode,
      reason: "minimum_subtotal",
      message: `Đơn hàng cần thêm ${minimumShortfall.toLocaleString("vi-VN")}đ để áp dụng mã`,
      minimumShortfall,
    };
  }

  return {
    valid: true,
    coupon,
    normalizedCode,
    discountAmount: calculateCouponDiscount(coupon, subtotal),
  };
}

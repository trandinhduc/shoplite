/**
 * Quy tắc mã giảm giá - hàm thuần dùng chung cho client và server (giống pricing.ts).
 * KHÔNG import src/data/coupons.ts ở đây để file client dùng được mà không lộ danh sách mã.
 *
 * Client chỉ dùng `evaluateCouponThreshold` (không xét hạn dùng bằng giờ máy khách);
 * hạn dùng do server kiểm tra bằng `checkCouponAvailability` / `evaluateCoupon`.
 */
import { formatCurrency } from "@/lib/format";
import type {
  CouponAvailability,
  CouponDefinition,
  CouponEvaluation,
  CouponEvaluationFailure,
  CouponThresholdResult,
} from "./types";

/** " shoplite10 " -> "SHOPLITE10" */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Mã dùng được đến hết ngày hết hạn theo giờ Việt Nam (UTC+7, không có giờ mùa hè). */
export function couponExpiryInstant(expiresOn: string): Date {
  return new Date(`${expiresOn}T23:59:59.999+07:00`);
}

export function isCouponExpired(coupon: CouponDefinition, now: Date): boolean {
  if (!coupon.expiresOn) return false;
  return now.getTime() > couponExpiryInstant(coupon.expiresOn).getTime();
}

/** Số tiền giảm: phần trăm làm tròn xuống và không vượt mức tối đa; luôn ≤ tạm tính. */
export function calculateCouponDiscount(coupon: CouponDefinition, subtotal: number): number {
  const raw =
    coupon.type === "fixed"
      ? coupon.value
      : Math.min(Math.floor((subtotal * coupon.value) / 100), coupon.maxDiscount);
  return Math.max(0, Math.min(raw, subtotal));
}

/** Bước 1–2: mã có tồn tại và còn hạn không (không xét ngưỡng). */
export function checkCouponAvailability(
  coupon: CouponDefinition | undefined,
  now: Date,
): CouponAvailability {
  if (!coupon) return { ok: false, reason: "COUPON_NOT_FOUND" };
  if (isCouponExpired(coupon, now)) return { ok: false, reason: "COUPON_EXPIRED", coupon };
  return { ok: true, coupon };
}

/** Bước 3–4: chỉ xét ngưỡng tối thiểu và tính tiền, KHÔNG xét hạn dùng. */
export function evaluateCouponThreshold(
  coupon: CouponDefinition,
  subtotal: number,
): CouponThresholdResult {
  if (coupon.minSubtotal !== undefined && subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      reason: "COUPON_MIN_SUBTOTAL_NOT_MET",
      coupon,
      minSubtotal: coupon.minSubtotal,
      shortfall: coupon.minSubtotal - subtotal,
    };
  }
  return {
    ok: true,
    coupon,
    discount: calculateCouponDiscount(coupon, subtotal),
  };
}

/** Kiểm tra đầy đủ theo thứ tự: tồn tại → hết hạn → ngưỡng (FR-014). Dùng ở server. */
export function evaluateCoupon(
  coupon: CouponDefinition | undefined,
  subtotal: number,
  now: Date,
): CouponEvaluation {
  const availability = checkCouponAvailability(coupon, now);
  if (!availability.ok) return availability;
  return evaluateCouponThreshold(availability.coupon, subtotal);
}

/** Thông báo tiếng Việt cho lý do mã không dùng được (FR-013). */
export function couponErrorMessage(
  failure: CouponEvaluationFailure | Extract<CouponAvailability, { ok: false }>,
): string {
  switch (failure.reason) {
    case "COUPON_NOT_FOUND":
      return "Mã giảm giá không tồn tại";
    case "COUPON_EXPIRED":
      return "Mã giảm giá đã hết hạn";
    case "COUPON_MIN_SUBTOTAL_NOT_MET":
      return `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(failure.minSubtotal)}. Mua thêm ${formatCurrency(failure.shortfall)} để dùng mã này.`;
  }
}

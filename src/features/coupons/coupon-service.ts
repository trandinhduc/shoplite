// src/features/coupons/coupon-service.ts
// Service for coupon operations. Uses static data from `src/data/coupons.ts`.

import { COUPONS } from "@/data/coupons";
import type { Coupon, CouponValidationResult } from "./types";
import { calculateDiscountAmount } from "./utils";

/** Find a coupon by its code (case‑insensitive). */
export function findCoupon(code: string): Coupon | undefined {
  const normalized = code.trim().toUpperCase();
  return COUPONS.find((c) => c.code.toUpperCase() === normalized);
}

/** Validate a coupon against the current cart subtotal.
 * Returns a `CouponValidationResult` used by preview and order services.
 */
export function validateCoupon(
  code: string,
  subtotal: number,
): CouponValidationResult {
  const coupon = findCoupon(code);
  if (!coupon) {
    return {
      valid: false,
      errorCode: "COUPON_NOT_FOUND",
      message: "Mã giảm giá không tồn tại",
    };
  }
  // Future checks (expiry, usage limit, minOrderValue, stock) can be added here.
  const discountAmount = calculateDiscountAmount(coupon, subtotal);
  return { valid: true, coupon, discountAmount };
}

export const couponService = { findCoupon, validateCoupon };

// src/features/coupons/utils.ts
// Utility helpers used by the coupon service.

import type { Coupon } from "./types";

/**
 * Calculate the discount amount for a given coupon and cart subtotal.
 * - Percentage coupons respect `maxDiscount` if provided.
 * - Fixed‑amount coupons simply return the `value`.
 */
export function calculateDiscountAmount(coupon: Coupon, subtotal: number): number {
  if (coupon.type === "percentage") {
    const raw = (subtotal * coupon.value) / 100;
    if (typeof coupon.maxDiscount === "number") {
      return Math.min(raw, coupon.maxDiscount);
    }
    return raw;
  }
  // fixed amount
  return coupon.value;
}


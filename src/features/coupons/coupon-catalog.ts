/**
 * Tra mã giảm giá trong dữ liệu tĩnh.
 * Chỉ import từ server (route handler, order-service) - KHÔNG import từ file "use client".
 */
import { COUPONS } from "@/data/coupons";
import { normalizeCouponCode } from "./coupon-service";
import type { CouponDefinition } from "./types";

export function findCoupon(code: string): CouponDefinition | undefined {
  const normalized = normalizeCouponCode(code);
  return COUPONS.find((coupon) => coupon.code === normalized);
}

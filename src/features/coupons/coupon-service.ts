import { coupons } from "@/data/coupons";
import { normalizeCouponCode } from "./coupon-rules";
import type { Coupon } from "./types";

/**
 * Tra cứu mã giảm giá. Chỉ import file này từ code chạy trên server (Route Handler, order-service)
 * vì nó đọc toàn bộ danh sách mã.
 */

export type CouponLookupResult =
  { ok: true; coupon: Coupon } | { ok: false; code: "COUPON_NOT_FOUND"; message: string };

export function findCoupon(code: string): Coupon | undefined {
  const normalized = normalizeCouponCode(code);
  return coupons.find((coupon) => coupon.code === normalized);
}

export function lookupCoupon(code: string): CouponLookupResult {
  const coupon = findCoupon(code);
  return coupon
    ? { ok: true, coupon }
    : {
        ok: false,
        code: "COUPON_NOT_FOUND",
        message: "Mã giảm giá không tồn tại",
      };
}

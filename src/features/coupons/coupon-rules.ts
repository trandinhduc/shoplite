/**
 * Quy tắc mã giảm giá dùng chung cho client và server.
 * Không import danh sách mã (`src/data/coupons.ts`) ở đây để danh sách không lọt vào bundle client.
 */

export type CouponType = "percent" | "fixed";

export interface Coupon {
  /** Viết hoa, duy nhất. */
  code: string;
  type: CouponType;
  /** `percent`: 1-100; `fixed`: số đồng > 0. */
  value: number;
  /** Chỉ với `percent`: mức giảm tối đa (đồng). */
  maxDiscount?: number;
  /** So với tạm tính trước giảm: `subtotal >= minOrderValue`. */
  minOrderValue?: number;
  /** `YYYY-MM-DD`; dùng được đến hết 23:59:59.999 ngày đó theo giờ Việt Nam. */
  expiresOn?: string;
}

/** Mã đã áp dụng phía client: mã + quy tắc do API trả về. */
export interface AppliedCoupon {
  code: string;
  rule: Coupon;
}

export type CouponEligibility =
  | { ok: true; discount: number }
  | { ok: false; reason: "expired" }
  | {
      ok: false;
      reason: "min-order-not-met";
      minOrderValue: number;
      amountNeeded: number;
    };

/** NFKC đưa chữ/số full-width (`ＧＩＡＭ５０Ｋ`) về dạng thường trước khi so khớp. */
export function normalizeCouponCode(input: string): string {
  return input.normalize("NFKC").trim().toUpperCase();
}

export function isCouponExpired(coupon: Pick<Coupon, "expiresOn">, now: Date): boolean {
  if (!coupon.expiresOn) return false;
  return now > new Date(`${coupon.expiresOn}T23:59:59.999+07:00`);
}

export function calculateCouponDiscount(coupon: Coupon, subtotal: number): number {
  const raw =
    coupon.type === "percent"
      ? Math.min(Math.round((subtotal * coupon.value) / 100), coupon.maxDiscount ?? Infinity)
      : coupon.value;
  return Math.max(0, Math.min(raw, subtotal));
}

/** Kiểm tra theo thứ tự: hết hạn → giá trị tối thiểu. */
export function checkCouponEligibility(
  coupon: Coupon,
  subtotal: number,
  now: Date,
): CouponEligibility {
  if (isCouponExpired(coupon, now)) return { ok: false, reason: "expired" };
  if (coupon.minOrderValue !== undefined && subtotal < coupon.minOrderValue) {
    return {
      ok: false,
      reason: "min-order-not-met",
      minOrderValue: coupon.minOrderValue,
      amountNeeded: coupon.minOrderValue - subtotal,
    };
  }
  return { ok: true, discount: calculateCouponDiscount(coupon, subtotal) };
}

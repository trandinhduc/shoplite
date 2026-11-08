/**
 * Logic thuần cho mã giảm giá: tra mã, kiểm tra điều kiện, tính mức giảm.
 * Không import code server nên dùng được ở cả client (xem trước) và server (tính lại khi đặt hàng).
 */
import { COUPONS } from "@/data/coupons";
import { formatCurrency } from "@/lib/format";
import type { Coupon, CouponEvaluation } from "./types";

/** Chuẩn hóa mã người dùng nhập: bỏ khoảng trắng đầu/cuối, viết hoa. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function findCoupon(code: string, coupons: Coupon[] = COUPONS): Coupon | undefined {
  const normalized = normalizeCouponCode(code);
  return coupons.find((coupon) => coupon.code === normalized);
}

/** Mã dùng được đến hết ngày `expiresOn` (23:59:59.999 giờ Việt Nam, UTC+7). */
function isExpired(coupon: Coupon, now: Date): boolean {
  if (!coupon.expiresOn) return false;
  return now.getTime() > Date.parse(`${coupon.expiresOn}T23:59:59.999+07:00`);
}

function calculateDiscount(coupon: Coupon, subtotal: number): number {
  const raw =
    coupon.type === "percent"
      ? Math.min(Math.floor((subtotal * coupon.value) / 100), coupon.maxDiscount ?? Infinity)
      : coupon.value;
  return Math.max(0, Math.min(raw, subtotal));
}

/**
 * Kiểm tra mã với tiền hàng (trước giảm). Thứ tự báo lỗi:
 * không tồn tại -> hết hạn -> chưa đạt giá trị tối thiểu.
 */
export function evaluateCoupon(
  code: string,
  subtotal: number,
  now: Date,
  coupons: Coupon[] = COUPONS,
): CouponEvaluation {
  const coupon = findCoupon(code, coupons);
  if (!coupon) return { ok: false, reason: "not_found" };
  if (isExpired(coupon, now)) return { ok: false, reason: "expired" };
  if (coupon.minOrderValue !== undefined && subtotal < coupon.minOrderValue) {
    return {
      ok: false,
      reason: "min_order_not_met",
      shortfall: coupon.minOrderValue - subtotal,
    };
  }
  return {
    ok: true,
    code: coupon.code,
    discountAmount: calculateDiscount(coupon, subtotal),
  };
}

/** Thông báo tiếng Việt cho kết quả không hợp lệ (dùng chung client và server). */
export function describeCouponFailure(failure: Extract<CouponEvaluation, { ok: false }>): string {
  switch (failure.reason) {
    case "not_found":
      return "Mã giảm giá không tồn tại";
    case "expired":
      return "Mã giảm giá đã hết hạn";
    case "min_order_not_met":
      return `Cần mua thêm ${formatCurrency(failure.shortfall ?? 0)} để dùng mã này`;
  }
}

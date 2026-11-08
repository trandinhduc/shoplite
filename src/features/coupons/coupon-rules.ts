import { formatCurrency } from "@/lib/format";
import type { Coupon, CouponEvaluation } from "./types";

/**
 * Quy tắc mã giảm giá dạng hàm thuần - dùng chung cho client (hiển thị) và server (tạo đơn).
 * Không import src/data/ để danh sách mã không bị đóng gói vào bundle phía client.
 */

/** " shoplite10 " -> "SHOPLITE10" */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Mã dùng được đến hết ngày expiresOn theo giờ Việt Nam (UTC+7). */
export function getCouponDeadline(expiresOn: string): Date {
  return new Date(`${expiresOn}T23:59:59.999+07:00`);
}

/** Số tiền giảm, làm tròn xuống tới đồng và không vượt quá tạm tính. */
export function calculateCouponDiscount(
  coupon: Coupon,
  subtotal: number,
): number {
  const raw =
    coupon.type === "percent"
      ? Math.min(
          Math.floor((subtotal * coupon.value) / 100),
          coupon.maxDiscount,
        )
      : coupon.value;
  return Math.max(0, Math.min(raw, subtotal));
}

/** Thứ tự kiểm tra: không tồn tại -> hết hạn -> chưa đạt tối thiểu -> hợp lệ. */
export function evaluateCoupon(
  coupon: Coupon | undefined,
  subtotal: number,
  now: Date,
): CouponEvaluation {
  if (!coupon) return { ok: false, reason: "not_found" };

  if (
    coupon.expiresOn &&
    now.getTime() > getCouponDeadline(coupon.expiresOn).getTime()
  ) {
    return { ok: false, reason: "expired", coupon };
  }

  if (coupon.minSubtotal !== undefined && subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      reason: "below_minimum",
      coupon,
      shortfall: coupon.minSubtotal - subtotal,
    };
  }

  return {
    ok: true,
    coupon,
    discount: calculateCouponDiscount(coupon, subtotal),
  };
}

/** Thông báo tiếng Việt cho mã không dùng được. */
export function getCouponErrorMessage(
  evaluation: Extract<CouponEvaluation, { ok: false }>,
): string {
  switch (evaluation.reason) {
    case "not_found":
      return "Mã giảm giá không tồn tại";
    case "expired":
      return "Mã giảm giá đã hết hạn";
    case "below_minimum":
      return `Mua thêm ${formatCurrency(evaluation.shortfall)} để sử dụng mã ${evaluation.coupon.code}`;
  }
}

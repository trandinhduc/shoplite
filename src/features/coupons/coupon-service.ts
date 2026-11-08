/**
 * Tra cứu và kiểm tra mã giảm giá - CHỈ dùng phía server.
 * Không import file này vào Client Component (ESLint chặn, FR-020): nó đọc toàn bộ danh sách mã.
 */
import { coupons } from "@/data/coupons";
import { OrderError } from "@/features/orders/order-errors";
import { formatMinimumNotMetMessage, isCouponExpired, normalizeCouponCode } from "./coupon-rules";
import type { CouponEvaluation, CouponRule } from "./types";

export function findCouponByCode(
  code: string,
  list: CouponRule[] = coupons,
): CouponRule | undefined {
  const normalized = normalizeCouponCode(code);
  return list.find((coupon) => coupon.code === normalized);
}

function couponError(code: OrderError["code"], message: string): OrderError {
  return new OrderError(code, message, { couponCode: message });
}

export function couponNotFoundError(code: string): OrderError {
  return couponError(
    "COUPON_NOT_FOUND",
    `Mã giảm giá "${normalizeCouponCode(code)}" không tồn tại`,
  );
}

export function couponExpiredError(code: string): OrderError {
  return couponError("COUPON_EXPIRED", `Mã giảm giá "${normalizeCouponCode(code)}" đã hết hạn`);
}

/**
 * Kiểm tra mã tồn tại và còn hạn theo đồng hồ server (`now`).
 * Không kiểm tra giá trị tối thiểu: giỏ hàng có thể đổi, client tự đánh giá và server kiểm tra lại khi đặt hàng.
 */
export function validateCouponCode(
  code: string,
  now: Date,
  list: CouponRule[] = coupons,
): CouponRule {
  const rule = findCouponByCode(code, list);
  if (!rule) throw couponNotFoundError(code);
  if (isCouponExpired(rule, now)) throw couponExpiredError(rule.code);
  return rule;
}

/** Lỗi khi đơn chưa đạt giá trị tối thiểu của mã. */
export function toCouponError(
  code: string,
  evaluation: Extract<CouponEvaluation, { status: "below_minimum" }>,
): OrderError {
  return couponError("COUPON_MIN_SUBTOTAL_NOT_MET", formatMinimumNotMetMessage(code, evaluation));
}

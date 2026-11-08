/**
 * Quy tắc thuần của mã giảm giá, dùng chung cho client (hiển thị) và server (xác nhận khi đặt hàng).
 *
 * File này KHÔNG được import `@/data/coupons` để không đưa danh sách mã vào bundle của trình
 * duyệt (FR-022a). Việc tra mã nằm ở `coupon-service.ts` (chỉ phía server).
 */
import { formatCurrency } from "@/lib/format";
import type { Coupon, CouponEvaluation, CouponFailure, CouponRule } from "./types";

/** Việt Nam dùng UTC+7 cố định (không có giờ mùa hè). */
const VIETNAM_UTC_OFFSET = "+07:00";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** " shoplite10 " -> "SHOPLITE10". Không bỏ khoảng trắng ở giữa, không bỏ dấu. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Thời điểm mã bắt đầu hết hạn: 00:00 (giờ Việt Nam) của ngày sau `expiresOn`.
 * "2026-02-28" -> 2026-03-01T00:00:00+07:00
 */
export function getCouponExpiryCutoff(expiresOn: string): Date {
  const startOfExpiryDay = new Date(`${expiresOn}T00:00:00${VIETNAM_UTC_OFFSET}`);
  return new Date(startOfExpiryDay.getTime() + ONE_DAY_MS);
}

export function isCouponExpired(coupon: Coupon, now: Date): boolean {
  if (coupon.expiresOn === undefined) return false;
  return now.getTime() >= getCouponExpiryCutoff(coupon.expiresOn).getTime();
}

/**
 * Số tiền giảm (VND) cho một tạm tính. Phần trăm được làm tròn xuống đến đồng rồi giới hạn bởi
 * `maxDiscount`; mọi loại đều không vượt quá tạm tính.
 */
export function calculateCouponDiscount(coupon: Coupon, subtotal: number): number {
  const raw =
    coupon.type === "percentage"
      ? Math.min(Math.floor((subtotal * coupon.value) / 100), coupon.maxDiscount)
      : coupon.value;
  return Math.max(0, Math.min(raw, subtotal));
}

/**
 * Kiểm tra mã theo thứ tự: tồn tại → còn hạn → đạt giá trị tối thiểu (FR-005).
 * `subtotal` là tạm tính tiền hàng trước giảm giá, chưa gồm phí giao hàng (FR-006).
 */
export function evaluateCoupon(
  coupon: Coupon | undefined,
  subtotal: number,
  now: Date,
): CouponEvaluation {
  if (!coupon) {
    return { ok: false, reason: "NOT_FOUND" };
  }
  if (isCouponExpired(coupon, now)) {
    return { ok: false, reason: "EXPIRED", code: coupon.code };
  }
  if (coupon.minSubtotal !== undefined && subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      reason: "MIN_SUBTOTAL_NOT_MET",
      code: coupon.code,
      minSubtotal: coupon.minSubtotal,
      shortfall: coupon.minSubtotal - subtotal,
    };
  }
  return {
    ok: true,
    code: coupon.code,
    discount: calculateCouponDiscount(coupon, subtotal),
  };
}

/** Thông báo tiếng Việt cho từng lý do mã không dùng được (FR-014). */
export function getCouponErrorMessage(failure: CouponFailure): string {
  switch (failure.reason) {
    case "NOT_FOUND":
      return "Mã giảm giá không tồn tại";
    case "EXPIRED":
      return "Mã giảm giá đã hết hạn";
    case "MIN_SUBTOTAL_NOT_MET":
      return (
        `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(failure.minSubtotal)} ` +
        `để dùng mã ${failure.code}. Bạn cần mua thêm ${formatCurrency(failure.shortfall)}.`
      );
  }
}

/**
 * Mã đang áp dụng ở trang thanh toán.
 * `lockedError`: lỗi "dính" do server trả về khi đặt hàng (hết hạn / không tồn tại) — chỉ mất
 * khi khách gỡ hoặc thay mã (Clarification Q1).
 */
export interface AppliedCoupon {
  rule: CouponRule;
  lockedError?: string;
}

export type CouponStatus =
  | { status: "none" }
  | { status: "active"; code: string; discount: number }
  | { status: "error"; code: string; message: string };

/**
 * Trạng thái hiển thị của mã, suy ra mỗi lần render từ giỏ hàng hiện tại (FR-017).
 * Chỉ để hiển thị — server luôn kiểm tra lại khi đặt hàng (FR-017a, FR-022b).
 */
export function deriveCouponStatus(
  applied: AppliedCoupon | null,
  subtotal: number,
  now: Date,
): CouponStatus {
  if (!applied) return { status: "none" };

  const { rule, lockedError } = applied;
  if (lockedError !== undefined) {
    return { status: "error", code: rule.code, message: lockedError };
  }

  const evaluation = evaluateCoupon(rule, subtotal, now);
  if (evaluation.ok) {
    return {
      status: "active",
      code: evaluation.code,
      discount: evaluation.discount,
    };
  }
  return {
    status: "error",
    code: rule.code,
    message: getCouponErrorMessage(evaluation),
  };
}

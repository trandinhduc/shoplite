/**
 * Quy tắc mã giảm giá dạng hàm thuần, dùng chung client và server.
 * Không import dữ liệu mã ở đây để file an toàn khi dùng trong Client Component.
 */
import { formatCurrency } from "@/lib/format";
import type { CouponEvaluation, CouponRule } from "./types";

type BelowMinimum = Extract<CouponEvaluation, { status: "below_minimum" }>;

/** Câu báo chưa đạt giá trị tối thiểu - dùng chung client và server để câu chữ thống nhất. */
export function formatMinimumNotMetMessage(code: string, evaluation: BelowMinimum): string {
  return `Mã ${normalizeCouponCode(code)} áp dụng cho đơn từ ${formatCurrency(evaluation.minSubtotal)}, bạn cần mua thêm ${formatCurrency(evaluation.shortfall)}`;
}

/** " shoplite10 " -> "SHOPLITE10" */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Số tiền giảm: làm tròn xuống đến đồng, không vượt mức tối đa và không vượt tạm tính. */
export function calculateCouponDiscount(rule: CouponRule, subtotal: number): number {
  const raw =
    rule.type === "percent"
      ? Math.min(Math.floor((subtotal * rule.percent) / 100), rule.maxDiscount)
      : rule.amount;
  return Math.max(0, Math.min(raw, subtotal));
}

/** Hết hạn khi now >= expiresAt. Chỉ server gọi hàm này với đồng hồ máy chủ (FR-021). */
export function isCouponExpired(rule: CouponRule, now: Date): boolean {
  if (rule.expiresAt === undefined) return false;
  return now.getTime() >= new Date(rule.expiresAt).getTime();
}

/** Đánh giá mã theo tạm tính. Không xét hết hạn. */
export function evaluateCoupon(rule: CouponRule, subtotal: number): CouponEvaluation {
  if (rule.minSubtotal !== undefined && subtotal < rule.minSubtotal) {
    return {
      status: "below_minimum",
      minSubtotal: rule.minSubtotal,
      shortfall: rule.minSubtotal - subtotal,
    };
  }
  return {
    status: "applied",
    discount: calculateCouponDiscount(rule, subtotal),
  };
}

/**
 * Quy tắc tính tiền dùng chung cho giỏ hàng (client) và tạo đơn hàng (server).
 * Server luôn tính lại bằng hàm này - không tin số tiền gửi từ client.
 */

import type { DiscountRule } from "@/features/coupons/types";

export const SHIPPING_METHODS = ["standard", "express"] as const;

export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const SHIPPING_OPTIONS: Record<
  ShippingMethod,
  { label: string; description: string; fee: number }
> = {
  standard: { label: "Giao hàng tiêu chuẩn", description: "3–5 ngày làm việc", fee: 30_000 },
  express: { label: "Giao hàng nhanh", description: "1–2 ngày làm việc", fee: 60_000 },
};

/** Đơn từ mức này trở lên được miễn phí giao hàng tiêu chuẩn. */
export const FREE_SHIPPING_THRESHOLD = 500_000;

export interface PriceLine {
  unitPrice: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  /** Số tiền được giảm bởi mã giảm giá (0 nếu không có mã). */
  discount: number;
  shippingFee: number;
  total: number;
}

export function calculateSubtotal(lines: PriceLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

export function calculateShippingFee(subtotal: number, method: ShippingMethod): number {
  if (subtotal <= 0) return 0;
  if (method === "standard" && subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_OPTIONS[method].fee;
}

/**
 * Số tiền mã giảm giá mang lại trên tạm tính (trước phí giao hàng).
 * - Mã phần trăm: làm tròn xuống đến đồng, không vượt mức giảm tối đa của mã.
 * - Mã cố định: không vượt quá tạm tính để tổng tiền hàng không bao giờ âm.
 * - Tạm tính <= 0 thì không giảm.
 */
export function calculateCouponDiscount(rule: DiscountRule, subtotal: number): number {
  if (subtotal <= 0) return 0;
  if (rule.type === "percent") {
    return Math.min(Math.floor((subtotal * rule.percent) / 100), rule.maxDiscount);
  }
  return Math.min(rule.amount, subtotal);
}

/**
 * Tổng tiền đơn hàng = tạm tính - giảm giá + phí giao hàng.
 * Phí giao hàng (và ngưỡng miễn phí) luôn tính trên tạm tính TRƯỚC giảm giá.
 */
export function calculateOrderTotals(
  lines: PriceLine[],
  method: ShippingMethod,
  rule?: DiscountRule | null,
): OrderTotals {
  const subtotal = calculateSubtotal(lines);
  const discount = rule ? calculateCouponDiscount(rule, subtotal) : 0;
  const shippingFee = calculateShippingFee(subtotal, method);
  return {
    subtotal,
    discount,
    shippingFee,
    total: subtotal - discount + shippingFee,
  };
}

/** Số tiền cần mua thêm để được miễn phí giao hàng tiêu chuẩn. */
export function amountUntilFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}

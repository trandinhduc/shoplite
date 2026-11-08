/**
 * Quy tắc tính tiền dùng chung cho giỏ hàng (client) và tạo đơn hàng (server).
 * Server luôn tính lại bằng hàm này - không tin số tiền gửi từ client.
 */

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

export function calculateOrderTotals(lines: PriceLine[], method: ShippingMethod): OrderTotals {
  const subtotal = calculateSubtotal(lines);
  const shippingFee = calculateShippingFee(subtotal, method);
  return { subtotal, shippingFee, total: subtotal + shippingFee };
}

/** Số tiền cần mua thêm để được miễn phí giao hàng tiêu chuẩn. */
export function amountUntilFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}

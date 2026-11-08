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
  standard: {
    label: "Giao hàng tiêu chuẩn",
    description: "3–5 ngày làm việc",
    fee: 30_000,
  },
  express: {
    label: "Giao hàng nhanh",
    description: "1–2 ngày làm việc",
    fee: 60_000,
  },
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
  /** Số tiền giảm (đồng), nằm trong khoảng [0, subtotal]. */
  discountAmount: number;
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
 * Tổng tiền đơn hàng. Phí giao hàng (và ngưỡng miễn phí) luôn xét trên tiền hàng TRƯỚC giảm giá.
 * `discountAmount` không hợp lệ (âm, không nguyên) coi như 0 và bị chặn ở mức tiền hàng.
 */
export function calculateOrderTotals(
  lines: PriceLine[],
  method: ShippingMethod,
  discountAmount = 0,
): OrderTotals {
  const subtotal = calculateSubtotal(lines);
  const shippingFee = calculateShippingFee(subtotal, method);
  const discount = Number.isInteger(discountAmount) && discountAmount > 0 ? discountAmount : 0;
  const appliedDiscount = Math.min(discount, Math.max(subtotal, 0));
  return {
    subtotal,
    shippingFee,
    discountAmount: appliedDiscount,
    total: subtotal - appliedDiscount + shippingFee,
  };
}

/** Số tiền cần mua thêm để được miễn phí giao hàng tiêu chuẩn. */
export function amountUntilFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}

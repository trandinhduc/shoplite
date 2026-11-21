export type CouponType = "percentage" | "fixed";

export interface Coupon {
  code: string;
  type: CouponType;
  /** Giá trị giảm: phần trăm (ví dụ 10 = 10%) hoặc số tiền cố định (VND). */
  value: number;
  /** Mức giảm tối đa cho mã phần trăm (VND). */
  maxDiscount?: number;
  /** Giá trị đơn hàng tối thiểu để áp dụng mã (VND). */
  minOrderValue?: number;
  /** Ngày giờ hết hạn (chuỗi ISO 8601). */
  expiresAt?: string;
  description: string;
}

export const INITIAL_PROMOTIONS: Coupon[] = [
  {
    code: "SHOPLITE10",
    type: "percentage",
    value: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
    description: "Giảm 10%, tối đa 100.000 ₫ cho đơn từ 300.000 ₫",
  },
  {
    code: "GIAM50K",
    type: "fixed",
    value: 50_000,
    minOrderValue: 500_000,
    description: "Giảm 50.000 ₫ cho đơn từ 500.000 ₫",
  },
  {
    code: "TET2026",
    type: "percentage",
    value: 15,
    maxDiscount: 200_000,
    expiresAt: "2026-02-28T23:59:59+07:00",
    description: "Giảm 15%, tối đa 200.000 ₫ (hết hạn ngày 28/02/2026)",
  },
];


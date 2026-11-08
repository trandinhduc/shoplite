import type { Coupon } from "@/features/coupons/types";

/**
 * Danh mục mã giảm giá mẫu của ShopLite (read-only in-memory catalog).
 * Tuân thủ nguyên tắc đơn giản trước (Simplicity & YAGNI First).
 */
export const coupons: Coupon[] = [
  {
    code: "SHOPLITE10",
    type: "percentage",
    value: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
    expiresAt: null,
    description: "Giảm 10% tối đa 100.000 ₫ cho đơn từ 300.000 ₫",
  },
  {
    code: "GIAM50K",
    type: "fixed",
    value: 50_000,
    maxDiscount: null,
    minOrderValue: 500_000,
    expiresAt: null,
    description: "Giảm 50.000 ₫ cho đơn từ 500.000 ₫",
  },
  {
    code: "TET2026",
    type: "percentage",
    value: 15,
    maxDiscount: 200_000,
    minOrderValue: 500_000,
    expiresAt: "2026-02-28", // Đã hết hạn (dùng kiểm thử mã hết hạn)
    description: "Khuyến mãi Tết 2026 - Giảm 15% tối đa 200.000 ₫ cho đơn từ 500.000 ₫",
  },
];

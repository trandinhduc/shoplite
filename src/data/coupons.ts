// src/data/coupons.ts
// Danh sách coupon tĩnh dùng cho chức năng giảm giá.

import type { Coupon } from "@/features/coupons/types";

export const COUPONS: Coupon[] = [
  {
    code: "SHOPLITE10",
    type: "percentage",
    value: 10, // phần trăm
    maxDiscount: 100_000, // VND
    minOrderValue: 300_000, // VND
    description: "Giảm 10% tối đa 100.000₫, áp dụng cho đơn trên 300.000₫",
    expiresAt: null, // không hết hạn
    usageLimit: null,
    usedCount: 0,
  },
  {
    code: "GIAM50K",
    type: "fixed",
    value: 50_000, // VND
    description: "Giảm cố định 50.000₫",
    expiresAt: null,
    usageLimit: null,
    usedCount: 0,
  },
];


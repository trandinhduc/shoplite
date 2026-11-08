import type { Coupon } from "@/features/coupons/types";

/**
 * Danh sách mã giảm giá (read-only), giống cách khai báo của products.ts.
 * `TET2026` đã hết hạn - dùng để kiểm thử trường hợp mã hết hạn.
 */
export const COUPONS: Coupon[] = [
  {
    code: "SHOPLITE10",
    type: "percent",
    value: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
  },
  {
    code: "GIAM50K",
    type: "fixed",
    value: 50_000,
    minOrderValue: 500_000,
  },
  {
    code: "TET2026",
    type: "percent",
    value: 15,
    maxDiscount: 200_000,
    expiresOn: "2026-02-28",
  },
];

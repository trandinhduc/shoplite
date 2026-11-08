import type { Coupon } from "@/features/coupons/types";

/**
 * Danh sách mã giảm giá (read-only). Giá trị tiền tính bằng VND.
 * Chỉ đọc từ code server (features/coupons/coupon-service.ts) để không lộ danh sách mã ra client.
 */
export const coupons: Coupon[] = [
  {
    code: "SHOPLITE10",
    type: "percent",
    value: 10,
    maxDiscount: 100_000,
    minSubtotal: 300_000,
  },
  {
    code: "GIAM50K",
    type: "fixed",
    value: 50_000,
    minSubtotal: 500_000,
  },
  {
    // Đã hết hạn - dùng để kiểm thử mã hết hạn.
    code: "TET2026",
    type: "percent",
    value: 15,
    maxDiscount: 200_000,
    expiresOn: "2026-02-28",
  },
];

import type { CouponRule } from "@/features/coupons/types";

/**
 * Danh sách mã giảm giá (read-only). Tiền tính bằng VND.
 * CHỈ dùng phía server: không import vào Client Component để không lộ danh sách mã (FR-020).
 */
export const coupons: CouponRule[] = [
  {
    code: "SHOPLITE10",
    type: "percent",
    percent: 10,
    maxDiscount: 100_000,
    minSubtotal: 300_000,
  },
  { code: "GIAM50K", type: "fixed", amount: 50_000, minSubtotal: 500_000 },
  {
    code: "TET2026",
    type: "percent",
    percent: 15,
    maxDiscount: 200_000,
    // Dùng được đến hết ngày 28/02/2026 giờ Việt Nam.
    expiresAt: "2026-03-01T00:00:00+07:00",
  },
];

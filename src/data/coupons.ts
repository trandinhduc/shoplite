import type { CouponDefinition } from "@/features/coupons/types";

/**
 * Danh sách mã giảm giá (read-only, FR-022).
 * Chỉ import từ server (route handler, order-service) để không lộ danh sách mã ra trình duyệt.
 */
export const COUPONS: readonly CouponDefinition[] = [
  {
    code: "SHOPLITE10",
    type: "percent",
    value: 10,
    maxDiscount: 100_000,
    minSubtotal: 300_000,
  },
  { code: "GIAM50K", type: "fixed", value: 50_000, minSubtotal: 500_000 },
  {
    code: "TET2026",
    type: "percent",
    value: 15,
    maxDiscount: 200_000,
    expiresOn: "2026-02-28",
  },
];

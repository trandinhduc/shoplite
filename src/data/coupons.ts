import type { Coupon } from "@/features/coupons/coupon-rules";

/**
 * Danh sách mã giảm giá (read-only). Chỉ import từ code chạy trên server
 * (xem features/coupons/coupon-service.ts) để danh sách không lộ ra trình duyệt.
 */
export const coupons: Coupon[] = [
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

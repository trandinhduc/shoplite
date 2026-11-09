import type { Coupon } from "@/features/coupons/types";

/** Danh sách mã giảm giá mẫu, read-only. Giá trị tiền tính bằng VND. */
export const coupons: Coupon[] = [
  {
    code: "SHOPLITE10",
    kind: "percentage",
    value: 10,
    maximumDiscount: 100_000,
    minimumSubtotal: 300_000,
  },
  {
    code: "GIAM50K",
    kind: "fixed",
    value: 50_000,
    minimumSubtotal: 500_000,
  },
  {
    code: "TET2026",
    kind: "percentage",
    value: 15,
    maximumDiscount: 200_000,
    minimumSubtotal: 0,
    expiresOn: "2026-02-28",
  },
];

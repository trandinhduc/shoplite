import type { Coupon } from "@/features/coupons/types";

/**
 * Danh sách mã giảm giá (read-only). Giá trị tính bằng VND.
 *
 * CHỈ import phía server (qua `features/coupons/coupon-service.ts`). Không import vào Client
 * Component, nếu không toàn bộ mã sẽ lộ trong bundle của trình duyệt (FR-022a).
 */
export const coupons: Coupon[] = [
  {
    code: "SHOPLITE10",
    type: "percentage",
    value: 10,
    maxDiscount: 100_000,
    minSubtotal: 300_000,
  },
  { code: "GIAM50K", type: "fixed", value: 50_000, minSubtotal: 500_000 },
  {
    code: "TET2026",
    type: "percentage",
    value: 15,
    maxDiscount: 200_000,
    // Đã hết hạn — dùng để kiểm thử thông báo "Mã giảm giá đã hết hạn".
    expiresOn: "2026-02-28",
  },
];

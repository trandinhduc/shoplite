import type { Coupon } from "@/features/coupons/types";

/**
 * Danh sách mã giảm giá (read-only). Số tiền tính bằng VND.
 * CHỈ import từ server (route handler / service): không để danh sách mã lọt vào bundle của trình duyệt.
 * Trình duyệt chỉ nhận quy tắc của đúng mã được hỏi, qua POST /api/coupons/validate.
 */
export const coupons: Coupon[] = [
  {
    code: "SHOPLITE10",
    type: "percent",
    percent: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
  },
  {
    code: "GIAM50K",
    type: "fixed",
    amount: 50_000,
    minOrderValue: 500_000,
  },
  {
    // Đã hết hạn - dùng để kiểm thử trường hợp mã hết hạn.
    code: "TET2026",
    type: "percent",
    percent: 15,
    maxDiscount: 200_000,
    expiresOn: "2026-02-28",
  },
];

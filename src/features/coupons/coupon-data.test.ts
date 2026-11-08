import { describe, expect, it } from "vitest";
import { coupons } from "@/data/coupons";
import { normalizeCouponCode } from "./coupon-rules";

describe("dữ liệu mã giảm giá", () => {
  it("mã là duy nhất và đã chuẩn hóa", () => {
    const codes = coupons.map((coupon) => coupon.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toBe(normalizeCouponCode(code));
      expect(code).not.toMatch(/\s/);
    }
  });

  it("mỗi mã có đủ trường hợp lệ theo loại", () => {
    for (const coupon of coupons) {
      if (coupon.type === "percent") {
        expect(coupon.percent).toBeGreaterThanOrEqual(1);
        expect(coupon.percent).toBeLessThanOrEqual(100);
        expect(coupon.maxDiscount).toBeGreaterThan(0);
      } else {
        expect(coupon.amount).toBeGreaterThan(0);
      }
      if (coupon.minSubtotal !== undefined) {
        expect(coupon.minSubtotal).toBeGreaterThanOrEqual(0);
      }
      if (coupon.expiresAt !== undefined) {
        expect(Number.isNaN(Date.parse(coupon.expiresAt))).toBe(false);
      }
    }
  });

  it("có đúng 3 mã khuyến mãi ban đầu", () => {
    expect(coupons).toEqual([
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
        expiresAt: "2026-03-01T00:00:00+07:00",
      },
    ]);
  });
});

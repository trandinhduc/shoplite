import { describe, expect, it } from "vitest";
import { coupons } from "@/data/coupons";
import { normalizeCouponCode } from "./coupon-rules";

describe("dữ liệu mã giảm giá (src/data/coupons.ts)", () => {
  it("mã là duy nhất và đã ở dạng chuẩn hóa", () => {
    const codes = coupons.map((coupon) => coupon.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toBe(normalizeCouponCode(code));
    }
  });

  it("giá trị giảm hợp lệ theo từng loại", () => {
    for (const coupon of coupons) {
      if (coupon.type === "percentage") {
        expect(coupon.value).toBeGreaterThan(0);
        expect(coupon.value).toBeLessThanOrEqual(100);
        expect(coupon.maxDiscount).toBeGreaterThan(0);
      } else {
        expect(coupon.value).toBeGreaterThan(0);
      }
    }
  });

  it("ngày hết hạn đúng định dạng YYYY-MM-DD", () => {
    for (const coupon of coupons) {
      if (coupon.expiresOn !== undefined) {
        expect(coupon.expiresOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("có đúng 3 mã khuyến mãi ban đầu", () => {
    expect(coupons).toEqual([
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
        expiresOn: "2026-02-28",
      },
    ]);
  });
});

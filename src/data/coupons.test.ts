import { describe, expect, it } from "vitest";
import { COUPONS } from "./coupons";

describe("COUPONS", () => {
  it("có đúng 3 mã khởi tạo", () => {
    expect(COUPONS.map((coupon) => coupon.code)).toEqual(["SHOPLITE10", "GIAM50K", "TET2026"]);
  });

  it("SHOPLITE10: giảm 10%, tối đa 100.000, đơn từ 300.000", () => {
    expect(COUPONS.find((c) => c.code === "SHOPLITE10")).toEqual({
      code: "SHOPLITE10",
      type: "percent",
      value: 10,
      maxDiscount: 100_000,
      minOrderValue: 300_000,
    });
  });

  it("GIAM50K: giảm 50.000, đơn từ 500.000", () => {
    expect(COUPONS.find((c) => c.code === "GIAM50K")).toEqual({
      code: "GIAM50K",
      type: "fixed",
      value: 50_000,
      minOrderValue: 500_000,
    });
  });

  it("TET2026: giảm 15%, tối đa 200.000, hết hạn 2026-02-28", () => {
    expect(COUPONS.find((c) => c.code === "TET2026")).toEqual({
      code: "TET2026",
      type: "percent",
      value: 15,
      maxDiscount: 200_000,
      expiresOn: "2026-02-28",
    });
  });

  describe("bất biến", () => {
    it("mã viết hoa và duy nhất", () => {
      const codes = COUPONS.map((coupon) => coupon.code);
      expect(new Set(codes).size).toBe(codes.length);
      for (const code of codes) expect(code).toBe(code.toUpperCase());
    });

    it("percent có value từ 1 đến 100, fixed có value > 0", () => {
      for (const coupon of COUPONS) {
        if (coupon.type === "percent") {
          expect(coupon.value).toBeGreaterThanOrEqual(1);
          expect(coupon.value).toBeLessThanOrEqual(100);
        } else {
          expect(coupon.value).toBeGreaterThan(0);
        }
      }
    });

    it("maxDiscount chỉ có ở loại percent", () => {
      for (const coupon of COUPONS) {
        if (coupon.type === "fixed") expect(coupon.maxDiscount).toBeUndefined();
      }
    });

    it("expiresOn đúng định dạng YYYY-MM-DD", () => {
      for (const coupon of COUPONS) {
        if (coupon.expiresOn !== undefined) {
          expect(coupon.expiresOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    });
  });
});

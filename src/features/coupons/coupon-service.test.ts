import { describe, expect, it } from "vitest";
import { coupons } from "@/data/coupons";
import { findCoupon, lookupCoupon } from "./coupon-service";

describe("findCoupon", () => {
  it("tìm mã không phân biệt hoa/thường và khoảng trắng", () => {
    expect(findCoupon(" shoplite10 ")?.code).toBe("SHOPLITE10");
  });

  it("trả undefined với mã không tồn tại", () => {
    expect(findCoupon("KHONGCO")).toBeUndefined();
  });
});

describe("lookupCoupon", () => {
  it("trả định nghĩa mã, kể cả mã đã hết hạn", () => {
    expect(lookupCoupon("tet2026")).toEqual({
      ok: true,
      coupon: findCoupon("TET2026"),
    });
  });

  it("báo COUPON_NOT_FOUND với mã không tồn tại", () => {
    expect(lookupCoupon("KHONGCO")).toEqual({
      ok: false,
      code: "COUPON_NOT_FOUND",
      message: "Mã giảm giá không tồn tại",
    });
  });
});

describe("dữ liệu mã giảm giá", () => {
  it("mã viết HOA, không khoảng trắng và không trùng", () => {
    const codes = coupons.map((coupon) => coupon.code);
    for (const code of codes) expect(code).toMatch(/^[A-Z0-9]+$/);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("giá trị của từng loại mã hợp lệ", () => {
    for (const coupon of coupons) {
      if (coupon.type === "percent") {
        expect(Number.isInteger(coupon.value)).toBe(true);
        expect(coupon.value).toBeGreaterThanOrEqual(1);
        expect(coupon.value).toBeLessThanOrEqual(100);
        expect(coupon.maxDiscount).toBeGreaterThan(0);
      } else {
        expect(coupon.value).toBeGreaterThan(0);
        expect(coupon).not.toHaveProperty("maxDiscount");
      }
      if (coupon.minSubtotal !== undefined)
        expect(coupon.minSubtotal).toBeGreaterThanOrEqual(0);
      if (coupon.expiresOn !== undefined)
        expect(coupon.expiresOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("có đủ ba mã khuyến mãi ban đầu", () => {
    expect(findCoupon("SHOPLITE10")).toEqual({
      code: "SHOPLITE10",
      type: "percent",
      value: 10,
      maxDiscount: 100_000,
      minSubtotal: 300_000,
    });
    expect(findCoupon("GIAM50K")).toEqual({
      code: "GIAM50K",
      type: "fixed",
      value: 50_000,
      minSubtotal: 500_000,
    });
    expect(findCoupon("TET2026")).toEqual({
      code: "TET2026",
      type: "percent",
      value: 15,
      maxDiscount: 200_000,
      expiresOn: "2026-02-28",
    });
  });
});

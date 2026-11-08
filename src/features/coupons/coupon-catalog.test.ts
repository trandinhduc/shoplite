import { describe, expect, it } from "vitest";
import { COUPONS } from "@/data/coupons";
import { findCoupon } from "./coupon-catalog";

describe("findCoupon", () => {
  it("tìm mã không phân biệt hoa/thường và bỏ khoảng trắng", () => {
    expect(findCoupon(" giam50k ")).toEqual({
      code: "GIAM50K",
      type: "fixed",
      value: 50_000,
      minSubtotal: 500_000,
    });
  });

  it("trả về undefined khi mã không tồn tại", () => {
    expect(findCoupon("KHONGCO")).toBeUndefined();
  });
});

describe("dữ liệu COUPONS", () => {
  it("mọi mã là chữ HOA, không khoảng trắng và duy nhất", () => {
    const codes = COUPONS.map((coupon) => coupon.code);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z0-9]+$/);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("mã phần trăm có giá trị nguyên 1–100 và mức tối đa > 0; mã cố định có giá trị > 0", () => {
    for (const coupon of COUPONS) {
      if (coupon.type === "percent") {
        expect(Number.isInteger(coupon.value)).toBe(true);
        expect(coupon.value).toBeGreaterThanOrEqual(1);
        expect(coupon.value).toBeLessThanOrEqual(100);
        expect(coupon.maxDiscount).toBeGreaterThan(0);
      } else {
        expect(coupon.value).toBeGreaterThan(0);
        expect(coupon).not.toHaveProperty("maxDiscount");
      }
    }
  });

  it("khớp đúng bảng mã ban đầu (FR-022)", () => {
    expect(COUPONS).toEqual([
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
    ]);
  });
});

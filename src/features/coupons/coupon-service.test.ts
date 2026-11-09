import { describe, expect, it } from "vitest";
import { coupons } from "@/data/coupons";
import {
  calculateCouponDiscount,
  evaluateCoupon,
  normalizeCouponCode,
} from "./coupon-service";

describe("coupon service", () => {
  it("chuẩn hóa mã bằng cách trim và uppercase", () => {
    expect(normalizeCouponCode("  shoplite10 ")).toBe("SHOPLITE10");
  });

  it("cung cấp đúng ba mã khuyến mãi ban đầu", () => {
    expect(coupons.map((coupon) => coupon.code)).toEqual([
      "SHOPLITE10",
      "GIAM50K",
      "TET2026",
    ]);
  });

  it("tính giảm phần trăm và áp dụng mức tối đa", () => {
    const coupon = coupons.find((item) => item.code === "SHOPLITE10")!;
    expect(calculateCouponDiscount(coupon, 900_000)).toBe(90_000);
    expect(calculateCouponDiscount(coupon, 2_000_000)).toBe(100_000);
  });

  it("tính giảm cố định", () => {
    const coupon = coupons.find((item) => item.code === "GIAM50K")!;
    expect(calculateCouponDiscount(coupon, 500_000)).toBe(50_000);
  });

  it("đánh giá TET2026 còn hợp lệ trong ngày hết hạn", () => {
    const result = evaluateCoupon(
      "TET2026",
      500_000,
      new Date("2026-02-28T16:59:59.000Z"),
    );
    expect(result).toMatchObject({
      valid: true,
      normalizedCode: "TET2026",
      discountAmount: 75_000,
    });
  });

  it("phân biệt mã không tồn tại, hết hạn và chưa đạt tối thiểu", () => {
    expect(evaluateCoupon("UNKNOWN", 500_000)).toMatchObject({
      valid: false,
      reason: "not_found",
    });
    expect(
      evaluateCoupon("TET2026", 500_000, new Date("2026-03-01T00:00:00.000Z")),
    ).toMatchObject({ valid: false, reason: "expired" });
    expect(evaluateCoupon("GIAM50K", 420_000)).toMatchObject({
      valid: false,
      reason: "minimum_subtotal",
      minimumShortfall: 80_000,
    });
    expect(evaluateCoupon("GIAM50K", 500_000)).toMatchObject({ valid: true });
  });
});

// src/features/coupons/__tests__/coupon-service.test.ts
import { describe, expect, it } from "vitest";
import { couponService } from "../coupon-service";
import { COUPONS } from "@/data/coupons";

describe("Coupon Service - validateCoupon", () => {
  it("happy path: valid coupon with discount cap", () => {
    const subtotal = 1_200_000; // 1.2M VND
    const result = couponService.validateCoupon("SHOPLITE10", subtotal);
    expect(result.valid).toBe(true);
    if (result.valid) {
      // 10% of 1.2M = 120k, but maxDiscount is 100k
      expect(result.discountAmount).toBe(100_000);
      expect(result.coupon.code).toBe("SHOPLITE10");
    }
  });

  it("coupon not found returns error", () => {
    const result = couponService.validateCoupon("UNKNOWN", 500_000);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCode).toBe("COUPON_NOT_FOUND");
      expect(result.message).toBe("Mã giảm giá không tồn tại");
    }
  });
});


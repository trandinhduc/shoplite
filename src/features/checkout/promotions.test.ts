import { describe, expect, it } from "vitest";
import type { Coupon } from "@/data/promotions";
import {
  calculateDiscountAmount,
  findCoupon,
  normalizeCouponCode,
  validateCoupon,
} from "./promotions";

const TEST_COUPONS: Coupon[] = [
  {
    code: "PERCENT10",
    type: "percentage",
    value: 10,
    maxDiscount: 50_000,
    minOrderValue: 200_000,
    description: "Giảm 10%, tối đa 50k từ 200k",
  },
  {
    code: "FIXED30K",
    type: "fixed",
    value: 30_000,
    minOrderValue: 100_000,
    description: "Giảm 30k từ 100k",
  },
  {
    code: "EXPIRED",
    type: "percentage",
    value: 20,
    expiresAt: "2026-01-01T00:00:00.000Z",
    description: "Mã đã hết hạn",
  },
];

describe("normalizeCouponCode", () => {
  it("chuẩn hóa khoảng trắng và chuyển chữ hoa", () => {
    expect(normalizeCouponCode("  shoplite10  ")).toBe("SHOPLITE10");
    expect(normalizeCouponCode("giam50k")).toBe("GIAM50K");
  });
});

describe("calculateDiscountAmount", () => {
  it("tính giảm theo % khi chưa chạm mức tối đa", () => {
    const coupon: Coupon = {
      code: "TEST",
      type: "percentage",
      value: 10,
      maxDiscount: 100_000,
      description: "Test",
    };
    expect(calculateDiscountAmount(coupon, 400_000)).toBe(40_000);
  });

  it("giới hạn theo trần tối đa (maxDiscount) khi tính %", () => {
    const coupon: Coupon = {
      code: "TEST",
      type: "percentage",
      value: 10,
      maxDiscount: 50_000,
      description: "Test",
    };
    expect(calculateDiscountAmount(coupon, 1_000_000)).toBe(50_000);
  });

  it("tính giảm tiền cố định", () => {
    const coupon: Coupon = {
      code: "TEST",
      type: "fixed",
      value: 50_000,
      description: "Test",
    };
    expect(calculateDiscountAmount(coupon, 300_000)).toBe(50_000);
  });

  it("không giảm vượt quá giá trị đơn hàng để tránh âm tiền", () => {
    const coupon: Coupon = {
      code: "TEST",
      type: "fixed",
      value: 50_000,
      description: "Test",
    };
    expect(calculateDiscountAmount(coupon, 30_000)).toBe(30_000);
  });
});

describe("validateCoupon", () => {
  const now = () => new Date("2026-06-01T12:00:00.000Z");

  it("báo lỗi khi mã không tồn tại", () => {
    const result = validateCoupon("NOTFOUND", 500_000, { coupons: TEST_COUPONS, now });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("COUPON_NOT_FOUND");
      expect(result.message).toBe("Mã giảm giá không tồn tại");
    }
  });

  it("báo lỗi khi mã đã hết hạn", () => {
    const result = validateCoupon("EXPIRED", 500_000, { coupons: TEST_COUPONS, now });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("COUPON_EXPIRED");
      expect(result.message).toBe("Mã giảm giá đã hết hạn sử dụng");
    }
  });

  it("báo lỗi khi đơn chưa đạt giá trị tối thiểu và chỉ rõ số tiền cần mua thêm", () => {
    const result = validateCoupon("PERCENT10", 150_000, { coupons: TEST_COUPONS, now });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("COUPON_MIN_ORDER_NOT_MET");
      expect(result.amountNeeded).toBe(50_000);
      expect(result.message).toContain("200.000");
      expect(result.message).toContain("50.000");
    }
  });

  it("hợp lệ khi đơn đạt đúng giá trị tối thiểu", () => {
    const result = validateCoupon("PERCENT10", 200_000, { coupons: TEST_COUPONS, now });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.coupon.code).toBe("PERCENT10");
      expect(result.discountAmount).toBe(20_000);
    }
  });

  it("hợp lệ với mã giảm cố định khi đủ điều kiện", () => {
    const result = validateCoupon("fixed30k", 100_000, { coupons: TEST_COUPONS, now });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.coupon.code).toBe("FIXED30K");
      expect(result.discountAmount).toBe(30_000);
    }
  });
});

describe("findCoupon", () => {
  it("tìm mã không phân biệt hoa thường", () => {
    const coupon = findCoupon("shoplite10");
    expect(coupon).toBeDefined();
    expect(coupon?.code).toBe("SHOPLITE10");
  });
});


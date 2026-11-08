import { describe, expect, it } from "vitest";
import {
  calculateDiscount,
  findCouponByCode,
  normalizeCouponCode,
  validateCoupon,
} from "./coupon-service";
import type { Coupon } from "./types";

const TEST_COUPONS: Coupon[] = [
  {
    code: "SHOPLITE10",
    type: "percentage",
    value: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
    expiresAt: null,
    description: "Giảm 10% tối đa 100.000 ₫ cho đơn từ 300.000 ₫",
  },
  {
    code: "GIAM50K",
    type: "fixed",
    value: 50_000,
    maxDiscount: null,
    minOrderValue: 500_000,
    expiresAt: null,
    description: "Giảm 50.000 ₫ cho đơn từ 500.000 ₫",
  },
  {
    code: "BIGSALE",
    type: "percentage",
    value: 20,
    maxDiscount: null, // Không giới hạn trần
    minOrderValue: 200_000,
    expiresAt: null,
    description: "Giảm 20% không giới hạn trần",
  },
];

describe("normalizeCouponCode", () => {
  it("loại bỏ khoảng trắng ở 2 đầu", () => {
    expect(normalizeCouponCode("   SHOPLITE10   ")).toBe("SHOPLITE10");
  });

  it("chuyển đổi chữ thường thành chữ in hoa", () => {
    expect(normalizeCouponCode("shoplite10")).toBe("SHOPLITE10");
    expect(normalizeCouponCode("giam50k")).toBe("GIAM50K");
  });

  it("kết hợp vừa trim vừa in hoa", () => {
    expect(normalizeCouponCode("  tet2026  ")).toBe("TET2026");
  });
});

describe("findCouponByCode", () => {
  it("tìm thấy coupon khi truyền mã chính xác", () => {
    const coupon = findCouponByCode("SHOPLITE10", TEST_COUPONS);
    expect(coupon).toBeDefined();
    expect(coupon?.code).toBe("SHOPLITE10");
  });

  it("tìm thấy coupon khi người dùng nhập chữ thường hoặc có khoảng trắng", () => {
    const coupon = findCouponByCode("  shoplite10  ", TEST_COUPONS);
    expect(coupon).toBeDefined();
    expect(coupon?.code).toBe("SHOPLITE10");
  });

  it("trả về undefined nếu mã không tồn tại", () => {
    const coupon = findCouponByCode("KHONGTONTAI", TEST_COUPONS);
    expect(coupon).toBeUndefined();
  });
});

describe("calculateDiscount", () => {
  it("tính giảm giá theo % bị chặn ở mức tối đa (maxDiscount)", () => {
    // 10% của 1.290.000 ₫ = 129.000 ₫, nhưng maxDiscount là 100.000 ₫
    const coupon = TEST_COUPONS[0]; // SHOPLITE10
    const discount = calculateDiscount(coupon, 1_290_000);
    expect(discount).toBe(100_000);
  });

  it("tính giảm giá theo % khi chưa chạm mức trần tối đa", () => {
    // 10% của 500.000 ₫ = 50.000 ₫ (< 100.000 ₫)
    const coupon = TEST_COUPONS[0]; // SHOPLITE10
    const discount = calculateDiscount(coupon, 500_000);
    expect(discount).toBe(50_000);
  });

  it("tính giảm giá theo % khi không có mức giảm tối đa", () => {
    // 20% của 1.000.000 ₫ = 200.000 ₫
    const coupon = TEST_COUPONS[2]; // BIGSALE
    const discount = calculateDiscount(coupon, 1_000_000);
    expect(discount).toBe(200_000);
  });

  it("tính giảm giá cố định (fixed)", () => {
    const coupon = TEST_COUPONS[1]; // GIAM50K
    const discount = calculateDiscount(coupon, 600_000);
    expect(discount).toBe(50_000);
  });

  it("giảm giá không bao giờ vượt quá tạm tính tiền hàng", () => {
    const fixedCoupon: Coupon = {
      code: "SUPER100K",
      type: "fixed",
      value: 100_000,
      minOrderValue: 0,
      description: "Giảm 100k",
    };
    // Tạm tính chỉ 60.000 ₫ thì mức giảm tối đa chỉ là 60.000 ₫
    expect(calculateDiscount(fixedCoupon, 60_000)).toBe(60_000);
  });

  it("trả về 0 khi tạm tính bằng 0", () => {
    const coupon = TEST_COUPONS[0];
    expect(calculateDiscount(coupon, 0)).toBe(0);
  });
});

describe("validateCoupon - US1 Valid Cases", () => {
  it("xác thực thành công mã giảm % có trần (SHOPLITE10) cho đơn hàng đủ điều kiện", () => {
    const coupon = TEST_COUPONS[0]; // SHOPLITE10 (đơn từ 300k, giảm 10% max 100k)
    const result = validateCoupon(coupon, 1_290_000);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.coupon.code).toBe("SHOPLITE10");
      expect(result.discountAmount).toBe(100_000);
    }
  });

  it("xác thực thành công mã giảm số tiền cố định (GIAM50K) cho đơn hàng đủ điều kiện", () => {
    const coupon = TEST_COUPONS[1]; // GIAM50K (đơn từ 500k, giảm 50k)
    const result = validateCoupon(coupon, 600_000);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.coupon.code).toBe("GIAM50K");
      expect(result.discountAmount).toBe(50_000);
    }
  });
});

describe("validateCoupon - US2 Error Cases", () => {
  it("trả về lỗi COUPON_NOT_FOUND khi mã không tồn tại trong danh mục", () => {
    const result = validateCoupon(undefined, 500_000);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("COUPON_NOT_FOUND");
      expect(result.error.message).toBe("Mã giảm giá không tồn tại");
    }
  });

  it("trả về lỗi COUPON_EXPIRED khi mã đã hết hạn sử dụng", () => {
    const expiredCoupon: Coupon = {
      code: "TET2026",
      type: "percentage",
      value: 15,
      minOrderValue: 500_000,
      expiresAt: "2026-02-28",
      description: "Khuyến mãi Tết",
    };
    // Thời điểm hiện tại là 01/03/2026 sau hạn chót
    const now = new Date("2026-03-01T10:00:00+07:00");
    const result = validateCoupon(expiredCoupon, 600_000, now);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("COUPON_EXPIRED");
      expect(result.error.message).toBe("Mã giảm giá đã hết hạn sử dụng");
    }
  });

  it("trả về lỗi COUPON_MIN_ORDER_NOT_MET nêu rõ số tiền cần mua thêm khi chưa đủ giá trị tối thiểu", () => {
    const coupon = TEST_COUPONS[0]; // minOrderValue: 300.000 ₫
    const result = validateCoupon(coupon, 200_000);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("COUPON_MIN_ORDER_NOT_MET");
      expect(result.error.message).toContain("300.000 ₫");
      expect(result.error.message).toContain("cần mua thêm 100.000 ₫");
      expect(result.error.details?.amountNeeded).toBe("100000");
    }
  });
});

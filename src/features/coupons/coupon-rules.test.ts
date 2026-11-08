import { describe, expect, it } from "vitest";
import {
  calculateCouponDiscount,
  evaluateCoupon,
  isCouponExpired,
  normalizeCouponCode,
} from "./coupon-rules";
import type { CouponRule } from "./types";

const SHOPLITE10: CouponRule = {
  code: "SHOPLITE10",
  type: "percent",
  percent: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};

const GIAM50K: CouponRule = {
  code: "GIAM50K",
  type: "fixed",
  amount: 50_000,
  minSubtotal: 500_000,
};

const TET2026: CouponRule = {
  code: "TET2026",
  type: "percent",
  percent: 15,
  maxDiscount: 200_000,
  expiresAt: "2026-03-01T00:00:00+07:00",
};

describe("normalizeCouponCode", () => {
  it("bỏ khoảng trắng đầu/cuối và chuyển sang chữ in hoa", () => {
    expect(normalizeCouponCode(" shoplite10 ")).toBe("SHOPLITE10");
  });

  it("chuỗi chỉ có khoảng trắng thành chuỗi rỗng", () => {
    expect(normalizeCouponCode("   ")).toBe("");
  });
});

describe("calculateCouponDiscount", () => {
  it.each([
    [300_000, 30_000],
    [333_333, 33_333],
    [999_999, 99_999],
    [1_000_000, 100_000],
    [1_000_001, 100_000],
  ])(
    "mã phần trăm: tạm tính %i → giảm %i (làm tròn xuống, không vượt mức tối đa)",
    (subtotal, expected) => {
      expect(calculateCouponDiscount(SHOPLITE10, subtotal)).toBe(expected);
    },
  );

  it("mã cố định giảm đúng số tiền", () => {
    expect(calculateCouponDiscount(GIAM50K, 600_000)).toBe(50_000);
  });

  it("số tiền giảm không vượt quá tạm tính", () => {
    const fixedWithoutMinimum: CouponRule = {
      code: "X",
      type: "fixed",
      amount: 50_000,
    };
    expect(calculateCouponDiscount(fixedWithoutMinimum, 20_000)).toBe(20_000);
  });

  it("không âm khi tạm tính bằng 0", () => {
    expect(calculateCouponDiscount(SHOPLITE10, 0)).toBe(0);
  });
});

describe("isCouponExpired", () => {
  it("còn hạn đến hết ngày 28/02/2026 giờ Việt Nam", () => {
    expect(isCouponExpired(TET2026, new Date("2026-02-28T23:59:59.999+07:00"))).toBe(false);
  });

  it("hết hạn từ 00:00 ngày 01/03/2026 giờ Việt Nam", () => {
    expect(isCouponExpired(TET2026, new Date("2026-03-01T00:00:00+07:00"))).toBe(true);
  });

  it("mã không có ngày hết hạn thì không bao giờ hết hạn", () => {
    expect(isCouponExpired(SHOPLITE10, new Date("2099-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("evaluateCoupon", () => {
  it("đúng bằng giá trị tối thiểu thì được áp dụng", () => {
    expect(evaluateCoupon(SHOPLITE10, 300_000)).toEqual({
      status: "applied",
      discount: 30_000,
    });
  });

  it("thiếu 1đ so với giá trị tối thiểu thì chưa đủ điều kiện", () => {
    expect(evaluateCoupon(SHOPLITE10, 299_999)).toEqual({
      status: "below_minimum",
      minSubtotal: 300_000,
      shortfall: 1,
    });
  });

  it("báo đúng số tiền cần mua thêm", () => {
    expect(evaluateCoupon(GIAM50K, 420_000)).toEqual({
      status: "below_minimum",
      minSubtotal: 500_000,
      shortfall: 80_000,
    });
  });

  it("không xét hết hạn (hết hạn chỉ do server kiểm tra)", () => {
    expect(evaluateCoupon(TET2026, 1_000_000)).toEqual({
      status: "applied",
      discount: 150_000,
    });
  });
});

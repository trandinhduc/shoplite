import { describe, expect, it } from "vitest";
import {
  calculateCouponDiscount,
  checkCouponEligibility,
  isCouponExpired,
  normalizeCouponCode,
  type Coupon,
} from "./coupon-rules";

const SHOPLITE10: Coupon = {
  code: "SHOPLITE10",
  type: "percent",
  value: 10,
  maxDiscount: 100_000,
  minOrderValue: 300_000,
};
const GIAM50K: Coupon = {
  code: "GIAM50K",
  type: "fixed",
  value: 50_000,
  minOrderValue: 500_000,
};
const EXPIRING: Coupon = {
  code: "TET2026",
  type: "percent",
  value: 15,
  maxDiscount: 200_000,
  expiresOn: "2026-02-28",
};

describe("normalizeCouponCode", () => {
  it("bỏ khoảng trắng hai đầu và viết hoa", () => {
    expect(normalizeCouponCode(" giam50k ")).toBe("GIAM50K");
  });

  it("chuyển chữ và số full-width về dạng thường (NFKC)", () => {
    expect(normalizeCouponCode("ｓｈｏｐｌｉｔｅ１０")).toBe("SHOPLITE10");
  });
});

describe("calculateCouponDiscount", () => {
  it.each([
    [300_000, 30_000],
    [999_990, 99_999],
    [1_000_000, 100_000],
    [1_500_000, 100_000],
  ])("mã phần trăm với tạm tính %i giảm %i (không vượt mức tối đa)", (subtotal, discount) => {
    expect(calculateCouponDiscount(SHOPLITE10, subtotal)).toBe(discount);
  });

  it("làm tròn số tiền giảm theo phần trăm đến đồng", () => {
    expect(calculateCouponDiscount({ ...SHOPLITE10, maxDiscount: undefined }, 123_455)).toBe(
      12_346,
    );
  });

  it("mã số tiền cố định giảm đúng giá trị", () => {
    expect(calculateCouponDiscount(GIAM50K, 600_000)).toBe(50_000);
  });

  it("số tiền giảm không vượt quá tạm tính", () => {
    expect(calculateCouponDiscount(GIAM50K, 30_000)).toBe(30_000);
  });
});

describe("isCouponExpired", () => {
  it("mã không có ngày hết hạn thì không bao giờ hết hạn", () => {
    expect(isCouponExpired(SHOPLITE10, new Date("2099-01-01"))).toBe(false);
  });

  it("còn dùng được đến hết 23:59:59 ngày hết hạn theo giờ Việt Nam", () => {
    expect(isCouponExpired(EXPIRING, new Date("2026-02-28T23:59:59.999+07:00"))).toBe(false);
  });

  it("hết hạn từ 00:00 ngày hôm sau theo giờ Việt Nam", () => {
    expect(isCouponExpired(EXPIRING, new Date("2026-03-01T00:00:00+07:00"))).toBe(true);
  });
});

describe("checkCouponEligibility", () => {
  const now = new Date("2026-01-01T00:00:00+07:00");

  it("từ chối khi tạm tính dưới mức tối thiểu và cho biết cần mua thêm bao nhiêu", () => {
    expect(checkCouponEligibility(SHOPLITE10, 299_999, now)).toEqual({
      ok: false,
      reason: "min-order-not-met",
      minOrderValue: 300_000,
      amountNeeded: 1,
    });
  });

  it.each([300_000, 300_001])("chấp nhận khi tạm tính %i đạt mức tối thiểu", (subtotal) => {
    expect(checkCouponEligibility(SHOPLITE10, subtotal, now)).toEqual({
      ok: true,
      discount: 30_000,
    });
  });

  it("báo hết hạn trước khi kiểm tra giá trị tối thiểu", () => {
    const coupon = { ...EXPIRING, minOrderValue: 1_000_000 };
    expect(checkCouponEligibility(coupon, 100_000, new Date("2026-03-01T00:00:00+07:00"))).toEqual({
      ok: false,
      reason: "expired",
    });
  });
});

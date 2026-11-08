import { describe, expect, it } from "vitest";
import { evaluateCoupon, isCouponExpired, normalizeCouponCode } from "./coupon-rules";
import type { Coupon } from "./types";

const SHOPLITE10: Coupon = {
  code: "SHOPLITE10",
  type: "percent",
  percent: 10,
  maxDiscount: 100_000,
  minOrderValue: 300_000,
};
const GIAM50K: Coupon = {
  code: "GIAM50K",
  type: "fixed",
  amount: 50_000,
  minOrderValue: 500_000,
};
const TET2026: Coupon = {
  code: "TET2026",
  type: "percent",
  percent: 15,
  maxDiscount: 200_000,
  expiresOn: "2026-02-28",
};

const TRUOC_KHI_HET_HAN = new Date("2026-02-01T10:00:00+07:00");
const SAU_KHI_HET_HAN = new Date("2026-11-08T10:00:00+07:00");

describe("normalizeCouponCode", () => {
  it("bỏ khoảng trắng đầu cuối và chuyển thành chữ HOA", () => {
    expect(normalizeCouponCode(" shoplite10 ")).toBe("SHOPLITE10");
  });

  it("không sửa khoảng trắng ở giữa mã", () => {
    expect(normalizeCouponCode("shop lite10")).toBe("SHOP LITE10");
  });

  it("chuỗi chỉ có khoảng trắng thành chuỗi rỗng", () => {
    expect(normalizeCouponCode("   ")).toBe("");
  });
});

describe("isCouponExpired", () => {
  it("còn hạn đến hết ngày hết hạn theo giờ Việt Nam", () => {
    expect(isCouponExpired(TET2026, new Date("2026-02-28T00:00:00+07:00"))).toBe(false);
    expect(isCouponExpired(TET2026, new Date("2026-02-28T23:59:59+07:00"))).toBe(false);
  });

  it("hết hạn từ 00:00 ngày kế tiếp theo giờ Việt Nam", () => {
    expect(isCouponExpired(TET2026, new Date("2026-03-01T00:00:00+07:00"))).toBe(true);
  });

  it("không phụ thuộc múi giờ của máy: 16:59 UTC vẫn là cuối ngày 28/02 ở Việt Nam", () => {
    expect(isCouponExpired(TET2026, new Date("2026-02-28T16:59:59Z"))).toBe(false);
    expect(isCouponExpired(TET2026, new Date("2026-02-28T17:00:00Z"))).toBe(true);
  });

  it("mã không có ngày hết hạn thì không bao giờ hết hạn", () => {
    expect(isCouponExpired(SHOPLITE10, new Date("2099-01-01T00:00:00+07:00"))).toBe(false);
  });
});

describe("evaluateCoupon", () => {
  it("mã không tồn tại", () => {
    expect(evaluateCoupon(undefined, 500_000, SAU_KHI_HET_HAN)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });

  it("mã đã hết hạn", () => {
    expect(evaluateCoupon(TET2026, 500_000, SAU_KHI_HET_HAN)).toEqual({
      ok: false,
      reason: "EXPIRED",
      coupon: TET2026,
    });
  });

  it("kiểm tra hết hạn trước khi kiểm tra đơn tối thiểu", () => {
    const hetHanVaCoToiThieu: Coupon = {
      ...SHOPLITE10,
      expiresOn: "2026-02-28",
    };
    const result = evaluateCoupon(hetHanVaCoToiThieu, 1, SAU_KHI_HET_HAN);
    expect(result).toMatchObject({ ok: false, reason: "EXPIRED" });
  });

  it.each([
    [299_999, 1],
    [250_000, 50_000],
  ])("SHOPLITE10 với tạm tính %i: cần mua thêm %i", (subtotal, missingAmount) => {
    expect(evaluateCoupon(SHOPLITE10, subtotal, SAU_KHI_HET_HAN)).toEqual({
      ok: false,
      reason: "MIN_ORDER_NOT_MET",
      coupon: SHOPLITE10,
      minOrderValue: 300_000,
      missingAmount,
    });
  });

  it.each([
    [300_000, 30_000],
    [300_001, 30_000],
  ])("SHOPLITE10 đạt mức tối thiểu: tạm tính %i giảm %i", (subtotal, discount) => {
    expect(evaluateCoupon(SHOPLITE10, subtotal, SAU_KHI_HET_HAN)).toEqual({
      ok: true,
      coupon: SHOPLITE10,
      discount,
    });
  });

  it("GIAM50K từ chối dưới 500.000 ₫ và chấp nhận đúng 500.000 ₫", () => {
    expect(evaluateCoupon(GIAM50K, 499_999, SAU_KHI_HET_HAN)).toMatchObject({
      ok: false,
      reason: "MIN_ORDER_NOT_MET",
      missingAmount: 1,
    });
    expect(evaluateCoupon(GIAM50K, 500_000, SAU_KHI_HET_HAN)).toMatchObject({
      ok: true,
      discount: 50_000,
    });
  });

  it("mã không có đơn tối thiểu dùng được với mọi tạm tính", () => {
    expect(evaluateCoupon(TET2026, 100_000, TRUOC_KHI_HET_HAN)).toMatchObject({
      ok: true,
      discount: 15_000,
    });
  });

  it("chặn mức giảm tối đa của mã phần trăm", () => {
    expect(evaluateCoupon(SHOPLITE10, 2_000_000, SAU_KHI_HET_HAN)).toMatchObject({
      ok: true,
      discount: 100_000,
    });
  });
});

import { describe, expect, it } from "vitest";
import type { DiscountRule } from "@/features/coupons/types";
import {
  amountUntilFreeShipping,
  calculateCouponDiscount,
  calculateOrderTotals,
  calculateShippingFee,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_OPTIONS,
} from "./pricing";

const GIAM_10_PHAN_TRAM: DiscountRule = {
  type: "percent",
  percent: 10,
  maxDiscount: 100_000,
};
const GIAM_50K: DiscountRule = { type: "fixed", amount: 50_000 };

describe("calculateShippingFee", () => {
  it("tính phí tiêu chuẩn khi đơn dưới ngưỡng miễn phí", () => {
    expect(calculateShippingFee(FREE_SHIPPING_THRESHOLD - 1, "standard")).toBe(
      SHIPPING_OPTIONS.standard.fee,
    );
  });

  it("miễn phí giao hàng tiêu chuẩn khi đơn đạt ngưỡng", () => {
    expect(calculateShippingFee(FREE_SHIPPING_THRESHOLD, "standard")).toBe(0);
  });

  it("giao hàng nhanh luôn tính phí", () => {
    expect(calculateShippingFee(5_000_000, "express")).toBe(SHIPPING_OPTIONS.express.fee);
  });

  it("không tính phí cho giỏ hàng trống", () => {
    expect(calculateShippingFee(0, "express")).toBe(0);
  });
});

describe("calculateOrderTotals", () => {
  it("cộng tạm tính và phí giao hàng", () => {
    const totals = calculateOrderTotals(
      [
        { unitPrice: 150_000, quantity: 2 },
        { unitPrice: 50_000, quantity: 1 },
      ],
      "standard",
    );
    expect(totals).toEqual({
      subtotal: 350_000,
      discount: 0,
      shippingFee: 30_000,
      total: 380_000,
    });
  });

  it("không giảm giá khi không có mã", () => {
    const lines = [{ unitPrice: 200_000, quantity: 1 }];
    expect(calculateOrderTotals(lines, "standard", null).discount).toBe(0);
    expect(calculateOrderTotals(lines, "standard", undefined).discount).toBe(0);
  });

  it("trừ giảm giá khỏi tổng tiền: tổng = tạm tính - giảm giá + phí giao hàng", () => {
    const totals = calculateOrderTotals(
      [{ unitPrice: 200_000, quantity: 2 }],
      "express",
      GIAM_10_PHAN_TRAM,
    );
    expect(totals).toEqual({
      subtotal: 400_000,
      discount: 40_000,
      shippingFee: 60_000,
      total: 420_000,
    });
  });

  it("miễn phí giao hàng tại đúng ngưỡng dù sau giảm giá tạm tính thấp hơn ngưỡng", () => {
    const totals = calculateOrderTotals(
      [{ unitPrice: FREE_SHIPPING_THRESHOLD, quantity: 1 }],
      "standard",
      GIAM_50K,
    );
    expect(totals.shippingFee).toBe(0);
    expect(totals.total).toBe(FREE_SHIPPING_THRESHOLD - 50_000);
  });

  it("vẫn tính phí giao hàng tiêu chuẩn khi tạm tính trước giảm giá dưới ngưỡng", () => {
    const totals = calculateOrderTotals(
      [{ unitPrice: FREE_SHIPPING_THRESHOLD - 1, quantity: 1 }],
      "standard",
      GIAM_50K,
    );
    expect(totals.shippingFee).toBe(SHIPPING_OPTIONS.standard.fee);
    expect(totals.total).toBe(FREE_SHIPPING_THRESHOLD - 1 - 50_000 + 30_000);
  });

  it("giao hàng nhanh vẫn tính phí khi có giảm giá", () => {
    const totals = calculateOrderTotals([{ unitPrice: 600_000, quantity: 1 }], "express", GIAM_50K);
    expect(totals.shippingFee).toBe(SHIPPING_OPTIONS.express.fee);
    expect(totals.total).toBe(600_000 - 50_000 + 60_000);
  });
});

describe("calculateCouponDiscount", () => {
  it("giảm theo phần trăm của tạm tính", () => {
    expect(calculateCouponDiscount(GIAM_10_PHAN_TRAM, 500_000)).toBe(50_000);
  });

  it("làm tròn xuống đến đồng khi phần trăm ra số lẻ", () => {
    expect(calculateCouponDiscount(GIAM_10_PHAN_TRAM, 333_335)).toBe(33_333);
  });

  it.each([
    [999_999, 99_999],
    [1_000_000, 100_000],
    [1_000_001, 100_000],
    [2_000_000, 100_000],
  ])("chặn mức giảm tối đa: tạm tính %i giảm %i", (subtotal, expected) => {
    expect(calculateCouponDiscount(GIAM_10_PHAN_TRAM, subtotal)).toBe(expected);
  });

  it("mã cố định giảm đúng số tiền ghi trên mã", () => {
    expect(calculateCouponDiscount(GIAM_50K, 500_000)).toBe(50_000);
  });

  it("mã cố định không vượt quá tạm tính", () => {
    expect(calculateCouponDiscount(GIAM_50K, 30_000)).toBe(30_000);
    expect(calculateCouponDiscount(GIAM_50K, 50_000)).toBe(50_000);
    expect(calculateCouponDiscount(GIAM_50K, 50_001)).toBe(50_000);
  });

  it("tạm tính bằng 0 hoặc âm thì không giảm", () => {
    expect(calculateCouponDiscount(GIAM_10_PHAN_TRAM, 0)).toBe(0);
    expect(calculateCouponDiscount(GIAM_50K, 0)).toBe(0);
    expect(calculateCouponDiscount(GIAM_50K, -1)).toBe(0);
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});

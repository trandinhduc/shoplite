import { describe, expect, it } from "vitest";
import {
  amountUntilFreeShipping,
  calculateOrderTotals,
  calculateShippingFee,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_OPTIONS,
} from "./pricing";

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

  it("trừ số tiền giảm vào tổng", () => {
    const totals = calculateOrderTotals([{ unitPrice: 450_000, quantity: 1 }], "express", 45_000);
    expect(totals).toEqual({
      subtotal: 450_000,
      discount: 45_000,
      shippingFee: SHIPPING_OPTIONS.express.fee,
      total: 450_000 - 45_000 + SHIPPING_OPTIONS.express.fee,
    });
  });

  it("kẹp số tiền giảm trong khoảng [0, tạm tính]", () => {
    const lines = [{ unitPrice: 100_000, quantity: 1 }];
    expect(calculateOrderTotals(lines, "standard", 250_000)).toMatchObject({
      discount: 100_000,
      total: SHIPPING_OPTIONS.standard.fee,
    });
    expect(calculateOrderTotals(lines, "standard", -5_000)).toMatchObject({
      discount: 0,
      total: 100_000 + SHIPPING_OPTIONS.standard.fee,
    });
  });

  it("phí giao hàng tính trên tạm tính trước khi giảm giá", () => {
    const totals = calculateOrderTotals(
      [{ unitPrice: FREE_SHIPPING_THRESHOLD, quantity: 1 }],
      "standard",
      50_000,
    );
    expect(totals).toEqual({
      subtotal: FREE_SHIPPING_THRESHOLD,
      discount: 50_000,
      shippingFee: 0,
      total: FREE_SHIPPING_THRESHOLD - 50_000,
    });
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});

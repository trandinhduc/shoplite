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

  it("trừ số tiền giảm vào tổng tiền", () => {
    const totals = calculateOrderTotals([{ unitPrice: 400_000, quantity: 1 }], "standard", 40_000);
    expect(totals).toEqual({
      subtotal: 400_000,
      discount: 40_000,
      shippingFee: 30_000,
      total: 390_000,
    });
  });

  it("giới hạn số tiền giảm trong khoảng [0, tạm tính]", () => {
    const lines = [{ unitPrice: 100_000, quantity: 1 }];
    expect(calculateOrderTotals(lines, "express", -5_000).discount).toBe(0);
    const capped = calculateOrderTotals(lines, "express", 999_999);
    expect(capped.discount).toBe(100_000);
    expect(capped.total).toBe(SHIPPING_OPTIONS.express.fee);
  });

  it("tính miễn phí giao hàng theo tạm tính trước khi giảm", () => {
    const totals = calculateOrderTotals([{ unitPrice: 520_000, quantity: 1 }], "standard", 52_000);
    expect(totals).toEqual({
      subtotal: 520_000,
      discount: 52_000,
      shippingFee: 0,
      total: 468_000,
    });
  });

  it("vẫn tính phí giao hàng khi tạm tính dưới ngưỡng dù có giảm giá", () => {
    const totals = calculateOrderTotals(
      [{ unitPrice: FREE_SHIPPING_THRESHOLD - 1, quantity: 1 }],
      "standard",
      10_000,
    );
    expect(totals.shippingFee).toBe(SHIPPING_OPTIONS.standard.fee);
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});

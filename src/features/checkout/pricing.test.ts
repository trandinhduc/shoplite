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
    expect(totals).toEqual({ subtotal: 350_000, shippingFee: 30_000, total: 380_000 });
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});

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
      shippingFee: 30_000,
      discountAmount: 0,
      total: 380_000,
    });
  });
});

describe("calculateOrderTotals - có giảm giá", () => {
  const lines = (subtotal: number) => [{ unitPrice: subtotal, quantity: 1 }];

  it("không truyền tham số giảm giá thì discountAmount bằng 0 và không có khóa discount", () => {
    const totals = calculateOrderTotals(lines(600_000), "standard");
    expect(totals.discountAmount).toBe(0);
    expect(totals).not.toHaveProperty("discount");
  });

  it("trừ giảm giá vào tổng tiền", () => {
    expect(calculateOrderTotals(lines(600_000), "standard", 60_000)).toEqual({
      subtotal: 600_000,
      shippingFee: 0,
      discountAmount: 60_000,
      total: 540_000,
    });
  });

  it("ngưỡng miễn phí ship xét trên tiền hàng TRƯỚC giảm", () => {
    expect(calculateOrderTotals(lines(520_000), "standard", 50_000)).toEqual({
      subtotal: 520_000,
      shippingFee: 0,
      discountAmount: 50_000,
      total: 470_000,
    });
  });

  it("đúng biên 500.000 vẫn miễn phí ship dù có giảm", () => {
    const totals = calculateOrderTotals(lines(500_000), "standard", 50_000);
    expect(totals.shippingFee).toBe(0);
    expect(totals.total).toBe(450_000);
  });

  it("dưới ngưỡng vẫn tính phí ship 30.000", () => {
    expect(calculateOrderTotals(lines(450_000), "standard", 45_000)).toEqual({
      subtotal: 450_000,
      shippingFee: 30_000,
      discountAmount: 45_000,
      total: 435_000,
    });
  });

  it("giao hàng nhanh không miễn phí dù có giảm", () => {
    const totals = calculateOrderTotals(lines(600_000), "express", 60_000);
    expect(totals.shippingFee).toBe(SHIPPING_OPTIONS.express.fee);
    expect(totals.total).toBe(600_000 - 60_000 + SHIPPING_OPTIONS.express.fee);
  });

  it("chặn giảm giá ở mức tiền hàng, tổng không âm", () => {
    const totals = calculateOrderTotals(lines(30_000), "standard", 50_000);
    expect(totals.discountAmount).toBe(30_000);
    expect(totals.total).toBe(SHIPPING_OPTIONS.standard.fee);
    expect(totals.total).toBeGreaterThanOrEqual(0);
  });

  it.each([-1, -50_000, 1.5, Number.NaN])("coi giảm giá không hợp lệ %s như 0", (discount) => {
    const totals = calculateOrderTotals(lines(600_000), "standard", discount);
    expect(totals.discountAmount).toBe(0);
    expect(totals.total).toBe(600_000);
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});

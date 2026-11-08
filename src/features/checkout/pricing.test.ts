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
});

describe("calculateOrderTotals với giảm giá", () => {
  const linesOf = (subtotal: number) => [{ unitPrice: subtotal, quantity: 1 }];

  it("không truyền giảm giá thì giống hệt khi chưa có mã", () => {
    expect(calculateOrderTotals(linesOf(520_000), "standard")).toEqual({
      subtotal: 520_000,
      discount: 0,
      shippingFee: 0,
      total: 520_000,
    });
  });

  it("mất miễn phí ship khi tạm tính sau giảm dưới ngưỡng", () => {
    expect(calculateOrderTotals(linesOf(520_000), "standard", 50_000)).toEqual({
      subtotal: 520_000,
      discount: 50_000,
      shippingFee: 30_000,
      total: 500_000,
    });
  });

  it("vẫn miễn phí ship khi tạm tính sau giảm đúng bằng ngưỡng", () => {
    expect(calculateOrderTotals(linesOf(550_000), "standard", 50_000)).toEqual({
      subtotal: 550_000,
      discount: 50_000,
      shippingFee: 0,
      total: 500_000,
    });
  });

  it.each([
    [FREE_SHIPPING_THRESHOLD - 1, SHIPPING_OPTIONS.standard.fee],
    [FREE_SHIPPING_THRESHOLD, 0],
    [FREE_SHIPPING_THRESHOLD + 1, 0],
  ])("tạm tính sau giảm %i → phí ship %i", (afterDiscount, expectedFee) => {
    const discount = 40_000;
    const totals = calculateOrderTotals(linesOf(afterDiscount + discount), "standard", discount);
    expect(totals.shippingFee).toBe(expectedFee);
    expect(totals.total).toBe(afterDiscount + expectedFee);
  });

  it("giao nhanh vẫn tính phí khi có giảm giá", () => {
    const totals = calculateOrderTotals(linesOf(2_000_000), "express", 100_000);
    expect(totals.shippingFee).toBe(SHIPPING_OPTIONS.express.fee);
    expect(totals.total).toBe(2_000_000 - 100_000 + SHIPPING_OPTIONS.express.fee);
  });

  it("kẹp giảm giá về tạm tính khi lớn hơn tạm tính", () => {
    const totals = calculateOrderTotals(linesOf(30_000), "standard", 50_000);
    expect(totals.discount).toBe(30_000);
    expect(totals.total).toBe(totals.shippingFee);
  });

  it("kẹp giảm giá âm về 0", () => {
    const totals = calculateOrderTotals(linesOf(300_000), "standard", -10_000);
    expect(totals.discount).toBe(0);
    expect(totals.total).toBe(300_000 + SHIPPING_OPTIONS.standard.fee);
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});

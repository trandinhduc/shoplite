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

  it("trừ giảm giá vào tạm tính và tính lại phí giao hàng theo tạm tính sau giảm", () => {
    expect(calculateOrderTotals([{ unitPrice: 500_000, quantity: 1 }], "standard", 50_000)).toEqual(
      {
        subtotal: 500_000,
        discount: 50_000,
        shippingFee: 30_000,
        total: 480_000,
      },
    );
  });

  it("vẫn miễn phí giao hàng khi tạm tính sau giảm còn đạt ngưỡng", () => {
    expect(calculateOrderTotals([{ unitPrice: 560_000, quantity: 1 }], "standard", 50_000)).toEqual(
      {
        subtotal: 560_000,
        discount: 50_000,
        shippingFee: 0,
        total: 510_000,
      },
    );
  });

  it.each([
    [499_999, SHIPPING_OPTIONS.standard.fee],
    [FREE_SHIPPING_THRESHOLD, 0],
    [500_001, 0],
  ])("tạm tính sau giảm %i thì phí giao hàng tiêu chuẩn là %i", (afterDiscount, fee) => {
    const totals = calculateOrderTotals(
      [{ unitPrice: afterDiscount + 10_000, quantity: 1 }],
      "standard",
      10_000,
    );
    expect(totals.shippingFee).toBe(fee);
  });

  it("giảm giá lớn hơn tạm tính thì chỉ giảm bằng tạm tính, tổng không âm", () => {
    const totals = calculateOrderTotals([{ unitPrice: 30_000, quantity: 1 }], "standard", 50_000);
    expect(totals.discount).toBe(30_000);
    expect(totals.total).toBeGreaterThanOrEqual(0);
  });

  it("coi giảm giá âm như không giảm", () => {
    expect(
      calculateOrderTotals([{ unitPrice: 100_000, quantity: 1 }], "standard", -5).discount,
    ).toBe(0);
  });

  it("giao hàng nhanh vẫn tính phí khi có giảm giá", () => {
    const totals = calculateOrderTotals([{ unitPrice: 900_000, quantity: 1 }], "express", 50_000);
    expect(totals.shippingFee).toBe(SHIPPING_OPTIONS.express.fee);
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});

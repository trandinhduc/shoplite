import { describe, expect, it } from "vitest";
import { coupons } from "@/data/coupons";
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
    expect(calculateShippingFee(5_000_000, "express")).toBe(
      SHIPPING_OPTIONS.express.fee,
    );
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
      discountAmount: 0,
      shippingFee: 30_000,
      total: 380_000,
    });
  });

  it("trừ giảm giá trước khi cộng phí giao hàng", () => {
    const totals = calculateOrderTotals(
      [{ unitPrice: 450_000, quantity: 2 }],
      "standard",
      coupons[0],
    );

    expect(totals).toEqual({
      subtotal: 900_000,
      discountAmount: 90_000,
      shippingFee: 0,
      total: 810_000,
    });
  });

  it("không giảm quá subtotal và làm tròn phần trăm xuống", () => {
    expect(
      calculateOrderTotals([{ unitPrice: 50_000, quantity: 1 }], "express", {
        code: "FIXED",
        kind: "fixed",
        value: 100_000,
        minimumSubtotal: 0,
      }),
    ).toMatchObject({
      subtotal: 50_000,
      discountAmount: 50_000,
      total: 60_000,
    });
    expect(
      calculateOrderTotals([{ unitPrice: 333, quantity: 1 }], "standard", {
        code: "PERCENT",
        kind: "percentage",
        value: 10,
        minimumSubtotal: 0,
      }),
    ).toMatchObject({ discountAmount: 33, total: 30_300 });
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});

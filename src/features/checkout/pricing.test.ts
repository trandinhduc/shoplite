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
  it("cộng tạm tính và phí giao hàng khi không có coupon", () => {
    const totals = calculateOrderTotals(
      [
        { unitPrice: 150_000, quantity: 2 },
        { unitPrice: 50_000, quantity: 1 },
      ],
      "standard",
    );
    expect(totals).toEqual({ subtotal: 350_000, shippingFee: 30_000, discount: 0, total: 380_000 });
  });

  it("khấu trừ số tiền coupon vào tạm tính và không khấu trừ vào phí vận chuyển", () => {
    const totals = calculateOrderTotals(
      [
        { unitPrice: 150_000, quantity: 2 }, // subtotal: 300.000 ₫
      ],
      "standard", // shippingFee: 30.000 ₫ (< 500k)
      { code: "SHOPLITE10", discountAmount: 30_000, description: "Giảm 10%" },
    );
    expect(totals).toEqual({
      subtotal: 300_000,
      shippingFee: 30_000,
      discount: 30_000,
      total: 300_000, // (300.000 - 30.000) + 30.000
      couponCode: "SHOPLITE10",
    });
  });

  it("ngưỡng miễn phí vận chuyển vẫn tính trên tạm tính trước khi giảm giá", () => {
    // Tạm tính 600.000 ₫ >= 500.000 ₫ -> phí ship 0 ₫
    // Giảm giá 50.000 ₫ -> tiền hàng còn 550.000 ₫, phí ship vẫn là 0 ₫
    const totals = calculateOrderTotals(
      [{ unitPrice: 600_000, quantity: 1 }],
      "standard",
      { code: "GIAM50K", discountAmount: 50_000, description: "Giảm 50k" },
    );
    expect(totals).toEqual({
      subtotal: 600_000,
      shippingFee: 0,
      discount: 50_000,
      total: 550_000,
      couponCode: "GIAM50K",
    });
  });

  it("tổng tiền không bị âm nếu giảm giá lớn hơn tạm tính", () => {
    const totals = calculateOrderTotals(
      [{ unitPrice: 40_000, quantity: 1 }],
      "standard",
      { code: "GIAM50K", discountAmount: 50_000, description: "Giảm 50k" },
    );
    // Tiền hàng sau giảm tối thiểu là 0 ₫ + phí ship 30.000 ₫ = 30.000 ₫
    expect(totals.total).toBe(30_000);
    expect(totals.discount).toBe(40_000);
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});

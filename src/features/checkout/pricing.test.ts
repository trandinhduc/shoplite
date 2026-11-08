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
  it("cộng tạm tính và phí giao hàng khi không có mã giảm giá", () => {
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
      couponCode: undefined,
      shippingFee: 30_000,
      total: 380_000,
    });
  });

  it("trừ tiền giảm giá và giữ nguyên freeship tính theo subtotal gốc", () => {
    // Đơn 500k đạt ngưỡng freeship tiêu chuẩn, áp mã giảm 50k
    const totals = calculateOrderTotals(
      [{ unitPrice: 500_000, quantity: 1 }],
      "standard",
      {
        coupon: {
          code: "GIAM50K",
          type: "fixed",
          value: 50_000,
          description: "Giảm 50k",
        },
      },
    );
    expect(totals).toEqual({
      subtotal: 500_000,
      discountAmount: 50_000,
      couponCode: "GIAM50K",
      shippingFee: 0,
      total: 450_000,
    });
  });

  it("tính tổng chính xác khi truyền discountAmount và couponCode trực tiếp", () => {
    const totals = calculateOrderTotals(
      [{ unitPrice: 200_000, quantity: 1 }],
      "express",
      {
        discountAmount: 20_000,
        couponCode: "TEST20K",
      },
    );
    expect(totals).toEqual({
      subtotal: 200_000,
      discountAmount: 20_000,
      couponCode: "TEST20K",
      shippingFee: 60_000,
      total: 240_000,
    });
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});

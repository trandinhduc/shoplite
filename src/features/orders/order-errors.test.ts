import { describe, expect, it } from "vitest";
import { OrderError } from "./order-errors";

describe("OrderError - mã giảm giá", () => {
  it.each(["COUPON_NOT_FOUND", "COUPON_EXPIRED", "COUPON_MIN_ORDER_NOT_MET"] as const)(
    "%s trả HTTP 422",
    (code) => {
      expect(new OrderError(code, "Lỗi").httpStatus).toBe(422);
    },
  );

  it("giữ nguyên details", () => {
    const error = new OrderError("COUPON_MIN_ORDER_NOT_MET", "Cần mua thêm", {
      shortfall: "100000",
    });
    expect(error.details).toEqual({ shortfall: "100000" });
    expect(error.code).toBe("COUPON_MIN_ORDER_NOT_MET");
  });
});

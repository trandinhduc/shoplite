import { describe, expect, it } from "vitest";
import { couponErrorMessage } from "@/features/coupons/coupon-service";
import type { CouponDefinition, CouponEvaluationFailure } from "@/features/coupons/types";
import { couponOrderError, OrderError } from "./order-errors";

const giam50k: CouponDefinition = {
  code: "GIAM50K",
  type: "fixed",
  value: 50_000,
  minSubtotal: 500_000,
};

describe("OrderError - mã lỗi coupon", () => {
  it.each(["COUPON_NOT_FOUND", "COUPON_EXPIRED", "COUPON_MIN_SUBTOTAL_NOT_MET"] as const)(
    "%s trả HTTP 422",
    (code) => {
      expect(new OrderError(code, "lỗi").httpStatus).toBe(422);
    },
  );

  it("giữ nguyên HTTP status của các mã lỗi cũ", () => {
    expect(new OrderError("VALIDATION_ERROR", "x").httpStatus).toBe(400);
    expect(new OrderError("PRODUCT_NOT_FOUND", "x").httpStatus).toBe(422);
    expect(new OrderError("INSUFFICIENT_STOCK", "x").httpStatus).toBe(409);
    expect(new OrderError("ORDER_NOT_FOUND", "x").httpStatus).toBe(404);
    expect(new OrderError("INVALID_STATUS_TRANSITION", "x").httpStatus).toBe(409);
  });
});

describe("couponOrderError", () => {
  it("chưa đạt ngưỡng: kèm ngưỡng và số tiền cần mua thêm dạng chuỗi số", () => {
    const failure: CouponEvaluationFailure = {
      ok: false,
      reason: "COUPON_MIN_SUBTOTAL_NOT_MET",
      coupon: giam50k,
      minSubtotal: 500_000,
      shortfall: 50_000,
    };
    const error = couponOrderError(failure, "GIAM50K");
    expect(error).toBeInstanceOf(OrderError);
    expect(error.code).toBe("COUPON_MIN_SUBTOTAL_NOT_MET");
    expect(error.message).toBe(couponErrorMessage(failure));
    expect(error.details).toEqual({
      couponCode: "GIAM50K",
      minSubtotal: "500000",
      shortfall: "50000",
    });
  });

  it("mã không tồn tại: details chỉ có couponCode", () => {
    const error = couponOrderError({ ok: false, reason: "COUPON_NOT_FOUND" }, "KHONGCO");
    expect(error.code).toBe("COUPON_NOT_FOUND");
    expect(error.message).toBe("Mã giảm giá không tồn tại");
    expect(error.details).toEqual({ couponCode: "KHONGCO" });
  });

  it("mã hết hạn: details chỉ có couponCode", () => {
    const error = couponOrderError(
      { ok: false, reason: "COUPON_EXPIRED", coupon: giam50k },
      "GIAM50K",
    );
    expect(error.code).toBe("COUPON_EXPIRED");
    expect(error.message).toBe("Mã giảm giá đã hết hạn");
    expect(error.details).toEqual({ couponCode: "GIAM50K" });
  });
});

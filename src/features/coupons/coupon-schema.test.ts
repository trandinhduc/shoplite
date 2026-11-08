import { describe, expect, it } from "vitest";
import { toFieldErrors } from "@/features/checkout/checkout-schema";
import { validateCouponSchema } from "./coupon-schema";

describe("validateCouponSchema", () => {
  it("chấp nhận mã và bỏ khoảng trắng đầu/cuối", () => {
    const result = validateCouponSchema.safeParse({ code: " shoplite10 " });
    expect(result.success).toBe(true);
    expect(result.data?.code).toBe("shoplite10");
  });

  it.each(["", "   "])("báo yêu cầu nhập mã khi ô trống (%j)", (code) => {
    const result = validateCouponSchema.safeParse({ code });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!).code).toBe("Vui lòng nhập mã giảm giá");
  });

  it("chấp nhận mã dài đúng 32 ký tự", () => {
    expect(validateCouponSchema.safeParse({ code: "A".repeat(32) }).success).toBe(true);
  });

  it("từ chối mã dài 33 ký tự", () => {
    expect(validateCouponSchema.safeParse({ code: "A".repeat(33) }).success).toBe(false);
  });

  it("từ chối khi thiếu trường code", () => {
    expect(validateCouponSchema.safeParse({}).success).toBe(false);
  });
});

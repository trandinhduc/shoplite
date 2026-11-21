import { describe, expect, it } from "vitest";
import { couponCodeSchema } from "./coupon-schema";

const firstMessage = (value: unknown) => {
  const result = couponCodeSchema.safeParse(value);
  return result.success ? null : result.error.issues[0]?.message;
};

describe("couponCodeSchema", () => {
  it("bỏ khoảng trắng đầu/cuối", () => {
    expect(couponCodeSchema.parse(" shoplite10 ")).toBe("shoplite10");
  });

  it("báo lỗi khi mã rỗng hoặc chỉ có khoảng trắng", () => {
    expect(firstMessage("")).toBe("Vui lòng nhập mã giảm giá");
    expect(firstMessage("   ")).toBe("Vui lòng nhập mã giảm giá");
  });

  it("chấp nhận tối đa 32 ký tự", () => {
    expect(couponCodeSchema.safeParse("A".repeat(32)).success).toBe(true);
    expect(firstMessage("A".repeat(33))).toBe("Mã giảm giá không hợp lệ");
  });

  it("từ chối giá trị không phải chuỗi", () => {
    expect(couponCodeSchema.safeParse(123).success).toBe(false);
    expect(couponCodeSchema.safeParse(null).success).toBe(false);
  });
});

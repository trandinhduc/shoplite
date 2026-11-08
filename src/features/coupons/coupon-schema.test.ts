import { describe, expect, it } from "vitest";
import { COUPON_CODE_MAX_LENGTH, couponCodeSchema } from "./coupon-schema";

describe("couponCodeSchema", () => {
  it("bỏ khoảng trắng đầu/cuối", () => {
    expect(couponCodeSchema.parse(" shoplite10 ")).toBe("shoplite10");
  });

  it.each(["", "   "])("từ chối mã rỗng %j", (value) => {
    const result = couponCodeSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Vui lòng nhập mã giảm giá");
  });

  it("chấp nhận mã dài đúng giới hạn", () => {
    expect(couponCodeSchema.safeParse("A".repeat(COUPON_CODE_MAX_LENGTH)).success).toBe(true);
  });

  it("từ chối mã dài hơn giới hạn", () => {
    const result = couponCodeSchema.safeParse("A".repeat(COUPON_CODE_MAX_LENGTH + 1));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      `Mã giảm giá tối đa ${COUPON_CODE_MAX_LENGTH} ký tự`,
    );
  });

  it.each([10, ["A", "B"], null])("từ chối kiểu dữ liệu không phải chuỗi: %j", (value) => {
    expect(couponCodeSchema.safeParse(value).success).toBe(false);
  });
});

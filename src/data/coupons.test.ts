import { describe, expect, it } from "vitest";
import { normalizeCouponCode } from "@/features/coupons/coupon-rules";
import { coupons } from "./coupons";

describe("dữ liệu mã giảm giá khởi tạo", () => {
  it("mỗi mã là duy nhất và đã ở dạng chuẩn hóa: chỉ chữ in hoa và số, tối đa 32 ký tự", () => {
    const codes = coupons.map((coupon) => coupon.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z0-9]{1,32}$/);
      expect(normalizeCouponCode(code)).toBe(code);
    }
  });

  it.each(coupons)("mã $code có giá trị hợp lệ theo loại", (coupon) => {
    if (coupon.type === "percent") {
      expect(coupon.value).toBeGreaterThanOrEqual(1);
      expect(coupon.value).toBeLessThanOrEqual(100);
      expect(coupon.maxDiscount).toBeGreaterThan(0);
    } else {
      expect(coupon.value).toBeGreaterThan(0);
      expect(coupon.maxDiscount).toBeUndefined();
    }
    if (coupon.minOrderValue !== undefined) expect(coupon.minOrderValue).toBeGreaterThan(0);
    if (coupon.expiresOn !== undefined) {
      expect(coupon.expiresOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(`${coupon.expiresOn}T00:00:00+07:00`).getTime())).toBe(false);
    }
  });
});

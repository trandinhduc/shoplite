import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/format";
import {
  calculateCouponDiscount,
  evaluateCoupon,
  getCouponDeadline,
  getCouponErrorMessage,
  normalizeCouponCode,
} from "./coupon-rules";
import type { Coupon } from "./types";

const percent10: Coupon = {
  code: "SHOPLITE10",
  type: "percent",
  value: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};
const fixed50k: Coupon = {
  code: "GIAM50K",
  type: "fixed",
  value: 50_000,
  minSubtotal: 500_000,
};
const tet: Coupon = {
  code: "TET2026",
  type: "percent",
  value: 15,
  maxDiscount: 200_000,
  expiresOn: "2026-02-28",
};

const NOW = new Date("2026-01-15T10:00:00+07:00");

describe("normalizeCouponCode", () => {
  it("bỏ khoảng trắng đầu/cuối và viết HOA", () => {
    expect(normalizeCouponCode(" shoplite10 ")).toBe("SHOPLITE10");
  });

  it("chuỗi chỉ có khoảng trắng trở thành chuỗi rỗng", () => {
    expect(normalizeCouponCode("   ")).toBe("");
  });
});

describe("getCouponDeadline", () => {
  it("hết hạn vào cuối ngày theo giờ Việt Nam", () => {
    expect(getCouponDeadline("2026-02-28").getTime()).toBe(
      new Date("2026-02-28T23:59:59.999+07:00").getTime(),
    );
  });
});

describe("calculateCouponDiscount", () => {
  it("giảm theo phần trăm khi chưa chạm mức tối đa", () => {
    expect(calculateCouponDiscount(percent10, 300_000)).toBe(30_000);
  });

  it("giới hạn ở mức giảm tối đa", () => {
    expect(calculateCouponDiscount(percent10, 1_000_000)).toBe(100_000);
    expect(calculateCouponDiscount(percent10, 1_500_000)).toBe(100_000);
  });

  it("làm tròn xuống tới đồng", () => {
    expect(calculateCouponDiscount(tet, 333_333)).toBe(49_999);
  });

  it("giảm cố định không vượt quá tạm tính", () => {
    const fixedNoMin: Coupon = { code: "X", type: "fixed", value: 50_000 };
    expect(calculateCouponDiscount(fixedNoMin, 30_000)).toBe(30_000);
    expect(calculateCouponDiscount(fixed50k, 600_000)).toBe(50_000);
  });

  it("không giảm khi tạm tính bằng 0", () => {
    expect(calculateCouponDiscount(tet, 0)).toBe(0);
  });
});

describe("evaluateCoupon", () => {
  it("không có mã thì trả not_found", () => {
    expect(evaluateCoupon(undefined, 500_000, NOW)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("thiếu 1đ so với tối thiểu thì báo số tiền còn thiếu", () => {
    expect(evaluateCoupon(percent10, 299_999, NOW)).toEqual({
      ok: false,
      reason: "below_minimum",
      coupon: percent10,
      shortfall: 1,
    });
  });

  it("chấp nhận khi tạm tính đúng bằng mức tối thiểu", () => {
    expect(evaluateCoupon(percent10, 300_000, NOW)).toEqual({
      ok: true,
      coupon: percent10,
      discount: 30_000,
    });
  });

  it("còn hiệu lực tới mili-giây cuối cùng của ngày hết hạn", () => {
    const result = evaluateCoupon(
      tet,
      400_000,
      new Date("2026-02-28T23:59:59.999+07:00"),
    );
    expect(result).toEqual({ ok: true, coupon: tet, discount: 60_000 });
  });

  it("hết hạn từ 00:00 ngày hôm sau", () => {
    expect(
      evaluateCoupon(tet, 400_000, new Date("2026-03-01T00:00:00+07:00")),
    ).toEqual({
      ok: false,
      reason: "expired",
      coupon: tet,
    });
  });

  it("kiểm tra hết hạn trước điều kiện tối thiểu", () => {
    const expiredWithMin: Coupon = { ...fixed50k, expiresOn: "2026-01-01" };
    expect(evaluateCoupon(expiredWithMin, 100_000, NOW)).toMatchObject({
      reason: "expired",
    });
  });

  it("số tiền giảm luôn nằm trong khoảng [0, tạm tính]", () => {
    for (const subtotal of [0, 1, 299_999, 300_000, 999_999, 5_000_000]) {
      const result = evaluateCoupon(tet, subtotal, NOW);
      if (result.ok) {
        expect(result.discount).toBeGreaterThanOrEqual(0);
        expect(result.discount).toBeLessThanOrEqual(subtotal);
      }
    }
  });
});

describe("getCouponErrorMessage", () => {
  it("báo mã không tồn tại", () => {
    expect(getCouponErrorMessage({ ok: false, reason: "not_found" })).toBe(
      "Mã giảm giá không tồn tại",
    );
  });

  it("báo mã đã hết hạn", () => {
    expect(
      getCouponErrorMessage({ ok: false, reason: "expired", coupon: tet }),
    ).toBe("Mã giảm giá đã hết hạn");
  });

  it("báo số tiền cần mua thêm kèm mã chuẩn hóa từ dữ liệu", () => {
    expect(
      getCouponErrorMessage({
        ok: false,
        reason: "below_minimum",
        coupon: fixed50k,
        shortfall: 50_000,
      }),
    ).toBe(`Mua thêm ${formatCurrency(50_000)} để sử dụng mã GIAM50K`);
  });
});

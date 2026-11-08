import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/format";
import {
  describeCouponFailure,
  evaluateCoupon,
  findCoupon,
  normalizeCouponCode,
} from "./coupon-service";
import type { Coupon } from "./types";

const NOW = new Date("2026-11-08T05:00:00.000Z");

describe("normalizeCouponCode", () => {
  it("bỏ khoảng trắng đầu/cuối và viết hoa", () => {
    expect(normalizeCouponCode("  shoplite10 ")).toBe("SHOPLITE10");
  });

  it("giữ khoảng trắng ở giữa", () => {
    expect(normalizeCouponCode("shop lite10")).toBe("SHOP LITE10");
  });
});

describe("findCoupon", () => {
  it("tìm theo mã đã chuẩn hóa", () => {
    expect(findCoupon(" giam50k ")?.code).toBe("GIAM50K");
  });

  it("trả về undefined khi mã không tồn tại", () => {
    expect(findCoupon("ABC")).toBeUndefined();
  });
});

describe("evaluateCoupon - SHOPLITE10 (10%, tối đa 100.000, từ 300.000)", () => {
  it("giảm 10% tiền hàng", () => {
    expect(evaluateCoupon("SHOPLITE10", 600_000, NOW)).toEqual({
      ok: true,
      code: "SHOPLITE10",
      discountAmount: 60_000,
    });
  });

  it("chấp nhận đúng mức tối thiểu 300.000", () => {
    expect(evaluateCoupon("SHOPLITE10", 300_000, NOW)).toEqual({
      ok: true,
      code: "SHOPLITE10",
      discountAmount: 30_000,
    });
  });

  it("từ chối dưới tối thiểu 1đ và báo số tiền còn thiếu", () => {
    expect(evaluateCoupon("SHOPLITE10", 299_999, NOW)).toEqual({
      ok: false,
      reason: "min_order_not_met",
      shortfall: 1,
    });
  });

  it("báo thiếu 100.000 khi tiền hàng 200.000", () => {
    expect(evaluateCoupon("SHOPLITE10", 200_000, NOW)).toEqual({
      ok: false,
      reason: "min_order_not_met",
      shortfall: 100_000,
    });
  });

  it("đúng trần 100.000 khi 10% bằng đúng trần", () => {
    const result = evaluateCoupon("SHOPLITE10", 1_000_000, NOW);
    expect(result).toMatchObject({ ok: true, discountAmount: 100_000 });
  });

  it("chạm trần 100.000 khi 10% vượt trần", () => {
    const result = evaluateCoupon("SHOPLITE10", 2_000_000, NOW);
    expect(result).toMatchObject({ ok: true, discountAmount: 100_000 });
  });

  it("làm tròn xuống đồng", () => {
    const result = evaluateCoupon("SHOPLITE10", 333_333, NOW);
    expect(result).toMatchObject({ ok: true, discountAmount: 33_333 });
  });

  it("nhận mã chữ thường và có khoảng trắng thừa", () => {
    expect(evaluateCoupon("  shoplite10 ", 600_000, NOW)).toMatchObject({
      ok: true,
      code: "SHOPLITE10",
    });
  });
});

describe("evaluateCoupon - GIAM50K (50.000, từ 500.000)", () => {
  it("giảm 50.000 khi đủ tối thiểu", () => {
    expect(evaluateCoupon("GIAM50K", 500_000, NOW)).toEqual({
      ok: true,
      code: "GIAM50K",
      discountAmount: 50_000,
    });
  });

  it("từ chối khi thiếu 1đ", () => {
    expect(evaluateCoupon("GIAM50K", 499_999, NOW)).toEqual({
      ok: false,
      reason: "min_order_not_met",
      shortfall: 1,
    });
  });
});

describe("evaluateCoupon - TET2026 (hết hạn 28/02/2026, giờ UTC+7)", () => {
  it("còn hợp lệ ở 23:59:59.999 ngày 28/02/2026 (UTC+7)", () => {
    const result = evaluateCoupon("TET2026", 1_000_000, new Date("2026-02-28T16:59:59.999Z"));
    expect(result).toMatchObject({
      ok: true,
      code: "TET2026",
      discountAmount: 150_000,
    });
  });

  it("hết hạn từ 00:00 ngày 01/03/2026 (UTC+7)", () => {
    expect(evaluateCoupon("TET2026", 1_000_000, new Date("2026-02-28T17:00:00.000Z"))).toEqual({
      ok: false,
      reason: "expired",
    });
  });
});

describe("evaluateCoupon - lỗi và quy tắc chung", () => {
  it("mã không tồn tại", () => {
    expect(evaluateCoupon("ABC", 1_000_000, NOW)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("ưu tiên báo hết hạn trước khi báo thiếu tối thiểu", () => {
    const coupons: Coupon[] = [
      {
        code: "OLD",
        type: "fixed",
        value: 10_000,
        minOrderValue: 500_000,
        expiresOn: "2026-01-01",
      },
    ];
    expect(evaluateCoupon("OLD", 100_000, NOW, coupons)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("mức giảm không vượt quá tiền hàng", () => {
    const coupons: Coupon[] = [{ code: "BIG", type: "fixed", value: 50_000 }];
    expect(evaluateCoupon("BIG", 30_000, NOW, coupons)).toEqual({
      ok: true,
      code: "BIG",
      discountAmount: 30_000,
    });
  });

  it("mức giảm luôn là số nguyên không âm", () => {
    for (const subtotal of [300_000, 333_333, 777_777, 1_234_567]) {
      const result = evaluateCoupon("SHOPLITE10", subtotal, NOW);
      if (result.ok) {
        expect(Number.isInteger(result.discountAmount)).toBe(true);
        expect(result.discountAmount).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("describeCouponFailure", () => {
  it("mã không tồn tại", () => {
    expect(describeCouponFailure({ ok: false, reason: "not_found" })).toBe(
      "Mã giảm giá không tồn tại",
    );
  });

  it("mã đã hết hạn", () => {
    expect(describeCouponFailure({ ok: false, reason: "expired" })).toBe("Mã giảm giá đã hết hạn");
  });

  it("chưa đạt tối thiểu, nêu số tiền cần mua thêm", () => {
    expect(
      describeCouponFailure({
        ok: false,
        reason: "min_order_not_met",
        shortfall: 100_000,
      }),
    ).toBe(`Cần mua thêm ${formatCurrency(100_000)} để dùng mã này`);
  });
});

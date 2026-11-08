import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/format";
import {
  calculateCouponDiscount,
  deriveCouponStatus,
  evaluateCoupon,
  getCouponErrorMessage,
  getCouponExpiryCutoff,
  isCouponExpired,
  normalizeCouponCode,
} from "./coupon-rules";
import type { Coupon, FixedCoupon, PercentageCoupon } from "./types";

// Fixture riêng cho test (không phụ thuộc src/data/coupons.ts).
const PERCENT_10: PercentageCoupon = {
  code: "SHOPLITE10",
  type: "percentage",
  value: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};
const FIXED_50K: FixedCoupon = {
  code: "GIAM50K",
  type: "fixed",
  value: 50_000,
  minSubtotal: 500_000,
};
const EXPIRING: PercentageCoupon = {
  code: "TET2026",
  type: "percentage",
  value: 15,
  maxDiscount: 200_000,
  expiresOn: "2026-02-28",
};

const LAST_MS_OF_EXPIRY_DAY = new Date("2026-02-28T23:59:59.999+07:00");
const FIRST_MS_AFTER_EXPIRY = new Date("2026-03-01T00:00:00+07:00");
const NOW = new Date("2026-11-08T10:00:00+07:00");

describe("normalizeCouponCode", () => {
  it("bỏ khoảng trắng đầu/cuối và viết hoa", () => {
    expect(normalizeCouponCode(" shoplite10 ")).toBe("SHOPLITE10");
  });

  it("không bỏ khoảng trắng ở giữa và không bỏ dấu", () => {
    expect(normalizeCouponCode("shop lite10")).toBe("SHOP LITE10");
    expect(normalizeCouponCode("giảm50k")).toBe("GIẢM50K");
  });
});

describe("getCouponExpiryCutoff / isCouponExpired", () => {
  it("mốc hết hạn là 00:00 ngày hôm sau theo giờ Việt Nam", () => {
    expect(getCouponExpiryCutoff("2026-02-28").getTime()).toBe(FIRST_MS_AFTER_EXPIRY.getTime());
  });

  it("còn hiệu lực đến hết ngày hết hạn", () => {
    expect(isCouponExpired(EXPIRING, LAST_MS_OF_EXPIRY_DAY)).toBe(false);
  });

  it("hết hạn từ 00:00 ngày hôm sau", () => {
    expect(isCouponExpired(EXPIRING, FIRST_MS_AFTER_EXPIRY)).toBe(true);
  });

  it("mã không có ngày hết hạn thì không bao giờ hết hạn", () => {
    expect(isCouponExpired(PERCENT_10, new Date("2100-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("calculateCouponDiscount", () => {
  it("giảm theo phần trăm, làm tròn xuống đến đồng", () => {
    expect(calculateCouponDiscount(PERCENT_10, 333_333)).toBe(33_333);
  });

  it("giới hạn bởi mức giảm tối đa", () => {
    expect(calculateCouponDiscount(PERCENT_10, 999_990)).toBe(99_999);
    expect(calculateCouponDiscount(PERCENT_10, 1_000_000)).toBe(100_000);
    expect(calculateCouponDiscount(PERCENT_10, 1_000_010)).toBe(100_000);
  });

  it("giảm số tiền cố định", () => {
    expect(calculateCouponDiscount(FIXED_50K, 600_000)).toBe(50_000);
  });

  it("không bao giờ vượt quá tạm tính", () => {
    const bigFixed: Coupon = { code: "BIG", type: "fixed", value: 1_000_000 };
    expect(calculateCouponDiscount(bigFixed, 250_000)).toBe(250_000);
  });
});

describe("evaluateCoupon", () => {
  it("không có mã → NOT_FOUND", () => {
    expect(evaluateCoupon(undefined, 1_000_000, NOW)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });

  it("mã hợp lệ → trả mã và số tiền giảm", () => {
    expect(evaluateCoupon(PERCENT_10, 400_000, NOW)).toEqual({
      ok: true,
      code: "SHOPLITE10",
      discount: 40_000,
    });
  });

  it("tạm tính đúng bằng mức tối thiểu → hợp lệ", () => {
    expect(evaluateCoupon(PERCENT_10, 300_000, NOW)).toEqual({
      ok: true,
      code: "SHOPLITE10",
      discount: 30_000,
    });
  });

  it("thiếu 1 đồng so với mức tối thiểu → MIN_SUBTOTAL_NOT_MET, cần mua thêm 1 đồng", () => {
    expect(evaluateCoupon(PERCENT_10, 299_999, NOW)).toEqual({
      ok: false,
      reason: "MIN_SUBTOTAL_NOT_MET",
      code: "SHOPLITE10",
      minSubtotal: 300_000,
      shortfall: 1,
    });
  });

  it("biên ngày hết hạn", () => {
    expect(evaluateCoupon(EXPIRING, 100_000, LAST_MS_OF_EXPIRY_DAY)).toEqual({
      ok: true,
      code: "TET2026",
      discount: 15_000,
    });
    expect(evaluateCoupon(EXPIRING, 100_000, FIRST_MS_AFTER_EXPIRY)).toEqual({
      ok: false,
      reason: "EXPIRED",
      code: "TET2026",
    });
  });

  it("kiểm tra hạn trước mức tối thiểu", () => {
    const expiredWithMin: Coupon = { ...EXPIRING, minSubtotal: 1_000_000 };
    expect(evaluateCoupon(expiredWithMin, 0, FIRST_MS_AFTER_EXPIRY)).toMatchObject({
      reason: "EXPIRED",
    });
  });
});

describe("getCouponErrorMessage", () => {
  it("trả câu tiếng Việt cho từng lý do", () => {
    expect(getCouponErrorMessage({ ok: false, reason: "NOT_FOUND" })).toBe(
      "Mã giảm giá không tồn tại",
    );
    expect(getCouponErrorMessage({ ok: false, reason: "EXPIRED", code: "TET2026" })).toBe(
      "Mã giảm giá đã hết hạn",
    );
    expect(
      getCouponErrorMessage({
        ok: false,
        reason: "MIN_SUBTOTAL_NOT_MET",
        code: "GIAM50K",
        minSubtotal: 500_000,
        shortfall: 50_000,
      }),
    ).toBe(
      `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500_000)} để dùng mã GIAM50K. ` +
        `Bạn cần mua thêm ${formatCurrency(50_000)}.`,
    );
  });
});

describe("deriveCouponStatus", () => {
  it("chưa áp mã → none", () => {
    expect(deriveCouponStatus(null, 600_000, NOW)).toEqual({ status: "none" });
  });

  it("mã hợp lệ → active kèm số tiền giảm", () => {
    expect(deriveCouponStatus({ rule: FIXED_50K }, 600_000, NOW)).toEqual({
      status: "active",
      code: "GIAM50K",
      discount: 50_000,
    });
  });

  it("tạm tính rơi dưới mức tối thiểu → error kèm số tiền cần mua thêm", () => {
    const result = deriveCouponStatus({ rule: FIXED_50K }, 450_000, NOW);
    expect(result).toMatchObject({ status: "error", code: "GIAM50K" });
    expect(result.status === "error" && result.message).toContain(formatCurrency(50_000));
  });

  it("tạm tính đạt lại mức tối thiểu → tự active lại", () => {
    expect(deriveCouponStatus({ rule: FIXED_50K }, 500_000, NOW)).toMatchObject({
      status: "active",
    });
  });

  it("lỗi bị khóa → luôn error bất kể tạm tính", () => {
    expect(
      deriveCouponStatus(
        { rule: PERCENT_10, lockedError: "Mã giảm giá đã hết hạn" },
        2_000_000,
        NOW,
      ),
    ).toEqual({
      status: "error",
      code: "SHOPLITE10",
      message: "Mã giảm giá đã hết hạn",
    });
  });
});

import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/format";
import {
  calculateCouponDiscount,
  checkCouponAvailability,
  couponErrorMessage,
  couponExpiryInstant,
  evaluateCoupon,
  evaluateCouponThreshold,
  isCouponExpired,
  normalizeCouponCode,
} from "./coupon-service";
import type { CouponDefinition } from "./types";

// Coupon định nghĩa ngay trong test để không phụ thuộc src/data/coupons.ts.
const percent10: CouponDefinition = {
  code: "PCT10",
  type: "percent",
  value: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};
const percent10NoMin: CouponDefinition = {
  code: "PCT10NOMIN",
  type: "percent",
  value: 10,
  maxDiscount: 100_000,
};
const fixed50kMin500k: CouponDefinition = {
  code: "FIX50K",
  type: "fixed",
  value: 50_000,
  minSubtotal: 500_000,
};
const fixed50kNoMin: CouponDefinition = {
  code: "FIX50KNOMIN",
  type: "fixed",
  value: 50_000,
};
const expiring: CouponDefinition = {
  code: "TET",
  type: "percent",
  value: 15,
  maxDiscount: 200_000,
  minSubtotal: 300_000,
  expiresOn: "2026-02-28",
};

const NOW = new Date("2026-01-15T10:00:00+07:00");

describe("normalizeCouponCode", () => {
  it("bỏ khoảng trắng đầu/cuối và chuyển chữ HOA", () => {
    expect(normalizeCouponCode(" shoplite10 ")).toBe("SHOPLITE10");
  });
});

describe("couponExpiryInstant", () => {
  it("hạn chót là 23:59:59.999 giờ Việt Nam của ngày hết hạn", () => {
    expect(couponExpiryInstant("2026-02-28")).toEqual(new Date("2026-02-28T23:59:59.999+07:00"));
  });
});

describe("isCouponExpired", () => {
  it("chưa hết hạn trước ngày hết hạn", () => {
    expect(isCouponExpired(expiring, new Date("2026-02-28T12:00:00+07:00"))).toBe(false);
  });

  it("vẫn dùng được đúng hạn chót 23:59:59.999", () => {
    expect(isCouponExpired(expiring, new Date("2026-02-28T23:59:59.999+07:00"))).toBe(false);
  });

  it("hết hạn từ 00:00 ngày hôm sau", () => {
    expect(isCouponExpired(expiring, new Date("2026-03-01T00:00:00.000+07:00"))).toBe(true);
  });

  it("mã không có ngày hết hạn thì không bao giờ hết hạn", () => {
    expect(isCouponExpired(percent10, new Date("2099-12-31T23:59:59+07:00"))).toBe(false);
  });
});

describe("calculateCouponDiscount", () => {
  it("giảm theo phần trăm khi dưới mức tối đa", () => {
    expect(calculateCouponDiscount(percent10, 999_990)).toBe(99_999);
  });

  it("giảm đúng mức tối đa khi chạm mức", () => {
    expect(calculateCouponDiscount(percent10, 1_000_000)).toBe(100_000);
  });

  it("không vượt mức tối đa khi trên mức", () => {
    expect(calculateCouponDiscount(percent10, 1_000_010)).toBe(100_000);
  });

  it("làm tròn xuống đến đồng nguyên", () => {
    expect(calculateCouponDiscount(percent10, 333_335)).toBe(33_333);
  });

  it("số tiền giảm không vượt quá tạm tính", () => {
    expect(calculateCouponDiscount(fixed50kNoMin, 30_000)).toBe(30_000);
  });

  it("mã cố định giảm đúng giá trị", () => {
    expect(calculateCouponDiscount(fixed50kNoMin, 600_000)).toBe(50_000);
  });
});

describe("checkCouponAvailability", () => {
  it("báo không tồn tại khi không có mã", () => {
    expect(checkCouponAvailability(undefined, NOW)).toEqual({
      ok: false,
      reason: "COUPON_NOT_FOUND",
    });
  });

  it("báo hết hạn khi đã qua hạn chót", () => {
    expect(checkCouponAvailability(expiring, new Date("2026-03-01T00:00:00+07:00"))).toEqual({
      ok: false,
      reason: "COUPON_EXPIRED",
      coupon: expiring,
    });
  });

  it("hợp lệ khi còn hạn, không xét ngưỡng", () => {
    expect(checkCouponAvailability(fixed50kMin500k, NOW)).toEqual({
      ok: true,
      coupon: fixed50kMin500k,
    });
  });
});

describe("evaluateCouponThreshold", () => {
  const expiredLongAgo: CouponDefinition = {
    ...percent10,
    expiresOn: "2020-01-01",
  };

  it("không xét hạn dùng: mã đã hết hạn vẫn ok khi đạt ngưỡng", () => {
    expect(evaluateCouponThreshold(expiredLongAgo, 400_000)).toEqual({
      ok: true,
      coupon: expiredLongAgo,
      discount: 40_000,
    });
  });

  it("dưới ngưỡng thì trả về số tiền cần mua thêm", () => {
    expect(evaluateCouponThreshold(expiredLongAgo, 250_000)).toEqual({
      ok: false,
      reason: "COUPON_MIN_SUBTOTAL_NOT_MET",
      coupon: expiredLongAgo,
      minSubtotal: 300_000,
      shortfall: 50_000,
    });
  });

  it("mã không có ngưỡng áp dụng cho mọi tạm tính", () => {
    expect(evaluateCouponThreshold(percent10NoMin, 100_000)).toEqual({
      ok: true,
      coupon: percent10NoMin,
      discount: 10_000,
    });
  });
});

describe("evaluateCoupon", () => {
  it("báo không tồn tại khi không có mã", () => {
    expect(evaluateCoupon(undefined, 1_000_000, NOW)).toEqual({
      ok: false,
      reason: "COUPON_NOT_FOUND",
    });
  });

  it("từ chối khi tạm tính dưới ngưỡng 1đ", () => {
    expect(evaluateCoupon(percent10, 299_999, NOW)).toEqual({
      ok: false,
      reason: "COUPON_MIN_SUBTOTAL_NOT_MET",
      coupon: percent10,
      minSubtotal: 300_000,
      shortfall: 1,
    });
  });

  it("áp dụng khi tạm tính bằng ngưỡng", () => {
    expect(evaluateCoupon(percent10, 300_000, NOW)).toEqual({
      ok: true,
      coupon: percent10,
      discount: 30_000,
    });
  });

  it("áp dụng khi tạm tính trên ngưỡng", () => {
    expect(evaluateCoupon(percent10, 300_001, NOW)).toEqual({
      ok: true,
      coupon: percent10,
      discount: 30_000,
    });
  });

  it("mã cố định: dưới ngưỡng báo cần mua thêm, bằng ngưỡng thì áp dụng", () => {
    expect(evaluateCoupon(fixed50kMin500k, 450_000, NOW)).toMatchObject({
      ok: false,
      reason: "COUPON_MIN_SUBTOTAL_NOT_MET",
      minSubtotal: 500_000,
      shortfall: 50_000,
    });
    expect(evaluateCoupon(fixed50kMin500k, 500_000, NOW)).toEqual({
      ok: true,
      coupon: fixed50kMin500k,
      discount: 50_000,
    });
  });

  it("vừa hết hạn vừa dưới ngưỡng thì chỉ báo hết hạn", () => {
    expect(evaluateCoupon(expiring, 100_000, new Date("2026-03-01T00:00:00+07:00"))).toEqual({
      ok: false,
      reason: "COUPON_EXPIRED",
      coupon: expiring,
    });
  });

  it("cho cùng kết quả với evaluateCouponThreshold khi mã còn hạn", () => {
    for (const subtotal of [250_000, 300_000, 1_500_000]) {
      expect(evaluateCoupon(expiring, subtotal, NOW)).toEqual(
        evaluateCouponThreshold(expiring, subtotal),
      );
    }
  });
});

describe("couponErrorMessage", () => {
  it("thông báo mã không tồn tại", () => {
    expect(couponErrorMessage({ ok: false, reason: "COUPON_NOT_FOUND" })).toBe(
      "Mã giảm giá không tồn tại",
    );
  });

  it("thông báo mã hết hạn", () => {
    expect(
      couponErrorMessage({
        ok: false,
        reason: "COUPON_EXPIRED",
        coupon: expiring,
      }),
    ).toBe("Mã giảm giá đã hết hạn");
  });

  it("thông báo ngưỡng tối thiểu và số tiền cần mua thêm", () => {
    expect(
      couponErrorMessage({
        ok: false,
        reason: "COUPON_MIN_SUBTOTAL_NOT_MET",
        coupon: fixed50kMin500k,
        minSubtotal: 500_000,
        shortfall: 50_000,
      }),
    ).toBe(
      `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500_000)}. Mua thêm ${formatCurrency(50_000)} để dùng mã này.`,
    );
  });
});

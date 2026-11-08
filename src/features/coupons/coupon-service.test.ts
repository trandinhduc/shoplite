// @vitest-environment node
import { describe, expect, it } from "vitest";
import { coupons } from "@/data/coupons";
import { OrderError } from "@/features/orders/order-errors";
import { formatCurrency } from "@/lib/format";
import {
  findCouponByCode,
  getExpiredCouponNotice,
  getExpiredCouponNoticeForOrder,
  toCouponError,
} from "./coupon-service";
import type { Coupon } from "./types";

const SHOPLITE10 = coupons.find((coupon) => coupon.code === "SHOPLITE10") as Coupon;
const TET2026 = coupons.find((coupon) => coupon.code === "TET2026") as Coupon;

const SAU_KHI_HET_HAN = new Date("2026-11-08T10:00:00+07:00");
const TRUOC_KHI_HET_HAN = new Date("2026-02-28T23:59:59+07:00");

describe("dữ liệu mã giảm giá (src/data/coupons.ts)", () => {
  it("có đủ ba mã ban đầu với giá trị đúng", () => {
    expect(coupons).toEqual([
      {
        code: "SHOPLITE10",
        type: "percent",
        percent: 10,
        maxDiscount: 100_000,
        minOrderValue: 300_000,
      },
      {
        code: "GIAM50K",
        type: "fixed",
        amount: 50_000,
        minOrderValue: 500_000,
      },
      {
        code: "TET2026",
        type: "percent",
        percent: 15,
        maxDiscount: 200_000,
        expiresOn: "2026-02-28",
      },
    ]);
  });

  it("mã viết HOA, không khoảng trắng và dài tối đa 32 ký tự", () => {
    for (const coupon of coupons) {
      expect(coupon.code).toBe(coupon.code.trim().toUpperCase());
      expect(coupon.code).not.toMatch(/\s/);
      expect(coupon.code.length).toBeGreaterThan(0);
      expect(coupon.code.length).toBeLessThanOrEqual(32);
    }
  });

  it("không có mã trùng nhau", () => {
    const codes = coupons.map((coupon) => coupon.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("ràng buộc đúng theo loại mã", () => {
    for (const coupon of coupons) {
      if (coupon.type === "percent") {
        expect(Number.isInteger(coupon.percent)).toBe(true);
        expect(coupon.percent).toBeGreaterThanOrEqual(1);
        expect(coupon.percent).toBeLessThanOrEqual(100);
        expect(Number.isInteger(coupon.maxDiscount)).toBe(true);
        expect(coupon.maxDiscount).toBeGreaterThan(0);
      } else {
        expect(Number.isInteger(coupon.amount)).toBe(true);
        expect(coupon.amount).toBeGreaterThan(0);
      }
      if (coupon.minOrderValue !== undefined) {
        expect(Number.isInteger(coupon.minOrderValue)).toBe(true);
        expect(coupon.minOrderValue).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("ngày hết hạn đúng dạng YYYY-MM-DD và là ngày có thật", () => {
    for (const coupon of coupons) {
      if (coupon.expiresOn === undefined) continue;
      expect(coupon.expiresOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const date = new Date(`${coupon.expiresOn}T00:00:00Z`);
      expect(date.toISOString().slice(0, 10)).toBe(coupon.expiresOn);
    }
  });
});

describe("findCouponByCode", () => {
  it("nhận mã viết thường hoặc có khoảng trắng đầu cuối", () => {
    expect(findCouponByCode("shoplite10")?.code).toBe("SHOPLITE10");
    expect(findCouponByCode("  GiAm50k ")?.code).toBe("GIAM50K");
  });

  it("mã không có trong danh sách trả về undefined", () => {
    expect(findCouponByCode("ABC123")).toBeUndefined();
    expect(findCouponByCode("")).toBeUndefined();
  });

  it("không tự sửa khoảng trắng ở giữa mã", () => {
    expect(findCouponByCode("SHOP LITE10")).toBeUndefined();
  });

  it("dùng danh sách được truyền vào thay cho dữ liệu mặc định", () => {
    const rieng: Coupon[] = [{ code: "RIENG5", type: "fixed", amount: 5_000 }];
    expect(findCouponByCode("rieng5", rieng)?.code).toBe("RIENG5");
    expect(findCouponByCode("SHOPLITE10", rieng)).toBeUndefined();
  });
});

describe("toCouponError", () => {
  it("mã không tồn tại → COUPON_NOT_FOUND (422)", () => {
    const error = toCouponError({ ok: false, reason: "NOT_FOUND" }, "ABC123");
    expect(error).toBeInstanceOf(OrderError);
    expect(error.code).toBe("COUPON_NOT_FOUND");
    expect(error.httpStatus).toBe(422);
    expect(error.message).toBe('Mã giảm giá "ABC123" không tồn tại');
  });

  it("mã hết hạn → COUPON_EXPIRED (422)", () => {
    const error = toCouponError({ ok: false, reason: "EXPIRED", coupon: TET2026 }, "TET2026");
    expect(error.code).toBe("COUPON_EXPIRED");
    expect(error.httpStatus).toBe(422);
    expect(error.message).toBe('Mã giảm giá "TET2026" đã hết hạn');
  });

  it("chưa đạt đơn tối thiểu → COUPON_MIN_ORDER_NOT_MET (422) kèm số tiền cần mua thêm", () => {
    const error = toCouponError(
      {
        ok: false,
        reason: "MIN_ORDER_NOT_MET",
        coupon: SHOPLITE10,
        minOrderValue: 300_000,
        missingAmount: 50_000,
      },
      "SHOPLITE10",
    );
    expect(error.code).toBe("COUPON_MIN_ORDER_NOT_MET");
    expect(error.httpStatus).toBe(422);
    expect(error.message).toBe(
      `Đơn hàng cần tối thiểu ${formatCurrency(300_000)} để dùng mã SHOPLITE10. ` +
        `Bạn cần mua thêm ${formatCurrency(50_000)}`,
    );
    expect(error.details).toEqual({
      minOrderValue: "300000",
      missingAmount: "50000",
    });
  });
});

describe("getExpiredCouponNotice", () => {
  it("mã đã hết hạn → số tiền giảm mà mã lẽ ra mang lại", () => {
    expect(getExpiredCouponNotice("TET2026", 600_000, SAU_KHI_HET_HAN)).toEqual({
      couponCode: "TET2026",
      lostDiscount: 90_000,
    });
  });

  it("nhận mã viết thường hoặc có khoảng trắng", () => {
    expect(getExpiredCouponNotice(" tet2026 ", 600_000, SAU_KHI_HET_HAN)?.couponCode).toBe(
      "TET2026",
    );
  });

  it("mã còn hạn thì không có thông báo", () => {
    expect(getExpiredCouponNotice("SHOPLITE10", 600_000, SAU_KHI_HET_HAN)).toBeNull();
    expect(getExpiredCouponNotice("TET2026", 600_000, TRUOC_KHI_HET_HAN)).toBeNull();
  });

  it("mã không tồn tại thì không có thông báo", () => {
    expect(getExpiredCouponNotice("ABC123", 600_000, SAU_KHI_HET_HAN)).toBeNull();
  });

  it.each([
    ["chuỗi dài hơn 32 ký tự", "A".repeat(33)],
    ["undefined", undefined],
    ["mảng", ["TET2026"]],
    ["số", 2026],
    ["chuỗi chỉ có khoảng trắng", "   "],
    ["null", null],
  ])("giá trị không hợp lệ (%s) trả về null và không ném lỗi", (_label, value) => {
    expect(() => getExpiredCouponNotice(value, 600_000, SAU_KHI_HET_HAN)).not.toThrow();
    expect(getExpiredCouponNotice(value, 600_000, SAU_KHI_HET_HAN)).toBeNull();
  });
});

describe("getExpiredCouponNoticeForOrder", () => {
  it("đơn đã có couponCode thì không có thông báo, dù tham số là mã đã hết hạn", () => {
    const order = { couponCode: "SHOPLITE10", subtotal: 600_000 };
    expect(getExpiredCouponNoticeForOrder(order, "TET2026", SAU_KHI_HET_HAN)).toBeNull();
  });

  it("đơn không có couponCode thì tính theo tạm tính của đơn", () => {
    const order = { subtotal: 600_000 };
    expect(getExpiredCouponNoticeForOrder(order, "TET2026", SAU_KHI_HET_HAN)).toEqual({
      couponCode: "TET2026",
      lostDiscount: 90_000,
    });
  });

  it("tham số URL giả (mã còn hạn, sai kiểu) không tạo ra thông báo", () => {
    const order = { subtotal: 600_000 };
    expect(getExpiredCouponNoticeForOrder(order, "SHOPLITE10", SAU_KHI_HET_HAN)).toBeNull();
    expect(getExpiredCouponNoticeForOrder(order, ["TET2026"], SAU_KHI_HET_HAN)).toBeNull();
    expect(getExpiredCouponNoticeForOrder(order, undefined, SAU_KHI_HET_HAN)).toBeNull();
  });
});

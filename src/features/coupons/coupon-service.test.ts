import { describe, expect, it } from "vitest";
import { OrderError } from "@/features/orders/order-errors";
import { findCouponByCode, toCouponError, validateCouponCode } from "./coupon-service";

const NOW = new Date("2026-11-08T10:00:00+07:00");

function catchError(fn: () => unknown): OrderError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(OrderError);
    return error as OrderError;
  }
  throw new Error("Hàm không ném lỗi");
}

describe("findCouponByCode", () => {
  it("tìm mã không phân biệt hoa thường và khoảng trắng", () => {
    expect(findCouponByCode(" shoplite10 ")?.code).toBe("SHOPLITE10");
  });

  it("trả về undefined khi mã không tồn tại", () => {
    expect(findCouponByCode("KHONGCO")).toBeUndefined();
  });
});

describe("validateCouponCode", () => {
  it("trả về quy tắc của mã hợp lệ sau khi chuẩn hóa", () => {
    expect(validateCouponCode(" giam50k ", NOW)).toEqual({
      code: "GIAM50K",
      type: "fixed",
      amount: 50_000,
      minSubtotal: 500_000,
    });
  });

  it("ném COUPON_NOT_FOUND khi mã không tồn tại", () => {
    const error = catchError(() => validateCouponCode("khongco", NOW));
    expect(error.code).toBe("COUPON_NOT_FOUND");
    expect(error.message).toBe('Mã giảm giá "KHONGCO" không tồn tại');
    expect(error.httpStatus).toBe(422);
    expect(error.details).toEqual({ couponCode: error.message });
  });

  it("ném COUPON_EXPIRED từ 00:00 ngày 01/03/2026 giờ Việt Nam", () => {
    const error = catchError(() =>
      validateCouponCode("TET2026", new Date("2026-03-01T00:00:00+07:00")),
    );
    expect(error.code).toBe("COUPON_EXPIRED");
    expect(error.message).toBe('Mã giảm giá "TET2026" đã hết hạn');
    expect(error.httpStatus).toBe(422);
    expect(error.details).toEqual({ couponCode: error.message });
  });

  it("vẫn hợp lệ lúc 23:59:59.999 ngày 28/02/2026 giờ Việt Nam", () => {
    expect(validateCouponCode("TET2026", new Date("2026-02-28T23:59:59.999+07:00")).code).toBe(
      "TET2026",
    );
  });
});

describe("toCouponError", () => {
  it("báo giá trị tối thiểu và số tiền cần mua thêm", () => {
    const error = toCouponError("GIAM50K", {
      status: "below_minimum",
      minSubtotal: 500_000,
      shortfall: 80_000,
    });
    expect(error.code).toBe("COUPON_MIN_SUBTOTAL_NOT_MET");
    expect(error.message).toMatch(/GIAM50K/);
    expect(error.message).toMatch(/500\.000\s₫/);
    expect(error.message).toMatch(/80\.000\s₫/);
    expect(error.httpStatus).toBe(422);
    expect(error.details).toEqual({ couponCode: error.message });
  });
});

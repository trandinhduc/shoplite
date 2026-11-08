// @vitest-environment node
import { describe, expect, it } from "vitest";
import { OrderError } from "@/features/orders/order-errors";
import { validateCoupon } from "./coupon-service";

const NOW = new Date("2026-11-08T10:00:00+07:00");

function catchOrderError(run: () => unknown): OrderError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(OrderError);
    return error as OrderError;
  }
  throw new Error("Không ném OrderError");
}

describe("validateCoupon", () => {
  it("trả về quy tắc mã và số tiền giảm khi hợp lệ, sau khi chuẩn hóa mã", () => {
    const result = validateCoupon(" shoplite10 ", 400_000, NOW);
    expect(result.coupon.code).toBe("SHOPLITE10");
    expect(result.discount).toBe(40_000);
  });

  it("báo mã không tồn tại", () => {
    const error = catchOrderError(() => validateCoupon("KHONGCO", 400_000, NOW));
    expect(error.code).toBe("COUPON_NOT_FOUND");
    expect(error.message).toBe('Mã giảm giá "KHONGCO" không tồn tại');
    expect(error.httpStatus).toBe(422);
  });

  it("báo mã đã hết hạn", () => {
    const error = catchOrderError(() => validateCoupon("TET2026", 400_000, NOW));
    expect(error.code).toBe("COUPON_EXPIRED");
    expect(error.message).toBe('Mã giảm giá "TET2026" đã hết hạn');
    expect(error.httpStatus).toBe(422);
  });

  it("báo chưa đạt giá trị tối thiểu kèm số tiền cần mua thêm", () => {
    const error = catchOrderError(() => validateCoupon("GIAM50K", 450_000, NOW));
    expect(error.code).toBe("COUPON_MIN_ORDER_NOT_MET");
    expect(error.details).toEqual({
      minOrderValue: "500000",
      amountNeeded: "50000",
    });
    expect(error.message).toMatch(/500\.000.*50\.000/);
    expect(error.httpStatus).toBe(422);
  });
});

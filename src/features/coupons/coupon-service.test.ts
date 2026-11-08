// @vitest-environment node
import { describe, expect, it } from "vitest";
import { OrderError } from "@/features/orders/order-errors";
import { formatCurrency } from "@/lib/format";
import { createCouponService, findCouponByCode } from "./coupon-service";

const NOW = new Date("2026-11-08T10:00:00+07:00");

describe("findCouponByCode", () => {
  it("tìm mã không phân biệt hoa/thường và bỏ khoảng trắng đầu/cuối", () => {
    expect(findCouponByCode(" shoplite10 ")).toMatchObject({
      code: "SHOPLITE10",
    });
  });

  it("trả undefined khi mã không tồn tại", () => {
    expect(findCouponByCode("KHONGCO")).toBeUndefined();
  });
});

describe("couponService.validateCoupon", () => {
  const service = createCouponService({ now: () => NOW });

  it("lấy giá từ catalog và trả quy tắc của đúng mã, tạm tính và số tiền giảm", () => {
    // Chuột không dây SwiftClick (p006) 450.000đ
    const result = service.validateCoupon({
      code: " shoplite10 ",
      items: [{ productId: "p006", quantity: 1 }],
    });
    expect(result).toEqual({
      coupon: {
        code: "SHOPLITE10",
        type: "percentage",
        value: 10,
        maxDiscount: 100_000,
        minSubtotal: 300_000,
      },
      subtotal: 450_000,
      discount: 45_000,
    });
  });

  it("giới hạn mức giảm tối đa của mã phần trăm", () => {
    // Bàn di chuột DeskMat XL (p007) 250.000đ × 8 = 2.000.000đ
    const result = service.validateCoupon({
      code: "SHOPLITE10",
      items: [{ productId: "p007", quantity: 8 }],
    });
    expect(result).toMatchObject({ subtotal: 2_000_000, discount: 100_000 });
  });

  it("giảm số tiền cố định khi đạt giá trị tối thiểu", () => {
    // 450.000đ + 150.000đ = 600.000đ
    const result = service.validateCoupon({
      code: "GIAM50K",
      items: [
        { productId: "p006", quantity: 1 },
        { productId: "p010", quantity: 1 },
      ],
    });
    expect(result).toMatchObject({ subtotal: 600_000, discount: 50_000 });
  });

  it("không dùng giá do client gửi lên", () => {
    const result = service.validateCoupon({
      code: "SHOPLITE10",
      items: [{ productId: "p006", quantity: 1, price: 1 }],
      subtotal: 999_999_999,
    });
    expect(result).toMatchObject({ subtotal: 450_000, discount: 45_000 });
  });
});

describe("couponService.validateCoupon - lỗi", () => {
  const service = createCouponService({ now: () => NOW });
  const mouse = [{ productId: "p006", quantity: 1 }]; // 450.000đ

  function catchOrderError(fn: () => unknown): OrderError {
    try {
      fn();
    } catch (error) {
      expect(error).toBeInstanceOf(OrderError);
      return error as OrderError;
    }
    throw new Error("Không ném lỗi");
  }

  it.each(["KHONGCO", "SHOP LITE10", "GIẢM50K"])("mã %j → COUPON_NOT_FOUND", (code) => {
    const error = catchOrderError(() => service.validateCoupon({ code, items: mouse }));
    expect(error.code).toBe("COUPON_NOT_FOUND");
    expect(error.message).toBe("Mã giảm giá không tồn tại");
    expect(error.httpStatus).toBe(422);
  });

  it("mã hết hạn từ 00:00 ngày sau ngày hết hạn → COUPON_EXPIRED", () => {
    const expiredService = createCouponService({
      now: () => new Date("2026-03-01T00:00:00+07:00"),
    });
    const error = catchOrderError(() =>
      expiredService.validateCoupon({ code: "TET2026", items: mouse }),
    );
    expect(error.code).toBe("COUPON_EXPIRED");
    expect(error.message).toBe("Mã giảm giá đã hết hạn");
    expect(error.httpStatus).toBe(422);
  });

  it("mã vẫn dùng được ở mili giây cuối của ngày hết hạn", () => {
    const lastMsService = createCouponService({
      now: () => new Date("2026-02-28T23:59:59.999+07:00"),
    });
    expect(lastMsService.validateCoupon({ code: "TET2026", items: mouse })).toMatchObject({
      discount: 67_500,
    });
  });

  it("chưa đạt giá trị tối thiểu → COUPON_MIN_SUBTOTAL_NOT_MET kèm số tiền cần mua thêm", () => {
    const error = catchOrderError(() => service.validateCoupon({ code: "GIAM50K", items: mouse }));
    expect(error.code).toBe("COUPON_MIN_SUBTOTAL_NOT_MET");
    expect(error.httpStatus).toBe(422);
    expect(error.details).toEqual({
      minSubtotal: "500000",
      shortfall: "50000",
    });
    expect(error.message).toBe(
      `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500_000)} để dùng mã GIAM50K. ` +
        `Bạn cần mua thêm ${formatCurrency(50_000)}.`,
    );
  });

  it("sản phẩm không tồn tại → PRODUCT_NOT_FOUND", () => {
    const error = catchOrderError(() =>
      service.validateCoupon({
        code: "SHOPLITE10",
        items: [{ productId: "p999", quantity: 1 }],
      }),
    );
    expect(error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it.each([
    ["mã rỗng", ""],
    ["mã dài 33 ký tự", "A".repeat(33)],
  ])("%s → VALIDATION_ERROR kèm lỗi của trường code", (_label, code) => {
    const error = catchOrderError(() => service.validateCoupon({ code, items: mouse }));
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details).toHaveProperty(["code"]);
  });
});

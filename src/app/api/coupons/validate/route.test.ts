// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "./route";

const postValidate = (body: unknown) =>
  POST(
    new Request("http://localhost/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/coupons/validate", () => {
  it("200 - áp dụng thành công mã hợp lệ (SHOPLITE10)", async () => {
    const response = await postValidate({
      code: "SHOPLITE10",
      subtotal: 1_290_000,
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      valid: true,
      coupon: {
        code: "SHOPLITE10",
        type: "percentage",
        value: 10,
        maxDiscount: 100_000,
        minOrderValue: 300_000,
        expiresAt: null,
        description: "Giảm 10% tối đa 100.000 ₫ cho đơn từ 300.000 ₫",
      },
      discountAmount: 100_000,
    });
  });

  it("200 - tự động chuẩn hóa chữ thường và khoảng trắng (shoplite10)", async () => {
    const response = await postValidate({
      code: "  shoplite10  ",
      subtotal: 600_000,
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(true);
    expect(data.coupon.code).toBe("SHOPLITE10");
    expect(data.discountAmount).toBe(60_000);
  });

  it("400 - body không phải JSON hợp lệ", async () => {
    const response = await postValidate("invalid-json");
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 - dữ liệu thiếu trường code hoặc subtotal", async () => {
    const response = await postValidate({ code: "" });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("422 - mã không tồn tại trong hệ thống (COUPON_NOT_FOUND)", async () => {
    const response = await postValidate({
      code: "KHONGTONTAI",
      subtotal: 500_000,
    });
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error.code).toBe("COUPON_NOT_FOUND");
    expect(data.error.message).toBe("Mã giảm giá không tồn tại");
  });

  it("422 - mã đã hết hạn sử dụng (COUPON_EXPIRED)", async () => {
    const response = await postValidate({
      code: "TET2026",
      subtotal: 600_000,
    });
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error.code).toBe("COUPON_EXPIRED");
    expect(data.error.message).toBe("Mã giảm giá đã hết hạn sử dụng");
  });

  it("422 - đơn hàng chưa đạt giá trị tối thiểu (COUPON_MIN_ORDER_NOT_MET)", async () => {
    const response = await postValidate({
      code: "SHOPLITE10",
      subtotal: 200_000, // minOrderValue: 300.000 ₫
    });
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error.code).toBe("COUPON_MIN_ORDER_NOT_MET");
    expect(data.error.message).toContain("300.000 ₫");
    expect(data.error.message).toContain("cần mua thêm 100.000 ₫");
  });
});

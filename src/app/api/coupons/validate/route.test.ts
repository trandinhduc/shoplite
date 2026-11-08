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
  it("200 - trả về quy tắc của đúng mã đã gửi, tạm tính và số tiền giảm do server tính", async () => {
    const response = await postValidate({
      code: " giam50k ",
      items: [{ productId: "p006", quantity: 2 }],
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      coupon: { code: "GIAM50K", type: "fixed", value: 50_000, minOrderValue: 500_000 },
      subtotal: 900_000,
      discount: 50_000,
    });
  });

  it("400 - body không phải JSON", async () => {
    const response = await postValidate("{oops");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/coupons/validate - lỗi", () => {
  const items = [{ productId: "p006", quantity: 1 }];

  it.each([
    ["KHONGCO", "COUPON_NOT_FOUND"],
    ["TET2026", "COUPON_EXPIRED"],
  ])("422 - mã %s trả về %s", async (code, errorCode) => {
    const response = await postValidate({ code, items });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe(errorCode);
  });

  it("422 - chưa đạt giá trị tối thiểu, kèm giá trị tối thiểu và số tiền cần mua thêm", async () => {
    const response = await postValidate({ code: "GIAM50K", items });
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_MIN_ORDER_NOT_MET");
    expect(error.details).toEqual({ minOrderValue: "500000", amountNeeded: "50000" });
  });

  it("400 - mã rỗng hoặc chỉ có khoảng trắng", async () => {
    const response = await postValidate({ code: "   ", items });
    expect(response.status).toBe(400);
    expect((await response.json()).error.details).toEqual({ code: "Vui lòng nhập mã giảm giá" });
  });

  it.each(["A".repeat(33), 123])("400 - mã không hợp lệ: %j", async (code) => {
    const response = await postValidate({ code, items });
    expect(response.status).toBe(400);
    expect((await response.json()).error.details).toHaveProperty("code");
  });

  it("422 - sản phẩm không tồn tại", async () => {
    const response = await postValidate({
      code: "SHOPLITE10",
      items: [{ productId: "p999", quantity: 1 }],
    });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("PRODUCT_NOT_FOUND");
  });
});

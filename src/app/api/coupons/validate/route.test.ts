// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Cố định thời điểm để kết quả không phụ thuộc ngày chạy test.
vi.mock("@/features/coupons/coupon-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/coupons/coupon-service")>();
  return {
    ...actual,
    couponService: actual.createCouponService({
      now: () => new Date("2026-11-08T10:00:00+07:00"),
    }),
  };
});

const postValidate = (body: unknown) =>
  POST(
    new Request("http://localhost/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/coupons/validate", () => {
  it("200 - trả quy tắc của đúng mã đã gửi, tạm tính và số tiền giảm", async () => {
    const response = await postValidate({
      code: " shoplite10 ",
      items: [{ productId: "p006", quantity: 1 }],
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
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

  it("200 - chỉ trả đúng 3 khóa, không lộ danh sách mã", async () => {
    const response = await postValidate({
      code: "GIAM50K",
      items: [{ productId: "p001", quantity: 1 }],
    });
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(["coupon", "discount", "subtotal"]);
    expect(body.coupon.code).toBe("GIAM50K");
  });
});

describe("POST /api/coupons/validate - lỗi", () => {
  const mouse = [{ productId: "p006", quantity: 1 }];

  it.each([
    ["KHONGCO", "COUPON_NOT_FOUND"],
    ["TET2026", "COUPON_EXPIRED"],
    ["GIAM50K", "COUPON_MIN_SUBTOTAL_NOT_MET"],
  ])("422 - mã %s → %s", async (code, errorCode) => {
    const response = await postValidate({ code, items: mouse });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe(errorCode);
    expect(typeof body.error.message).toBe("string");
  });

  it("400 - body không phải JSON", async () => {
    const response = await postValidate("{oops");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("400 - sai schema, có lỗi theo trường", async () => {
    const response = await postValidate({ code: "", items: [] });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toHaveProperty(["code"]);
    expect(body.error.details).toHaveProperty(["items"]);
  });
});

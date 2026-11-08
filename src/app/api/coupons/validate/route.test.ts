// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
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
  it("200 - nhận mã chữ thường có khoảng trắng và trả về định nghĩa của đúng mã đó", async () => {
    const response = await postValidate({ code: " shoplite10 " });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      coupon: {
        code: "SHOPLITE10",
        type: "percent",
        value: 10,
        maxDiscount: 100_000,
        minSubtotal: 300_000,
      },
    });
  });

  it("200 - không lộ danh sách mã", async () => {
    const body = await (await postValidate({ code: "GIAM50K" })).json();
    expect(Object.keys(body)).toEqual(["coupon"]);
    expect(Array.isArray(body.coupon)).toBe(false);
  });
});

describe("POST /api/coupons/validate - lỗi", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("422 COUPON_NOT_FOUND khi mã không tồn tại", async () => {
    const response = await postValidate({ code: "KHONGCO" });
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_NOT_FOUND");
    expect(error.message).toBe("Mã giảm giá không tồn tại");
    expect(error.details.couponCode).toBe("KHONGCO");
  });

  it("422 COUPON_EXPIRED với TET2026 (hôm nay đã qua 28/02/2026)", async () => {
    const response = await postValidate({ code: "tet2026" });
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_EXPIRED");
    expect(error.message).toBe("Mã giảm giá đã hết hạn");
    expect(error.details.couponCode).toBe("TET2026");
  });

  it("200 đúng hạn chót 23:59:59.999 ngày 28/02/2026 giờ VN", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-02-28T23:59:59.999+07:00"));
    const response = await postValidate({ code: "TET2026" });
    expect(response.status).toBe(200);
  });

  it("422 từ 00:00 ngày 01/03/2026 giờ VN", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000+07:00"));
    const response = await postValidate({ code: "TET2026" });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("COUPON_EXPIRED");
  });

  it("400 khi mã chỉ có khoảng trắng", async () => {
    const response = await postValidate({ code: "   " });
    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Vui lòng nhập mã giảm giá");
    expect(error.details.code).toBe("Vui lòng nhập mã giảm giá");
  });

  it("400 khi mã dài hơn 32 ký tự", async () => {
    const response = await postValidate({ code: "A".repeat(33) });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("400 khi body không phải JSON", async () => {
    const response = await postValidate("{oops");
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("Body phải là JSON hợp lệ");
  });
});

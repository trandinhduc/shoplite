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

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/coupons/validate", () => {
  it("200 - trả về quy tắc của mã hợp lệ", async () => {
    const response = await postValidate({ code: "SHOPLITE10" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      coupon: {
        code: "SHOPLITE10",
        type: "percent",
        percent: 10,
        maxDiscount: 100_000,
        minSubtotal: 300_000,
      },
    });
  });

  it("200 - chuẩn hóa mã có chữ thường và khoảng trắng", async () => {
    const response = await postValidate({ code: " giam50k " });
    expect(response.status).toBe(200);
    expect((await response.json()).coupon.code).toBe("GIAM50K");
  });

  it("422 - mã không tồn tại", async () => {
    const response = await postValidate({ code: "KHONGCO" });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("COUPON_NOT_FOUND");
    expect(body.error.details.couponCode).toBe(body.error.message);
  });

  it("422 - mã đã hết hạn theo đồng hồ server", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00+07:00"));
    const response = await postValidate({ code: "TET2026" });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("COUPON_EXPIRED");
  });

  it("200 - mã còn hạn ở mili-giây cuối cùng", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-28T23:59:59.999+07:00"));
    const response = await postValidate({ code: "TET2026" });
    expect(response.status).toBe(200);
  });

  it.each([
    ["body không phải JSON", "{oops"],
    ["thiếu code", {}],
    ["code rỗng", { code: "" }],
    ["code chỉ có khoảng trắng", { code: "   " }],
    ["code không phải chuỗi", { code: 123 }],
  ])("400 - %s", async (_label, body) => {
    const response = await postValidate(body);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});

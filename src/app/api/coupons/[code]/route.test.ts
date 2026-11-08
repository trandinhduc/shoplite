// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "./route";

const getCoupon = (code: string) =>
  GET(new Request(`http://localhost/api/coupons/${encodeURIComponent(code)}`), {
    params: Promise.resolve({ code }),
  } as RouteContext<"/api/coupons/[code]">);

describe("GET /api/coupons/:code", () => {
  it("200 - trả định nghĩa mã, không phân biệt hoa/thường", async () => {
    const response = await getCoupon("shoplite10");
    expect(response.status).toBe(200);
    expect((await response.json()).coupon).toMatchObject({
      code: "SHOPLITE10",
      type: "percent",
      value: 10,
    });
  });

  it("200 - vẫn trả mã đã hết hạn để client tự đánh giá", async () => {
    const response = await getCoupon("TET2026");
    expect(response.status).toBe(200);
    expect((await response.json()).coupon.expiresOn).toBe("2026-02-28");
  });

  it("404 - mã không tồn tại", async () => {
    const response = await getCoupon("KHONGCO");
    expect(response.status).toBe(404);
    expect((await response.json()).error).toMatchObject({
      code: "COUPON_NOT_FOUND",
      message: "Mã giảm giá không tồn tại",
    });
  });

  it("400 - mã chỉ có khoảng trắng", async () => {
    const response = await getCoupon("   ");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Vui lòng nhập mã giảm giá",
    });
  });

  it("400 - mã dài hơn 32 ký tự", async () => {
    const response = await getCoupon("A".repeat(33));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("Mã giảm giá không hợp lệ");
  });
});

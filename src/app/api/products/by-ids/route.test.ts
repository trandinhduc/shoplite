// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { getAllProducts, getProductById } from "@/features/catalog/catalog-service";
import { GET } from "./route";

const get = (search: string) =>
  GET(new NextRequest(`http://localhost/api/products/by-ids${search}`));

const fakeIds = (count: number) => Array.from({ length: count }, (_, i) => `x${i}`).join(",");

describe("GET /api/products/by-ids", () => {
  it("200 - trả sản phẩm hiện hành theo đúng thứ tự của ids", async () => {
    const response = await get("?ids=p003,p001");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [getProductById("p003"), getProductById("p001")],
    });
  });

  it("200 - bỏ qua mã không tồn tại", async () => {
    const response = await get("?ids=p001,khong-co");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [getProductById("p001")] });
  });

  it("200 - mã trùng lặp chỉ trả một lần", async () => {
    const response = await get("?ids=p001,p001");
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(1);
  });

  it("200 - đúng 50 mã (bằng ngưỡng) vẫn hợp lệ", async () => {
    const response = await get(`?ids=${fakeIds(50)}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [] });
  });

  it("200 - mỗi lần gọi đọc dữ liệu catalog hiện tại, không dùng bản cache", async () => {
    const product = getProductById("p001")!;
    const original = product.price;
    try {
      const before = (await (await get("?ids=p001")).json()).items[0].price;
      product.price = original + 1;
      const after = (await (await get("?ids=p001")).json()).items[0].price;
      expect(before).toBe(original);
      expect(after).toBe(original + 1);
    } finally {
      product.price = original;
    }
  });

  it.each([
    ["thiếu ids", "", "Thiếu tham số ids"],
    ["ids rỗng", "?ids=", "Vui lòng cung cấp ít nhất một mã sản phẩm"],
    ["51 mã (vượt ngưỡng)", `?ids=${fakeIds(51)}`, "Chỉ tra cứu tối đa 50 mã sản phẩm mỗi lần"],
    ["mã sai định dạng", `?ids=p001,${encodeURIComponent("<script>")}`, "Mã sản phẩm không hợp lệ"],
  ])("400 INVALID_QUERY - %s", async (_label, search, message) => {
    const response = await get(search);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(body.error.message).toBe(message);
    expect(Object.keys(body)).toEqual(["error"]);
  });

  it("không có sản phẩm nào dùng slug `by-ids` (sẽ bị che bởi route này)", () => {
    expect(getAllProducts().map((product) => product.slug)).not.toContain("by-ids");
  });
});

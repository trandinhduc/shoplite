import { describe, expect, it } from "vitest";
import { MAX_PRODUCT_IDS_PER_LOOKUP, productIdsQuerySchema } from "./catalog-schema";

const makeIds = (count: number) => Array.from({ length: count }, (_, i) => `p${i + 1}`).join(",");

describe("productIdsQuerySchema", () => {
  it("tách danh sách mã theo dấu phẩy và giữ đúng thứ tự", () => {
    const result = productIdsQuerySchema.safeParse("p003,p001");
    expect(result.success && result.data).toEqual(["p003", "p001"]);
  });

  it("chấp nhận đúng 1 mã (bằng ngưỡng dưới)", () => {
    const result = productIdsQuerySchema.safeParse("p001");
    expect(result.success && result.data).toEqual(["p001"]);
  });

  it("chấp nhận đúng 50 mã (bằng ngưỡng trên)", () => {
    expect(MAX_PRODUCT_IDS_PER_LOOKUP).toBe(50);
    const result = productIdsQuerySchema.safeParse(makeIds(50));
    expect(result.success && result.data).toHaveLength(50);
  });

  it("từ chối 51 mã (vượt ngưỡng trên)", () => {
    const result = productIdsQuerySchema.safeParse(makeIds(51));
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].message).toBe(
      "Chỉ tra cứu tối đa 50 mã sản phẩm mỗi lần",
    );
  });

  it("từ chối khi thiếu tham số ids", () => {
    const result = productIdsQuerySchema.safeParse(null);
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].message).toBe("Thiếu tham số ids");
  });

  it.each([[""], [" "], [","], [" , ,"]])("từ chối khi ids rỗng (%j) - 0 mã", (value) => {
    const result = productIdsQuerySchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].message).toBe(
      "Vui lòng cung cấp ít nhất một mã sản phẩm",
    );
  });

  it("bỏ khoảng trắng thừa và phần tử rỗng", () => {
    const result = productIdsQuerySchema.safeParse(" p001 , p002 ,");
    expect(result.success && result.data).toEqual(["p001", "p002"]);
  });

  it.each([["<script>"], ["p001,../etc"], ["p 001"], ["p001;p002"], ["a".repeat(65)]])(
    "từ chối mã sai định dạng (%s)",
    (value) => {
      const result = productIdsQuerySchema.safeParse(value);
      expect(result.success).toBe(false);
      expect(!result.success && result.error.issues[0].message).toBe("Mã sản phẩm không hợp lệ");
    },
  );

  it("chấp nhận mã dài đúng 64 ký tự (bằng ngưỡng)", () => {
    expect(productIdsQuerySchema.safeParse("a".repeat(64)).success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  EMPTY_WISHLIST,
  isWishlistFull,
  sanitizeProductIds,
  WISHLIST_MAX_ITEMS,
  wishlistReducer,
} from "./wishlist-reducer";
import type { WishlistState } from "./types";

const stateWith = (count: number): WishlistState => ({
  productIds: Array.from({ length: count }, (_, i) => `p${i + 1}`),
});

describe("wishlistReducer", () => {
  it("giới hạn danh sách yêu thích là 50 sản phẩm", () => {
    expect(WISHLIST_MAX_ITEMS).toBe(50);
  });

  it("thêm sản phẩm mới vào đầu danh sách", () => {
    const state = wishlistReducer({ productIds: ["a"] }, { type: "add", productId: "b" });
    expect(state.productIds).toEqual(["b", "a"]);
  });

  it("thêm sản phẩm đã có trả về cùng tham chiếu state", () => {
    const state: WishlistState = { productIds: ["a", "b"] };
    expect(wishlistReducer(state, { type: "add", productId: "a" })).toBe(state);
  });

  it("bỏ qua mã sản phẩm rỗng", () => {
    expect(wishlistReducer(EMPTY_WISHLIST, { type: "add", productId: "" })).toBe(EMPTY_WISHLIST);
  });

  it("thêm được sản phẩm thứ 50 khi đang có 49 (bằng ngưỡng)", () => {
    const state = wishlistReducer(stateWith(49), { type: "add", productId: "moi" });
    expect(state.productIds).toHaveLength(50);
    expect(state.productIds[0]).toBe("moi");
    expect(isWishlistFull(state)).toBe(true);
  });

  it("không thêm sản phẩm thứ 51 khi đã đủ 50 (vượt ngưỡng), trả về cùng tham chiếu", () => {
    const full = stateWith(50);
    expect(wishlistReducer(full, { type: "add", productId: "moi" })).toBe(full);
  });

  it("chưa đầy khi có 49 sản phẩm", () => {
    expect(isWishlistFull(stateWith(49))).toBe(false);
    expect(isWishlistFull(stateWith(50))).toBe(true);
  });

  it("bỏ thích được khi danh sách đã đầy", () => {
    const state = wishlistReducer(stateWith(50), { type: "remove", productId: "p10" });
    expect(state.productIds).toHaveLength(49);
    expect(state.productIds).not.toContain("p10");
  });

  it("bỏ một sản phẩm không có trong danh sách trả về cùng tham chiếu", () => {
    const state = stateWith(2);
    expect(wishlistReducer(state, { type: "remove", productId: "khong-co" })).toBe(state);
  });

  it("bỏ nhiều sản phẩm một lúc, bỏ qua mã không có", () => {
    const state = wishlistReducer(stateWith(4), {
      type: "remove-many",
      productIds: ["p2", "p4", "khong-co"],
    });
    expect(state.productIds).toEqual(["p1", "p3"]);
  });

  it("bỏ nhiều sản phẩm mà không mã nào có trong danh sách trả về cùng tham chiếu", () => {
    const state = stateWith(2);
    expect(wishlistReducer(state, { type: "remove-many", productIds: ["x", "y"] })).toBe(state);
    expect(wishlistReducer(state, { type: "remove-many", productIds: [] })).toBe(state);
  });

  it("xóa toàn bộ danh sách; danh sách đã trống trả về cùng tham chiếu", () => {
    expect(wishlistReducer(stateWith(3), { type: "clear" })).toEqual(EMPTY_WISHLIST);
    expect(wishlistReducer(EMPTY_WISHLIST, { type: "clear" })).toBe(EMPTY_WISHLIST);
  });
});

describe("sanitizeProductIds", () => {
  it("giữ nguyên danh sách hợp lệ và thứ tự", () => {
    expect(sanitizeProductIds(["b", "a", "c"])).toEqual(["b", "a", "c"]);
  });

  it.each([[undefined], [null], ["p001"], [123], [{ productIds: ["p001"] }]])(
    "coi dữ liệu không phải mảng (%j) là danh sách trống",
    (value) => {
      expect(sanitizeProductIds(value)).toEqual([]);
    },
  );

  it("bỏ phần tử không phải chuỗi hoặc rỗng", () => {
    expect(sanitizeProductIds(["a", 1, null, "", {}, "b"])).toEqual(["a", "b"]);
  });

  it("bỏ phần tử trùng, giữ lần xuất hiện đầu tiên", () => {
    expect(sanitizeProductIds(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });

  it("giữ nguyên đúng 50 phần tử (bằng ngưỡng)", () => {
    expect(sanitizeProductIds(stateWith(50).productIds)).toHaveLength(50);
  });

  it("chỉ giữ 50 phần tử đầu khi có 51 trở lên (vượt ngưỡng)", () => {
    const result = sanitizeProductIds(stateWith(60).productIds);
    expect(result).toHaveLength(50);
    expect(result[0]).toBe("p1");
    expect(result[49]).toBe("p50");
  });
});

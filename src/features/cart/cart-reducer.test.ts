import { describe, expect, it } from "vitest";
import {
  cartReducer,
  EMPTY_CART,
  getCartItemCount,
  getCartSubtotal,
  getMaxQuantity,
  MAX_QUANTITY_PER_ITEM,
} from "./cart-reducer";
import type { CartItem, CartState } from "./types";

const item = (overrides: Partial<CartItem> = {}): Omit<CartItem, "quantity"> => ({
  productId: "p001",
  slug: "san-pham-1",
  name: "Sản phẩm 1",
  price: 100_000,
  image: { emoji: "🎧", from: "#fff", to: "#000" },
  stock: 20,
  ...overrides,
});

const add = (state: CartState, quantity = 1, overrides: Partial<CartItem> = {}) =>
  cartReducer(state, { type: "add", item: item(overrides), quantity });

describe("cartReducer - add", () => {
  it("thêm sản phẩm mới vào giỏ", () => {
    const state = add(EMPTY_CART, 2);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
  });

  it("cộng dồn số lượng khi thêm lại cùng sản phẩm", () => {
    const state = add(add(EMPTY_CART, 2), 3);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(5);
  });

  it(`không vượt quá ${MAX_QUANTITY_PER_ITEM} sản phẩm mỗi loại`, () => {
    const state = add(add(EMPTY_CART, 8), 8);
    expect(state.items[0].quantity).toBe(MAX_QUANTITY_PER_ITEM);
  });

  it("không vượt quá tồn kho", () => {
    const state = add(EMPTY_CART, 5, { stock: 3 });
    expect(state.items[0].quantity).toBe(3);
  });

  it("bỏ qua sản phẩm hết hàng", () => {
    expect(add(EMPTY_CART, 1, { stock: 0 })).toBe(EMPTY_CART);
  });
});

describe("cartReducer - update / remove / clear", () => {
  const twoItems = add(add(EMPTY_CART, 2), 1, { productId: "p002", price: 50_000 });

  it("cập nhật số lượng trong giới hạn [1, max]", () => {
    const update = (quantity: number) =>
      cartReducer(twoItems, { type: "update-quantity", productId: "p001", quantity }).items[0]
        .quantity;
    expect(update(4)).toBe(4);
    expect(update(0)).toBe(1);
    expect(update(99)).toBe(getMaxQuantity(20));
  });

  it("xóa một sản phẩm", () => {
    const state = cartReducer(twoItems, { type: "remove", productId: "p001" });
    expect(state.items.map((line) => line.productId)).toEqual(["p002"]);
  });

  it("xóa toàn bộ giỏ hàng", () => {
    expect(cartReducer(twoItems, { type: "clear" })).toEqual(EMPTY_CART);
  });

  it("tính tổng số lượng và tạm tính", () => {
    expect(getCartItemCount(twoItems)).toBe(3);
    expect(getCartSubtotal(twoItems)).toBe(2 * 100_000 + 50_000);
  });
});

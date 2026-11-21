import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "./cart-reducer";
import { CART_STORAGE_KEY, cartStore } from "./cart-store";

const product = getProductById("p001")!;

describe("cartStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    cartStore.reset();
  });

  it("lưu giỏ hàng vào localStorage sau mỗi thay đổi", () => {
    cartStore.dispatch({ type: "add", item: toCartItem(product), quantity: 2 });
    const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)!);
    expect(saved.items[0]).toMatchObject({ productId: "p001", quantity: 2 });
  });

  it("đọc lại giỏ hàng đã lưu khi tải trang", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [{ ...toCartItem(product), quantity: 3 }] }),
    );
    expect(cartStore.getSnapshot().items[0].quantity).toBe(3);
  });

  it("bỏ qua dữ liệu hỏng trong localStorage", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "{not json");
    expect(cartStore.getSnapshot().items).toEqual([]);
  });

  it("lưu mã giảm giá cùng giỏ hàng", () => {
    cartStore.dispatch({ type: "add", item: toCartItem(product), quantity: 1 });
    cartStore.dispatch({ type: "apply-coupon", code: "SHOPLITE10" });
    const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)!);
    expect(saved.couponCode).toBe("SHOPLITE10");
  });

  it("đọc được giỏ hàng cũ chưa có mã giảm giá", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [{ ...toCartItem(product), quantity: 1 }] }),
    );
    expect(cartStore.getSnapshot()).toEqual({ items: [{ ...toCartItem(product), quantity: 1 }] });
  });

  it("bỏ qua mã giảm giá sai kiểu nhưng vẫn giữ sản phẩm", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [{ ...toCartItem(product), quantity: 2 }], couponCode: 123 }),
    );
    const snapshot = cartStore.getSnapshot();
    expect(snapshot.items[0].quantity).toBe(2);
    expect(snapshot).not.toHaveProperty("couponCode");
  });

  it("thông báo cho subscriber khi giỏ hàng thay đổi", () => {
    const listener = vi.fn();
    const unsubscribe = cartStore.subscribe(listener);
    cartStore.dispatch({ type: "add", item: toCartItem(product), quantity: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});

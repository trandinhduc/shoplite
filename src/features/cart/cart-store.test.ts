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

  it("thông báo cho subscriber khi giỏ hàng thay đổi", () => {
    const listener = vi.fn();
    const unsubscribe = cartStore.subscribe(listener);
    cartStore.dispatch({ type: "add", item: toCartItem(product), quantity: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});

describe("cartStore - mã giảm giá", () => {
  beforeEach(() => {
    window.localStorage.clear();
    cartStore.reset();
  });

  it("lưu mã giảm giá cùng giỏ hàng vào localStorage", () => {
    cartStore.dispatch({ type: "add", item: toCartItem(product), quantity: 1 });
    cartStore.dispatch({ type: "apply-coupon", code: "shoplite10" });
    const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)!);
    expect(saved.couponCode).toBe("SHOPLITE10");
  });

  it("đọc được giỏ hàng cũ không có couponCode", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [{ ...toCartItem(product), quantity: 3 }] }),
    );
    const snapshot = cartStore.getSnapshot();
    expect(snapshot.items[0].quantity).toBe(3);
    expect(snapshot.couponCode).toBeUndefined();
  });

  it.each([
    ["số", 123],
    ["mảng", ["GIAM50K"]],
    ["object", { code: "GIAM50K" }],
    ["chuỗi rỗng", ""],
  ])("bỏ qua couponCode sai kiểu (%s) nhưng vẫn giữ sản phẩm", (_label, couponCode) => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [{ ...toCartItem(product), quantity: 2 }], couponCode }),
    );
    const snapshot = cartStore.getSnapshot();
    expect(snapshot.items[0].quantity).toBe(2);
    expect(snapshot.couponCode).toBeUndefined();
  });

  it("đồng bộ mã giảm giá giữa các tab qua sự kiện storage", () => {
    const listener = vi.fn();
    const unsubscribe = cartStore.subscribe(listener);
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [{ ...toCartItem(product), quantity: 1 }], couponCode: "GIAM50K" }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: CART_STORAGE_KEY }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(cartStore.getSnapshot().couponCode).toBe("GIAM50K");
    unsubscribe();
  });
});

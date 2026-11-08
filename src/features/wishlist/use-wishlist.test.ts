import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { WishlistToggleResult } from "./types";
import { WISHLIST_MAX_ITEMS } from "./wishlist-reducer";
import { wishlistStore } from "./wishlist-store";
import { useWishlist } from "./use-wishlist";

const seed = (count: number) => {
  for (let i = count; i >= 1; i--) wishlistStore.dispatch({ type: "add", productId: `p${i}` });
};

describe("useWishlist", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  it("ban đầu danh sách trống và đã hydrate", () => {
    const { result } = renderHook(() => useWishlist());
    expect(result.current.productIds).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.hydrated).toBe(true);
  });

  it("thêm sản phẩm trả về 'added' và cập nhật danh sách, số lượng, has", () => {
    const { result } = renderHook(() => useWishlist());
    let outcome: WishlistToggleResult | undefined;
    act(() => {
      outcome = result.current.toggle("p001");
    });
    expect(outcome).toBe("added");
    expect(result.current.productIds).toEqual(["p001"]);
    expect(result.current.count).toBe(1);
    expect(result.current.has("p001")).toBe(true);
    expect(result.current.has("p002")).toBe(false);
  });

  it("bấm lần nữa trả về 'removed' và bỏ sản phẩm khỏi danh sách", () => {
    const { result } = renderHook(() => useWishlist());
    let outcome: WishlistToggleResult | undefined;
    act(() => {
      result.current.toggle("p001");
    });
    act(() => {
      outcome = result.current.toggle("p001");
    });
    expect(outcome).toBe("removed");
    expect(result.current.productIds).toEqual([]);
  });

  it("thêm được sản phẩm thứ 50 khi đang có 49 (bằng ngưỡng)", () => {
    seed(WISHLIST_MAX_ITEMS - 1);
    const { result } = renderHook(() => useWishlist());
    let outcome: WishlistToggleResult | undefined;
    act(() => {
      outcome = result.current.toggle("moi");
    });
    expect(outcome).toBe("added");
    expect(result.current.count).toBe(WISHLIST_MAX_ITEMS);
  });

  it("trả về 'full' và không đổi gì khi thêm sản phẩm thứ 51 (vượt ngưỡng)", () => {
    seed(WISHLIST_MAX_ITEMS);
    const { result } = renderHook(() => useWishlist());
    const before = result.current.productIds;
    let outcome: WishlistToggleResult | undefined;
    act(() => {
      outcome = result.current.toggle("moi");
    });
    expect(outcome).toBe("full");
    expect(result.current.count).toBe(WISHLIST_MAX_ITEMS);
    expect(result.current.productIds).toBe(before);
    expect(result.current.has("moi")).toBe(false);
  });

  it("vẫn bỏ thích được khi danh sách đã đầy", () => {
    seed(WISHLIST_MAX_ITEMS);
    const { result } = renderHook(() => useWishlist());
    let outcome: WishlistToggleResult | undefined;
    act(() => {
      outcome = result.current.toggle("p1");
    });
    expect(outcome).toBe("removed");
    expect(result.current.count).toBe(WISHLIST_MAX_ITEMS - 1);
  });

  it("bấm nhanh hai lần liên tiếp trong cùng một lượt render vẫn đúng (thêm rồi bỏ)", () => {
    const { result } = renderHook(() => useWishlist());
    act(() => {
      result.current.toggle("p001");
      result.current.toggle("p001");
    });
    expect(result.current.productIds).toEqual([]);
  });

  it("remove và removeMany bỏ đúng các sản phẩm", () => {
    seed(4);
    const { result } = renderHook(() => useWishlist());
    act(() => result.current.remove("p1"));
    expect(result.current.productIds).toEqual(["p2", "p3", "p4"]);
    act(() => result.current.removeMany(["p2", "p4", "khong-co"]));
    expect(result.current.productIds).toEqual(["p3"]);
  });

  it("các hook cùng lúc luôn thấy cùng một danh sách", () => {
    const first = renderHook(() => useWishlist());
    const second = renderHook(() => useWishlist());
    act(() => {
      first.result.current.toggle("p001");
    });
    expect(second.result.current.has("p001")).toBe(true);
  });
});

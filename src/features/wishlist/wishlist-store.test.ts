import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WISHLIST_MAX_ITEMS } from "./wishlist-reducer";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "./wishlist-store";

const ids = (count: number) => Array.from({ length: count }, (_, i) => `p${i + 1}`);

const save = (value: unknown) =>
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(value));

describe("wishlistStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  afterEach(() => vi.restoreAllMocks());

  it("lưu danh sách vào localStorage sau mỗi thay đổi", () => {
    wishlistStore.dispatch({ type: "add", productId: "p001" });
    wishlistStore.dispatch({ type: "add", productId: "p002" });
    expect(JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY)!)).toEqual({
      productIds: ["p002", "p001"],
    });
  });

  it("đọc lại danh sách đã lưu khi tải trang", () => {
    save({ productIds: ["p003", "p001"] });
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p003", "p001"]);
  });

  it("danh sách trống khi chưa lưu gì", () => {
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("bỏ qua JSON hỏng trong localStorage", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, "{not json");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it.each([
    ["mảng thay vì object", ["p001"]],
    ["số", 42],
    ["null", null],
    ["productIds không phải mảng", { productIds: "p001" }],
    ["thiếu productIds", {}],
  ])("coi dữ liệu sai kiểu (%s) là danh sách trống", (_label, value) => {
    save(value);
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("bỏ phần tử sai kiểu và phần tử trùng trong dữ liệu đã lưu", () => {
    save({ productIds: ["p001", 7, "", "p002", "p001"] });
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001", "p002"]);
  });

  it("đọc đủ 50 mã đã lưu (bằng ngưỡng)", () => {
    save({ productIds: ids(WISHLIST_MAX_ITEMS) });
    expect(wishlistStore.getSnapshot().productIds).toHaveLength(WISHLIST_MAX_ITEMS);
  });

  it("chỉ giữ 50 mã đầu khi dữ liệu đã lưu vượt giới hạn", () => {
    save({ productIds: ids(WISHLIST_MAX_ITEMS + 10) });
    const { productIds } = wishlistStore.getSnapshot();
    expect(productIds).toHaveLength(WISHLIST_MAX_ITEMS);
    expect(productIds[0]).toBe("p1");
  });

  it("thông báo cho subscriber khi danh sách thay đổi", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    wishlistStore.dispatch({ type: "add", productId: "p001" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("không ghi và không báo subscriber khi thêm sản phẩm đã có", () => {
    wishlistStore.dispatch({ type: "add", productId: "p001" });
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);

    wishlistStore.dispatch({ type: "add", productId: "p001" });

    expect(setItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("không ghi và không báo subscriber khi danh sách đã đầy 50 sản phẩm", () => {
    save({ productIds: ids(WISHLIST_MAX_ITEMS) });
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);

    wishlistStore.dispatch({ type: "add", productId: "moi" });

    expect(wishlistStore.getSnapshot().productIds).toHaveLength(WISHLIST_MAX_ITEMS);
    expect(setItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("đồng bộ giữa các tab qua sự kiện storage đúng khóa", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    save({ productIds: ["p005"] });
    window.dispatchEvent(new StorageEvent("storage", { key: WISHLIST_STORAGE_KEY }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p005"]);
    unsubscribe();
  });

  it("bỏ qua sự kiện storage của khóa khác (ví dụ giỏ hàng)", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    window.dispatchEvent(new StorageEvent("storage", { key: "shoplite:cart" }));

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("làm trống danh sách khi tab khác xóa toàn bộ storage", () => {
    wishlistStore.dispatch({ type: "add", productId: "p001" });
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    window.localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
    unsubscribe();
  });

  it("ngừng nghe sự kiện storage khi không còn subscriber", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    unsubscribe();
    save({ productIds: ["p005"] });
    window.dispatchEvent(new StorageEvent("storage", { key: WISHLIST_STORAGE_KEY }));

    expect(listener).not.toHaveBeenCalled();
  });

  it("vẫn hoạt động trong phiên hiện tại khi localStorage chặn ghi", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "QuotaExceededError");
    });
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);

    expect(() => wishlistStore.dispatch({ type: "add", productId: "p001" })).not.toThrow();
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("snapshot phía server luôn là danh sách trống", () => {
    wishlistStore.dispatch({ type: "add", productId: "p001" });
    expect(wishlistStore.getServerSnapshot().productIds).toEqual([]);
  });
});

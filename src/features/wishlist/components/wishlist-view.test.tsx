import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMaxQuantity, toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { getProductById } from "@/features/catalog/catalog-service";
import type { Product } from "@/features/catalog/types";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "../wishlist-store";
import { WishlistView } from "./wishlist-view";

const nameOf = (id: string) => getProductById(id)!.name;

/** Thích các sản phẩm lần lượt theo thứ tự truyền vào (sản phẩm cuối cùng sẽ nằm đầu danh sách). */
function like(...productIds: string[]) {
  for (const productId of productIds) wishlistStore.dispatch({ type: "add", productId });
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

/** Giả lập GET /api/products/by-ids bằng catalog thật, cho phép ghi đè giá/tồn kho từng sản phẩm. */
function stubCatalogFetch(overrides: Record<string, Partial<Product>> = {}) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input), "http://localhost");
    const ids = (url.searchParams.get("ids") ?? "").split(",");
    const items = ids.flatMap((id) => {
      const product = getProductById(id);
      return product ? [{ ...product, ...overrides[id] }] : [];
    });
    return jsonResponse({ items });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("<WishlistView />", () => {
  beforeEach(() => {
    wishlistStore.reset();
    cartStore.reset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("hiển thị khung giữ chỗ khi đang tải, không hiện trạng thái trống", () => {
    like("p001");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    render(<WishlistView />);

    expect(screen.getByRole("status", { name: "Đang tải danh sách yêu thích" })).toBeVisible();
    expect(screen.queryByText("Danh sách yêu thích đang trống")).not.toBeInTheDocument();
  });

  it("danh sách trống: không gọi API, mời khám phá sản phẩm kèm liên kết /products", () => {
    const fetchMock = stubCatalogFetch();
    render(<WishlistView />);

    expect(screen.getByText("Danh sách yêu thích đang trống")).toBeVisible();
    expect(screen.getByRole("link", { name: "Khám phá sản phẩm" })).toHaveAttribute(
      "href",
      "/products",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hiển thị sản phẩm mới thích nhất ở đầu và gọi API đúng một lần, không dùng cache", async () => {
    like("p001", "p006", "p010");
    const fetchMock = stubCatalogFetch();
    render(<WishlistView />);

    const rows = await screen.findAllByRole("listitem");
    expect(rows.map((row) => within(row).getAllByRole("link")[0].textContent)).toEqual([
      nameOf("p010"),
      nameOf("p006"),
      nameOf("p001"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/products/by-ids?ids=p010,p006,p001",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("hiển thị giá và tồn kho mới nhất do server trả về", async () => {
    like("p001");
    stubCatalogFetch({ p001: { price: 999_000, stock: 3 } });
    render(<WishlistView />);

    const row = await screen.findByRole("listitem");
    expect(within(row).getByTestId("price")).toHaveTextContent(/999\.000/);
    expect(within(row).getByText("Chỉ còn 3 sản phẩm")).toBeVisible();
    expect(within(row).getByRole("button", { name: /Thêm vào giỏ/ })).toBeEnabled();
  });

  it("sản phẩm hết hàng: hiển thị 'Hết hàng', không thêm vào giỏ được, vẫn bỏ thích được", async () => {
    like("p004");
    stubCatalogFetch();
    render(<WishlistView />);

    const row = await screen.findByRole("listitem");
    expect(within(row).getAllByText("Hết hàng")).toHaveLength(2); // huy hiệu + nút
    expect(within(row).getByRole("button", { name: "Hết hàng" })).toBeDisabled();
    expect(
      within(row).getByRole("button", { name: `Bỏ ${nameOf("p004")} khỏi yêu thích` }),
    ).toBeEnabled();
  });

  it("sản phẩm hết hàng sau khi thích hiển thị theo tồn kho mới nhất", async () => {
    like("p001");
    stubCatalogFetch({ p001: { stock: 0 } });
    render(<WishlistView />);

    const row = await screen.findByRole("listitem");
    expect(within(row).getByRole("button", { name: "Hết hàng" })).toBeDisabled();
  });

  it("bỏ thích không gọi lại API; bỏ sản phẩm cuối chuyển sang trạng thái trống", async () => {
    const user = userEvent.setup();
    like("p001", "p006");
    const fetchMock = stubCatalogFetch();
    render(<WishlistView />);
    await screen.findAllByRole("listitem");

    await user.click(screen.getByRole("button", { name: `Bỏ ${nameOf("p006")} khỏi yêu thích` }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);

    await user.click(screen.getByRole("button", { name: `Bỏ ${nameOf("p001")} khỏi yêu thích` }));
    expect(screen.getByText("Danh sách yêu thích đang trống")).toBeVisible();
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("thêm vào giỏ làm giỏ hàng tăng 1 và sản phẩm vẫn nằm trong danh sách yêu thích", async () => {
    const user = userEvent.setup();
    like("p006");
    stubCatalogFetch();
    render(<WishlistView />);

    await user.click(await screen.findByRole("button", { name: /Thêm vào giỏ/ }));

    expect(cartStore.getSnapshot().items).toEqual([
      expect.objectContaining({ productId: "p006", quantity: 1 }),
    ]);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p006"]);
  });

  it("vô hiệu hóa nút thêm vào giỏ khi đã đạt số lượng tối đa trong giỏ", async () => {
    const product = getProductById("p006")!;
    cartStore.dispatch({
      type: "add",
      item: toCartItem(product),
      quantity: getMaxQuantity(product.stock),
    });
    like("p006");
    stubCatalogFetch();
    render(<WishlistView />);

    expect(await screen.findByRole("button", { name: /Tối đa/ })).toBeDisabled();
  });

  it("lỗi mạng: báo lỗi, giữ nguyên danh sách đã lưu, 'Thử lại' thành công thì hiện sản phẩm", async () => {
    const user = userEvent.setup();
    like("p001", "p006");
    const fetchMock = stubCatalogFetch();
    fetchMock.mockRejectedValueOnce(new Error("network"));
    render(<WishlistView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được");
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p006", "p001"]);
    expect(screen.queryByText("Danh sách yêu thích đang trống")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lỗi HTTP 500 cũng báo lỗi và không xóa danh sách đã lưu", async () => {
    like("p001");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: { code: "INTERNAL_ERROR", message: "Đã có lỗi xảy ra" } }, 500),
        ),
    );
    render(<WishlistView />);

    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeVisible();
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
  });

  it("gỡ khỏi danh sách các mã không còn trong catalog để số lượng khớp với trang", async () => {
    like("p001", "khong-co");
    stubCatalogFetch();
    render(<WishlistView />);

    expect(await screen.findAllByRole("listitem")).toHaveLength(1);
    await waitFor(() => expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]));
  });

  it("chỉ gọi API cho mã mới khi tab khác thêm sản phẩm", async () => {
    like("p001");
    const fetchMock = stubCatalogFetch();
    render(<WishlistView />);
    await screen.findAllByRole("listitem");

    act(() => {
      window.localStorage.setItem(
        WISHLIST_STORAGE_KEY,
        JSON.stringify({ productIds: ["p006", "p001"] }),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: WISHLIST_STORAGE_KEY }));
    });

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/products/by-ids?ids=p006",
      expect.objectContaining({ cache: "no-store" }),
    );
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getAllByRole("link")[0]).toHaveTextContent(nameOf("p006"));
  });

  it("hủy yêu cầu đang chờ khi rời khỏi trang", () => {
    like("p001");
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<WishlistView />);

    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.signal?.aborted).toBe(false);
    unmount();
    expect(init.signal?.aborted).toBe(true);
  });
});

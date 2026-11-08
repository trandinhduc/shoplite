import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { cartStore } from "@/features/cart/cart-store";
import { toCartItem } from "@/features/cart/cart-reducer";
import { getProductById } from "@/features/catalog/catalog-service";
import { wishlistStore } from "../wishlist-store";
import { WishlistBadge } from "./wishlist-badge";

const like = (...productIds: string[]) => {
  for (const productId of productIds) wishlistStore.dispatch({ type: "add", productId });
};

describe("<WishlistBadge />", () => {
  beforeEach(() => {
    wishlistStore.reset();
    cartStore.reset();
  });

  it("dẫn tới trang /wishlist", () => {
    render(<WishlistBadge />);
    expect(screen.getByRole("link", { name: "Yêu thích" })).toHaveAttribute("href", "/wishlist");
  });

  it("không hiển thị số khi danh sách trống", () => {
    render(<WishlistBadge />);
    expect(screen.queryByTestId("wishlist-count")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAccessibleName("Yêu thích");
  });

  it("hiển thị 1 sản phẩm với tên truy cập nêu số lượng", () => {
    like("p001");
    render(<WishlistBadge />);
    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("1");
    expect(screen.getByRole("link", { name: "Yêu thích (1 sản phẩm)" })).toBeVisible();
  });

  it("hiển thị 3 sản phẩm với tên truy cập nêu số lượng", () => {
    like("p001", "p002", "p003");
    render(<WishlistBadge />);
    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: "Yêu thích (3 sản phẩm)" })).toBeVisible();
  });

  it("đếm số sản phẩm chứ không phải số lượng trong giỏ hàng", () => {
    cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p001")!), quantity: 5 });
    like("p001");
    render(<WishlistBadge />);
    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("1");
  });

  it("cập nhật số ngay khi danh sách thay đổi, và ẩn số khi bỏ hết", () => {
    like("p001", "p002");
    render(<WishlistBadge />);
    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("2");

    act(() => like("p003"));
    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("3");

    act(() => wishlistStore.dispatch({ type: "clear" }));
    expect(screen.queryByTestId("wishlist-count")).not.toBeInTheDocument();
  });
});

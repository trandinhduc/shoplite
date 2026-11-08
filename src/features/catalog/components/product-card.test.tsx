import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { cartStore } from "@/features/cart/cart-store";
import { wishlistStore } from "@/features/wishlist/wishlist-store";
import { ProductCard } from "./product-card";

describe("<ProductCard />", () => {
  beforeEach(() => {
    cartStore.reset();
    wishlistStore.reset();
  });

  it("hiển thị tên, giá, giá gốc và % giảm giá", () => {
    render(<ProductCard product={getProductById("p001")!} />);

    expect(screen.getByRole("heading", { name: "Tai nghe không dây SoundMax Pro" })).toBeVisible();
    expect(screen.getByTestId("price")).toHaveTextContent(/1\.290\.000/);
    expect(screen.getByText(/1\.590\.000/)).toHaveClass("line-through");
    expect(screen.getByText("-19%")).toBeVisible();
  });

  it("vô hiệu hóa nút mua khi sản phẩm hết hàng", () => {
    render(<ProductCard product={getProductById("p004")!} />);

    expect(screen.getByRole("button", { name: "Hết hàng" })).toBeDisabled();
    expect(screen.getAllByText("Hết hàng")).toHaveLength(2); // badge + nút
  });

  it("thêm sản phẩm vào giỏ khi bấm nút", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={getProductById("p006")!} />);

    await user.click(screen.getByRole("button", { name: /Thêm vào giỏ/ }));

    expect(screen.getByRole("button", { name: /Đã thêm/ })).toBeVisible();
    expect(cartStore.getSnapshot().items).toEqual([
      expect.objectContaining({ productId: "p006", quantity: 1 }),
    ]);
  });

  it("có nút yêu thích theo tên sản phẩm, bấm để thêm rồi bỏ khỏi danh sách yêu thích", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={getProductById("p001")!} />);

    const heart = screen.getByRole("button", { name: "Yêu thích Tai nghe không dây SoundMax Pro" });
    expect(heart).toHaveAttribute("aria-pressed", "false");

    await user.click(heart);
    expect(heart).toHaveAttribute("aria-pressed", "true");
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);

    await user.click(heart);
    expect(heart).toHaveAttribute("aria-pressed", "false");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("nút yêu thích không thay đổi giỏ hàng", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={getProductById("p001")!} />);

    await user.click(screen.getByRole("button", { name: /^Yêu thích / }));

    expect(cartStore.getSnapshot().items).toEqual([]);
  });

  it("vẫn thích được sản phẩm hết hàng", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={getProductById("p004")!} />);

    await user.click(screen.getByRole("button", { name: /^Yêu thích / }));

    expect(wishlistStore.getSnapshot().productIds).toEqual(["p004"]);
  });

  it("nút yêu thích không nằm trong link ảnh bị ẩn khỏi screen reader", () => {
    render(<ProductCard product={getProductById("p001")!} />);

    const heart = screen.getByRole("button", { name: /^Yêu thích / });
    expect(heart.closest("a")).toBeNull();
    expect(heart.closest("[aria-hidden]")).toBeNull();
  });
});

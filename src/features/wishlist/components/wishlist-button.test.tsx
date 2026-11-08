import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WISHLIST_MAX_ITEMS } from "../wishlist-reducer";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "../wishlist-store";
import { WishlistButton } from "./wishlist-button";

const NAME = "Tai nghe không dây SoundMax Pro";

function seed(count: number) {
  for (let i = 1; i <= count; i++) wishlistStore.dispatch({ type: "add", productId: `x${i}` });
}

const getButton = () => screen.getByRole("button", { name: `Yêu thích ${NAME}` });

describe("<WishlistButton />", () => {
  beforeEach(() => wishlistStore.reset());
  afterEach(() => vi.useRealTimers());

  it("có tên truy cập nêu tên sản phẩm và ban đầu chưa được bật", () => {
    render(<WishlistButton productId="p001" productName={NAME} />);
    expect(getButton()).toHaveAttribute("aria-pressed", "false");
  });

  it("bấm để thêm vào yêu thích, bấm lần nữa để bỏ", async () => {
    const user = userEvent.setup();
    render(<WishlistButton productId="p001" productName={NAME} />);

    await user.click(getButton());
    expect(getButton()).toHaveAttribute("aria-pressed", "true");
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);

    await user.click(getButton());
    expect(getButton()).toHaveAttribute("aria-pressed", "false");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("nhãn không đổi theo trạng thái (chỉ aria-pressed đổi)", async () => {
    const user = userEvent.setup();
    render(<WishlistButton productId="p001" productName={NAME} />);
    await user.click(getButton());
    expect(getButton()).toHaveAccessibleName(`Yêu thích ${NAME}`);
  });

  it("phân biệt đã thích và chưa thích bằng hình dạng trái tim, không chỉ bằng màu", async () => {
    const user = userEvent.setup();
    render(<WishlistButton productId="p001" productName={NAME} />);
    const icon = () => getButton().querySelector("svg")!;

    expect(icon()).not.toHaveClass("fill-current");
    await user.click(getButton());
    expect(icon()).toHaveClass("fill-current");
  });

  it("dùng được bằng bàn phím: Tab tới nút rồi Enter hoặc Space", async () => {
    const user = userEvent.setup();
    render(<WishlistButton productId="p001" productName={NAME} />);

    await user.tab();
    expect(getButton()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(getButton()).toHaveAttribute("aria-pressed", "true");

    await user.keyboard(" ");
    expect(getButton()).toHaveAttribute("aria-pressed", "false");
  });

  it("vùng thông báo role=status luôn có sẵn và rỗng khi chưa có lời nhắn", () => {
    render(<WishlistButton productId="p001" productName={NAME} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("thêm được sản phẩm thứ 50 khi đang có 49 (bằng ngưỡng), không có lời nhắn", async () => {
    const user = userEvent.setup();
    seed(WISHLIST_MAX_ITEMS - 1);
    render(<WishlistButton productId="p001" productName={NAME} />);

    await user.click(getButton());

    expect(getButton()).toHaveAttribute("aria-pressed", "true");
    expect(wishlistStore.getSnapshot().productIds).toHaveLength(WISHLIST_MAX_ITEMS);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("khi danh sách đã đủ 50 thì báo đầy, không thêm và nút vẫn ở trạng thái chưa thích", async () => {
    const user = userEvent.setup();
    seed(WISHLIST_MAX_ITEMS);
    render(<WishlistButton productId="p001" productName={NAME} />);

    await user.click(getButton());

    expect(screen.getByRole("status")).toHaveTextContent(/đã đầy.*tối đa 50 sản phẩm/);
    expect(getButton()).toHaveAttribute("aria-pressed", "false");
    expect(getButton()).toBeEnabled();
    expect(wishlistStore.getSnapshot().productIds).not.toContain("p001");
    expect(wishlistStore.getSnapshot().productIds).toHaveLength(WISHLIST_MAX_ITEMS);
  });

  it("lời nhắn đầy tự ẩn sau khoảng 4 giây", () => {
    vi.useFakeTimers();
    seed(WISHLIST_MAX_ITEMS);
    render(<WishlistButton productId="p001" productName={NAME} />);

    // fireEvent thay cho userEvent vì userEvent bị treo khi dùng cùng fake timers.
    fireEvent.click(getButton());
    expect(screen.getByRole("status")).not.toBeEmptyDOMElement();

    act(() => vi.advanceTimersByTime(3999));
    expect(screen.getByRole("status")).not.toBeEmptyDOMElement();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("vẫn bỏ thích được khi danh sách đã đầy", async () => {
    const user = userEvent.setup();
    seed(WISHLIST_MAX_ITEMS - 1);
    wishlistStore.dispatch({ type: "add", productId: "p001" });
    render(<WishlistButton productId="p001" productName={NAME} />);
    expect(getButton()).toHaveAttribute("aria-pressed", "true");

    await user.click(getButton());

    expect(getButton()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("cập nhật trạng thái khi tab khác thay đổi danh sách (sự kiện storage)", () => {
    render(<WishlistButton productId="p001" productName={NAME} />);
    expect(getButton()).toHaveAttribute("aria-pressed", "false");

    act(() => {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ["p001"] }));
      window.dispatchEvent(new StorageEvent("storage", { key: WISHLIST_STORAGE_KEY }));
    });
    expect(getButton()).toHaveAttribute("aria-pressed", "true");

    act(() => {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: [] }));
      window.dispatchEvent(new StorageEvent("storage", { key: WISHLIST_STORAGE_KEY }));
    });
    expect(getButton()).toHaveAttribute("aria-pressed", "false");
  });

  it("hai nút của cùng một sản phẩm luôn đồng bộ với nhau", async () => {
    const user = userEvent.setup();
    render(
      <>
        <WishlistButton productId="p001" productName="Thẻ" />
        <WishlistButton productId="p001" productName="Chi tiết" />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Yêu thích Thẻ" }));

    expect(screen.getByRole("button", { name: "Yêu thích Chi tiết" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

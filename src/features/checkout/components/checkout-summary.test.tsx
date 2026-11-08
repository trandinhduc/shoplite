import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import type { CartItem } from "@/features/cart/types";
import { CheckoutSummary } from "./checkout-summary";

/** Một dòng giỏ hàng có giá tùy ý để dựng tạm tính bất kỳ. */
const itemPriced = (price: number): CartItem => ({
  ...toCartItem(getProductById("p010")!),
  price,
  quantity: 1,
});

describe("<CheckoutSummary />", () => {
  it("không hiện dòng giảm giá khi không có giảm giá", () => {
    render(
      <CheckoutSummary items={[itemPriced(520_000)]} shippingMethod="standard" discount={0} />,
    );
    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
  });

  it("hiện dòng giảm giá và tính phí ship trên tạm tính sau giảm", () => {
    render(
      <CheckoutSummary
        items={[itemPriced(520_000)]}
        shippingMethod="standard"
        discount={50_000}
        couponCode="GIAM50K"
      />,
    );
    const row = screen.getByTestId("checkout-discount");
    expect(row).toHaveTextContent("Giảm giá (GIAM50K)");
    expect(row).toHaveTextContent(/−\s?50\.000/);
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/30\.000/);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/500\.000/);
  });

  it("vẫn miễn phí ship khi tạm tính sau giảm đúng 500.000đ", () => {
    render(
      <CheckoutSummary
        items={[itemPriced(550_000)]}
        shippingMethod="standard"
        discount={50_000}
        couponCode="GIAM50K"
      />,
    );
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent("Miễn phí");
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/500\.000/);
  });

  it("dòng giảm giá nằm giữa Tạm tính và Phí giao hàng", () => {
    render(
      <CheckoutSummary
        items={[itemPriced(520_000)]}
        shippingMethod="standard"
        discount={50_000}
        couponCode="GIAM50K"
      />,
    );
    const labels = screen.getAllByRole("term").map((term) => term.textContent);
    expect(labels.slice(0, 3)).toEqual(["Tạm tính", "Giảm giá (GIAM50K)", "Phí giao hàng"]);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import { coupons } from "@/data/coupons";
import { CheckoutSummary } from "./checkout-summary";

describe("<CheckoutSummary />", () => {
  it("hiển thị dòng giảm giá và tổng mới", () => {
    const item = toCartItem(getProductById("p006")!);

    render(
      <CheckoutSummary
        items={[{ ...item, quantity: 2 }]}
        shippingMethod="standard"
        coupon={coupons[0]}
      />,
    );

    expect(screen.getByTestId("discount-amount")).toHaveTextContent("-90.000");
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("810.000");
  });
});

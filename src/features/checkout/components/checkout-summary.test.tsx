import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { toCartItem } from "@/features/cart/cart-reducer";
import { getProductById } from "@/features/catalog/catalog-service";
import { CheckoutSummary } from "./checkout-summary";

// Cáp USB-C 150.000đ x 4 = 600.000đ (miễn phí giao hàng tiêu chuẩn)
const items = [{ ...toCartItem(getProductById("p010")!), quantity: 4 }];

describe("<CheckoutSummary />", () => {
  it("hiển thị dòng giảm giá và tổng mới khi có mã", () => {
    render(
      <CheckoutSummary
        items={items}
        shippingMethod="standard"
        discount={{ code: "SHOPLITE10", amount: 60_000 }}
      />,
    );

    expect(screen.getByText("Giảm giá (SHOPLITE10)")).toBeVisible();
    expect(screen.getByTestId("discount-amount")).toHaveTextContent(/-\s?60\.000/);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/540\.000/);
  });

  it("không có dòng giảm giá khi không có mã", () => {
    render(<CheckoutSummary items={items} shippingMethod="standard" />);

    expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/600\.000/);
  });

  it("phí giao hàng vẫn xét trên tiền hàng trước giảm", () => {
    render(
      <CheckoutSummary
        items={items}
        shippingMethod="standard"
        discount={{ code: "SHOPLITE10", amount: 60_000 }}
      />,
    );

    expect(screen.getByTestId("shipping-fee")).toHaveTextContent("Miễn phí");
  });
});

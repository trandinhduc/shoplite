import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { toCartItem } from "@/features/cart/cart-reducer";
import type { CartItem } from "@/features/cart/types";
import { getProductById } from "@/features/catalog/catalog-service";
import { CheckoutSummary } from "./checkout-summary";

const cartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  ...toCartItem(getProductById("p010")!),
  quantity: 4, // Cáp USB-C 150.000 ₫ × 4 = 600.000 ₫
  ...overrides,
});

const SHOPLITE10 = {
  code: "SHOPLITE10",
  rule: { type: "percent", percent: 10, maxDiscount: 100_000 },
} as const;

const GIAM50K = { code: "GIAM50K", rule: { type: "fixed", amount: 50_000 } } as const;

describe("<CheckoutSummary />", () => {
  it("có mã giảm giá: hiện dòng giảm giá và tổng tiền đã trừ giảm giá", () => {
    render(<CheckoutSummary items={[cartItem()]} shippingMethod="standard" coupon={SHOPLITE10} />);

    expect(screen.getByText("Giảm giá (SHOPLITE10)")).toBeVisible();
    expect(screen.getByTestId("discount-amount")).toHaveTextContent(/−60\.000/);
    // 600.000 - 60.000 + 0 (miễn phí giao hàng vì tạm tính ≥ 500.000)
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/540\.000/);
  });

  it("không có mã giảm giá: không có dòng giảm giá", () => {
    render(<CheckoutSummary items={[cartItem()]} shippingMethod="standard" />);
    expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/600\.000/);
  });

  it("coupon là null: không có dòng giảm giá", () => {
    render(<CheckoutSummary items={[cartItem()]} shippingMethod="standard" coupon={null} />);
    expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
  });

  it("phí giao hàng tính trên tạm tính trước giảm giá: đơn đúng 500.000 vẫn miễn phí", () => {
    render(
      <CheckoutSummary
        items={[cartItem({ price: 500_000, quantity: 1 })]}
        shippingMethod="standard"
        coupon={GIAM50K}
      />,
    );
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent("Miễn phí");
    expect(screen.getByTestId("discount-amount")).toHaveTextContent(/−50\.000/);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/450\.000/);
  });

  it("tạm tính 499.999 vẫn tính phí giao hàng dù có giảm giá", () => {
    render(
      <CheckoutSummary
        items={[cartItem({ price: 499_999, quantity: 1 })]}
        shippingMethod="standard"
        coupon={GIAM50K}
      />,
    );
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/30\.000/);
    // 499.999 - 50.000 + 30.000
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/479\.999/);
  });

  it("đổi phương thức giao hàng: tiền giảm giữ nguyên, phí giao hàng đổi", () => {
    render(<CheckoutSummary items={[cartItem()]} shippingMethod="express" coupon={SHOPLITE10} />);
    expect(screen.getByTestId("discount-amount")).toHaveTextContent(/−60\.000/);
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/60\.000/);
    // 600.000 - 60.000 + 60.000
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/600\.000/);
  });
});

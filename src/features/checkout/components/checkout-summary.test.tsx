import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CartItem } from "@/features/cart/types";
import type { AppliedCoupon } from "@/features/coupons/types";
import { CheckoutSummary } from "./checkout-summary";

const sampleItems: CartItem[] = [
  {
    productId: "p001",
    slug: "tai-nghe-soundmax",
    name: "Tai nghe SoundMax Pro",
    price: 1_290_000,
    quantity: 1,
    image: { emoji: "🎧", from: "#e0f2fe", to: "#c7d2fe" },
    stock: 10,
  },
];

describe("CheckoutSummary Component", () => {
  it("hiển thị tạm tính, phí ship và tổng tiền khi không có coupon", () => {
    render(<CheckoutSummary items={sampleItems} shippingMethod="standard" />);

    expect(screen.getByText("Tạm tính")).toBeInTheDocument();
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent("Miễn phí");
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("1.290.000 ₫");
    expect(screen.queryByTestId("discount-line")).not.toBeInTheDocument();
  });

  it("hiển thị dòng giảm giá và cập nhật tổng thanh toán khi có coupon", () => {
    const coupon: AppliedCoupon = {
      code: "SHOPLITE10",
      discountAmount: 100_000,
      description: "Giảm 10%",
    };

    render(
      <CheckoutSummary
        items={sampleItems}
        shippingMethod="standard"
        appliedCoupon={coupon}
      />,
    );

    const discountLine = screen.getByTestId("discount-line");
    expect(discountLine).toBeInTheDocument();
    expect(discountLine).toHaveTextContent("Giảm giá (SHOPLITE10)");
    expect(discountLine).toHaveTextContent("-100.000 ₫");
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("1.190.000 ₫");
  });
});

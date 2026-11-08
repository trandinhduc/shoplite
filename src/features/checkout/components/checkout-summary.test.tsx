import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/features/cart/types";
import { CheckoutSummary } from "./checkout-summary";

const sampleItem: CartItem = {
  stock: 10,

  productId: "p-custom",
  slug: "san-pham-test",
  name: "Bàn phím cơ cao cấp",
  price: 1_290_000,
  quantity: 1,
  image: {
    emoji: "⌨️",
    from: "#6366f1",
    to: "#a855f7",
  },
};

describe("<CheckoutSummary />", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("BDD Scenario: Tạm tính 1.290.000đ, áp dụng SHOPLITE10 giảm tối đa 100.000đ và tổng là 1.190.000đ", async () => {
    // Given giỏ hàng có tạm tính 1.290.000đ
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          valid: true,
          coupon: {
            code: "SHOPLITE10",
            type: "percentage",
            value: 10,
            maxDiscount: 100_000,
            minOrderValue: 300_000,
            description: "Giảm 10%, tối đa 100k",
          },
          discountAmount: 100_000,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutSummary items={[sampleItem]} shippingMethod="standard" />);

    // Tạm tính ban đầu 1.290.000đ, phí ship 0đ (do >= 500k)
    expect(screen.getByTestId("subtotal")).toHaveTextContent("1.290.000 ₫");
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent("Miễn phí");
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("1.290.000 ₫");

    // When khách nhập mã "SHOPLITE10" và bấm Áp dụng
    const input = screen.getByPlaceholderText(/Mã giảm giá/i);
    await user.type(input, "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    // Then tóm tắt đơn hiển thị dòng giảm giá -100.000 ₫
    expect(await screen.findByTestId("discount-amount")).toHaveTextContent("-100.000 ₫");
    expect(screen.getByText(/Giảm giá/)).toBeVisible();

    // And tổng thanh toán là 1.190.000đ
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("1.190.000 ₫");
  });

  it("cho phép gỡ mã giảm giá sau khi đã áp dụng", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          valid: true,
          coupon: {
            code: "SHOPLITE10",
            type: "percentage",
            value: 10,
            maxDiscount: 100_000,
            minOrderValue: 300_000,
          },
          discountAmount: 100_000,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutSummary items={[sampleItem]} shippingMethod="standard" />);

    await user.type(screen.getByPlaceholderText(/Mã giảm giá/i), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByTestId("discount-amount")).toBeVisible();

    // Bấm nút Gỡ
    await user.click(screen.getByTestId("remove-coupon-button"));

    // Dòng giảm giá biến mất, tổng tiền quay về ban đầu
    expect(screen.queryByTestId("discount-amount")).toBeNull();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("1.290.000 ₫");
  });

  it("hiển thị thông báo lỗi khi mã không hợp lệ", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          valid: false,
          code: "COUPON_NOT_FOUND",
          message: "Mã giảm giá không tồn tại",
        }),
        { status: 422 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutSummary items={[sampleItem]} shippingMethod="standard" />);

    await user.type(screen.getByPlaceholderText(/Mã giảm giá/i), "SAI");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByTestId("coupon-error")).toHaveTextContent(
      "Mã giảm giá không tồn tại",
    );
    expect(screen.queryByTestId("discount-amount")).toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Order } from "@/features/orders/types";
import { OrderPriceSummary } from "./order-price-summary";

const baseOrder = (overrides: Partial<Order> = {}): Order => ({
  id: "SL-1",
  status: "pending",
  createdAt: "2026-10-21T03:00:00.000Z",
  updatedAt: "2026-10-21T03:00:00.000Z",
  customer: { fullName: "Lê Văn C", phone: "0901234567", address: "1 Trần Phú, Hà Đông, Hà Nội" },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [],
  subtotal: 600_000,
  shippingFee: 0,
  total: 600_000,
  ...overrides,
});

describe("<OrderPriceSummary />", () => {
  it("đơn có mã giảm giá: hiện dòng giảm giá kèm mã và tổng đã trừ giảm giá", () => {
    render(
      <OrderPriceSummary
        order={baseOrder({ couponCode: "GIAM50K", discount: 50_000, total: 550_000 })}
      />,
    );

    expect(screen.getByText("Giảm giá (GIAM50K)")).toBeVisible();
    expect(screen.getByTestId("order-discount")).toHaveTextContent(/−50\.000/);
    expect(screen.getByText("Tổng cộng").nextElementSibling).toHaveTextContent(/550\.000/);
  });

  it("đơn cũ không có couponCode và discount: không có dòng giảm giá, tổng giữ nguyên", () => {
    render(
      <OrderPriceSummary
        order={baseOrder({ subtotal: 350_000, shippingFee: 30_000, total: 380_000 })}
      />,
    );

    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
    expect(screen.getByText("Tạm tính").nextElementSibling).toHaveTextContent(/350\.000/);
    expect(screen.getByText("Phí giao hàng").nextElementSibling).toHaveTextContent(/30\.000/);
    expect(screen.getByText("Tổng cộng").nextElementSibling).toHaveTextContent(/380\.000/);
  });

  it("đơn mới không áp mã (discount = 0): không có dòng giảm giá", () => {
    render(<OrderPriceSummary order={baseOrder({ discount: 0 })} />);
    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
  });

  it("có discount nhưng không có couponCode: không hiện dòng giảm giá", () => {
    render(<OrderPriceSummary order={baseOrder({ discount: 50_000 })} />);
    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
  });

  it("phí giao hàng bằng 0 hiển thị 'Miễn phí'", () => {
    render(<OrderPriceSummary order={baseOrder()} />);
    expect(screen.getByText("Phí giao hàng").nextElementSibling).toHaveTextContent("Miễn phí");
  });
});

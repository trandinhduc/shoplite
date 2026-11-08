import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Order } from "@/features/orders/types";
import { OrderTotals } from "./order-totals";

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "SL-20261108-ABC123",
    status: "pending",
    createdAt: "2026-11-08T03:00:00.000Z",
    updatedAt: "2026-11-08T03:00:00.000Z",
    customer: {
      fullName: "Nguyễn Văn A",
      phone: "0912345678",
      address: "12 Nguyễn Huệ, Q1",
    },
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [],
    subtotal: 600_000,
    shippingFee: 0,
    total: 550_000,
    ...overrides,
  };
}

const rowLabels = () =>
  within(screen.getByTestId("order-totals"))
    .getAllByRole("term")
    .map((term) => term.textContent);

describe("<OrderTotals />", () => {
  it("đơn có mã: hiển thị dòng giảm giá giữa tạm tính và phí giao hàng", () => {
    render(<OrderTotals order={makeOrder({ couponCode: "GIAM50K", discount: 50_000 })} />);

    expect(rowLabels()).toEqual(["Tạm tính", "Giảm giá (GIAM50K)", "Phí giao hàng", "Tổng cộng"]);
    expect(screen.getByTestId("order-discount")).toHaveTextContent(/−50\.000/);
    expect(screen.getByText("Miễn phí")).toBeInTheDocument();
  });

  it("tổng cộng lấy từ giá trị đã lưu, không tính lại", () => {
    render(
      <OrderTotals
        order={makeOrder({
          couponCode: "GIAM50K",
          discount: 50_000,
          total: 123_456,
        })}
      />,
    );
    expect(screen.getByTestId("order-total")).toHaveTextContent(/123\.456/);
  });

  it("đơn cũ không có trường giảm giá: không có dòng giảm giá, tổng giữ nguyên", () => {
    render(
      <OrderTotals
        order={makeOrder({
          subtotal: 300_000,
          shippingFee: 30_000,
          total: 330_000,
        })}
      />,
    );

    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
    expect(rowLabels()).toEqual(["Tạm tính", "Phí giao hàng", "Tổng cộng"]);
    expect(screen.getByTestId("order-total")).toHaveTextContent(/330\.000/);
  });

  it("đơn không dùng mã (giảm 0): không có dòng giảm giá", () => {
    render(<OrderTotals order={makeOrder({ discount: 0 })} />);
    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
  });
});

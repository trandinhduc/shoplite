import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderTotals } from "./order-totals";

describe("<OrderTotals />", () => {
  it("hiển thị mã đã dùng, số tiền giảm và tổng khớp lúc đặt", () => {
    render(
      <OrderTotals
        order={{
          subtotal: 600_000,
          shippingFee: 0,
          discount: { code: "GIAM50K", amount: 50_000 },
          total: 550_000,
        }}
      />,
    );

    expect(screen.getByText("Giảm giá (GIAM50K)")).toBeVisible();
    expect(screen.getByTestId("order-discount")).toHaveTextContent(/-\s?50\.000/);
    expect(screen.getByTestId("order-total")).toHaveTextContent(/550\.000/);
  });

  it("đơn không dùng mã (hoặc đơn cũ) không có dòng giảm giá và tổng không đổi", () => {
    render(<OrderTotals order={{ subtotal: 300_000, shippingFee: 30_000, total: 330_000 }} />);

    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
    expect(screen.queryByText(/Giảm giá/)).not.toBeInTheDocument();
    expect(screen.getByTestId("order-total")).toHaveTextContent(/330\.000/);
  });

  it("phí giao hàng bằng 0 hiển thị 'Miễn phí'", () => {
    render(<OrderTotals order={{ subtotal: 600_000, shippingFee: 0, total: 600_000 }} />);

    expect(screen.getByText("Miễn phí")).toBeVisible();
  });

  it("phí giao hàng khác 0 hiển thị số tiền", () => {
    render(<OrderTotals order={{ subtotal: 300_000, shippingFee: 30_000, total: 330_000 }} />);

    expect(screen.queryByText("Miễn phí")).not.toBeInTheDocument();
    expect(screen.getByText("Phí giao hàng").nextElementSibling).toHaveTextContent(/30\.000/);
  });
});

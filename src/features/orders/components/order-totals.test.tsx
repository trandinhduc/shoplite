import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderTotals } from "./order-totals";

describe("<OrderTotals />", () => {
  it("hiển thị dòng giảm giá giữa tạm tính và phí giao hàng cho đơn có mã", () => {
    render(
      <OrderTotals
        order={{
          subtotal: 600_000,
          couponCode: "GIAM50K",
          discount: 50_000,
          shippingFee: 0,
          total: 550_000,
        }}
      />,
    );

    expect(screen.getByText("Giảm giá (GIAM50K)")).toBeVisible();
    expect(screen.getByTestId("order-discount-amount")).toHaveTextContent(/−50\.000/);
    const labels = screen.getAllByRole("term").map((term) => term.textContent);
    expect(labels).toEqual(["Tạm tính", "Giảm giá (GIAM50K)", "Phí giao hàng", "Tổng cộng"]);
    const totalRow = screen.getByText("Tổng cộng").parentElement!;
    expect(within(totalRow).getByRole("definition")).toHaveTextContent(/550\.000/);
  });

  it("đơn cũ không có trường giảm giá vẫn hiển thị như trước", () => {
    // Dữ liệu dạng cũ trong storage/orders.json: không có couponCode/discount.
    render(<OrderTotals order={{ subtotal: 600_000, shippingFee: 0, total: 600_000 }} />);

    expect(screen.queryByTestId("order-discount-amount")).not.toBeInTheDocument();
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual([
      "Tạm tính",
      "Phí giao hàng",
      "Tổng cộng",
    ]);
    expect(screen.getByText("Miễn phí")).toBeVisible();
  });
});

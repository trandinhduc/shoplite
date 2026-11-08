import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderTotals } from "./order-totals";

const legacyOrder = { subtotal: 900_000, shippingFee: 0, total: 900_000 };

describe("<OrderTotals />", () => {
  it("hiển thị mã và số tiền giảm khi đơn có dùng mã", () => {
    render(
      <OrderTotals
        order={{ ...legacyOrder, couponCode: "GIAM50K", discount: 50_000, total: 850_000 }}
      />,
    );

    expect(screen.getByText("Giảm giá (GIAM50K)")).toBeVisible();
    expect(screen.getByTestId("order-discount")).toHaveTextContent(/-50\.000\s₫/);
    expect(screen.getByTestId("order-total")).toHaveTextContent(/850\.000\s₫/);
  });

  it("đơn cũ không có trường giảm giá thì không hiển thị dòng giảm giá", () => {
    render(<OrderTotals order={legacyOrder} />);

    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
    expect(screen.getByTestId("order-total")).toHaveTextContent(/900\.000\s₫/);
  });

  it("không hiển thị dòng giảm giá khi số tiền giảm bằng 0", () => {
    render(<OrderTotals order={{ ...legacyOrder, couponCode: "X", discount: 0 }} />);
    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
  });

  it("hiển thị đúng tổng tiền đã lưu, không tự tính lại", () => {
    render(<OrderTotals order={{ subtotal: 100_000, shippingFee: 30_000, total: 1 }} />);
    expect(screen.getByTestId("order-total")).toHaveTextContent(/^1\s₫$/);
  });
});

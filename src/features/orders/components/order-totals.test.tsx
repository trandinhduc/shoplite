import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderTotals } from "./order-totals";

const base = { subtotal: 560_000, shippingFee: 0, total: 510_000 };

describe("<OrderTotals />", () => {
  it("hiển thị dòng giảm giá kèm mã đã dùng", () => {
    render(<OrderTotals order={{ ...base, discount: 50_000, couponCode: "GIAM50K" }} />);
    expect(screen.getByText("Giảm giá (GIAM50K)")).toBeVisible();
    expect(screen.getByText(/-50\.000/)).toBeVisible();
    expect(screen.getByText(/510\.000/)).toBeVisible();
  });

  it("đơn hàng cũ không có trường giảm giá hiển thị như trước", () => {
    render(<OrderTotals order={{ subtotal: 300_000, shippingFee: 30_000, total: 330_000 }} />);
    expect(screen.queryByText(/Giảm giá/)).not.toBeInTheDocument();
    expect(screen.getByText(/300\.000/)).toBeVisible();
    expect(screen.getByText(/^30\.000/)).toBeVisible();
    expect(screen.getByText(/330\.000/)).toBeVisible();
  });

  it("không hiển thị dòng giảm giá khi số tiền giảm bằng 0", () => {
    render(<OrderTotals order={{ ...base, discount: 0, total: 560_000 }} />);
    expect(screen.queryByText(/Giảm giá/)).not.toBeInTheDocument();
  });
});

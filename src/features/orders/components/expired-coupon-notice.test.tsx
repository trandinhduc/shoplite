import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExpiredCouponNotice } from "./expired-coupon-notice";

describe("<ExpiredCouponNotice />", () => {
  it("báo mã đã hết hạn lúc đặt hàng, đơn tính theo giá gốc và số tiền mã lẽ ra giảm", () => {
    render(<ExpiredCouponNotice couponCode="TET2026" lostDiscount={90_000} />);

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Mã TET2026 đã hết hạn lúc đặt hàng nên không được áp dụng");
    expect(notice).toHaveTextContent("Đơn hàng được tính theo giá gốc");
    expect(notice).toHaveTextContent(/mã lẽ ra giảm 90\.000/);
  });
});

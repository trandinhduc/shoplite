import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CouponRule } from "../types";
import { CouponField } from "./coupon-field";

const SHOPLITE10: CouponRule = {
  code: "SHOPLITE10",
  type: "percent",
  percent: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};

function okResponse(coupon: CouponRule) {
  return new Response(JSON.stringify({ coupon }), { status: 200 });
}

describe("<CouponField />", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("có ô nhập gắn nhãn và nút Áp dụng", () => {
    render(<CouponField subtotal={900_000} onApplied={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByLabelText("Mã giảm giá")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeInTheDocument();
  });

  it("gọi API kiểm tra mã rồi trả quy tắc cho onApplied", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(SHOPLITE10));
    vi.stubGlobal("fetch", fetchMock);
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponField subtotal={900_000} onApplied={onApplied} onRemove={vi.fn()} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), " shoplite10 ");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/coupons/validate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ code: " shoplite10 " });
    expect(onApplied).toHaveBeenCalledWith(SHOPLITE10);
  });

  it("nhấn Enter trong ô mã cũng áp dụng mã", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(SHOPLITE10)));
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponField subtotal={900_000} onApplied={onApplied} onRemove={vi.fn()} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10{Enter}");

    expect(onApplied).toHaveBeenCalledWith(SHOPLITE10);
  });

  it("báo lỗi khi bấm Áp dụng với ô trống và không gọi API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CouponField subtotal={900_000} onApplied={vi.fn()} onRemove={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(screen.getByText("Vui lòng nhập mã giảm giá")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hiển thị lỗi từ server ngay dưới ô nhập, có liên kết trợ năng", async () => {
    const message = 'Mã giảm giá "KHONGCO" không tồn tại';
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "COUPON_NOT_FOUND", message, details: { couponCode: message } },
          }),
          { status: 422 },
        ),
      ),
    );
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponField subtotal={900_000} onApplied={onApplied} onRemove={vi.fn()} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "khongco");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    const input = screen.getByLabelText("Mã giảm giá");
    expect(await screen.findByText(message)).toBeVisible();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(message);
    expect(onApplied).not.toHaveBeenCalled();
  });

  it("từ chối mã khi tạm tính chưa đạt tối thiểu và báo số tiền cần mua thêm", async () => {
    const GIAM50K: CouponRule = {
      code: "GIAM50K",
      type: "fixed",
      amount: 50_000,
      minSubtotal: 500_000,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(GIAM50K)));
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponField subtotal={450_000} onApplied={onApplied} onRemove={vi.fn()} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "GIAM50K");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByTestId("error-couponCode")).toHaveTextContent(
      /cần mua thêm 50\.000\s₫/,
    );
    expect(onApplied).not.toHaveBeenCalled();
  });

  it("có nút Gỡ mã khi đang áp dụng mã", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <CouponField
        subtotal={900_000}
        appliedCode="SHOPLITE10"
        evaluation={{ status: "applied", discount: 90_000 }}
        onApplied={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("báo mã chưa đủ điều kiện và số tiền cần mua thêm", () => {
    render(
      <CouponField
        subtotal={450_000}
        appliedCode="GIAM50K"
        evaluation={{ status: "below_minimum", minSubtotal: 500_000, shortfall: 50_000 }}
        onApplied={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /Mã GIAM50K chưa đủ điều kiện, cần mua thêm 50\.000\s₫/,
    );
    expect(screen.getByRole("button", { name: "Gỡ mã" })).toBeInTheDocument();
  });

  it("hiển thị mã đang áp dụng", () => {
    render(
      <CouponField
        subtotal={900_000}
        appliedCode="SHOPLITE10"
        evaluation={{ status: "applied", discount: 90_000 }}
        onApplied={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Đã áp dụng mã SHOPLITE10");
  });
});

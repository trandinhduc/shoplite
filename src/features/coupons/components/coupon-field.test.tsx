import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { couponErrorMessage, evaluateCouponThreshold } from "../coupon-service";
import type { CouponDefinition } from "../types";
import { CouponField } from "./coupon-field";

describe("<CouponField />", () => {
  it("có ô nhập với nhãn Mã giảm giá", () => {
    render(<CouponField pending={false} onApply={vi.fn()} />);
    expect(screen.getByLabelText("Mã giảm giá")).toBeInTheDocument();
  });

  it("bấm Áp dụng gọi onApply với mã đã nhập", async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<CouponField pending={false} onApply={onApply} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(onApply).toHaveBeenCalledWith("shoplite10");
  });

  it("nhấn Enter trong ô mã chạy Áp dụng và không submit form đặt hàng", async () => {
    const onApply = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <CouponField pending={false} onApply={onApply} />
      </form>,
    );

    await user.type(screen.getByLabelText("Mã giảm giá"), "GIAM50K{Enter}");

    expect(onApply).toHaveBeenCalledWith("GIAM50K");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("khi đang kiểm tra thì nút bị vô hiệu và đổi chữ", () => {
    render(<CouponField pending onApply={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Đang kiểm tra…" });
    expect(button).toBeDisabled();
  });

  it("nút Áp dụng có type=button", () => {
    render(<CouponField pending={false} onApply={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Áp dụng" })).toHaveAttribute("type", "button");
  });
});

describe("<CouponField /> - thông báo lỗi", () => {
  it("hiển thị lỗi dạng alert, đánh dấu ô mã aria-invalid và liên kết aria-describedby", () => {
    render(<CouponField pending={false} onApply={vi.fn()} error="Mã giảm giá không tồn tại" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Mã giảm giá không tồn tại");
    const input = screen.getByLabelText("Mã giảm giá");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
  });

  it("không có lỗi thì không có alert và aria-invalid tắt", () => {
    render(<CouponField pending={false} onApply={vi.fn()} error={null} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("aria-invalid", "false");
  });
});

describe("<CouponField /> - mã đã áp dụng và trạng thái tạm ngưng", () => {
  const GIAM50K: CouponDefinition = {
    code: "GIAM50K",
    type: "fixed",
    value: 50_000,
    minSubtotal: 500_000,
  };

  it("hiện mã đã áp dụng và nút Gỡ mã gọi onRemove", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <CouponField
        pending={false}
        onApply={vi.fn()}
        appliedCode="SHOPLITE10"
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText(/Đã áp dụng/)).toHaveTextContent("SHOPLITE10");
    const removeButton = screen.getByRole("button", { name: "Gỡ mã" });
    expect(removeButton).toHaveAttribute("type", "button");
    await user.click(removeButton);
    expect(onRemove).toHaveBeenCalled();
  });

  it("mã tạm ngưng vẫn hiển thị cùng nút Gỡ mã và thông báo cần mua thêm", () => {
    const evaluation = evaluateCouponThreshold(GIAM50K, 450_000);
    render(
      <CouponField
        pending={false}
        onApply={vi.fn()}
        appliedCode="GIAM50K"
        evaluation={evaluation}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText(/Đã áp dụng/)).toHaveTextContent("GIAM50K");
    expect(screen.getByRole("button", { name: "Gỡ mã" })).toBeInTheDocument();
    if (evaluation.ok) throw new Error("evaluation phải là tạm ngưng");
    expect(screen.getByRole("alert").textContent).toBe(couponErrorMessage(evaluation));
  });

  it("ưu tiên hiển thị lỗi từ server/áp mã hơn thông báo tạm ngưng", () => {
    render(
      <CouponField
        pending={false}
        onApply={vi.fn()}
        appliedCode="GIAM50K"
        evaluation={evaluateCouponThreshold(GIAM50K, 450_000)}
        error="Mã giảm giá đã hết hạn"
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Mã giảm giá đã hết hạn");
  });
});

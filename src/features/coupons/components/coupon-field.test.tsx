import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CouponField } from "./coupon-field";

const renderField = (props: Partial<Parameters<typeof CouponField>[0]> = {}) => {
  const onApply = vi.fn();
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <CouponField onApply={onApply} onRemove={vi.fn()} {...props} />
    </form>,
  );
  return { onApply, onSubmit };
};

describe("<CouponField />", () => {
  it("ô nhập mã có nhãn hiển thị", () => {
    renderField();
    expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("id", "couponCode");
  });

  it("áp dụng mã đã chuẩn hóa khi bấm nút", async () => {
    const user = userEvent.setup();
    const { onApply } = renderField();

    await user.type(screen.getByLabelText("Mã giảm giá"), " shoplite10 ");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(onApply).toHaveBeenCalledWith("SHOPLITE10");
  });

  it("nhấn Enter áp dụng mã mà không gửi form đặt hàng", async () => {
    const user = userEvent.setup();
    const { onApply, onSubmit } = renderField();

    await user.type(screen.getByLabelText("Mã giảm giá"), "giam50k{Enter}");

    expect(onApply).toHaveBeenCalledWith("GIAM50K");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("khóa nút khi đang kiểm tra mã", () => {
    renderField({ pending: true });
    const button = screen.getByRole("button", { name: "Áp dụng" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("hiển thị mã đã áp dụng và ẩn ô nhập", () => {
    renderField({ appliedCode: "SHOPLITE10" });
    expect(screen.getByText("SHOPLITE10")).toBeVisible();
    expect(screen.queryByLabelText("Mã giảm giá")).not.toBeInTheDocument();
  });

  describe("trạng thái lỗi", () => {
    it("yêu cầu nhập mã khi bấm Áp dụng với ô trống", async () => {
      const user = userEvent.setup();
      const { onApply } = renderField();

      await user.click(screen.getByRole("button", { name: "Áp dụng" }));

      expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng nhập mã giảm giá");
      expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("aria-invalid", "true");
      expect(onApply).not.toHaveBeenCalled();
    });

    it("hiển thị lỗi ngay dưới ô nhập khi chưa có mã", () => {
      renderField({ error: "Mã giảm giá không tồn tại" });
      const input = screen.getByLabelText("Mã giảm giá");
      expect(screen.getByRole("alert")).toHaveTextContent("Mã giảm giá không tồn tại");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription("Mã giảm giá không tồn tại");
    });

    it("hiển thị mã kèm lỗi khi mã đã lưu nhưng không dùng được", () => {
      renderField({ appliedCode: "TET2026", error: "Mã giảm giá đã hết hạn" });
      expect(screen.getByText("TET2026")).toBeVisible();
      expect(screen.getByTestId("coupon-error")).toHaveTextContent("Mã giảm giá đã hết hạn");
      expect(screen.getByRole("alert")).toBe(screen.getByTestId("coupon-error"));
    });
  });

  describe("gỡ mã", () => {
    it("có nút gỡ mã đúng nhãn và gọi onRemove", async () => {
      const onRemove = vi.fn();
      const user = userEvent.setup();
      render(<CouponField appliedCode="SHOPLITE10" onApply={vi.fn()} onRemove={onRemove} />);

      await user.click(screen.getByRole("button", { name: "Gỡ mã giảm giá SHOPLITE10" }));

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it("không cho nhập mã thứ hai khi đã có mã", () => {
      renderField({ appliedCode: "SHOPLITE10" });
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Áp dụng" })).not.toBeInTheDocument();
    });
  });
});

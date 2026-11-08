import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CouponStatus } from "@/features/coupons/coupon-rules";
import { CouponField } from "./coupon-field";

function renderInForm(
  props: Partial<{
    status: CouponStatus;
    pending: boolean;
    message: string | null;
    onApply: (code: string) => Promise<boolean> | void;
    onRemove: () => void;
  }> = {},
) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const onApply = props.onApply ?? vi.fn();
  render(
    <form onSubmit={onSubmit}>
      <CouponField
        status={props.status ?? { status: "none" }}
        pending={props.pending ?? false}
        message={props.message ?? null}
        onApply={onApply}
        onRemove={props.onRemove ?? vi.fn()}
      />
    </form>,
  );
  return { onSubmit, onApply, onRemove: props.onRemove };
}

describe("<CouponField />", () => {
  it("có ô nhập gắn nhãn 'Mã giảm giá' và nút 'Áp dụng' không submit form", () => {
    renderInForm();
    expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("id", "couponCode");
    expect(screen.getByRole("button", { name: "Áp dụng" })).toHaveAttribute("type", "button");
  });

  it("bấm 'Áp dụng' gọi onApply với mã đã nhập và không submit form cha", async () => {
    const user = userEvent.setup();
    const { onApply, onSubmit } = renderInForm();

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(onApply).toHaveBeenCalledWith("SHOPLITE10");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("nhấn Enter trong ô mã gọi onApply thay vì đặt hàng", async () => {
    const user = userEvent.setup();
    const { onApply, onSubmit } = renderInForm();

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10{Enter}");

    expect(onApply).toHaveBeenCalledWith("SHOPLITE10");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("khi đang kiểm tra mã thì nút bị vô hiệu và đổi nhãn", () => {
    renderInForm({ pending: true });
    expect(screen.getByRole("button", { name: "Đang kiểm tra…" })).toBeDisabled();
  });

  it("hiển thị mã đang áp dụng", () => {
    renderInForm({
      status: { status: "active", code: "SHOPLITE10", discount: 30_000 },
    });
    expect(screen.getByTestId("applied-coupon")).toHaveTextContent("SHOPLITE10");
  });
  it.each(["", "   "])(
    "mã rỗng %j → báo 'Vui lòng nhập mã giảm giá', không gọi onApply",
    async (value) => {
      const user = userEvent.setup();
      const { onApply } = renderInForm();

      if (value) await user.type(screen.getByLabelText("Mã giảm giá"), value);
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));

      expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng nhập mã giảm giá");
      expect(onApply).not.toHaveBeenCalled();
    },
  );

  it("mã dài 33 ký tự → báo giới hạn 32 ký tự, không gọi onApply", async () => {
    const user = userEvent.setup();
    const { onApply } = renderInForm();

    await user.type(screen.getByLabelText("Mã giảm giá"), "A".repeat(33));
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Mã giảm giá tối đa 32 ký tự");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("gửi mã đã bỏ khoảng trắng đầu/cuối", async () => {
    const user = userEvent.setup();
    const { onApply } = renderInForm();

    await user.type(screen.getByLabelText("Mã giảm giá"), "  giam50k  ");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(onApply).toHaveBeenCalledWith("giam50k");
  });

  it("thông báo lỗi gắn với ô nhập cho trình đọc màn hình", () => {
    renderInForm({ message: "Mã giảm giá không tồn tại" });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Mã giảm giá không tồn tại");
    expect(alert).toHaveAttribute("id", "coupon-message");
    const input = screen.getByLabelText("Mã giảm giá");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "coupon-message");
  });

  it("không có lỗi thì ô nhập không bị đánh dấu không hợp lệ", () => {
    renderInForm();
    expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("<CouponField /> - gỡ và thay mã", () => {
  it("chưa áp mã thì không có nút 'Gỡ mã'", () => {
    renderInForm();
    expect(screen.queryByRole("button", { name: "Gỡ mã" })).not.toBeInTheDocument();
  });

  it.each([
    ["đang có hiệu lực", { status: "active", code: "SHOPLITE10", discount: 30_000 } as const],
    [
      "đang lỗi",
      {
        status: "error",
        code: "TET2026",
        message: "Mã giảm giá đã hết hạn",
      } as const,
    ],
  ])("mã %s → bấm 'Gỡ mã' gọi onRemove, không submit form", async (_label, status) => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const { onSubmit } = renderInForm({ status, onRemove });

    const removeButton = screen.getByRole("button", { name: "Gỡ mã" });
    expect(removeButton).toHaveAttribute("type", "button");
    await user.click(removeButton);

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Mã giảm giá")).toHaveFocus();
  });

  it("áp dụng thành công → xóa trắng ô nhập để sẵn sàng nhập mã mới", async () => {
    const user = userEvent.setup();
    renderInForm({ onApply: vi.fn().mockResolvedValue(true) });

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(screen.getByLabelText("Mã giảm giá")).toHaveValue("");
  });

  it("áp dụng thất bại → giữ nguyên mã đã nhập để khách sửa", async () => {
    const user = userEvent.setup();
    renderInForm({ onApply: vi.fn().mockResolvedValue(false) });

    await user.type(screen.getByLabelText("Mã giảm giá"), "KHONGCO");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(screen.getByLabelText("Mã giảm giá")).toHaveValue("KHONGCO");
  });
});

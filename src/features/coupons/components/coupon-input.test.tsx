import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CouponInput } from "./coupon-input";

describe("<CouponInput />", () => {
  it("có ô nhập 'Mã giảm giá' và nút 'Áp dụng'", () => {
    render(<CouponInput subtotal={600_000} applied={null} onApplied={vi.fn()} />);

    expect(screen.getByLabelText("Mã giảm giá")).toBeVisible();
    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeVisible();
  });

  it("áp dụng mã chữ thường hợp lệ và báo mức giảm", async () => {
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponInput subtotal={600_000} applied={null} onApplied={onApplied} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(onApplied).toHaveBeenCalledWith({
      code: "SHOPLITE10",
      amount: 60_000,
    });
  });

  it("bỏ khoảng trắng thừa khi nhập mã", async () => {
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponInput subtotal={500_000} applied={null} onApplied={onApplied} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), " giam50k ");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(onApplied).toHaveBeenCalledWith({ code: "GIAM50K", amount: 50_000 });
  });

  it("nhấn Enter trong ô nhập áp dụng mã và không gửi form bao quanh", async () => {
    const onApplied = vi.fn();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <CouponInput subtotal={600_000} applied={null} onApplied={onApplied} />
      </form>,
    );

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10{Enter}");

    expect(onApplied).toHaveBeenCalledWith({
      code: "SHOPLITE10",
      amount: 60_000,
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("hiển thị mã đang áp dụng và số tiền giảm", () => {
    render(
      <CouponInput
        subtotal={600_000}
        applied={{ code: "SHOPLITE10", amount: 60_000 }}
        onApplied={vi.fn()}
      />,
    );

    expect(screen.getByTestId("applied-coupon")).toHaveTextContent("SHOPLITE10");
    expect(screen.getByTestId("applied-coupon")).toHaveTextContent(/60\.000/);
  });
});

describe("<CouponInput /> - mã không hợp lệ", () => {
  beforeEach(() => {
    // Chỉ giả Date (không giả setTimeout) để userEvent không bị treo.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T05:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function tryApply(subtotal: number, text: string) {
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponInput subtotal={subtotal} applied={null} onApplied={onApplied} />);
    if (text !== "") await user.type(screen.getByLabelText("Mã giảm giá"), text);
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
    return { onApplied, user };
  }

  it("mã không tồn tại", async () => {
    const { onApplied } = await tryApply(600_000, "ABC");

    expect(screen.getByTestId("error-couponCode")).toHaveTextContent("Mã giảm giá không tồn tại");
    expect(onApplied).not.toHaveBeenCalled();
  });

  it("mã đã hết hạn", async () => {
    const { onApplied } = await tryApply(600_000, "TET2026");

    expect(screen.getByTestId("error-couponCode")).toHaveTextContent("Mã giảm giá đã hết hạn");
    expect(onApplied).not.toHaveBeenCalled();
  });

  it("chưa đạt giá trị tối thiểu, nêu số tiền cần mua thêm", async () => {
    const { onApplied } = await tryApply(200_000, "SHOPLITE10");

    expect(screen.getByTestId("error-couponCode")).toHaveTextContent(
      /Cần mua thêm 100\.000\s?₫ để dùng mã này/,
    );
    expect(onApplied).not.toHaveBeenCalled();
  });

  it.each(["", "   "])("nhập %j thì yêu cầu nhập mã", async (text) => {
    const { onApplied } = await tryApply(600_000, text);

    expect(screen.getByTestId("error-couponCode")).toHaveTextContent("Vui lòng nhập mã giảm giá");
    expect(onApplied).not.toHaveBeenCalled();
  });

  it("nhập 33 ký tự thì báo tối đa 32 ký tự, không phải 'không tồn tại'", async () => {
    const { onApplied } = await tryApply(600_000, "A".repeat(33));

    expect(screen.getByTestId("error-couponCode")).toHaveTextContent("Mã giảm giá tối đa 32 ký tự");
    expect(screen.getByTestId("error-couponCode")).not.toHaveTextContent("không tồn tại");
    expect(onApplied).not.toHaveBeenCalled();
  });

  it("giỏ rỗng thì nút 'Áp dụng' bị vô hiệu hóa", async () => {
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponInput subtotal={0} applied={null} onApplied={onApplied} />);

    const button = screen.getByRole("button", { name: "Áp dụng" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onApplied).not.toHaveBeenCalled();
  });

  it("thông báo lỗi không chứa nguyên văn chuỗi người dùng nhập", async () => {
    await tryApply(600_000, "<b>x</b>");

    expect(screen.getByTestId("error-couponCode")).not.toHaveTextContent("<b>");
  });

  it("liên kết lỗi với ô nhập bằng ARIA", async () => {
    await tryApply(600_000, "ABC");

    const input = screen.getByLabelText("Mã giảm giá");
    const error = screen.getByTestId("error-couponCode");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);
  });

  it("xóa lỗi khi người dùng gõ lại", async () => {
    const { user } = await tryApply(600_000, "ABC");
    expect(screen.getByTestId("error-couponCode")).toBeVisible();

    await user.type(screen.getByLabelText("Mã giảm giá"), "D");

    expect(screen.queryByTestId("error-couponCode")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Mã giảm giá")).not.toHaveAttribute("aria-invalid", "true");
  });
});

describe("<CouponInput /> - gỡ và đổi mã", () => {
  const applied = { code: "GIAM50K", amount: 50_000 };

  it("có nút 'Gỡ mã' khi đã áp dụng và gọi onRemoved", async () => {
    const onRemoved = vi.fn();
    const user = userEvent.setup();
    render(
      <CouponInput
        subtotal={600_000}
        applied={applied}
        onApplied={vi.fn()}
        onRemoved={onRemoved}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));

    expect(onRemoved).toHaveBeenCalledTimes(1);
  });

  it("không có nút 'Gỡ mã' khi chưa áp dụng mã nào", () => {
    render(
      <CouponInput subtotal={600_000} applied={null} onApplied={vi.fn()} onRemoved={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: "Gỡ mã" })).not.toBeInTheDocument();
  });

  it("áp dụng mã hợp lệ khác sẽ gọi onApplied với mã mới", async () => {
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(
      <CouponInput
        subtotal={600_000}
        applied={applied}
        onApplied={onApplied}
        onRemoved={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(onApplied).toHaveBeenCalledWith({ code: "SHOPLITE10", amount: 60_000 });
  });

  it("mã không hợp lệ không làm mất mã đang áp dụng", async () => {
    const onApplied = vi.fn();
    const onRemoved = vi.fn();
    const user = userEvent.setup();
    render(
      <CouponInput
        subtotal={600_000}
        applied={applied}
        onApplied={onApplied}
        onRemoved={onRemoved}
      />,
    );

    await user.type(screen.getByLabelText("Mã giảm giá"), "ABC");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(screen.getByTestId("error-couponCode")).toBeVisible();
    expect(onApplied).not.toHaveBeenCalled();
    expect(onRemoved).not.toHaveBeenCalled();
    expect(screen.getByTestId("applied-coupon")).toHaveTextContent("GIAM50K");
  });

  it("hiển thị thông báo từ bên ngoài (ví dụ mã bị gỡ vì giỏ hàng đổi)", () => {
    render(
      <CouponInput
        subtotal={150_000}
        applied={null}
        onApplied={vi.fn()}
        onRemoved={vi.fn()}
        notice="Cần mua thêm 150.000 ₫ để dùng mã này"
      />,
    );

    expect(screen.getByTestId("error-couponCode")).toHaveTextContent(/Cần mua thêm 150\.000/);
  });
});

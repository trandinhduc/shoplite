import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import type { CartItem } from "@/features/cart/types";
import { couponStore } from "../coupon-store";
import { useAppliedCoupon } from "../use-applied-coupon";
import { CouponField } from "./coupon-field";

const items: CartItem[] = [{ ...toCartItem(getProductById("p010")!), quantity: 2 }];

const SHOPLITE10 = {
  code: "SHOPLITE10",
  type: "percent",
  value: 10,
  maxDiscount: 100_000,
  minOrderValue: 300_000,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function Harness({ subtotal = 300_000 }: { subtotal?: number }) {
  const coupon = useAppliedCoupon(items, subtotal);
  return (
    <>
      <CouponField
        applied={coupon.applied}
        status={coupon.status}
        error={coupon.error}
        notice={coupon.notice}
        onApply={coupon.apply}
        onRemove={coupon.remove}
      />
      <output data-testid="discount">{coupon.discount}</output>
    </>
  );
}

describe("<CouponField />", () => {
  beforeEach(() => couponStore.reset());
  afterEach(() => vi.unstubAllGlobals());

  it("có ô nhập có nhãn và nút Áp dụng không submit form", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Mã giảm giá")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Áp dụng" })).toHaveAttribute("type", "button");
  });

  it("áp dụng mã hợp lệ: lưu mã, hiển thị mã và số tiền giảm", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ coupon: SHOPLITE10, subtotal: 300_000, discount: 30_000 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByText("SHOPLITE10")).toBeVisible();
    expect(couponStore.getSnapshot()?.code).toBe("SHOPLITE10");
    expect(screen.getByTestId("discount")).toHaveTextContent("30000");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/coupons/validate");
    expect(JSON.parse(init.body)).toEqual({
      code: "shoplite10",
      items: [{ productId: "p010", quantity: 2 }],
    });
  });

  it("nhấn Enter trong ô áp dụng mã mà không submit form đặt hàng", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ coupon: SHOPLITE10, subtotal: 300_000, discount: 30_000 }),
        ),
    );
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Harness />
      </form>,
    );

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10{Enter}");

    expect(await screen.findByText("SHOPLITE10")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("vô hiệu hóa nút và báo đang kiểm tra trong lúc chờ server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(screen.getByRole("button", { name: "Đang kiểm tra…" })).toBeDisabled();
  });

  it("hiển thị lý do lỗi dưới ô nhập, gắn với ô qua aria-describedby", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "COUPON_MIN_ORDER_NOT_MET",
              message: "Đơn hàng cần tối thiểu 500.000 ₫, mua thêm 50.000 ₫ để dùng mã",
              details: { minOrderValue: "500000", amountNeeded: "50000" },
            },
          },
          422,
        ),
      ),
    );
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "GIAM50K");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/500\.000.*50\.000/);
    expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("aria-describedby", alert.id);
    expect(couponStore.getSnapshot()).toBeNull();
  });

  it("báo cần nhập mã khi ô trống và không gọi server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "   ");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng nhập mã giảm giá");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gỡ mã đã áp dụng: xóa mã và số tiền giảm về 0", async () => {
    couponStore.set({ code: "SHOPLITE10", rule: SHOPLITE10 as never });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ coupon: SHOPLITE10, subtotal: 300_000, discount: 30_000 }),
        ),
    );
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByTestId("discount")).toHaveTextContent("30000");

    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));

    expect(couponStore.getSnapshot()).toBeNull();
    expect(screen.getByTestId("discount")).toHaveTextContent("0");
    expect(screen.queryByRole("button", { name: "Gỡ mã" })).not.toBeInTheDocument();
  });

  it("áp mã mới thay cho mã đang dùng", async () => {
    couponStore.set({ code: "SHOPLITE10", rule: SHOPLITE10 as never });
    const GIAM50K = { code: "GIAM50K", type: "fixed", value: 50_000, minOrderValue: 500_000 };
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        Promise.resolve(
          JSON.parse(init.body as string).code === "GIAM50K"
            ? jsonResponse({ coupon: GIAM50K, subtotal: 600_000, discount: 50_000 })
            : jsonResponse({ coupon: SHOPLITE10, subtotal: 600_000, discount: 60_000 }),
        ),
      ),
    );
    const user = userEvent.setup();
    render(<Harness subtotal={600_000} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "GIAM50K");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByText("GIAM50K")).toBeVisible();
    expect(screen.queryByText("SHOPLITE10")).not.toBeInTheDocument();
    expect(screen.getByTestId("discount")).toHaveTextContent("50000");
  });
});

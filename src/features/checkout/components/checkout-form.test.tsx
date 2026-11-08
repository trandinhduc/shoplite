import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { couponStore } from "@/features/coupons/coupon-store";
import { CheckoutForm } from "./checkout-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

describe("<CheckoutForm />", () => {
  beforeEach(() => {
    cartStore.reset();
    couponStore.reset();
    cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p010")!), quantity: 2 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("hiển thị lỗi validate khi gửi form trống và không gọi API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(screen.getByTestId("error-fullName")).toBeVisible();
    expect(screen.getByTestId("error-phone")).toHaveTextContent(/Số điện thoại không hợp lệ/);
    expect(screen.getByTestId("error-address")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cập nhật phí giao hàng khi đổi phương thức giao hàng", async () => {
    const user = userEvent.setup();
    render(<CheckoutForm />);

    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/30\.000/);
    await user.click(screen.getByText("Giao hàng nhanh"));
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/60\.000/);
  });

  it("gửi đơn hàng, xóa giỏ và chuyển tới trang đơn hàng", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "SL-20261021-ABC123" }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(JSON.parse(init.body)).toMatchObject({
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p010", quantity: 2 }],
      customer: { fullName: "Nguyễn Văn A", phone: "0912345678" },
    });
    expect(push).toHaveBeenCalledWith("/orders/SL-20261021-ABC123?placed=1");
    expect(cartStore.getSnapshot().items).toEqual([]);
  });

  it("áp dụng mã đã lưu: hiển thị giảm giá, gửi mã khi đặt hàng và xóa mã sau khi đặt", async () => {
    couponStore.set({
      code: "SHOPLITE10",
      rule: {
        code: "SHOPLITE10",
        type: "percent",
        value: 10,
        maxDiscount: 100_000,
        minOrderValue: 300_000,
      },
    });
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url) =>
      Promise.resolve(
        url === "/api/orders"
          ? new Response(JSON.stringify({ id: "SL-20261021-ABC123" }), { status: 201 })
          : new Response(
              JSON.stringify({
                coupon: couponStore.getSnapshot()!.rule,
                subtotal: 300_000,
                discount: 30_000,
              }),
            ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    expect(screen.getByText(/Giảm giá \(SHOPLITE10\)/)).toBeVisible();
    expect(screen.getByTestId("discount")).toHaveTextContent(/-30\.000/);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/300\.000/);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    const orderCall = fetchMock.mock.calls.find(([url]) => url === "/api/orders")!;
    expect(JSON.parse(orderCall[1]!.body as string)).toMatchObject({
      couponCode: "SHOPLITE10",
    });
    expect(push).toHaveBeenCalledWith("/orders/SL-20261021-ABC123?placed=1");
    expect(couponStore.getSnapshot()).toBeNull();
  });

  const SHOPLITE10_RULE = {
    code: "SHOPLITE10",
    type: "percent" as const,
    value: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
  };

  it("tự gỡ mã khi giỏ hàng không còn đạt giá trị tối thiểu và không tự áp lại", async () => {
    couponStore.set({ code: "SHOPLITE10", rule: SHOPLITE10_RULE });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ coupon: SHOPLITE10_RULE, subtotal: 300_000, discount: 30_000 }),
          ),
        ),
    );
    render(<CheckoutForm />);
    expect(screen.getByText(/Giảm giá \(SHOPLITE10\)/)).toBeVisible();

    act(() => cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 1 }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/mua thêm 150\.000/);
    expect(couponStore.getSnapshot()).toBeNull();
    expect(screen.queryByText(/Giảm giá \(/)).not.toBeInTheDocument();

    act(() => cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 2 }));
    expect(couponStore.getSnapshot()).toBeNull();
  });

  it("kiểm tra lại mã đã lưu một lần khi mở trang và gỡ mã nếu server báo không hợp lệ", async () => {
    couponStore.set({ code: "SHOPLITE10", rule: SHOPLITE10_RULE });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "COUPON_EXPIRED", message: 'Mã giảm giá "SHOPLITE10" đã hết hạn' },
        }),
        { status: 422 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutForm />);

    expect(await screen.findByRole("alert")).toHaveTextContent("đã hết hạn");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/coupons/validate");
    expect(couponStore.getSnapshot()).toBeNull();
  });

  it("mã bị server từ chối lúc đặt hàng: không chuyển trang, gỡ mã và hiện lý do", async () => {
    couponStore.set({ code: "SHOPLITE10", rule: SHOPLITE10_RULE });
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          url === "/api/orders"
            ? new Response(
                JSON.stringify({
                  error: { code: "COUPON_EXPIRED", message: 'Mã giảm giá "SHOPLITE10" đã hết hạn' },
                }),
                { status: 422 },
              )
            : new Response(
                JSON.stringify({ coupon: SHOPLITE10_RULE, subtotal: 300_000, discount: 30_000 }),
              ),
        ),
      ),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByText(/đã hết hạn/)).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    expect(couponStore.getSnapshot()).toBeNull();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
  });

  it("hiển thị thông báo lỗi từ server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "INSUFFICIENT_STOCK", message: "Sản phẩm đã hết hàng" },
          }),
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm đã hết hàng");
    expect(push).not.toHaveBeenCalled();
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { CheckoutForm } from "./checkout-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

describe("<CheckoutForm />", () => {
  beforeEach(() => {
    cartStore.reset();
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

  it("gửi kèm couponCode khi đặt hàng thành công", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/coupons/validate") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              valid: true,
              coupon: { code: "SHOPLITE10", description: "Giảm 10%" },
              discountAmount: 30_000,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ id: "SL-20261021-COUPON" }), { status: 201 }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    // Nhập mã giảm giá
    await user.type(screen.getByLabelText(/Mã giảm giá/i), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: /Áp dụng/i }));
    expect(await screen.findByTestId("discount-line")).toBeInTheDocument();

    // Điền form và đặt hàng
    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    await waitFor(() => {
      const orderCall = fetchMock.mock.calls.find((call) => call[0] === "/api/orders");
      expect(orderCall).toBeDefined();
      expect(JSON.parse(orderCall![1].body)).toMatchObject({
        couponCode: "SHOPLITE10",
      });
    });
  });

  it("chặn đặt hàng và báo [đã hết hạn] khi server từ chối vì COUPON_EXPIRED", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/coupons/validate") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              valid: true,
              coupon: { code: "SHOPLITE10", description: "Giảm 10%" },
              discountAmount: 30_000,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              code: "COUPON_EXPIRED",
              message: "Mã giảm giá đã hết hạn sử dụng. Vui lòng gỡ mã để tiếp tục đặt hàng.",
            },
          }),
          { status: 422 },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    // Nhập mã
    await user.type(screen.getByLabelText(/Mã giảm giá/i), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: /Áp dụng/i }));
    expect(await screen.findByTestId("discount-line")).toBeInTheDocument();

    // Điền form và đặt hàng
    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    // Báo lỗi và khóa nút
    expect(await screen.findByText(/\[đã hết hạn\]/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });
});

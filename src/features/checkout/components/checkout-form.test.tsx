import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { CheckoutForm } from "./checkout-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

describe("<CheckoutForm />", () => {
  beforeEach(() => {
    cartStore.reset();
    cartStore.dispatch({
      type: "add",
      item: toCartItem(getProductById("p010")!),
      quantity: 2,
    });
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
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "SL-20261021-ABC123" }), {
        status: 201,
      }),
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
            error: {
              code: "INSUFFICIENT_STOCK",
              message: "Sản phẩm đã hết hàng",
            },
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
  describe("mã giảm giá", () => {
    async function fillCustomer(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
      await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
      await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    }

    const okResponse = () =>
      new Response(JSON.stringify({ id: "SL-20261021-ABC123" }), {
        status: 201,
      });

    it("áp dụng mã hợp lệ: hiện dòng giảm giá, tổng mới và gửi couponCode khi đặt hàng", async () => {
      const fetchMock = vi.fn().mockResolvedValue(okResponse());
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      // Cáp USB-C 150.000đ x 2 = 300.000đ (đúng mức tối thiểu của SHOPLITE10)
      await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));

      expect(screen.getByTestId("discount-amount")).toHaveTextContent(/-\s?30\.000/);
      // 300.000 - 30.000 + 30.000 phí giao hàng
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/300\.000/);

      await fillCustomer(user);
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.couponCode).toBe("SHOPLITE10");
      for (const key of ["discount", "discountAmount", "total", "unitPrice"]) {
        expect(body).not.toHaveProperty(key);
      }
      expect(body.items).toEqual([{ productId: "p010", quantity: 2 }]);
    });

    it("nhập mã sai thì hiện lỗi cạnh ô nhập, tổng tiền không đổi và không có dòng giảm giá", async () => {
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await user.type(screen.getByLabelText("Mã giảm giá"), "ABC");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));

      expect(screen.getByTestId("error-couponCode")).toHaveTextContent("Mã giảm giá không tồn tại");
      expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
      // 300.000 + 30.000 phí giao hàng
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
    });

    describe("server từ chối đơn", () => {
      async function applyAndSubmit(status: number, code: string, message: string) {
        const fetchMock = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ error: { code, message } }), {
            status,
          }),
        );
        vi.stubGlobal("fetch", fetchMock);
        const user = userEvent.setup();
        render(<CheckoutForm />);

        await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
        await user.click(screen.getByRole("button", { name: "Áp dụng" }));
        expect(screen.getByTestId("discount-amount")).toBeVisible();

        await fillCustomer(user);
        await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
        return fetchMock;
      }

      it.each([
        ["COUPON_EXPIRED", "Mã giảm giá đã hết hạn"],
        ["COUPON_MIN_ORDER_NOT_MET", "Cần mua thêm 100.000 ₫ để dùng mã này"],
      ])(
        "%s: tự gỡ mã, hiện lý do, giữ thông tin đã nhập, không tự đặt lại",
        async (code, message) => {
          const fetchMock = await applyAndSubmit(422, code, message);

          expect(await screen.findByRole("alert")).toHaveTextContent(message);
          expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
          // 300.000 + 30.000 phí giao hàng: về giá gốc
          expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
          expect(screen.getByLabelText(/Họ và tên/)).toHaveValue("Nguyễn Văn A");
          expect(screen.getByLabelText(/Số điện thoại/)).toHaveValue("0912345678");
          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
          expect(push).not.toHaveBeenCalled();
        },
      );

      it("lỗi khác (hết hàng) thì KHÔNG gỡ mã", async () => {
        await applyAndSubmit(409, "INSUFFICIENT_STOCK", "Sản phẩm đã hết hàng");

        expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm đã hết hàng");
        expect(screen.getByTestId("discount-amount")).toBeVisible();
      });
    });

    describe("gỡ, đổi mã và giỏ hàng thay đổi", () => {
      async function apply(user: ReturnType<typeof userEvent.setup>, code: string) {
        await user.type(screen.getByLabelText("Mã giảm giá"), code);
        await user.click(screen.getByRole("button", { name: "Áp dụng" }));
      }

      it("gỡ mã thì dòng giảm giá biến mất và tổng về giá gốc", async () => {
        cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 4 }); // 600.000
        const user = userEvent.setup();
        render(<CheckoutForm />);

        await apply(user, "GIAM50K");
        expect(screen.getByTestId("discount-amount")).toHaveTextContent(/-\s?50\.000/);

        await user.click(screen.getByRole("button", { name: "Gỡ mã" }));

        expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
        expect(screen.getByTestId("checkout-total")).toHaveTextContent(/600\.000/);
      });

      it("đổi sang mã khác thì chỉ còn đúng một dòng giảm giá", async () => {
        cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 4 });
        const user = userEvent.setup();
        render(<CheckoutForm />);

        await apply(user, "GIAM50K");
        await apply(user, "SHOPLITE10");

        expect(screen.getAllByTestId("discount-amount")).toHaveLength(1);
        expect(screen.getByText("Giảm giá (SHOPLITE10)")).toBeVisible();
        expect(screen.queryByText("Giảm giá (GIAM50K)")).not.toBeInTheDocument();
        expect(screen.getByTestId("discount-amount")).toHaveTextContent(/-\s?60\.000/);
      });

      it("giỏ đổi làm tiền hàng dưới mức tối thiểu thì mã tự bị gỡ kèm thông báo", async () => {
        const user = userEvent.setup();
        render(<CheckoutForm />);
        await apply(user, "SHOPLITE10"); // 300.000đ: đúng mức tối thiểu

        act(() => {
          cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 1 });
        });

        expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
        expect(screen.getByTestId("error-couponCode")).toHaveTextContent(
          /Cần mua thêm 150\.000\s?₫ để dùng mã này/,
        );
        // 150.000 + 30.000 phí giao hàng
        expect(screen.getByTestId("checkout-total")).toHaveTextContent(/180\.000/);
      });

      it("giỏ đổi nhưng vẫn đạt điều kiện thì mức giảm được tính lại", async () => {
        cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 4 }); // 600.000
        const user = userEvent.setup();
        render(<CheckoutForm />);
        await apply(user, "SHOPLITE10");
        expect(screen.getByTestId("discount-amount")).toHaveTextContent(/-\s?60\.000/);

        act(() => {
          cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 3 }); // 450.000
        });

        expect(screen.getByTestId("discount-amount")).toHaveTextContent(/-\s?45\.000/);
      });
    });

    it("không áp dụng mã thì không gửi couponCode", async () => {
      const fetchMock = vi.fn().mockResolvedValue(okResponse());
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await fillCustomer(user);
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).not.toHaveProperty("couponCode");
    });
  });

  it("giỏ rỗng chỉ hiển thị trạng thái trống, không có ô nhập mã giảm giá", async () => {
    cartStore.dispatch({ type: "clear" });
    render(<CheckoutForm />);

    expect(await screen.findByText("Chưa có sản phẩm để thanh toán")).toBeVisible();
    expect(screen.queryByLabelText("Mã giảm giá")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Áp dụng" })).not.toBeInTheDocument();
  });
});

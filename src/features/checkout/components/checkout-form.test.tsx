import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { findCoupon } from "@/features/coupons/coupon-service";
import { CheckoutForm } from "./checkout-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

/** Mock fetch theo URL: GET /api/coupons/:code trả định nghĩa mã, POST /api/orders trả đơn. */
function mockApi(orderResponse: unknown = { id: "SL-20261021-ABC123" }, orderStatus = 201) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    if (url.startsWith("/api/coupons/")) {
      const coupon = findCoupon(decodeURIComponent(url.slice("/api/coupons/".length)));
      return coupon
        ? new Response(JSON.stringify({ coupon }), { status: 200 })
        : new Response(
            JSON.stringify({
              error: {
                code: "COUPON_NOT_FOUND",
                message: "Mã giảm giá không tồn tại",
              },
            }),
            { status: 404 },
          );
    }
    return new Response(JSON.stringify(orderResponse), { status: orderStatus });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function fillCustomer(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
  await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
  await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
}

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
    // Giỏ: 3 × Cáp USB-C 150.000đ = 450.000đ
    beforeEach(() => {
      cartStore.dispatch({
        type: "add",
        item: toCartItem(getProductById("p010")!),
        quantity: 1,
      });
    });

    it("áp dụng mã hợp lệ và hiển thị số tiền giảm, tổng tiền mới", async () => {
      mockApi();
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));

      expect(await screen.findByTestId("discount-amount")).toHaveTextContent(/45\.000/);
      expect(screen.getByText("Giảm giá (SHOPLITE10)")).toBeVisible();
      // 450.000 − 45.000 + 30.000
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/435\.000/);
      expect(cartStore.getSnapshot().couponCode).toBe("SHOPLITE10");
    });

    it("gửi mã khi đặt hàng nhưng không gửi số tiền, rồi xóa giỏ và mã", async () => {
      const fetchMock = mockApi();
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));
      await screen.findByTestId("discount-amount");
      await fillCustomer(user);
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

      const orderCall = fetchMock.mock.calls.find(([url]) => url === "/api/orders")!;
      const body = JSON.parse((orderCall[1] as RequestInit).body as string);
      expect(body.couponCode).toBe("SHOPLITE10");
      expect(body).not.toHaveProperty("discount");
      expect(body).not.toHaveProperty("total");
      expect(push).toHaveBeenCalledWith("/orders/SL-20261021-ABC123?placed=1");
      expect(cartStore.getSnapshot()).toEqual({ items: [] });
    });

    it("tự kiểm tra lại mã đã lưu trong giỏ khi mở trang thanh toán", async () => {
      cartStore.dispatch({ type: "apply-coupon", code: "SHOPLITE10" });
      const fetchMock = mockApi();
      render(<CheckoutForm />);

      expect(await screen.findByTestId("discount-amount")).toHaveTextContent(/45\.000/);
      expect(fetchMock).toHaveBeenCalledWith("/api/coupons/SHOPLITE10");
    });

    describe("thông báo khi mã không dùng được", () => {
      const couponCalls = (fetchMock: ReturnType<typeof mockApi>) =>
        fetchMock.mock.calls.filter(([url]) => url.startsWith("/api/coupons/")).length;

      async function applyCode(user: ReturnType<typeof userEvent.setup>, code: string) {
        await user.type(screen.getByLabelText("Mã giảm giá"), code);
        await user.click(screen.getByRole("button", { name: "Áp dụng" }));
      }

      it("mã không tồn tại: báo lỗi và không lưu mã", async () => {
        mockApi();
        const user = userEvent.setup();
        render(<CheckoutForm />);

        await applyCode(user, "KHONGCO");

        expect(await screen.findByRole("alert")).toHaveTextContent("Mã giảm giá không tồn tại");
        expect(cartStore.getSnapshot().couponCode).toBeUndefined();
        expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
      });

      it("lỗi mạng: báo không kiểm tra được mã", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
        const user = userEvent.setup();
        render(<CheckoutForm />);

        await applyCode(user, "SHOPLITE10");

        expect(await screen.findByRole("alert")).toHaveTextContent(
          "Không kiểm tra được mã giảm giá, vui lòng thử lại.",
        );
        expect(cartStore.getSnapshot().couponCode).toBeUndefined();
      });

      it("mã hết hạn: giữ mã, báo lỗi, không giảm tiền và khóa nút đặt hàng", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-03-01T00:00:00+07:00"));
        try {
          mockApi();
          const user = userEvent.setup();
          render(<CheckoutForm />);

          await applyCode(user, "TET2026");

          expect(await screen.findByTestId("coupon-error")).toHaveTextContent(
            "Mã giảm giá đã hết hạn",
          );
          expect(cartStore.getSnapshot().couponCode).toBe("TET2026");
          expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
          expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();
        } finally {
          vi.useRealTimers();
        }
      });

      it("giảm giỏ dưới mức tối thiểu thì mã báo lỗi, đủ lại thì tự có hiệu lực", async () => {
        // 4 × 150.000đ = 600.000đ
        cartStore.dispatch({
          type: "update-quantity",
          productId: "p010",
          quantity: 4,
        });
        const fetchMock = mockApi();
        const user = userEvent.setup();
        render(<CheckoutForm />);

        await applyCode(user, "GIAM50K");
        expect(await screen.findByTestId("discount-amount")).toHaveTextContent(/50\.000/);

        act(() => {
          cartStore.dispatch({
            type: "update-quantity",
            productId: "p010",
            quantity: 3,
          });
        });
        expect(screen.getByTestId("coupon-error")).toHaveTextContent(
          /^Mua thêm 50\.000.* để sử dụng mã GIAM50K$/,
        );
        expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();

        act(() => {
          cartStore.dispatch({
            type: "update-quantity",
            productId: "p010",
            quantity: 4,
          });
        });
        expect(screen.getByTestId("discount-amount")).toHaveTextContent(/50\.000/);
        expect(screen.queryByTestId("coupon-error")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
        expect(couponCalls(fetchMock)).toBe(1);
      });

      it("server từ chối mã khi đặt hàng: lỗi hiện tại ô mã, giữ mã và khóa nút", async () => {
        const message = "Mã giảm giá đã hết hạn";
        mockApi(
          {
            error: {
              code: "INVALID_COUPON",
              message,
              details: { couponCode: message, reason: "expired" },
            },
          },
          422,
        );
        const user = userEvent.setup();
        render(<CheckoutForm />);

        await applyCode(user, "SHOPLITE10");
        await screen.findByTestId("discount-amount");
        await fillCustomer(user);
        await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

        expect(await screen.findByTestId("coupon-error")).toHaveTextContent(message);
        expect(screen.getAllByRole("alert")).toHaveLength(1);
        expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();
        expect(cartStore.getSnapshot().couponCode).toBe("SHOPLITE10");
        expect(push).not.toHaveBeenCalled();
      });
    });

    describe("gỡ hoặc thay mã", () => {
      const removeButton = (code: string) =>
        screen.getByRole("button", { name: `Gỡ mã giảm giá ${code}` });

      it("gỡ mã thì tổng tiền về như chưa giảm", async () => {
        mockApi();
        const user = userEvent.setup();
        render(<CheckoutForm />);

        await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
        await user.click(screen.getByRole("button", { name: "Áp dụng" }));
        await screen.findByTestId("discount-amount");

        await user.click(removeButton("SHOPLITE10"));

        expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
        // 450.000 + 30.000
        expect(screen.getByTestId("checkout-total")).toHaveTextContent(/480\.000/);
        expect(cartStore.getSnapshot().couponCode).toBeUndefined();
        expect(screen.getByLabelText("Mã giảm giá")).toBeVisible();
      });

      it("gỡ mã bị server từ chối thì hết lỗi và đặt hàng lại được", async () => {
        const message = "Mã giảm giá đã hết hạn";
        mockApi(
          {
            error: {
              code: "INVALID_COUPON",
              message,
              details: { couponCode: message, reason: "expired" },
            },
          },
          422,
        );
        const user = userEvent.setup();
        render(<CheckoutForm />);

        await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
        await user.click(screen.getByRole("button", { name: "Áp dụng" }));
        await screen.findByTestId("discount-amount");
        await fillCustomer(user);
        await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
        await screen.findByTestId("coupon-error");

        await user.click(removeButton("SHOPLITE10"));

        expect(screen.queryByTestId("coupon-error")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
      });

      it("gỡ mã cũ rồi áp dụng mã khác: chỉ còn một dòng giảm giá", async () => {
        // 4 × 150.000đ = 600.000đ
        cartStore.dispatch({
          type: "update-quantity",
          productId: "p010",
          quantity: 4,
        });
        mockApi();
        const user = userEvent.setup();
        render(<CheckoutForm />);

        await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
        await user.click(screen.getByRole("button", { name: "Áp dụng" }));
        await screen.findByText("Giảm giá (SHOPLITE10)");
        await user.click(removeButton("SHOPLITE10"));
        await user.type(screen.getByLabelText("Mã giảm giá"), "GIAM50K");
        await user.click(screen.getByRole("button", { name: "Áp dụng" }));

        expect(await screen.findByText("Giảm giá (GIAM50K)")).toBeVisible();
        expect(screen.getAllByTestId("discount-amount")).toHaveLength(1);
        expect(screen.queryByText("Giảm giá (SHOPLITE10)")).not.toBeInTheDocument();
      });
    });
  });
});

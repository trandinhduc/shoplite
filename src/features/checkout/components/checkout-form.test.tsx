import { render, screen } from "@testing-library/react";
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

  describe("mã giảm giá", () => {
    // Giỏ trong beforeEach: Cáp USB-C 150.000 ₫ × 2 = 300.000 ₫ (đúng mức tối thiểu của SHOPLITE10)
    const PREVIEW_SHOPLITE10 = {
      coupon: {
        code: "SHOPLITE10",
        type: "percent",
        percent: 10,
        maxDiscount: 100_000,
        minOrderValue: 300_000,
      },
      subtotal: 300_000,
      discount: 30_000,
    };

    it("có ô nhập mã giảm giá trong cột tóm tắt, chưa áp mã thì chưa có dòng giảm giá", () => {
      render(<CheckoutForm />);
      expect(screen.getByLabelText("Mã giảm giá")).toBeVisible();
      expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
    });

    it("áp dụng mã: tóm tắt hiện dòng giảm giá và tổng đã trừ giảm giá", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify(PREVIEW_SHOPLITE10), { status: 200 })),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await user.type(screen.getByLabelText("Mã giảm giá"), " shoplite10 ");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));

      expect(await screen.findByText("Giảm giá (SHOPLITE10)")).toBeVisible();
      expect(screen.getByTestId("discount-amount")).toHaveTextContent(/−30\.000/);
      // 300.000 - 30.000 + 30.000 (giao hàng tiêu chuẩn, tạm tính < 500.000)
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/300\.000/);
    });

    it("đổi phương thức giao hàng sau khi áp mã: giảm giá giữ nguyên, phí giao hàng đổi", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify(PREVIEW_SHOPLITE10), { status: 200 })),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));
      await screen.findByTestId("discount-amount");
      await user.click(screen.getByText("Giao hàng nhanh"));

      expect(screen.getByTestId("discount-amount")).toHaveTextContent(/−30\.000/);
      expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/60\.000/);
      // 300.000 - 30.000 + 60.000
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
    });

    it("bấm 'Áp dụng' không gửi form thanh toán", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(PREVIEW_SHOPLITE10), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));
      await screen.findByTestId("discount-amount");

      // Chỉ có 1 lần gọi (validate); không có lần gọi POST /api/orders, cũng không có lỗi validate form.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/coupons/validate");
      expect(screen.queryByTestId("error-fullName")).not.toBeInTheDocument();
    });
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
});

describe("<CheckoutForm /> - đặt hàng với mã giảm giá", () => {
  const PREVIEW_SHOPLITE10 = {
    coupon: {
      code: "SHOPLITE10",
      type: "percent",
      percent: 10,
      maxDiscount: 100_000,
      minOrderValue: 300_000,
    },
    subtotal: 300_000,
    discount: 30_000,
  };

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  /** Stub fetch: /api/coupons/validate trả preview, các URL khác trả `orderResponse()`. */
  function stubFetch(orderResponse: () => Response) {
    const fetchMock = vi.fn<typeof fetch>((input) =>
      Promise.resolve(
        input === "/api/coupons/validate" ? json(PREVIEW_SHOPLITE10) : orderResponse(),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  const ordersCall = (fetchMock: ReturnType<typeof stubFetch>) =>
    fetchMock.mock.calls.find(([url]) => url === "/api/orders")!;

  async function fillAndApplyCoupon(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
    await screen.findByTestId("discount-amount");
  }

  async function fillCustomerAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
  }

  beforeEach(() => {
    cartStore.reset();
    cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p010")!), quantity: 2 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("gửi couponCode trong payload khi đã áp mã", async () => {
    const fetchMock = stubFetch(() => json({ id: "SL-1" }, 201));
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await fillAndApplyCoupon(user);
    await fillCustomerAndSubmit(user);

    const [, init] = ordersCall(fetchMock);
    expect(JSON.parse(init!.body as string)).toMatchObject({ couponCode: "SHOPLITE10" });
  });

  it("không gửi couponCode khi chưa áp mã", async () => {
    const fetchMock = stubFetch(() => json({ id: "SL-1" }, 201));
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await fillCustomerAndSubmit(user);

    const [, init] = ordersCall(fetchMock);
    expect(JSON.parse(init!.body as string)).not.toHaveProperty("couponCode");
  });

  it("đặt hàng thành công: xóa giỏ hàng cùng mã giảm giá và chuyển trang", async () => {
    stubFetch(() => json({ id: "SL-1" }, 201));
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await fillAndApplyCoupon(user);
    await fillCustomerAndSubmit(user);

    expect(push).toHaveBeenCalledWith("/orders/SL-1?placed=1");
    expect(cartStore.getSnapshot().items).toEqual([]);
    expect(cartStore.getSnapshot().couponCode).toBeUndefined();
  });

  it("mã hết hạn lúc đặt: chuyển trang kèm couponExpired để trang đơn hàng báo cho khách", async () => {
    stubFetch(() =>
      json({ id: "SL-1", couponNotice: { code: "COUPON_EXPIRED", couponCode: "TET2026" } }, 201),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await fillAndApplyCoupon(user);
    await fillCustomerAndSubmit(user);

    expect(push).toHaveBeenCalledWith("/orders/SL-1?placed=1&couponExpired=TET2026");
  });

  it("bị từ chối vì mã (422): ở lại trang, hiện lý do, gỡ mã khỏi giỏ và hiện lại ô nhập", async () => {
    stubFetch(() =>
      json(
        {
          error: {
            code: "COUPON_MIN_ORDER_NOT_MET",
            message: "Đơn hàng cần tối thiểu 300.000 ₫ để dùng mã SHOPLITE10. Bạn cần mua thêm 1 ₫",
          },
        },
        422,
      ),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await fillAndApplyCoupon(user);
    await fillCustomerAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Bạn cần mua thêm 1 ₫");
    expect(push).not.toHaveBeenCalled();
    expect(cartStore.getSnapshot().couponCode).toBeUndefined();
    expect(cartStore.getSnapshot().items).toHaveLength(1);
    expect(screen.getByLabelText("Mã giảm giá")).toBeVisible();
    expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
  });

  it("lỗi không liên quan tới mã (hết hàng): giữ nguyên mã đã áp", async () => {
    stubFetch(() =>
      json({ error: { code: "INSUFFICIENT_STOCK", message: "Sản phẩm đã hết hàng" } }, 409),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await fillAndApplyCoupon(user);
    await fillCustomerAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm đã hết hàng");
    expect(cartStore.getSnapshot().couponCode).toBe("SHOPLITE10");
    expect(screen.getByTestId("discount-amount")).toBeVisible();
  });
});

describe("<CheckoutForm /> - kiểm tra lại mã đã lưu trong giỏ", () => {
  const PREVIEW_SHOPLITE10 = {
    coupon: {
      code: "SHOPLITE10",
      type: "percent",
      percent: 10,
      maxDiscount: 100_000,
      minOrderValue: 300_000,
    },
    subtotal: 300_000,
    discount: 30_000,
  };

  beforeEach(() => {
    cartStore.reset();
    // Giỏ 300.000 ₫ đã lưu sẵn mã SHOPLITE10 (ví dụ khách quay lại từ trang giỏ hàng).
    cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p010")!), quantity: 2 });
    cartStore.dispatch({ type: "apply-coupon", code: "SHOPLITE10" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("trong lúc kiểm tra lại: nút Đặt hàng bị vô hiệu hóa và tóm tắt hiện giá chưa giảm", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );
    render(<CheckoutForm />);

    expect(await screen.findByText("Đang kiểm tra lại mã SHOPLITE10…")).toBeVisible();
    expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();
    expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);

    resolveFetch(new Response(JSON.stringify(PREVIEW_SHOPLITE10), { status: 200 }));

    expect(await screen.findByTestId("discount-amount")).toHaveTextContent(/−30\.000/);
    expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
  });

  it("mã không còn hợp lệ: gỡ mã, bật lại nút Đặt hàng và tóm tắt về giá gốc", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "COUPON_EXPIRED", message: 'Mã giảm giá "SHOPLITE10" đã hết hạn' },
          }),
          { status: 422 },
        ),
      ),
    );
    render(<CheckoutForm />);

    expect(await screen.findByRole("status")).toHaveTextContent("Mã SHOPLITE10 đã được gỡ");
    expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
    expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
    expect(cartStore.getSnapshot().couponCode).toBeUndefined();
  });

  it("không gửi mã khi chưa kiểm tra xong: payload không có couponCode sau khi mã bị gỡ", async () => {
    const fetchMock = vi.fn<typeof fetch>((input) =>
      Promise.resolve(
        input === "/api/coupons/validate"
          ? new Response(
              JSON.stringify({ error: { code: "COUPON_EXPIRED", message: "Mã đã hết hạn" } }),
              { status: 422 },
            )
          : new Response(JSON.stringify({ id: "SL-1" }), { status: 201 }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);
    await screen.findByRole("status");

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    const orderCall = fetchMock.mock.calls.find(([url]) => url === "/api/orders")!;
    expect(JSON.parse(orderCall[1]!.body as string)).not.toHaveProperty("couponCode");
  });
});

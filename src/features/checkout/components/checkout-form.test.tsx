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

  it("áp dụng mã hợp lệ, hiển thị giảm giá và gửi mã khi đặt hàng (không gửi số tiền)", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === "/api/coupons/validate"
        ? new Response(
            JSON.stringify({
              coupon: {
                code: "SHOPLITE10",
                type: "percentage",
                value: 10,
                maxDiscount: 100_000,
                minSubtotal: 300_000,
              },
              subtotal: 300_000,
              discount: 30_000,
            }),
            { status: 200 },
          )
        : new Response(JSON.stringify({ id: "SL-20261108-ABC123" }), {
            status: 201,
          }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    // Giỏ: Cáp USB-C 150.000đ × 2 = 300.000đ, phí ship tiêu chuẩn 30.000đ
    await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    const discountRow = await screen.findByTestId("checkout-discount");
    expect(discountRow).toHaveTextContent("Giảm giá (SHOPLITE10)");
    expect(discountRow).toHaveTextContent(/−30\.000/);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/300\.000/);

    const [validateUrl, validateInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(validateUrl).toBe("/api/coupons/validate");
    expect(JSON.parse(validateInit.body as string)).toEqual({
      code: "shoplite10",
      items: [{ productId: "p010", quantity: 2 }],
    });

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    const [orderUrl, orderInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(orderUrl).toBe("/api/orders");
    const orderBody = JSON.parse(orderInit.body as string);
    expect(orderBody.couponCode).toBe("SHOPLITE10");
    for (const moneyKey of ["discount", "subtotal", "shippingFee", "total"]) {
      expect(orderBody).not.toHaveProperty(moneyKey);
    }
    expect(push).toHaveBeenCalledWith("/orders/SL-20261108-ABC123?placed=1");
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
});

describe("<CheckoutForm /> - mã giảm giá không hợp lệ", () => {
  const SHOPLITE10 = {
    code: "SHOPLITE10",
    type: "percentage",
    value: 10,
    maxDiscount: 100_000,
    minSubtotal: 300_000,
  };
  const GIAM50K = {
    code: "GIAM50K",
    type: "fixed",
    value: 50_000,
    minSubtotal: 500_000,
  };

  const ok = (coupon: object, subtotal: number, discount: number) =>
    new Response(JSON.stringify({ coupon, subtotal, discount }), {
      status: 200,
    });
  const apiError = (status: number, code: string, message: string, details?: object) =>
    new Response(JSON.stringify({ error: { code, message, details } }), {
      status,
    });

  async function applyCode(user: ReturnType<typeof userEvent.setup>, code: string) {
    const input = screen.getByLabelText("Mã giảm giá");
    await user.clear(input);
    await user.type(input, code);
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
  }

  beforeEach(() => {
    cartStore.reset();
    // Cáp USB-C 150.000đ × 2 = 300.000đ
    cartStore.dispatch({
      type: "add",
      item: toCartItem(getProductById("p010")!),
      quantity: 2,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hiển thị lý do lỗi từ server, tổng tiền không đổi", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(apiError(422, "COUPON_NOT_FOUND", "Mã giảm giá không tồn tại")),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCode(user, "KHONGCO");

    expect(await screen.findByRole("alert")).toHaveTextContent("Mã giảm giá không tồn tại");
    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
  });

  it("lỗi định dạng từ server → hiển thị lỗi của trường code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        apiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", {
          code: "Mã giảm giá tối đa 32 ký tự",
        }),
      ),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCode(user, "ABC");

    expect(await screen.findByRole("alert")).toHaveTextContent("Mã giảm giá tối đa 32 ký tự");
  });

  it("áp mã mới thất bại thì giữ nguyên mã cũ", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(ok(SHOPLITE10, 300_000, 30_000))
        .mockResolvedValueOnce(
          apiError(422, "COUPON_MIN_SUBTOTAL_NOT_MET", "Đơn hàng chưa đạt giá trị tối thiểu"),
        ),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCode(user, "SHOPLITE10");
    await screen.findByTestId("checkout-discount");
    await applyCode(user, "GIAM50K");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Đơn hàng chưa đạt giá trị tối thiểu",
    );
    expect(screen.getByTestId("applied-coupon")).toHaveTextContent("SHOPLITE10");
    expect(screen.getByTestId("checkout-discount")).toHaveTextContent(/−30\.000/);
  });

  it("lỗi mạng → báo không kiểm tra được mã", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCode(user, "SHOPLITE10");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không kiểm tra được mã, vui lòng thử lại.",
    );
    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeEnabled();
  });

  it("giỏ hàng giảm dưới mức tối thiểu → mã báo lỗi; mua thêm đủ → tự có hiệu lực lại", async () => {
    // Giỏ 150.000đ × 4 = 600.000đ
    cartStore.dispatch({
      type: "update-quantity",
      productId: "p010",
      quantity: 4,
    });
    const fetchMock = vi.fn().mockResolvedValue(ok(GIAM50K, 600_000, 50_000));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCode(user, "GIAM50K");
    expect(await screen.findByTestId("checkout-discount")).toHaveTextContent(/−50\.000/);

    // Giảm còn 450.000đ (vd. sửa giỏ ở tab khác)
    act(() =>
      cartStore.dispatch({
        type: "update-quantity",
        productId: "p010",
        quantity: 3,
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/cần mua thêm 50\.000/);
    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
    expect(screen.getByTestId("applied-coupon")).toHaveTextContent("GIAM50K");

    // Tăng lại 600.000đ
    act(() =>
      cartStore.dispatch({
        type: "update-quantity",
        productId: "p010",
        quantity: 4,
      }),
    );
    expect(await screen.findByTestId("checkout-discount")).toHaveTextContent(/−50\.000/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("<CheckoutForm /> - đặt hàng bị từ chối vì mã", () => {
  const SHOPLITE10 = {
    code: "SHOPLITE10",
    type: "percentage",
    value: 10,
    maxDiscount: 100_000,
    minSubtotal: 300_000,
  };

  beforeEach(() => {
    cartStore.reset();
    // Cáp USB-C 150.000đ × 2 = 300.000đ
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

  it("mã hết hạn lúc đặt hàng → giữ mã ở trạng thái lỗi, không xóa giỏ; đặt lại vẫn gửi mã", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === "/api/coupons/validate"
        ? new Response(
            JSON.stringify({
              coupon: SHOPLITE10,
              subtotal: 300_000,
              discount: 30_000,
            }),
            { status: 200 },
          )
        : new Response(
            JSON.stringify({
              error: {
                code: "COUPON_EXPIRED",
                message: "Mã giảm giá đã hết hạn",
              },
            }),
            { status: 422 },
          ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
    await screen.findByTestId("checkout-discount");

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByTestId("coupon-message")).toHaveTextContent("Mã giảm giá đã hết hạn");
    expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("applied-coupon")).toHaveTextContent("SHOPLITE10");
    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
    expect(cartStore.getSnapshot().items).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();

    // Khách chưa gỡ mã mà bấm đặt hàng lần nữa → vẫn gửi mã (hệ thống không tự bỏ mã)
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
    const orderCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/orders");
    expect(orderCalls).toHaveLength(2);
    const secondBody = JSON.parse(
      (orderCalls[1] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(secondBody.couponCode).toBe("SHOPLITE10");
  });
});

describe("<CheckoutForm /> - gỡ và thay mã", () => {
  const SHOPLITE10 = {
    code: "SHOPLITE10",
    type: "percentage",
    value: 10,
    maxDiscount: 100_000,
    minSubtotal: 300_000,
  };
  const GIAM50K = {
    code: "GIAM50K",
    type: "fixed",
    value: 50_000,
    minSubtotal: 500_000,
  };
  const ok = (coupon: object, subtotal: number, discount: number) =>
    new Response(JSON.stringify({ coupon, subtotal, discount }), {
      status: 200,
    });
  const created = () => new Response(JSON.stringify({ id: "SL-20261108-ABC123" }), { status: 201 });

  async function applyCode(user: ReturnType<typeof userEvent.setup>, code: string) {
    await user.type(screen.getByLabelText("Mã giảm giá"), code);
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
  }

  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
  }

  function orderBodies(fetchMock: ReturnType<typeof vi.fn>) {
    return fetchMock.mock.calls
      .filter(([url]) => url === "/api/orders")
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));
  }

  beforeEach(() => {
    cartStore.reset();
    // Cáp USB-C 150.000đ × 2 = 300.000đ
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

  it("gỡ mã → tổng về như chưa giảm, đặt hàng không gửi mã", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok(SHOPLITE10, 300_000, 30_000))
      .mockResolvedValueOnce(created());
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCode(user, "SHOPLITE10");
    await screen.findByTestId("checkout-discount");
    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));

    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
    expect(screen.queryByTestId("applied-coupon")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);

    await fillAndSubmit(user);
    expect(orderBodies(fetchMock)[0]).not.toHaveProperty("couponCode");
  });

  it("áp mã khác thành công → thay hẳn mã cũ", async () => {
    // Giỏ 150.000đ × 4 = 600.000đ
    cartStore.dispatch({
      type: "update-quantity",
      productId: "p010",
      quantity: 4,
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(ok(SHOPLITE10, 600_000, 60_000))
        .mockResolvedValueOnce(ok(GIAM50K, 600_000, 50_000)),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCode(user, "SHOPLITE10");
    expect(await screen.findByTestId("checkout-discount")).toHaveTextContent(/−60\.000/);
    await applyCode(user, "GIAM50K");

    expect(await screen.findByTestId("checkout-discount")).toHaveTextContent("GIAM50K");
    expect(screen.getByTestId("checkout-discount")).toHaveTextContent(/−50\.000/);
    expect(screen.getByTestId("applied-coupon")).not.toHaveTextContent("SHOPLITE10");
  });

  it("mã bị khóa lỗi vì hết hạn → gỡ mã rồi đặt lại thành công, không gửi mã", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok(SHOPLITE10, 300_000, 30_000))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "COUPON_EXPIRED",
              message: "Mã giảm giá đã hết hạn",
            },
          }),
          { status: 422 },
        ),
      )
      .mockResolvedValueOnce(created());
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCode(user, "SHOPLITE10");
    await screen.findByTestId("checkout-discount");
    await fillAndSubmit(user);
    expect(await screen.findByTestId("coupon-message")).toHaveTextContent("đã hết hạn");

    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));
    expect(screen.queryByTestId("coupon-message")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    const bodies = orderBodies(fetchMock);
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).not.toHaveProperty("couponCode");
    expect(push).toHaveBeenCalledWith("/orders/SL-20261108-ABC123?placed=1");
  });
});

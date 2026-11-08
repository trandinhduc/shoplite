import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import type { CouponDefinition } from "@/features/coupons/types";
import { formatCurrency } from "@/lib/format";
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
});

// ---------------------------------------------------------------------------
// Mã giảm giá (US1)
// ---------------------------------------------------------------------------

const SHOPLITE10: CouponDefinition = {
  code: "SHOPLITE10",
  type: "percent",
  value: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};
const GIAM50K: CouponDefinition = {
  code: "GIAM50K",
  type: "fixed",
  value: 50_000,
  minSubtotal: 500_000,
};

/** Dựng lại giỏ hàng: [productId, quantity][]. */
function setCart(lines: [string, number][]) {
  cartStore.reset();
  for (const [productId, quantity] of lines) {
    cartStore.dispatch({
      type: "add",
      item: toCartItem(getProductById(productId)!),
      quantity,
    });
  }
}

/** fetch giả: phân nhánh theo URL, mỗi lần gọi tạo Response mới. */
function stubApi({ coupon }: { coupon: CouponDefinition }) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/coupons/validate") {
      return new Response(JSON.stringify({ coupon }), { status: 200 });
    }
    if (url === "/api/orders") {
      return new Response(JSON.stringify({ id: "SL-20261108-C0FFEE" }), {
        status: 201,
      });
    }
    throw new Error(`URL không mong đợi: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function applyCoupon(user: ReturnType<typeof userEvent.setup>, code: string) {
  await user.type(screen.getByLabelText("Mã giảm giá"), code);
  await user.click(screen.getByRole("button", { name: "Áp dụng" }));
}

async function fillCustomer(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
  await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
  await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
}

describe("<CheckoutForm /> - áp mã giảm giá hợp lệ", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("áp SHOPLITE10 với tạm tính 400.000đ: giảm 40.000đ, ship 30.000đ, tổng 390.000đ", async () => {
    setCart([
      ["p010", 1],
      ["p007", 1],
    ]);
    const fetchMock = stubApi({ coupon: SHOPLITE10 });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "shoplite10");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/coupons/validate");
    expect(JSON.parse(init.body as string)).toEqual({ code: "shoplite10" });

    const discountRow = await screen.findByTestId("checkout-discount");
    expect(discountRow).toHaveTextContent("Giảm giá (SHOPLITE10)");
    expect(discountRow).toHaveTextContent(/40\.000/);
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/30\.000/);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/390\.000/);
  });

  it("áp SHOPLITE10 với tạm tính 1.540.000đ chỉ giảm mức tối đa 100.000đ", async () => {
    setCart([
      ["p001", 1],
      ["p007", 1],
    ]);
    stubApi({ coupon: SHOPLITE10 });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "SHOPLITE10");

    expect(await screen.findByTestId("checkout-discount")).toHaveTextContent(/100\.000/);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/1\.440\.000/);
  });

  it("áp GIAM50K với tạm tính 550.000đ: còn đúng 500.000đ nên vẫn miễn phí ship", async () => {
    setCart([
      ["p010", 2],
      ["p007", 1],
    ]);
    stubApi({ coupon: GIAM50K });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "GIAM50K");

    expect(await screen.findByTestId("checkout-discount")).toHaveTextContent(/50\.000/);
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent("Miễn phí");
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/500\.000/);
  });

  it("thẻ giao hàng tiêu chuẩn tính phí theo tạm tính sau giảm, khớp với tóm tắt", async () => {
    // 550.000đ − 10% = 495.000đ < 500.000đ → mất miễn phí ship
    setCart([
      ["p010", 2],
      ["p007", 1],
    ]);
    stubApi({ coupon: SHOPLITE10 });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    expect(screen.getByText(/3–5 ngày làm việc/)).toHaveTextContent("Miễn phí");
    await applyCoupon(user, "SHOPLITE10");
    await screen.findByTestId("checkout-discount");

    expect(screen.getByText(/3–5 ngày làm việc/)).toHaveTextContent(/30\.000/);
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/30\.000/);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/525\.000/);
  });

  it("đặt hàng chỉ gửi couponCode, không gửi số tiền, rồi chuyển tới trang đơn", async () => {
    setCart([
      ["p010", 1],
      ["p007", 1],
    ]);
    const fetchMock = stubApi({ coupon: SHOPLITE10 });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "shoplite10");
    await screen.findByTestId("checkout-discount");
    await fillCustomer(user);
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    const orderCall = fetchMock.mock.calls.find(([url]) => url === "/api/orders") as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(orderCall[1].body as string);
    expect(body.couponCode).toBe("SHOPLITE10");
    expect(body).not.toHaveProperty("discount");
    expect(body).not.toHaveProperty("total");
    expect(body).not.toHaveProperty("subtotal");
    expect(push).toHaveBeenCalledWith("/orders/SL-20261108-C0FFEE?placed=1");
  });
});

// ---------------------------------------------------------------------------
// Thông báo lý do mã không hợp lệ (US2)
// ---------------------------------------------------------------------------

type Handler = (body: unknown) => Response | Promise<Response>;

/** fetch giả theo URL với handler tùy biến; mỗi lần gọi tạo Response mới. */
function stubRoutes(routes: { validate?: Handler; orders?: Handler }) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    if (url === "/api/coupons/validate" && routes.validate) return routes.validate(body);
    if (url === "/api/orders" && routes.orders) return routes.orders(body);
    throw new Error(`URL không mong đợi: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const okCoupon = (coupon: CouponDefinition) => () =>
  new Response(JSON.stringify({ coupon }), { status: 200 });

const apiError =
  (status: number, code: string, message: string, details?: Record<string, string>) => () =>
    new Response(JSON.stringify({ error: { code, message, details } }), {
      status,
    });

describe("<CheckoutForm /> - lỗi khi áp mã", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("mã không tồn tại: báo lỗi, không có giảm giá, tổng tiền không đổi", async () => {
    setCart([
      ["p010", 1],
      ["p007", 1],
    ]);
    stubRoutes({
      validate: apiError(422, "COUPON_NOT_FOUND", "Mã giảm giá không tồn tại", {
        couponCode: "KHONGCO",
      }),
    });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "KHONGCO");

    expect(await screen.findByRole("alert")).toHaveTextContent("Mã giảm giá không tồn tại");
    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/430\.000/);
  });

  it("mã hết hạn: báo Mã giảm giá đã hết hạn", async () => {
    setCart([["p001", 1]]);
    stubRoutes({
      validate: apiError(422, "COUPON_EXPIRED", "Mã giảm giá đã hết hạn", {
        couponCode: "TET2026",
      }),
    });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "TET2026");

    expect(await screen.findByRole("alert")).toHaveTextContent("Mã giảm giá đã hết hạn");
    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
  });

  it("chưa đạt ngưỡng: báo số tiền cần mua thêm và không lưu mã", async () => {
    setCart([["p006", 1]]); // 450.000đ
    stubRoutes({ validate: okCoupon(GIAM50K) });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "GIAM50K");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500_000)}. Mua thêm ${formatCurrency(50_000)} để dùng mã này.`,
    );
    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gỡ mã" })).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/480\.000/);
  });

  it("tạm tính đúng bằng ngưỡng 500.000đ thì áp dụng được", async () => {
    setCart([["p007", 2]]);
    stubRoutes({ validate: okCoupon(GIAM50K) });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "GIAM50K");

    expect(await screen.findByTestId("checkout-discount")).toHaveTextContent(/50\.000/);
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/30\.000/);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/480\.000/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["", "   "])("ô mã trống (%j): yêu cầu nhập mã và không gọi API", async (code) => {
    setCart([["p001", 1]]);
    const fetchMock = stubRoutes({});
    const user = userEvent.setup();
    render(<CheckoutForm />);

    if (code) await user.type(screen.getByLabelText("Mã giảm giá"), code);
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Vui lòng nhập mã giảm giá");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lỗi mạng: báo lỗi chung và nút Áp dụng dùng lại được", async () => {
    setCart([["p001", 1]]);
    stubRoutes({
      validate: () => {
        throw new TypeError("Failed to fetch");
      },
    });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "SHOPLITE10");

    expect(await screen.findByRole("alert")).toHaveTextContent(/Không kiểm tra được mã giảm giá/);
    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// Server từ chối mã khi đặt hàng (US5)
// ---------------------------------------------------------------------------

describe("<CheckoutForm /> - server từ chối mã khi đặt hàng", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  async function applyAndSubmit(orders: Handler) {
    setCart([
      ["p010", 1],
      ["p007", 1],
    ]);
    const fetchMock = stubRoutes({ validate: okCoupon(SHOPLITE10), orders });
    const user = userEvent.setup();
    render(<CheckoutForm />);
    await applyCoupon(user, "SHOPLITE10");
    await screen.findByTestId("checkout-discount");
    await fillCustomer(user);
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
    return { fetchMock, user };
  }

  it("COUPON_EXPIRED: hiện lỗi cạnh ô mã, giữ mã, không chuyển trang, không xóa giỏ", async () => {
    await applyAndSubmit(
      apiError(422, "COUPON_EXPIRED", "Mã giảm giá đã hết hạn", {
        couponCode: "SHOPLITE10",
      }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Mã giảm giá đã hết hạn");
    expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("aria-describedby", alert.id);
    const discountRow = screen.getByTestId("checkout-discount");
    expect(discountRow).toHaveTextContent("SHOPLITE10");
    expect(discountRow).toHaveTextContent(/40\.000/);
    expect(push).not.toHaveBeenCalled();
    expect(cartStore.getSnapshot().items).toHaveLength(2);
  });

  it("COUPON_MIN_SUBTOTAL_NOT_MET: hiện đúng thông báo server trả về cạnh ô mã", async () => {
    const message = `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(300_000)}. Mua thêm ${formatCurrency(1)} để dùng mã này.`;
    await applyAndSubmit(apiError(422, "COUPON_MIN_SUBTOTAL_NOT_MET", message));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(message);
    expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("lỗi không phải COUPON_* vẫn hiện ở thông báo chung, không gắn vào ô mã", async () => {
    await applyAndSubmit(apiError(409, "INSUFFICIENT_STOCK", "Sản phẩm đã hết hàng"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm đã hết hàng");
    expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("aria-invalid", "false");
    expect(push).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Gỡ mã, đổi mã, tạm ngưng, giữ mã trong phiên (US3, FR-023)
// ---------------------------------------------------------------------------

const COUPON_SESSION_KEY = "shoplite:coupon";

/** validate trả định nghĩa theo mã gửi lên; mã lạ → 422 COUPON_NOT_FOUND. */
const validateBy = (known: CouponDefinition[]) => (body: unknown) => {
  const code = String((body as { code: string }).code)
    .trim()
    .toUpperCase();
  const coupon = known.find((item) => item.code === code);
  return coupon
    ? new Response(JSON.stringify({ coupon }), { status: 200 })
    : apiError(422, "COUPON_NOT_FOUND", "Mã giảm giá không tồn tại", {
        couponCode: code,
      })();
};

const created = () => new Response(JSON.stringify({ id: "SL-20261108-ABCDEF" }), { status: 201 });

async function replaceCoupon(user: ReturnType<typeof userEvent.setup>, code: string) {
  await user.clear(screen.getByLabelText("Mã giảm giá"));
  await applyCoupon(user, code);
}

const ordersCalls = (fetchMock: ReturnType<typeof stubRoutes>) =>
  fetchMock.mock.calls
    .filter(([url]) => url === "/api/orders")
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));

const validateCalls = (fetchMock: ReturnType<typeof stubRoutes>) =>
  fetchMock.mock.calls
    .filter(([url]) => url === "/api/coupons/validate")
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));

describe("<CheckoutForm /> - gỡ mã, đổi mã và tạm ngưng", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("(a) gỡ mã thì tổng về giá gốc và đặt hàng không gửi couponCode", async () => {
    setCart([
      ["p010", 1],
      ["p007", 1],
    ]);
    const fetchMock = stubRoutes({
      validate: validateBy([SHOPLITE10]),
      orders: created,
    });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "SHOPLITE10");
    await screen.findByTestId("checkout-discount");
    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));

    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/430\.000/);

    await fillCustomer(user);
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalled());
    expect(ordersCalls(fetchMock)[0]).not.toHaveProperty("couponCode");
  });

  it("(b) áp thành công mã mới thì thay mã cũ, chỉ một mã được tính", async () => {
    setCart([
      ["p006", 1],
      ["p010", 1],
    ]); // 600.000đ
    const fetchMock = stubRoutes({
      validate: validateBy([SHOPLITE10, GIAM50K]),
      orders: created,
    });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "SHOPLITE10");
    expect(await screen.findByTestId("checkout-discount")).toHaveTextContent(/60\.000/);
    await replaceCoupon(user, "GIAM50K");

    await vi.waitFor(() =>
      expect(screen.getByTestId("checkout-discount")).toHaveTextContent("Giảm giá (GIAM50K)"),
    );
    expect(screen.getAllByTestId("checkout-discount")).toHaveLength(1);
    expect(screen.getByTestId("checkout-discount")).toHaveTextContent(/50\.000/);

    await fillCustomer(user);
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalled());
    expect(ordersCalls(fetchMock)[0].couponCode).toBe("GIAM50K");
  });

  it("(c) áp mã mới thất bại thì giữ nguyên mã cũ", async () => {
    setCart([
      ["p010", 1],
      ["p007", 1],
    ]);
    stubRoutes({ validate: validateBy([SHOPLITE10]) });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "SHOPLITE10");
    await screen.findByTestId("checkout-discount");
    await replaceCoupon(user, "KHONGCO");

    expect(await screen.findByRole("alert")).toHaveTextContent("Mã giảm giá không tồn tại");
    const row = screen.getByTestId("checkout-discount");
    expect(row).toHaveTextContent("SHOPLITE10");
    expect(row).toHaveTextContent(/40\.000/);
  });

  it("(d)(e) giỏ tụt dưới ngưỡng thì mã tạm ngưng, đủ ngưỡng lại thì tự có hiệu lực", async () => {
    setCart([
      ["p006", 1],
      ["p010", 1],
    ]);
    stubRoutes({ validate: validateBy([GIAM50K]) });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "GIAM50K");
    await screen.findByTestId("checkout-discount");

    act(() => cartStore.dispatch({ type: "remove", productId: "p010" })); // còn 450.000đ
    expect(screen.getByText(/Đã áp dụng/)).toHaveTextContent("GIAM50K");
    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
    expect(screen.getByRole("alert").textContent).toBe(
      `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500_000)}. Mua thêm ${formatCurrency(50_000)} để dùng mã này.`,
    );
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/480\.000/);

    act(() =>
      cartStore.dispatch({
        type: "add",
        item: toCartItem(getProductById("p010")!),
        quantity: 1,
      }),
    );
    expect(screen.getByTestId("checkout-discount")).toHaveTextContent(/50\.000/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("(f) đặt hàng khi mã đang tạm ngưng thì bị chặn ở client", async () => {
    setCart([
      ["p006", 1],
      ["p010", 1],
    ]);
    const fetchMock = stubRoutes({
      validate: validateBy([GIAM50K]),
      orders: created,
    });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "GIAM50K");
    await screen.findByTestId("checkout-discount");
    act(() => cartStore.dispatch({ type: "remove", productId: "p010" }));

    await fillCustomer(user);
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(ordersCalls(fetchMock)).toHaveLength(0);
    expect(screen.getByRole("alert")).toHaveTextContent(/Mua thêm/);
    expect(screen.getByText(/Đã áp dụng/)).toHaveTextContent("GIAM50K");
  });

  it("(g) sau lỗi server COUPON_EXPIRED, gỡ mã rồi đặt lại thì đơn được tạo với giá gốc", async () => {
    setCart([
      ["p010", 1],
      ["p007", 1],
    ]);
    let orderAttempts = 0;
    const fetchMock = stubRoutes({
      validate: validateBy([SHOPLITE10]),
      orders: () =>
        ++orderAttempts === 1
          ? apiError(422, "COUPON_EXPIRED", "Mã giảm giá đã hết hạn", {
              couponCode: "SHOPLITE10",
            })()
          : created(),
    });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "SHOPLITE10");
    await screen.findByTestId("checkout-discount");
    await fillCustomer(user);
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Mã giảm giá đã hết hạn");

    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith("/orders/SL-20261108-ABCDEF?placed=1"),
    );
    const [first, second] = ordersCalls(fetchMock);
    expect(first.couponCode).toBe("SHOPLITE10");
    expect(second).not.toHaveProperty("couponCode");
  });
});

describe("<CheckoutForm /> - giữ mã trong phiên (FR-023)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("(h) quay lại trang thanh toán sau khi giảm giỏ: mã được kiểm tra lại và ở trạng thái tạm ngưng", async () => {
    setCart([
      ["p006", 1],
      ["p010", 1],
    ]);
    const fetchMock = stubRoutes({ validate: validateBy([GIAM50K]) });
    const user = userEvent.setup();
    const { unmount } = render(<CheckoutForm />);

    await applyCoupon(user, "GIAM50K");
    await screen.findByTestId("checkout-discount");
    expect(window.sessionStorage.getItem(COUPON_SESSION_KEY)).toBe("GIAM50K");

    unmount();
    act(() => cartStore.dispatch({ type: "remove", productId: "p010" })); // 450.000đ
    render(<CheckoutForm />);

    await vi.waitFor(() => expect(validateCalls(fetchMock)).toHaveLength(2));
    expect(validateCalls(fetchMock)[1]).toEqual({ code: "GIAM50K" });
    expect(await screen.findByText(/Đã áp dụng/)).toHaveTextContent("GIAM50K");
    expect(screen.getByRole("alert")).toHaveTextContent(/Mua thêm/);
    expect(screen.getByRole("alert")).toHaveTextContent(/50\.000/);
    expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
  });

  it("(i) mã đã lưu không còn hợp lệ thì bị bỏ kèm thông báo lý do", async () => {
    setCart([["p001", 1]]);
    window.sessionStorage.setItem(COUPON_SESSION_KEY, "KHONGCO");
    stubRoutes({ validate: validateBy([]) });
    render(<CheckoutForm />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Mã giảm giá không tồn tại");
    expect(screen.queryByText(/Đã áp dụng/)).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(COUPON_SESSION_KEY)).toBeNull();
  });

  it("(j) gỡ mã hoặc đặt hàng thành công thì xóa mã khỏi phiên", async () => {
    setCart([
      ["p010", 1],
      ["p007", 1],
    ]);
    stubRoutes({ validate: validateBy([SHOPLITE10]), orders: created });
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await applyCoupon(user, "SHOPLITE10");
    await screen.findByTestId("checkout-discount");
    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));
    expect(window.sessionStorage.getItem(COUPON_SESSION_KEY)).toBeNull();

    await replaceCoupon(user, "SHOPLITE10");
    await screen.findByTestId("checkout-discount");
    expect(window.sessionStorage.getItem(COUPON_SESSION_KEY)).toBe("SHOPLITE10");
    await fillCustomer(user);
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalled());
    expect(window.sessionStorage.getItem(COUPON_SESSION_KEY)).toBeNull();
  });
});

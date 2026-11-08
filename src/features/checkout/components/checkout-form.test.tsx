import { act, render, screen } from "@testing-library/react";
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

  describe("mã giảm giá", () => {
    const SHOPLITE10 = {
      code: "SHOPLITE10",
      type: "percent",
      percent: 10,
      maxDiscount: 100_000,
      minSubtotal: 300_000,
    };
    const GIAM50K = { code: "GIAM50K", type: "fixed", amount: 50_000, minSubtotal: 500_000 };

    beforeEach(() => {
      // Giỏ 2 × Chuột không dây SwiftClick (450.000đ) = 900.000đ, miễn phí giao hàng.
      // reset() chỉ đọc lại localStorage, nên xóa giỏ p010 của beforeEach bên ngoài trước.
      localStorage.clear();
      cartStore.reset();
      cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p006")!), quantity: 2 });
    });

    function mockApi() {
      return vi.fn((url: string) =>
        Promise.resolve(
          url === "/api/coupons/validate"
            ? new Response(JSON.stringify({ coupon: SHOPLITE10 }), { status: 200 })
            : new Response(JSON.stringify({ id: "SL-20261108-ABC123" }), { status: 201 }),
        ),
      );
    }

    it("áp dụng mã hợp lệ thì hiện số tiền giảm và tổng mới", async () => {
      vi.stubGlobal("fetch", mockApi());
      const user = userEvent.setup();
      render(<CheckoutForm />);

      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/900\.000/);
      await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));

      expect(await screen.findByTestId("checkout-discount")).toHaveTextContent(/-90\.000\s₫/);
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/810\.000/);
    });

    it("gửi couponCode khi đặt hàng, không gửi số tiền", async () => {
      const fetchMock = mockApi();
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));
      await screen.findByTestId("checkout-discount");

      await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
      await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
      await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

      const orderCall = fetchMock.mock.calls.find(([url]) => url === "/api/orders");
      expect(orderCall).toBeDefined();
      const body = JSON.parse((orderCall as unknown as [string, RequestInit])[1].body as string);
      expect(body.couponCode).toBe("SHOPLITE10");
      expect(body).not.toHaveProperty("discount");
      expect(body).not.toHaveProperty("total");
      expect(push).toHaveBeenCalledWith("/orders/SL-20261108-ABC123?placed=1");
    });

    /** Mock API: validate trả về rule theo mã đã nhập; đặt hàng luôn thành công. */
    function mockApiWith(rules: Record<string, object>) {
      return vi.fn((url: string, init?: RequestInit) => {
        if (url === "/api/coupons/validate") {
          const code = String(JSON.parse(String(init?.body)).code)
            .trim()
            .toUpperCase();
          return Promise.resolve(
            new Response(JSON.stringify({ coupon: rules[code] }), { status: 200 }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ id: "SL-20261108-ABC123" }), { status: 201 }),
        );
      });
    }

    async function applyCode(user: ReturnType<typeof userEvent.setup>, code: string) {
      await user.type(screen.getByLabelText("Mã giảm giá"), code);
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));
    }

    function setMiceQuantity(quantity: number) {
      act(() => {
        cartStore.dispatch({ type: "update-quantity", productId: "p006", quantity });
      });
    }

    it("gỡ mã thì dòng giảm giá biến mất và tổng về ban đầu", async () => {
      vi.stubGlobal("fetch", mockApiWith({ SHOPLITE10 }));
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await applyCode(user, "SHOPLITE10");
      await screen.findByTestId("checkout-discount");
      await user.click(screen.getByRole("button", { name: "Gỡ mã" }));

      expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/900\.000/);
    });

    it("áp dụng mã mới thì thay mã cũ, chỉ còn một mã", async () => {
      vi.stubGlobal("fetch", mockApiWith({ SHOPLITE10, GIAM50K }));
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await applyCode(user, "SHOPLITE10");
      await screen.findByText("Giảm giá (SHOPLITE10)");
      await applyCode(user, "GIAM50K");

      expect(await screen.findByText("Giảm giá (GIAM50K)")).toBeVisible();
      expect(screen.queryByText("Giảm giá (SHOPLITE10)")).not.toBeInTheDocument();
      expect(screen.getByTestId("checkout-discount")).toHaveTextContent(/-50\.000\s₫/);
    });

    it("giỏ giảm dưới tối thiểu thì giữ mã ở trạng thái chờ, đủ lại thì tự giảm", async () => {
      const fetchMock = mockApiWith({ GIAM50K });
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await applyCode(user, "GIAM50K");
      await screen.findByTestId("checkout-discount");

      setMiceQuantity(1);
      expect(screen.getByRole("status")).toHaveTextContent(
        /Mã GIAM50K chưa đủ điều kiện, cần mua thêm 50\.000\s₫/,
      );
      expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();

      setMiceQuantity(2);
      expect(screen.getByTestId("checkout-discount")).toHaveTextContent(/-50\.000\s₫/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("chặn đặt hàng khi mã đang chưa đủ điều kiện", async () => {
      const fetchMock = mockApiWith({ GIAM50K });
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await applyCode(user, "GIAM50K");
      await screen.findByTestId("checkout-discount");
      setMiceQuantity(1);

      await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
      await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
      await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

      expect(fetchMock.mock.calls.some(([url]) => url === "/api/orders")).toBe(false);
      expect(screen.getByTestId("error-couponCode")).toHaveTextContent(/mua thêm 50\.000\s₫/);
      expect(screen.getByTestId("error-couponCode")).toHaveTextContent(/gỡ mã/);

      // Mua đủ lại thì câu báo chặn biến mất và đặt hàng được.
      setMiceQuantity(2);
      expect(screen.queryByTestId("error-couponCode")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
      expect(fetchMock.mock.calls.some(([url]) => url === "/api/orders")).toBe(true);
    });

    it("tính lại số tiền giảm phần trăm khi giỏ thay đổi", async () => {
      localStorage.clear();
      cartStore.reset();
      // Cáp USB-C (p010) 150.000đ × 4 = 600.000đ → SHOPLITE10 giảm 60.000đ
      cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p010")!), quantity: 4 });
      vi.stubGlobal("fetch", mockApiWith({ SHOPLITE10 }));
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await applyCode(user, "SHOPLITE10");
      expect(await screen.findByTestId("checkout-discount")).toHaveTextContent(/-60\.000\s₫/);

      act(() => {
        cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 2 });
      });
      expect(screen.getByTestId("checkout-discount")).toHaveTextContent(/-30\.000\s₫/);
    });

    it("không tự gỡ mã theo giờ máy khách khi mã đã qua hạn (FR-021)", async () => {
      const TET2026 = {
        code: "TET2026",
        type: "percent",
        percent: 15,
        maxDiscount: 200_000,
        expiresAt: "2026-03-01T00:00:00+07:00",
      };
      vi.stubGlobal("fetch", mockApiWith({ TET2026 }));
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await applyCode(user, "TET2026");
      expect(await screen.findByTestId("checkout-discount")).toHaveTextContent(/-135\.000\s₫/);

      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2027-01-01T00:00:00+07:00"));
      setMiceQuantity(3);
      vi.useRealTimers();

      expect(screen.getByTestId("checkout-discount")).toHaveTextContent(/-200\.000\s₫/);
    });

    it("không áp dụng GIAM50K khi giỏ chưa đạt 500.000đ và giữ nguyên tổng tiền", async () => {
      localStorage.clear();
      cartStore.reset();
      cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p006")!), quantity: 1 });
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify({ coupon: GIAM50K }), { status: 200 })),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      const totalBefore = screen.getByTestId("checkout-total").textContent;

      await user.type(screen.getByLabelText("Mã giảm giá"), "GIAM50K");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));

      expect(await screen.findByTestId("error-couponCode")).toHaveTextContent(
        /cần mua thêm 50\.000\s₫/,
      );
      expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
      expect(screen.getByTestId("checkout-total").textContent).toBe(totalBefore);
    });

    it("server từ chối mã lúc đặt hàng thì gỡ mã, báo lỗi ở ô mã và giữ thông tin đã nhập", async () => {
      const message = 'Mã giảm giá "SHOPLITE10" đã hết hạn';
      const fetchMock = vi.fn((url: string) =>
        Promise.resolve(
          url === "/api/coupons/validate"
            ? new Response(JSON.stringify({ coupon: SHOPLITE10 }), { status: 200 })
            : new Response(
                JSON.stringify({
                  error: { code: "COUPON_EXPIRED", message, details: { couponCode: message } },
                }),
                { status: 422 },
              ),
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

      expect(await screen.findByTestId("error-couponCode")).toHaveTextContent(message);
      expect(screen.queryByTestId("checkout-discount")).not.toBeInTheDocument();
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/900\.000/);
      expect(screen.getByLabelText(/Họ và tên/)).toHaveValue("Nguyễn Văn A");
      expect(screen.getByLabelText(/Số điện thoại/)).toHaveValue("0912345678");
      expect(screen.getByLabelText(/Địa chỉ giao hàng/)).toHaveValue(
        "12 Nguyễn Huệ, Quận 1, TP.HCM",
      );
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
      expect(push).not.toHaveBeenCalled();
    });
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

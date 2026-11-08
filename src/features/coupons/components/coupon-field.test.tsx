import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { getProductById } from "@/features/catalog/catalog-service";
import type { CouponPreview } from "../types";
import { CouponField } from "./coupon-field";

const PREVIEW_SHOPLITE10: CouponPreview = {
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

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("<CouponField />", () => {
  beforeEach(() => {
    cartStore.reset();
    // Cáp USB-C 150.000 ₫ × 2 = 300.000 ₫
    cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p010")!), quantity: 2 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("có ô nhập gắn nhãn 'Mã giảm giá' và nút 'Áp dụng'", () => {
    render(<CouponField />);
    expect(screen.getByLabelText("Mã giảm giá")).toBeVisible();
    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeEnabled();
  });

  it("gửi mã đã chuẩn hóa cùng danh sách sản phẩm tới /api/coupons/validate", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PREVIEW_SHOPLITE10));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CouponField />);

    await user.type(screen.getByLabelText("Mã giảm giá"), " shoplite10 ");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/coupons/validate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      code: "SHOPLITE10",
      items: [{ productId: "p010", quantity: 2 }],
    });
  });

  it("trong lúc kiểm tra: nút bị vô hiệu hóa và hiện 'Đang kiểm tra…'", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );
    const user = userEvent.setup();
    render(<CouponField />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(screen.getByRole("button", { name: "Đang kiểm tra…" })).toBeDisabled();
    resolveFetch(jsonResponse(PREVIEW_SHOPLITE10));
    expect(await screen.findByText("Đã áp dụng mã SHOPLITE10")).toBeVisible();
  });

  it("áp dụng thành công: hiện mã đã áp dụng, ẩn ô nhập, gọi onApplied và lưu mã vào giỏ", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PREVIEW_SHOPLITE10)));
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponField onApplied={onApplied} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByText("Đã áp dụng mã SHOPLITE10")).toBeVisible();
    expect(screen.queryByLabelText("Mã giảm giá")).not.toBeInTheDocument();
    expect(onApplied).toHaveBeenCalledWith(PREVIEW_SHOPLITE10);
    expect(cartStore.getSnapshot().couponCode).toBe("SHOPLITE10");
  });

  it("nhấn Enter trong ô mã áp dụng mã và KHÔNG gửi form cha", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PREVIEW_SHOPLITE10));
    vi.stubGlobal("fetch", fetchMock);
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <CouponField />
      </form>,
    );

    await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10{Enter}");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("bấm 'Áp dụng' không gửi form cha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PREVIEW_SHOPLITE10)));
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <CouponField />
      </form>,
    );

    await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("<CouponField /> - thông báo lỗi", () => {
  const apiError = (code: string, message: string) =>
    jsonResponse({ error: { code, message } }, 422);

  beforeEach(() => {
    cartStore.reset();
    cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p010")!), quantity: 2 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["COUPON_NOT_FOUND", 'Mã giảm giá "ABC123" không tồn tại'],
    ["COUPON_EXPIRED", 'Mã giảm giá "TET2026" đã hết hạn'],
    [
      "COUPON_MIN_ORDER_NOT_MET",
      "Đơn hàng cần tối thiểu 300.000 ₫ để dùng mã SHOPLITE10. Bạn cần mua thêm 50.000 ₫",
    ],
  ])("lỗi %s: hiện nguyên văn thông báo của server trong role=alert", async (code, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiError(code, message)));
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponField onApplied={onApplied} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "ABC123");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(onApplied).not.toHaveBeenCalled();
    expect(cartStore.getSnapshot().couponCode).toBeUndefined();
    expect(screen.getByLabelText("Mã giảm giá")).toBeVisible();
    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeEnabled();
  });

  it("gắn lỗi với ô nhập bằng aria-invalid và aria-describedby", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(apiError("COUPON_NOT_FOUND", 'Mã giảm giá "X" không tồn tại')),
    );
    const user = userEvent.setup();
    render(<CouponField />);
    const input = screen.getByLabelText("Mã giảm giá");
    expect(input).not.toHaveAttribute("aria-invalid", "true");

    await user.type(input, "X");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    const alert = await screen.findByRole("alert");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
    expect(alert.id).not.toBe("");
  });

  it("ô trống: nhắc nhập mã và không gọi fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CouponField />);

    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Vui lòng nhập mã giảm giá");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ô chỉ có khoảng trắng cũng được coi là trống", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CouponField />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "   ");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Vui lòng nhập mã giảm giá");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mất mạng: báo không kết nối được máy chủ", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = userEvent.setup();
    render(<CouponField />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không kết nối được máy chủ, vui lòng thử lại.",
    );
    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeEnabled();
  });

  it("server trả lỗi không có nội dung JSON: dùng thông báo mặc định", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500 })));
    const user = userEvent.setup();
    render(<CouponField />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể kiểm tra mã giảm giá, vui lòng thử lại.",
    );
  });

  it("gõ lại vào ô nhập thì xóa lỗi", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(apiError("COUPON_NOT_FOUND", 'Mã giảm giá "X" không tồn tại')),
    );
    const user = userEvent.setup();
    render(<CouponField />);
    const input = screen.getByLabelText("Mã giảm giá");

    await user.type(input, "X");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
    await screen.findByRole("alert");
    await user.type(input, "Y");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid", "true");
  });

  it("sau lỗi vẫn áp dụng được mã đúng", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(apiError("COUPON_NOT_FOUND", 'Mã giảm giá "X" không tồn tại'))
        .mockResolvedValueOnce(jsonResponse(PREVIEW_SHOPLITE10)),
    );
    const user = userEvent.setup();
    render(<CouponField />);
    const input = screen.getByLabelText("Mã giảm giá");

    await user.type(input, "X");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
    await screen.findByRole("alert");
    await user.clear(input);
    await user.type(input, "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByText("Đã áp dụng mã SHOPLITE10")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("<CouponField /> - gỡ mã, giữ mã và kiểm tra lại", () => {
  const MIN_ORDER_MESSAGE =
    "Đơn hàng cần tối thiểu 300.000 ₫ để dùng mã SHOPLITE10. Bạn cần mua thêm 150.000 ₫";
  const apiError = (code: string, message: string) =>
    jsonResponse({ error: { code, message } }, 422);

  /** Phản hồi chưa trả về, để test kiểm soát thời điểm server trả lời. */
  function deferred() {
    let resolve!: (response: Response) => void;
    const promise = new Promise<Response>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

  beforeEach(() => {
    cartStore.reset();
    // Cáp USB-C 150.000 ₫ × 2 = 300.000 ₫, và đã lưu sẵn mã SHOPLITE10 trong giỏ.
    cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p010")!), quantity: 2 });
    cartStore.dispatch({ type: "apply-coupon", code: "SHOPLITE10" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("không có mã trong giỏ thì không gọi server khi hiển thị", async () => {
    cartStore.dispatch({ type: "remove-coupon" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<CouponField />);
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Mã giảm giá")).toBeVisible();
  });

  it("mã đã lưu trong giỏ được kiểm tra lại với server khi hiển thị", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PREVIEW_SHOPLITE10));
    vi.stubGlobal("fetch", fetchMock);
    const onApplied = vi.fn();
    render(<CouponField onApplied={onApplied} />);

    expect(await screen.findByText("Đã áp dụng mã SHOPLITE10")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      code: "SHOPLITE10",
      items: [{ productId: "p010", quantity: 2 }],
    });
    expect(onApplied).toHaveBeenCalledWith(PREVIEW_SHOPLITE10);
    expect(cartStore.getSnapshot().couponCode).toBe("SHOPLITE10");
  });

  it("trong lúc kiểm tra lại: báo đang kiểm tra, ẩn ô nhập, rồi báo xong", async () => {
    const pending = deferred();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending.promise));
    const onRevalidatingChange = vi.fn();
    render(<CouponField onRevalidatingChange={onRevalidatingChange} />);

    expect(await screen.findByText("Đang kiểm tra lại mã SHOPLITE10…")).toBeVisible();
    expect(screen.queryByLabelText("Mã giảm giá")).not.toBeInTheDocument();
    expect(onRevalidatingChange).toHaveBeenLastCalledWith(true);

    pending.resolve(jsonResponse(PREVIEW_SHOPLITE10));
    expect(await screen.findByText("Đã áp dụng mã SHOPLITE10")).toBeVisible();
    expect(onRevalidatingChange).toHaveBeenLastCalledWith(false);
  });

  it("nút Gỡ mã bỏ mã khỏi giỏ và hiện lại ô nhập để trống", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PREVIEW_SHOPLITE10)));
    const user = userEvent.setup();
    render(<CouponField />);
    await screen.findByText("Đã áp dụng mã SHOPLITE10");

    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));

    expect(cartStore.getSnapshot().couponCode).toBeUndefined();
    expect(screen.queryByText("Đã áp dụng mã SHOPLITE10")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Mã giảm giá")).toHaveValue("");
    expect(cartStore.getSnapshot().items).toHaveLength(1);
  });

  it("mã không còn hợp lệ khi kiểm tra lại: gỡ hẳn mã, báo lý do và để ô nhập trống", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(apiError("COUPON_MIN_ORDER_NOT_MET", MIN_ORDER_MESSAGE)),
    );
    render(<CouponField />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      `Mã SHOPLITE10 đã được gỡ: ${MIN_ORDER_MESSAGE}`,
    );
    expect(cartStore.getSnapshot().couponCode).toBeUndefined();
    expect(screen.getByLabelText("Mã giảm giá")).toHaveValue("");
  });

  it("giỏ đổi và tạm tính xuống dưới mức tối thiểu: gỡ mã kèm số tiền cần mua thêm", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(PREVIEW_SHOPLITE10))
      .mockResolvedValueOnce(apiError("COUPON_MIN_ORDER_NOT_MET", MIN_ORDER_MESSAGE));
    vi.stubGlobal("fetch", fetchMock);
    render(<CouponField />);
    await screen.findByText("Đã áp dụng mã SHOPLITE10");

    act(() => {
      cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 1 });
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Bạn cần mua thêm 150.000 ₫");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).items).toEqual([
      { productId: "p010", quantity: 1 },
    ]);
    expect(cartStore.getSnapshot().couponCode).toBeUndefined();
  });

  it("sau khi mã bị gỡ, giỏ đạt lại mức tối thiểu thì KHÔNG tự áp dụng lại", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(apiError("COUPON_MIN_ORDER_NOT_MET", MIN_ORDER_MESSAGE));
    vi.stubGlobal("fetch", fetchMock);
    render(<CouponField />);
    await screen.findByRole("status");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 4 });
    });
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cartStore.getSnapshot().couponCode).toBeUndefined();
    expect(screen.getByLabelText("Mã giảm giá")).toBeVisible();
  });

  it("phản hồi cũ về muộn sau khi giỏ đã đổi thì bị bỏ qua", async () => {
    const first = deferred();
    const second = deferred();
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<CouponField />);
    await screen.findByText("Đang kiểm tra lại mã SHOPLITE10…");

    act(() => {
      cartStore.dispatch({ type: "update-quantity", productId: "p010", quantity: 3 });
    });
    second.resolve(jsonResponse({ ...PREVIEW_SHOPLITE10, subtotal: 450_000, discount: 45_000 }));
    expect(await screen.findByText("Đã áp dụng mã SHOPLITE10")).toBeVisible();

    // Phản hồi của lần kiểm tra đầu (giỏ cũ) về muộn và báo lỗi: phải bị bỏ qua.
    first.resolve(apiError("COUPON_MIN_ORDER_NOT_MET", MIN_ORDER_MESSAGE));
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cartStore.getSnapshot().couponCode).toBe("SHOPLITE10");
    expect(screen.getByText("Đã áp dụng mã SHOPLITE10")).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("mất mạng khi kiểm tra lại: gỡ mã và báo để khách nhập lại", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<CouponField />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Mã SHOPLITE10 đã được gỡ: Không kết nối được máy chủ để kiểm tra lại mã, vui lòng nhập lại.",
    );
    expect(cartStore.getSnapshot().couponCode).toBeUndefined();
  });

  it("gõ vào ô nhập thì xóa thông báo mã đã bị gỡ", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(apiError("COUPON_MIN_ORDER_NOT_MET", MIN_ORDER_MESSAGE)),
    );
    const user = userEvent.setup();
    render(<CouponField />);
    await screen.findByRole("status");

    await user.type(screen.getByLabelText("Mã giảm giá"), "G");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("đồng bộ giữa các tab: mã bị gỡ ở tab khác thì hiện lại ô nhập", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PREVIEW_SHOPLITE10)));
    render(<CouponField />);
    await screen.findByText("Đã áp dụng mã SHOPLITE10");

    act(() => {
      cartStore.dispatch({ type: "remove-coupon" });
    });

    expect(screen.getByLabelText("Mã giảm giá")).toBeVisible();
  });
});

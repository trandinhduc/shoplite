import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/features/orders/types";
import { formatCurrency } from "@/lib/format";

const getOrder = vi.fn<(id: string) => Promise<Order>>();

// Trang đọc orderService trực tiếp (Server Component) - thay bằng bản giả.
vi.mock("@/features/orders/server", () => ({ orderService: { getOrder } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { default: OrderDetailPage } = await import("./page");

const baseOrder: Order = {
  id: "SL-20261108-ABCDEF",
  status: "pending",
  createdAt: "2026-11-08T03:00:00.000Z",
  updatedAt: "2026-11-08T03:00:00.000Z",
  customer: {
    fullName: "Lê Văn C",
    phone: "0901234567",
    address: "1 Trần Phú, Hà Đông, Hà Nội",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [
    {
      productId: "p006",
      slug: "chuot-khong-day-swiftclick",
      name: "Chuột không dây SwiftClick",
      image: { emoji: "🖱️", from: "#e0e7ff", to: "#c7d2fe" },
      unitPrice: 450_000,
      quantity: 1,
      lineTotal: 450_000,
    },
    {
      productId: "p010",
      slug: "cap-usb-c-ben-du-2m",
      name: "Cáp USB-C bền dù 2m",
      image: { emoji: "🔌", from: "#fef3c7", to: "#fde68a" },
      unitPrice: 150_000,
      quantity: 1,
      lineTotal: 150_000,
    },
  ],
  subtotal: 600_000,
  shippingFee: 0,
  total: 600_000,
};

async function renderPage(order: Order) {
  getOrder.mockResolvedValue(order);
  render(
    await OrderDetailPage({
      params: Promise.resolve({ id: order.id }),
      searchParams: Promise.resolve({}),
    }),
  );
}

const totalValue = () => screen.getByText("Tổng cộng").nextElementSibling;

describe("Trang chi tiết đơn hàng - giảm giá", () => {
  beforeEach(() => {
    getOrder.mockReset();
  });

  it("hiện mã và số tiền giảm của đơn dùng mã, tổng tiền đã trừ giảm giá", async () => {
    await renderPage({
      ...baseOrder,
      discount: 50_000,
      coupon: { code: "GIAM50K", discount: 50_000 },
      total: 550_000,
    });

    const row = screen.getByTestId("order-discount");
    expect(row).toHaveTextContent("Giảm giá (GIAM50K)");
    expect(row).toHaveTextContent(`−${formatCurrency(50_000)}`.replace(/\s/g, " "));
    expect(totalValue()).toHaveTextContent(/550\.000/);
  });

  it("đơn không dùng mã không hiện dòng giảm giá", async () => {
    await renderPage({ ...baseOrder, discount: 0 });
    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
    expect(totalValue()).toHaveTextContent(/600\.000/);
  });

  it("đơn cũ không có trường discount/coupon vẫn hiển thị bình thường", async () => {
    await renderPage(baseOrder);
    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
    expect(screen.getByText("Tạm tính").nextElementSibling).toHaveTextContent(/600\.000/);
  });

  it("dòng giảm giá nằm giữa Tạm tính và Phí giao hàng", async () => {
    await renderPage({
      ...baseOrder,
      discount: 50_000,
      coupon: { code: "GIAM50K", discount: 50_000 },
      total: 550_000,
    });
    const labels = screen.getAllByRole("term").map((term) => term.textContent);
    expect(labels).toEqual(["Tạm tính", "Giảm giá (GIAM50K)", "Phí giao hàng", "Tổng cộng"]);
  });

  it("hiển thị đúng snapshot kể cả khi mã không còn trong danh sách", async () => {
    await renderPage({
      ...baseOrder,
      discount: 77_000,
      coupon: { code: "MADAXOA", discount: 77_000 },
      total: 523_000,
    });
    const row = screen.getByTestId("order-discount");
    expect(row).toHaveTextContent("Giảm giá (MADAXOA)");
    expect(row).toHaveTextContent(/77\.000/);
  });
});

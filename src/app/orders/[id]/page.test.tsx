import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Order } from "@/features/orders/types";
import OrderDetailPage from "./page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  notFound: vi.fn(),
}));

// Mock orderService
const mockGetOrder = vi.fn();
vi.mock("@/features/orders/server", () => ({
  orderService: {
    getOrder: (id: string) => mockGetOrder(id),
  },
}));

const baseOrder: Order = {
  id: "SL-20261021-123456",
  status: "pending",
  createdAt: "2026-10-21T03:00:00.000Z",
  updatedAt: "2026-10-21T03:00:00.000Z",
  customer: {
    fullName: "Nguyễn Văn Test",
    phone: "0912345678",
    address: "123 Test Street",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [
    {
      productId: "p001",
      slug: "tai-nghe-soundmax",
      name: "Tai nghe SoundMax Pro",
      image: { emoji: "🎧", from: "#e0f2fe", to: "#c7d2fe" },
      unitPrice: 1_290_000,
      quantity: 1,
      lineTotal: 1_290_000,
    },
  ],
  subtotal: 1_290_000,
  shippingFee: 0,
  total: 1_190_000,
};

describe("OrderDetailPage Component", () => {
  it("hiển thị dòng giảm giá khi đơn hàng có sử dụng coupon", async () => {
    mockGetOrder.mockResolvedValueOnce({
      ...baseOrder,
      couponCode: "SHOPLITE10",
      discount: 100_000,
    });

    const jsx = await OrderDetailPage({
      params: Promise.resolve({ id: "SL-20261021-123456" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const discountElement = screen.getByTestId("order-discount");
    expect(discountElement).toBeInTheDocument();
    expect(discountElement).toHaveTextContent("Giảm giá (SHOPLITE10)");
    expect(discountElement).toHaveTextContent("-100.000 ₫");
  });

  it("hiển thị bình thường không có dòng giảm giá đối với đơn hàng cũ", async () => {
    mockGetOrder.mockResolvedValueOnce({
      ...baseOrder,
      total: 1_290_000,
      // Đơn hàng cũ không có couponCode hay discount
    });

    const jsx = await OrderDetailPage({
      params: Promise.resolve({ id: "SL-20261021-123456" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
    expect(screen.getAllByText(/1\.290\.000/)[0]).toBeInTheDocument();
  });
});

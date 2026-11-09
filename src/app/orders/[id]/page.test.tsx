import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/features/orders/types";
import { orderService } from "@/features/orders/server";
import OrderDetailPage from "./page";

vi.mock("@/features/orders/server", () => ({
  orderService: { getOrder: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const baseOrder: Order = {
  id: "SL-TEST-1",
  status: "pending",
  createdAt: "2026-10-21T03:00:00.000Z",
  updatedAt: "2026-10-21T03:00:00.000Z",
  customer: {
    fullName: "Nguyễn Văn A",
    phone: "0912345678",
    address: "12 Nguyễn Huệ, Huế",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [],
  subtotal: 900_000,
  shippingFee: 0,
  total: 810_000,
};

describe("OrderDetailPage discount display", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hiển thị mã và số tiền giảm của đơn mới", async () => {
    vi.mocked(orderService.getOrder).mockResolvedValue({
      ...baseOrder,
      discountCode: "SHOPLITE10",
      discountAmount: 90_000,
    });

    render(
      await OrderDetailPage({
        params: Promise.resolve({ id: baseOrder.id }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("Giảm giá (SHOPLITE10)")).toBeVisible();
    expect(screen.getByText(/90\.000/)).toBeVisible();
  });

  it("không hiển thị dòng giảm cho đơn cũ thiếu field discount", async () => {
    vi.mocked(orderService.getOrder).mockResolvedValue(baseOrder);

    render(
      await OrderDetailPage({
        params: Promise.resolve({ id: baseOrder.id }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.queryByText(/Giảm giá/)).not.toBeInTheDocument();
  });
});

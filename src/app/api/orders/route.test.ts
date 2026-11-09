// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

// Thay orderService (ghi file) bằng bản dùng repository trong bộ nhớ.
vi.mock("@/features/orders/server", async () => {
  const { createOrderService } =
    await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } =
    await import("@/features/orders/order-repository");
  return {
    orderService: createOrderService({
      repository: createInMemoryOrderRepository(),
    }),
  };
});

const postOrder = (body: unknown) =>
  POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const validBody = {
  customer: {
    fullName: "Phạm Minh D",
    phone: "0356789012",
    address: "99 Hai Bà Trưng, Huế",
  },
  shippingMethod: "express",
  paymentMethod: "bank_transfer",
  items: [{ productId: "p006", quantity: 1 }],
};

describe("POST /api/orders", () => {
  it("201 - tạo đơn hàng thành công", async () => {
    const response = await postOrder(validBody);
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order).toMatchObject({
      status: "pending",
      subtotal: 450_000,
      shippingFee: 60_000,
    });
  });

  it("201 - server tự tính lại mã và tổng tiền", async () => {
    const response = await postOrder({
      ...validBody,
      shippingMethod: "standard",
      items: [{ productId: "p006", quantity: 2 }],
      couponCode: "shoplite10",
      discountAmount: 1,
      total: 1,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      subtotal: 900_000,
      discountCode: "SHOPLITE10",
      discountAmount: 90_000,
      shippingFee: 0,
      total: 810_000,
    });
  });

  it("422 - từ chối mã không đủ điều kiện khi đặt hàng", async () => {
    const response = await postOrder({ ...validBody, couponCode: "GIAM50K" });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("INVALID_COUPON");
  });

  it("400 - body không phải JSON", async () => {
    const response = await postOrder("{oops");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("400 - dữ liệu không hợp lệ kèm details", async () => {
    const response = await postOrder({
      ...validBody,
      customer: { ...validBody.customer, phone: "1" },
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.details).toHaveProperty(["customer.phone"]);
  });

  it("409 - vượt quá tồn kho", async () => {
    const response = await postOrder({
      ...validBody,
      items: [{ productId: "p004", quantity: 1 }],
    });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INSUFFICIENT_STOCK");
  });
});

describe("GET /api/orders", () => {
  it("trả về các đơn hàng đã tạo", async () => {
    const response = await GET();
    const { orders } = await response.json();
    expect(response.status).toBe(200);
    expect(orders.length).toBeGreaterThan(0);
  });
});

// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

// Thay orderService (ghi file) bằng bản dùng repository trong bộ nhớ.
vi.mock("@/features/orders/server", async () => {
  const { createOrderService } = await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } = await import("@/features/orders/order-repository");
  return { orderService: createOrderService({ repository: createInMemoryOrderRepository() }) };
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
  customer: { fullName: "Phạm Minh D", phone: "0356789012", address: "99 Hai Bà Trưng, Huế" },
  shippingMethod: "express",
  paymentMethod: "bank_transfer",
  items: [{ productId: "p006", quantity: 1 }],
};

describe("POST /api/orders", () => {
  it("201 - tạo đơn hàng thành công", async () => {
    const response = await postOrder(validBody);
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order).toMatchObject({ status: "pending", subtotal: 450_000, shippingFee: 60_000 });
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
    const response = await postOrder({ ...validBody, items: [{ productId: "p004", quantity: 1 }] });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INSUFFICIENT_STOCK");
  });

  it("201 - áp dụng couponCode và server tự tính discount, phớt lờ số tiền client gửi", async () => {
    // p006 có giá 450.000 ₫ >= 300.000 ₫ (đủ minOrderValue của SHOPLITE10)
    // 10% của 450.000 ₫ = 45.000 ₫, phí ship express 60.000 ₫ -> total: 465.000 ₫
    const response = await postOrder({
      ...validBody,
      couponCode: "SHOPLITE10",
      discount: 300_000, // client cố tình gửi khống
      total: 10_000,
    });
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order.couponCode).toBe("SHOPLITE10");
    expect(order.discount).toBe(45_000);
    expect(order.total).toBe(465_000); // (450k - 45k) + 60k
  });

  it("422 - từ chối khi mã giảm giá đã hết hạn sử dụng", async () => {
    const response = await postOrder({
      ...validBody,
      couponCode: "TET2026",
    });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("COUPON_EXPIRED");
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

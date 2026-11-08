// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

// Thay orderService (ghi file) bằng bản dùng repository trong bộ nhớ.
vi.mock("@/features/orders/server", async () => {
  const { createOrderService } = await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } = await import("@/features/orders/order-repository");
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

  it("201 - áp mã SHOPLITE10 và server tự tính giảm giá", async () => {
    const response = await postOrder({
      ...validBody,
      shippingMethod: "standard",
      items: [{ productId: "p001", quantity: 1 }],
      couponCode: "SHOPLITE10",
    });
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order.discount).toBe(100_000);
    expect(order.total).toBe(1_190_000);
    expect(order.coupon.code).toBe("SHOPLITE10");
  });

  it("201 - không có mã thì discount = 0 và không có coupon", async () => {
    const response = await postOrder(validBody);
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order.discount).toBe(0);
    expect(order).not.toHaveProperty("coupon");
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

describe("POST /api/orders - mã giảm giá", () => {
  it("201 - bỏ qua discount/total do client gửi, server tự tính", async () => {
    const response = await postOrder({
      ...validBody,
      shippingMethod: "standard",
      items: [{ productId: "p001", quantity: 1 }],
      couponCode: "SHOPLITE10",
      discount: 999_999,
      total: 1,
    });
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order.discount).toBe(100_000);
    expect(order.total).toBe(1_190_000);
  });

  it("422 - COUPON_NOT_FOUND", async () => {
    const response = await postOrder({ ...validBody, couponCode: "KHONGCO" });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("COUPON_NOT_FOUND");
  });

  it("422 - COUPON_EXPIRED với TET2026", async () => {
    const response = await postOrder({ ...validBody, couponCode: "TET2026" });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("COUPON_EXPIRED");
  });

  it("422 - COUPON_MIN_SUBTOTAL_NOT_MET kèm ngưỡng và số tiền cần mua thêm", async () => {
    const response = await postOrder({
      ...validBody,
      items: [{ productId: "p006", quantity: 1 }],
      couponCode: "GIAM50K",
    });
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_MIN_SUBTOTAL_NOT_MET");
    expect(error.details.shortfall).toBe("50000");
    expect(error.details.minSubtotal).toBe("500000");
  });
});

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
      // Cố định thời điểm để kết quả kiểm tra hạn mã không phụ thuộc ngày chạy test.
      now: () => new Date("2026-11-08T10:00:00+07:00"),
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

  it("201 - áp dụng mã giảm giá, tổng tiền do server tính", async () => {
    // Chuột SwiftClick (p006) 450.000đ, giao nhanh 60.000đ, SHOPLITE10 giảm 45.000đ
    const response = await postOrder({
      ...validBody,
      items: [{ productId: "p006", quantity: 1 }],
      couponCode: "SHOPLITE10",
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      couponCode: "SHOPLITE10",
      subtotal: 450_000,
      discount: 45_000,
      shippingFee: 60_000,
      total: 465_000,
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

  it("409 - vượt quá tồn kho", async () => {
    const response = await postOrder({ ...validBody, items: [{ productId: "p004", quantity: 1 }] });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INSUFFICIENT_STOCK");
  });
});

describe("POST /api/orders - mã giảm giá không hợp lệ", () => {
  async function countOrders() {
    const { orders } = await (await GET()).json();
    return orders.length as number;
  }

  it.each([
    ["TET2026", "COUPON_EXPIRED"],
    ["KHONGCO", "COUPON_NOT_FOUND"],
    ["GIAM50K", "COUPON_MIN_SUBTOTAL_NOT_MET"],
  ])("422 - mã %s → %s, không tạo đơn", async (couponCode, errorCode) => {
    const before = await countOrders();
    const response = await postOrder({ ...validBody, couponCode });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe(errorCode);
    expect(typeof body.error.message).toBe("string");
    expect(await countOrders()).toBe(before);
  });

  it("201 - bỏ qua số tiền do client tự khai", async () => {
    const response = await postOrder({
      ...validBody,
      items: [{ productId: "p006", quantity: 1 }],
      couponCode: "SHOPLITE10",
      discount: 450_000,
      total: 0,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      discount: 45_000,
      total: 465_000,
    });
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

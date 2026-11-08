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
});

describe("POST /api/orders - mã giảm giá", () => {
  const twoMice = {
    ...validBody,
    shippingMethod: "standard",
    items: [{ productId: "p006", quantity: 2 }],
  };

  async function countOrders() {
    const { orders } = await (await GET()).json();
    return orders.length as number;
  }

  it("201 - server tự tính giảm giá và tổng tiền", async () => {
    const response = await postOrder({ ...twoMice, couponCode: "shoplite10" });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      couponCode: "SHOPLITE10",
      subtotal: 900_000,
      discount: 90_000,
      shippingFee: 0,
      total: 810_000,
    });
  });

  it("201 - bỏ qua số tiền giảm và tổng tiền client gửi lên", async () => {
    const response = await postOrder({
      ...twoMice,
      couponCode: "SHOPLITE10",
      discount: 999_999,
      total: 1,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ discount: 90_000, total: 810_000 });
  });

  it.each([
    ["mảng nhiều mã", ["SHOPLITE10", "GIAM50K"]],
    ["số", 123],
    ["null", null],
    ["object", {}],
    ["chuỗi quá 32 ký tự", "A".repeat(33)],
  ])("400 - couponCode là %s và không lưu đơn", async (_label, couponCode) => {
    const before = await countOrders();
    const response = await postOrder({ ...twoMice, couponCode });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(await countOrders()).toBe(before);
  });

  it.each([
    ["KHONGCO", "không tồn tại", twoMice.items, "COUPON_NOT_FOUND"],
    ["TET2026", "đã hết hạn", twoMice.items, "COUPON_EXPIRED"],
    [
      "GIAM50K",
      "chưa đạt tối thiểu",
      [{ productId: "p006", quantity: 1 }],
      "COUPON_MIN_SUBTOTAL_NOT_MET",
    ],
  ])(
    "422 - mã %s %s thì bị từ chối và không lưu đơn",
    async (couponCode, _reason, items, expectedCode) => {
      const before = await countOrders();
      const response = await postOrder({ ...twoMice, items, couponCode });
      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error.code).toBe(expectedCode);
      expect(body.error.details.couponCode).toBe(body.error.message);
      expect(await countOrders()).toBe(before);
    },
  );
});

describe("GET /api/orders", () => {
  it("trả về các đơn hàng đã tạo", async () => {
    const response = await GET();
    const { orders } = await response.json();
    expect(response.status).toBe(200);
    expect(orders.length).toBeGreaterThan(0);
  });
});

// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PATCH } from "./[id]/route";
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
  it("201 - áp dụng SHOPLITE10 và lưu discount do server tính", async () => {
    const response = await postOrder({
      ...validBody,
      couponCode: "shoplite10",
    });
    expect(response.status).toBe(201);
    const order = await response.json();
    // 450.000 - 45.000 (10%) + 60.000 phí giao hàng nhanh
    expect(order).toMatchObject({
      subtotal: 450_000,
      shippingFee: 60_000,
      discount: { code: "SHOPLITE10", amount: 45_000 },
      total: 465_000,
    });
  });

  it("201 - không có couponCode thì response như cũ, không có discount", async () => {
    const response = await postOrder(validBody);
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order).not.toHaveProperty("discount");
    expect(order.total).toBe(510_000);
  });
});

describe("POST /api/orders - lỗi mã giảm giá", () => {
  const countOrders = async () => (await (await GET()).json()).orders.length as number;

  it("422 COUPON_NOT_FOUND khi mã không tồn tại, không tạo đơn", async () => {
    const before = await countOrders();
    const response = await postOrder({ ...validBody, couponCode: "ABC" });

    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error).toMatchObject({
      code: "COUPON_NOT_FOUND",
      message: "Mã giảm giá không tồn tại",
    });
    expect(await countOrders()).toBe(before);
  });

  it("422 COUPON_EXPIRED khi mã đã hết hạn", async () => {
    const response = await postOrder({ ...validBody, couponCode: "TET2026" });

    expect(response.status).toBe(422);
    expect((await response.json()).error).toMatchObject({
      code: "COUPON_EXPIRED",
      message: "Mã giảm giá đã hết hạn",
    });
  });

  it("422 COUPON_MIN_ORDER_NOT_MET kèm details.shortfall", async () => {
    const response = await postOrder({
      ...validBody,
      items: [{ productId: "p010", quantity: 1 }], // 150.000đ, SHOPLITE10 cần 300.000đ
      couponCode: "SHOPLITE10",
    });

    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_MIN_ORDER_NOT_MET");
    expect(error.message).toMatch(/Cần mua thêm 150\.000\s?₫ để dùng mã này/);
    expect(error.details).toEqual({ shortfall: "150000" });
  });

  it.each([["A".repeat(33)], [123], [["SHOPLITE10"]]])(
    "400 VALIDATION_ERROR khi couponCode không hợp lệ (%j)",
    async (couponCode) => {
      const response = await postOrder({ ...validBody, couponCode });

      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("400 khi giỏ rỗng kèm mã, details.items là 'Giỏ hàng đang trống'", async () => {
    const response = await postOrder({
      ...validBody,
      items: [],
      couponCode: "SHOPLITE10",
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.details).toEqual({
      items: "Giỏ hàng đang trống",
    });
  });

  it("bỏ qua discount/total do client tự điền", async () => {
    const response = await postOrder({
      ...validBody,
      couponCode: "SHOPLITE10",
      discount: { code: "SHOPLITE10", amount: 999_999 },
      total: 1,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      discount: { code: "SHOPLITE10", amount: 45_000 },
      total: 465_000,
    });
  });
});

describe("PATCH /api/orders/:id - hủy đơn có mã giảm giá", () => {
  it("không làm đổi discount của đơn", async () => {
    const created = await (await postOrder({ ...validBody, couponCode: "SHOPLITE10" })).json();

    const response = await PATCH(
      new Request(`http://localhost/api/orders/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      }),
      { params: Promise.resolve({ id: created.id }) } as never,
    );

    expect(response.status).toBe(200);
    const cancelled = await response.json();
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.discount).toEqual(created.discount);
    expect(cancelled.total).toBe(created.total);
  });
});

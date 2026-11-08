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

describe("GET /api/orders", () => {
  it("trả về các đơn hàng đã tạo", async () => {
    const response = await GET();
    const { orders } = await response.json();
    expect(response.status).toBe(200);
    expect(orders.length).toBeGreaterThan(0);
  });
});

describe("POST /api/orders - mã giảm giá", () => {
  // p006 giá 450.000 ₫ → 2 sản phẩm = tạm tính 900.000 ₫
  const body = (couponCode: string, quantity = 2) => ({
    ...validBody,
    items: [{ productId: "p006", quantity }],
    couponCode,
  });

  it("201 - áp dụng GIAM50K: lưu mã và số tiền giảm, tổng đã trừ giảm giá", async () => {
    const response = await postOrder(body("giam50k"));
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order).toMatchObject({
      couponCode: "GIAM50K",
      discount: 50_000,
      subtotal: 900_000,
      shippingFee: 60_000,
      total: 910_000,
    });
    expect(order).not.toHaveProperty("couponNotice");
  });

  it("201 - bỏ qua discount và total do client gửi lên", async () => {
    const response = await postOrder({ ...body("GIAM50K"), discount: 999_999, total: 1 });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ discount: 50_000, total: 910_000 });
  });

  it("201 - mã đã hết hạn: đơn theo giá gốc kèm couponNotice", async () => {
    const response = await postOrder(body("TET2026"));
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order).toMatchObject({ discount: 0, total: 960_000 });
    expect(order.couponCode).toBeUndefined();
    expect(order.couponNotice).toEqual({ code: "COUPON_EXPIRED", couponCode: "TET2026" });
  });

  it("422 - mã không tồn tại", async () => {
    const response = await postOrder(body("ABC123"));
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("COUPON_NOT_FOUND");
  });

  it("422 - chưa đạt giá trị đơn tối thiểu, kèm số tiền cần mua thêm", async () => {
    // GIAM50K cần 500.000 ₫, đơn chỉ 450.000 ₫
    const response = await postOrder(body("GIAM50K", 1));
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_MIN_ORDER_NOT_MET");
    expect(error.details).toEqual({ minOrderValue: "500000", missingAmount: "50000" });
  });

  it("400 - mã dài hơn 32 ký tự", async () => {
    const response = await postOrder(body("A".repeat(33)));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});

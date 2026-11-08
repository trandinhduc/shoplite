import { beforeEach, describe, expect, it } from "vitest";
import { SHIPPING_OPTIONS } from "@/features/checkout/pricing";
import { OrderError } from "./order-errors";
import { createInMemoryOrderRepository, type OrderRepository } from "./order-repository";
import { createOrderService, generateOrderId, type OrderService } from "./order-service";

const FIXED_DATE = new Date("2026-10-21T03:00:00.000Z");

const validInput = (overrides: Record<string, unknown> = {}) => ({
  customer: {
    fullName: "Trần Thị B",
    phone: "0987654321",
    email: "",
    address: "45 Lê Lợi, Hải Châu, Đà Nẵng",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p010", quantity: 2 }], // Cáp USB-C 150.000đ
  ...overrides,
});

async function expectOrderError(promise: Promise<unknown>, code: OrderError["code"]) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(OrderError);
  expect((error as OrderError).code).toBe(code);
  return error as OrderError;
}

describe("orderService", () => {
  let repository: OrderRepository;
  let service: OrderService;

  beforeEach(() => {
    repository = createInMemoryOrderRepository();
    let counter = 0;
    service = createOrderService({
      repository,
      now: () => FIXED_DATE,
      generateId: () => `SL-TEST-${++counter}`,
    });
  });

  describe("placeOrder", () => {
    it("tạo đơn hàng với giá lấy từ catalog và lưu vào repository", async () => {
      const order = await service.placeOrder(validInput());

      expect(order).toMatchObject({
        id: "SL-TEST-1",
        status: "pending",
        createdAt: FIXED_DATE.toISOString(),
        subtotal: 300_000,
        shippingFee: SHIPPING_OPTIONS.standard.fee,
        total: 330_000,
      });
      expect(order.items[0]).toMatchObject({
        productId: "p010",
        unitPrice: 150_000,
        lineTotal: 300_000,
      });
      expect(order.customer.email).toBeUndefined();
      expect(await repository.findById(order.id)).toEqual(order);
    });

    it("bỏ qua giá do client gửi lên", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p010", quantity: 1, price: 1 }] }),
      );
      expect(order.items[0].unitPrice).toBe(150_000);
    });

    it("gộp các dòng trùng sản phẩm", async () => {
      const order = await service.placeOrder(
        validInput({
          items: [
            { productId: "p010", quantity: 1 },
            { productId: "p010", quantity: 2 },
          ],
        }),
      );
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(3);
    });

    it("miễn phí giao hàng tiêu chuẩn cho đơn từ 500.000đ", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p001", quantity: 1 }] }),
      );
      expect(order.shippingFee).toBe(0);
    });

    it("trả lỗi VALIDATION_ERROR kèm chi tiết từng field", async () => {
      const error = await expectOrderError(
        service.placeOrder(validInput({ customer: { fullName: "", phone: "123", address: "" } })),
        "VALIDATION_ERROR",
      );
      expect(error.details).toHaveProperty(["customer.phone"]);
      expect(error.httpStatus).toBe(400);
    });

    it("từ chối giỏ hàng trống", async () => {
      await expectOrderError(service.placeOrder(validInput({ items: [] })), "VALIDATION_ERROR");
    });

    it("trả lỗi PRODUCT_NOT_FOUND khi sản phẩm không tồn tại", async () => {
      await expectOrderError(
        service.placeOrder(validInput({ items: [{ productId: "p999", quantity: 1 }] })),
        "PRODUCT_NOT_FOUND",
      );
    });

    it("trả lỗi INSUFFICIENT_STOCK khi vượt tồn kho hoặc hết hàng", async () => {
      // Giá đỡ laptop (p011) chỉ còn 3 sản phẩm, micro (p004) đã hết hàng
      await expectOrderError(
        service.placeOrder(validInput({ items: [{ productId: "p011", quantity: 4 }] })),
        "INSUFFICIENT_STOCK",
      );
      await expectOrderError(
        service.placeOrder(validInput({ items: [{ productId: "p004", quantity: 1 }] })),
        "INSUFFICIENT_STOCK",
      );
    });

    it("tạo đơn hàng với mã giảm giá hợp lệ, server độc lập tính toán lại discount", async () => {
      // 2 x 150.000 = 300.000 ₫, mã SHOPLITE10 giảm 10% (30.000 ₫)
      const order = await service.placeOrder(
        validInput({
          couponCode: "shoplite10", // chữ thường -> server tự chuẩn hóa
          discount: 999_999, // client cố tình gửi sai -> server phớt lờ
          total: 0,
        }),
      );

      expect(order.couponCode).toBe("SHOPLITE10");
      expect(order.discount).toBe(30_000);
      expect(order.subtotal).toBe(300_000);
      expect(order.shippingFee).toBe(30_000);
      expect(order.total).toBe(300_000); // (300k - 30k) + 30k ship
    });

    it("từ chối tạo đơn khi mã giảm giá không tồn tại (COUPON_NOT_FOUND)", async () => {
      await expectOrderError(
        service.placeOrder(validInput({ couponCode: "KHONGTONTAI" })),
        "COUPON_NOT_FOUND",
      );
    });

    it("từ chối tạo đơn khi mã giảm giá đã hết hạn tại thời điểm đặt hàng (COUPON_EXPIRED)", async () => {
      // TET2026 hết hạn 2026-02-28, FIXED_DATE là 2026-10-21
      await expectOrderError(
        service.placeOrder(
          validInput({
            items: [{ productId: "p002", quantity: 1 }], // Loa 690k
            couponCode: "TET2026",
          }),
        ),
        "COUPON_EXPIRED",
      );
    });

    it("từ chối tạo đơn khi đơn chưa đạt giá trị tối thiểu của mã (COUPON_MIN_ORDER_NOT_MET)", async () => {
      // 1 x 150.000 = 150.000 ₫, mã SHOPLITE10 yêu cầu tối thiểu 300.000 ₫
      await expectOrderError(
        service.placeOrder(
          validInput({
            items: [{ productId: "p010", quantity: 1 }],
            couponCode: "SHOPLITE10",
          }),
        ),
        "COUPON_MIN_ORDER_NOT_MET",
      );
    });
  });

  describe("listOrders / getOrder", () => {
    it("liệt kê đơn hàng mới nhất trước", async () => {
      let time = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date((time += 60_000)),
      });
      const first = await timedService.placeOrder(validInput());
      const second = await timedService.placeOrder(validInput());

      const orders = await timedService.listOrders();
      expect(orders.map((order) => order.id)).toEqual([second.id, first.id]);
    });

    it("trả lỗi ORDER_NOT_FOUND với mã đơn không tồn tại", async () => {
      await expectOrderError(service.getOrder("SL-KHONG-CO"), "ORDER_NOT_FOUND");
    });
  });

  describe("cancelOrder", () => {
    it("hủy đơn đang chờ xác nhận", async () => {
      const order = await service.placeOrder(validInput());
      const cancelled = await service.cancelOrder(order.id);
      expect(cancelled.status).toBe("cancelled");
      expect((await service.getOrder(order.id)).status).toBe("cancelled");
    });

    it("không cho hủy đơn đã hủy hoặc đã xác nhận", async () => {
      const order = await service.placeOrder(validInput());
      await repository.save({ ...order, status: "confirmed" });
      await expectOrderError(service.cancelOrder(order.id), "INVALID_STATUS_TRANSITION");
    });
  });
});

describe("generateOrderId", () => {
  it("có dạng SL-YYYYMMDD-XXXXXX", () => {
    expect(generateOrderId(FIXED_DATE)).toMatch(/^SL-20261021-[0-9A-F]{6}$/);
  });
});

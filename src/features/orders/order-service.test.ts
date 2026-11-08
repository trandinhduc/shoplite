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

    it("đơn không dùng mã giảm giá không có trường discount và couponCode", async () => {
      const order = await service.placeOrder(validInput());

      expect(order).not.toHaveProperty("discount");
      expect(order).not.toHaveProperty("couponCode");
      const saved = await repository.findById(order.id);
      expect(saved).not.toHaveProperty("discount");
      expect(saved).not.toHaveProperty("couponCode");
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
  });

  describe("placeOrder với mã giảm giá", () => {
    // Chuột không dây SwiftClick (p006) 450.000đ × 2 = 900.000đ
    const twoMice = { items: [{ productId: "p006", quantity: 2 }] };

    it("server tự tính số tiền giảm và tổng tiền", async () => {
      const order = await service.placeOrder(validInput({ ...twoMice, couponCode: "shoplite10" }));
      expect(order).toMatchObject({
        couponCode: "SHOPLITE10",
        subtotal: 900_000,
        discount: 90_000,
        shippingFee: 0,
        total: 810_000,
      });
      expect(await repository.findById(order.id)).toEqual(order);
    });

    it("không giảm quá mức tối đa của mã phần trăm", async () => {
      // Webcam (p003) 2.450.000đ → 10% = 245.000đ nhưng tối đa 100.000đ
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p003", quantity: 1 }], couponCode: "SHOPLITE10" }),
      );
      expect(order.discount).toBe(100_000);
      expect(order.total).toBe(2_450_000 - 100_000);
    });

    it("bỏ qua số tiền giảm và tổng tiền do client gửi lên", async () => {
      const order = await service.placeOrder(
        validInput({ ...twoMice, couponCode: "SHOPLITE10", discount: 999_999, total: 1 }),
      );
      expect(order.discount).toBe(90_000);
      expect(order.total).toBe(810_000);
    });

    it.each(["", "   "])("coi couponCode %j là không dùng mã", async (couponCode) => {
      const order = await service.placeOrder(validInput({ ...twoMice, couponCode }));
      expect(order).not.toHaveProperty("discount");
      expect(order).not.toHaveProperty("couponCode");
      expect(order.total).toBe(900_000);
    });

    it("dùng findCoupon được truyền vào", async () => {
      const customService = createOrderService({
        repository,
        now: () => FIXED_DATE,
        generateId: () => "SL-TEST-CUSTOM",
        findCoupon: (code) =>
          code === "THU20K" ? { code: "THU20K", type: "fixed", amount: 20_000 } : undefined,
      });
      const order = await customService.placeOrder(validInput({ couponCode: "thu20k" }));
      expect(order).toMatchObject({ couponCode: "THU20K", discount: 20_000 });
    });

    it("từ chối mã không tồn tại và không lưu đơn", async () => {
      await expectOrderError(
        service.placeOrder(validInput({ ...twoMice, couponCode: "KHONGCO" })),
        "COUPON_NOT_FOUND",
      );
      expect(await repository.findAll()).toEqual([]);
    });

    it("từ chối mã đã hết hạn theo đồng hồ server và không lưu đơn", async () => {
      // FIXED_DATE (21/10/2026) đã sau hạn của TET2026
      await expectOrderError(
        service.placeOrder(validInput({ ...twoMice, couponCode: "TET2026" })),
        "COUPON_EXPIRED",
      );
      expect(await repository.findAll()).toEqual([]);
    });

    it("chấp nhận TET2026 khi đồng hồ server còn trong hạn", async () => {
      const beforeExpiry = createOrderService({
        repository,
        now: () => new Date("2026-02-28T23:59:59.999+07:00"),
        generateId: () => "SL-TEST-TET",
      });
      const order = await beforeExpiry.placeOrder(
        validInput({ ...twoMice, couponCode: "TET2026" }),
      );
      expect(order.discount).toBe(135_000);
    });

    it("từ chối khi chưa đạt giá trị tối thiểu và không lưu đơn", async () => {
      const error = await expectOrderError(
        service.placeOrder(
          validInput({ items: [{ productId: "p006", quantity: 1 }], couponCode: "GIAM50K" }),
        ),
        "COUPON_MIN_SUBTOTAL_NOT_MET",
      );
      expect(error.message).toMatch(/50\.000\s₫/);
      expect(error.httpStatus).toBe(422);
      expect(error.details).toHaveProperty("couponCode");
      expect(await repository.findAll()).toEqual([]);
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

    it("đọc đơn cũ (chưa có trường giảm giá) nguyên trạng", async () => {
      const legacy = await service.placeOrder(validInput());
      const legacyRepository = createInMemoryOrderRepository([legacy]);
      const legacyService = createOrderService({ repository: legacyRepository });

      expect(await legacyService.getOrder(legacy.id)).toEqual(legacy);
      expect(await legacyService.listOrders()).toEqual([legacy]);
      expect(legacy).not.toHaveProperty("discount");
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

    it("hủy đơn có mã giảm giá vẫn giữ nguyên mã, số tiền giảm và tổng tiền", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p006", quantity: 2 }], couponCode: "SHOPLITE10" }),
      );
      const cancelled = await service.cancelOrder(order.id);
      expect(cancelled).toMatchObject({
        status: "cancelled",
        couponCode: "SHOPLITE10",
        discount: 90_000,
        total: 810_000,
      });
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

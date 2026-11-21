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
      expect(order).not.toHaveProperty("discount");
      expect(order).not.toHaveProperty("couponCode");
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

    describe("mã giảm giá", () => {
      // 3 × Cáp USB-C 150.000đ = 450.000đ
      const withCoupon = (couponCode: unknown, overrides: Record<string, unknown> = {}) =>
        validInput({
          items: [{ productId: "p010", quantity: 3 }],
          couponCode,
          ...overrides,
        });

      it("áp dụng mã hợp lệ, lưu mã chuẩn hóa và số tiền giảm", async () => {
        const order = await service.placeOrder(withCoupon(" shoplite10 "));
        expect(order).toMatchObject({
          subtotal: 450_000,
          couponCode: "SHOPLITE10",
          discount: 45_000,
          shippingFee: SHIPPING_OPTIONS.standard.fee,
          total: 450_000 - 45_000 + SHIPPING_OPTIONS.standard.fee,
        });
        expect(await repository.findById(order.id)).toEqual(order);
      });

      it("bỏ qua số tiền giảm và tổng tiền do client gửi lên", async () => {
        const order = await service.placeOrder(
          withCoupon("SHOPLITE10", { discount: 999_999, total: 1 }),
        );
        expect(order.discount).toBe(45_000);
        expect(order.total).toBe(435_000);
      });

      it("tính miễn phí giao hàng theo tạm tính trước khi giảm", async () => {
        // 2 × Bàn di chuột DeskMat XL (p007) 250.000đ = 500.000đ: sau giảm 450.000đ vẫn miễn phí giao hàng
        const order = await service.placeOrder(
          withCoupon("SHOPLITE10", { items: [{ productId: "p007", quantity: 2 }] }),
        );
        expect(order).toMatchObject({
          subtotal: 500_000,
          discount: 50_000,
          shippingFee: 0,
          total: 450_000,
        });
      });

      it("chuỗi rỗng nghĩa là không dùng mã", async () => {
        const order = await service.placeOrder(withCoupon(""));
        expect(order).not.toHaveProperty("couponCode");
        expect(order).not.toHaveProperty("discount");
      });

      it("từ chối mã không tồn tại và không lưu đơn", async () => {
        const error = await expectOrderError(
          service.placeOrder(withCoupon("KHONGCO")),
          "INVALID_COUPON",
        );
        expect(error.httpStatus).toBe(422);
        expect(error.details).toEqual({
          couponCode: "Mã giảm giá không tồn tại",
          reason: "not_found",
        });
        expect(await repository.findAll()).toEqual([]);
      });

      it("từ chối mã đã hết hạn theo thời điểm đặt hàng", async () => {
        const lateService = createOrderService({
          repository,
          now: () => new Date("2026-03-01T00:00:00+07:00"),
        });
        const error = await expectOrderError(
          lateService.placeOrder(withCoupon("TET2026")),
          "INVALID_COUPON",
        );
        expect(error.details).toEqual({
          couponCode: "Mã giảm giá đã hết hạn",
          reason: "expired",
        });
      });

      it("chấp nhận mã vào phút cuối của ngày hết hạn", async () => {
        const onTimeService = createOrderService({
          repository,
          now: () => new Date("2026-02-28T23:59:59.999+07:00"),
        });
        const order = await onTimeService.placeOrder(withCoupon("TET2026"));
        expect(order.discount).toBe(67_500);
      });

      it("từ chối mã khi đơn chưa đạt giá trị tối thiểu", async () => {
        const error = await expectOrderError(
          service.placeOrder(withCoupon("GIAM50K")),
          "INVALID_COUPON",
        );
        expect(error.details?.reason).toBe("below_minimum");
        expect(error.message).toMatch(/^Mua thêm 50\.000.* để sử dụng mã GIAM50K$/);
      });

      it("dùng findCoupon được inject", async () => {
        const customService = createOrderService({
          repository,
          now: () => FIXED_DATE,
          findCoupon: (code) =>
            code === "TEST" ? { code: "TEST", type: "fixed", value: 10_000 } : undefined,
        });
        const order = await customService.placeOrder(withCoupon("test"));
        expect(order).toMatchObject({ couponCode: "TEST", discount: 10_000 });
      });

      it("báo lỗi tồn kho trước lỗi mã giảm giá", async () => {
        await expectOrderError(
          service.placeOrder(
            withCoupon("KHONGCO", {
              items: [{ productId: "p004", quantity: 1 }],
            }),
          ),
          "INSUFFICIENT_STOCK",
        );
      });
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

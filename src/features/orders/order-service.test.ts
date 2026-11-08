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
  });

  describe("placeOrder với mã giảm giá", () => {
    it("lưu mã, số tiền giảm và tổng đã trừ giảm giá", async () => {
      // Cáp USB-C (p010) 150.000đ × 2 = 300.000đ → SHOPLITE10 giảm 10% = 30.000đ
      const order = await service.placeOrder(validInput({ couponCode: "SHOPLITE10" }));
      expect(order).toMatchObject({
        couponCode: "SHOPLITE10",
        subtotal: 300_000,
        discount: 30_000,
        shippingFee: SHIPPING_OPTIONS.standard.fee,
        total: 300_000 - 30_000 + SHIPPING_OPTIONS.standard.fee,
      });
      expect(await repository.findById(order.id)).toEqual(order);
    });

    it("phí giao hàng tính trên tạm tính trước khi giảm giá", async () => {
      // DeskMat XL (p007) 250.000đ × 2 = 500.000đ (đạt ngưỡng miễn phí) → giảm 50.000đ
      const order = await service.placeOrder(
        validInput({
          items: [{ productId: "p007", quantity: 2 }],
          couponCode: "SHOPLITE10",
        }),
      );
      expect(order).toMatchObject({
        subtotal: 500_000,
        discount: 50_000,
        shippingFee: 0,
        total: 450_000,
      });
    });

    it("không có mã → giảm 0 và không lưu couponCode", async () => {
      const order = await service.placeOrder(validInput());
      expect(order.discount).toBe(0);
      expect(order).not.toHaveProperty("couponCode");
    });

    it("chuẩn hóa mã trước khi lưu", async () => {
      const order = await service.placeOrder(validInput({ couponCode: " shoplite10 " }));
      expect(order.couponCode).toBe("SHOPLITE10");
    });

    // Test giữ hành vi: pass ngay vì code hiện tại bỏ qua couponCode; viết trước T023 để
    // T023 không đảo thứ tự kiểm tra (FR-022: tồn kho được kiểm trước mã giảm giá).
    it("kiểm tra tồn kho trước mã giảm giá", async () => {
      await expectOrderError(
        service.placeOrder(
          validInput({
            items: [{ productId: "p011", quantity: 4 }],
            couponCode: "KHONGCO",
          }),
        ),
        "INSUFFICIENT_STOCK",
      );
    });

    it("hủy đơn vẫn giữ nguyên mã và số tiền giảm", async () => {
      const order = await service.placeOrder(validInput({ couponCode: "SHOPLITE10" }));
      const cancelled = await service.cancelOrder(order.id);
      expect(cancelled).toMatchObject({
        couponCode: "SHOPLITE10",
        discount: 30_000,
      });
    });
  });

  describe("placeOrder - chống gian lận mã giảm giá", () => {
    function serviceAt(isoTime: string) {
      return createOrderService({
        repository,
        now: () => new Date(isoTime),
        generateId: () => "SL-TEST-FRAUD",
      });
    }

    it("bỏ qua số tiền giảm, tạm tính và tổng do client tự khai", async () => {
      const order = await service.placeOrder(
        validInput({
          couponCode: "SHOPLITE10",
          discount: 450_000,
          total: 0,
          subtotal: 1,
        }),
      );
      // p010 150.000đ × 2 = 300.000đ → giảm 30.000đ, ship 30.000đ
      expect(order).toMatchObject({
        subtotal: 300_000,
        discount: 30_000,
        total: 300_000 - 30_000 + SHIPPING_OPTIONS.standard.fee,
      });
    });

    it("mã hết hạn → COUPON_EXPIRED, không lưu đơn", async () => {
      const error = await expectOrderError(
        serviceAt("2026-03-01T00:00:00+07:00").placeOrder(validInput({ couponCode: "TET2026" })),
        "COUPON_EXPIRED",
      );
      expect(error.httpStatus).toBe(422);
      expect(error.message).toBe("Mã giảm giá đã hết hạn");
      expect(await repository.findAll()).toEqual([]);
    });

    it("mã còn hạn ở mili giây cuối của ngày hết hạn → tạo đơn", async () => {
      const order = await serviceAt("2026-02-28T23:59:59.999+07:00").placeOrder(
        validInput({ couponCode: "TET2026" }),
      );
      // 15% của 300.000đ = 45.000đ
      expect(order).toMatchObject({ couponCode: "TET2026", discount: 45_000 });
    });

    it("mã không tồn tại → COUPON_NOT_FOUND, không lưu đơn", async () => {
      await expectOrderError(
        service.placeOrder(validInput({ couponCode: "KHONGCO" })),
        "COUPON_NOT_FOUND",
      );
      expect(await repository.findAll()).toEqual([]);
    });

    it("chưa đạt giá trị tối thiểu → COUPON_MIN_SUBTOTAL_NOT_MET, không tự bỏ mã", async () => {
      const error = await expectOrderError(
        service.placeOrder(validInput({ couponCode: "GIAM50K" })),
        "COUPON_MIN_SUBTOTAL_NOT_MET",
      );
      expect(error.details).toEqual({
        minSubtotal: "500000",
        shortfall: "200000",
      });
      expect(await repository.findAll()).toEqual([]);
    });

    // (Các ca kiểu dữ liệu của couponCode đã kiểm ở checkout-schema.test.ts; ca tồn kho trước
    // mã đã kiểm ở "placeOrder với mã giảm giá".)
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

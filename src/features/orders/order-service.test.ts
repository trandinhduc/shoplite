import { beforeEach, describe, expect, it } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { calculateOrderTotals, SHIPPING_OPTIONS } from "@/features/checkout/pricing";
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

describe("orderService.placeOrder - mã giảm giá", () => {
  let service: OrderService;

  beforeEach(() => {
    let counter = 0;
    service = createOrderService({
      repository: createInMemoryOrderRepository(),
      now: () => FIXED_DATE,
      generateId: () => `SL-COUPON-${++counter}`,
    });
  });

  // Cáp USB-C 150.000đ x 4 = 600.000đ
  const withCoupon = (couponCode?: string) =>
    validInput({ items: [{ productId: "p010", quantity: 4 }], couponCode });

  it("tính mức giảm từ giá catalog và lưu discount cùng đơn", async () => {
    const order = await service.placeOrder(withCoupon("shoplite10"));

    expect(order.discount).toEqual({ code: "SHOPLITE10", amount: 60_000 });
    expect(order.subtotal).toBe(600_000);
    expect(order.shippingFee).toBe(0);
    expect(order.total).toBe(540_000);
  });

  it("tổng tiền khớp calculateOrderTotals với mức giảm của server", async () => {
    const order = await service.placeOrder(withCoupon("SHOPLITE10"));
    const totals = calculateOrderTotals(order.items, order.shippingMethod, order.discount!.amount);

    expect(order.total).toBe(totals.total);
    expect(order).not.toHaveProperty("discountAmount");
  });

  it("không có mã thì đơn không có khóa discount", async () => {
    const order = await service.placeOrder(withCoupon());

    expect(order).not.toHaveProperty("discount");
    expect(order.total).toBe(600_000);
  });
});

describe("orderService.placeOrder - server xác nhận lại mã giảm giá", () => {
  const cable = getProductById("p010")!; // Cáp USB-C 150.000đ
  const at = (iso: string) => new Date(iso);

  function setup(options: { price?: () => number; now?: Date } = {}) {
    const repository = createInMemoryOrderRepository();
    const service = createOrderService({
      repository,
      now: () => options.now ?? FIXED_DATE,
      findProduct: (id) =>
        id === cable.id ? { ...cable, price: options.price?.() ?? cable.price } : undefined,
    });
    return { repository, service };
  }

  const order = (couponCode: string | undefined, quantity = 2, extra = {}) =>
    validInput({
      items: [{ productId: "p010", quantity }],
      couponCode,
      ...extra,
    });

  it("TET2026 còn hợp lệ ở 23:59:59.999 (UTC+7) ngày hết hạn và hết hạn ngay sau đó", async () => {
    const before = setup({ now: at("2026-02-28T16:59:59.999Z") });
    expect((await before.service.placeOrder(order("TET2026"))).discount).toEqual({
      code: "TET2026",
      amount: 45_000,
    });

    const after = setup({ now: at("2026-02-28T17:00:00.000Z") });
    await expectOrderError(after.service.placeOrder(order("TET2026")), "COUPON_EXPIRED");
  });

  it("SHOPLITE10: đúng 300.000 được nhận, thiếu 1đ bị từ chối kèm số tiền còn thiếu", async () => {
    const exact = setup();
    expect((await exact.service.placeOrder(order("SHOPLITE10"))).discount?.amount).toBe(30_000);

    const short = setup({ price: () => 299_999 });
    const error = await expectOrderError(
      short.service.placeOrder(order("SHOPLITE10", 1)),
      "COUPON_MIN_ORDER_NOT_MET",
    );
    expect(error.details).toEqual({ shortfall: "1" });
  });

  it("mã không tồn tại bị từ chối và không lưu đơn nào", async () => {
    const { service, repository } = setup();

    const error = await expectOrderError(service.placeOrder(order("ABC")), "COUPON_NOT_FOUND");

    expect(error.message).toBe("Mã giảm giá không tồn tại");
    expect(await repository.findAll()).toEqual([]);
  });

  it("bỏ qua discount, discountAmount, total, unitPrice do client tự điền", async () => {
    const { service } = setup();

    const placed = await service.placeOrder({
      ...order("SHOPLITE10"),
      discount: { code: "SHOPLITE10", amount: 999_999 },
      discountAmount: 999_999,
      total: 1,
      items: [{ productId: "p010", quantity: 2, unitPrice: 1 }],
    });

    expect(placed.discount).toEqual({ code: "SHOPLITE10", amount: 30_000 });
    expect(placed.items[0].unitPrice).toBe(150_000);
    expect(placed.total).toBe(300_000); // 300.000 - 30.000 + 30.000 phí giao hàng
  });

  it("từ chối couponCode dài hơn 32 ký tự bằng VALIDATION_ERROR", async () => {
    const { service } = setup();
    await expectOrderError(service.placeOrder(order("A".repeat(33))), "VALIDATION_ERROR");
  });

  it("gộp dòng trùng sản phẩm trước khi xét giá trị tối thiểu", async () => {
    const { service } = setup();

    const placed = await service.placeOrder(
      validInput({
        items: [
          { productId: "p010", quantity: 1 },
          { productId: "p010", quantity: 1 },
        ],
        couponCode: "SHOPLITE10",
      }),
    );

    expect(placed.subtotal).toBe(300_000);
    expect(placed.discount?.amount).toBe(30_000);
  });

  it("ngưỡng miễn phí ship xét trước giảm; giao hàng nhanh vẫn tính phí", async () => {
    const { service } = setup({ price: () => 520_000 });

    const standard = await service.placeOrder(order("GIAM50K", 1));
    expect(standard).toMatchObject({ shippingFee: 0, total: 470_000 });

    const express = await service.placeOrder(order("GIAM50K", 1, { shippingMethod: "express" }));
    expect(express).toMatchObject({ shippingFee: 60_000, total: 530_000 });
  });

  it("FR-012: đơn đã đặt giữ nguyên discount dù mã hết hạn và giá catalog đổi về sau", async () => {
    const repository = createInMemoryOrderRepository();
    const placing = createOrderService({
      repository,
      now: () => at("2026-02-28T16:59:59.999Z"),
      generateId: () => "SL-KEEP-1",
    });
    const placed = await placing.placeOrder(order("TET2026"));

    const later = createOrderService({
      repository,
      now: () => at("2027-01-01T00:00:00.000Z"),
      findProduct: () => ({ ...cable, price: 1 }),
    });

    const reloaded = await later.getOrder("SL-KEEP-1");
    expect(reloaded.discount).toEqual(placed.discount);
    expect(reloaded.total).toBe(placed.total);

    const cancelled = await later.cancelOrder("SL-KEEP-1");
    expect(cancelled.discount).toEqual(placed.discount);
  });

  it("giá đổi giữa lúc xem trước và lúc đặt: mức giảm tính trên giá hiện hành", async () => {
    let price = 600_000;
    const { service, repository } = setup({ price: () => price });

    expect((await service.placeOrder(order("SHOPLITE10", 1))).discount?.amount).toBe(60_000);

    price = 700_000;
    expect((await service.placeOrder(order("SHOPLITE10", 1))).discount?.amount).toBe(70_000);

    price = 299_999;
    await expectOrderError(service.placeOrder(order("SHOPLITE10", 1)), "COUPON_MIN_ORDER_NOT_MET");
    expect(await repository.findAll()).toHaveLength(2);
  });

  it("giỏ rỗng kèm mã giảm giá bị từ chối ngay ở bước validate", async () => {
    const { service, repository } = setup();

    const error = await expectOrderError(
      service.placeOrder(validInput({ items: [], couponCode: "SHOPLITE10" })),
      "VALIDATION_ERROR",
    );

    expect(error.details).toEqual({ items: "Giỏ hàng đang trống" });
    expect(await repository.findAll()).toEqual([]);
  });

  it("mã chỉ có khoảng trắng coi như không dùng mã", async () => {
    const { service } = setup();

    const placed = await service.placeOrder(order("   "));

    expect(placed).not.toHaveProperty("discount");
  });

  it("mức giảm bằng 0 thì không ghi discount (AppliedDiscount.amount phải > 0)", async () => {
    // TET2026 (15%, không có mức tối thiểu) trên tiền hàng 6đ: floor(6 × 15%) = 0
    const { service } = setup({ price: () => 6, now: at("2026-02-01T05:00:00.000Z") });

    const placed = await service.placeOrder(order("TET2026", 1));

    expect(placed).not.toHaveProperty("discount");
    expect(placed.subtotal).toBe(6);
    expect(placed.total).toBe(6 + SHIPPING_OPTIONS.standard.fee);
  });

  it("khoảng trắng ở giữa mã không bị bỏ và thông báo lỗi không lặp lại mã đã nhập", async () => {
    const { service } = setup();

    const error = await expectOrderError(
      service.placeOrder(order("SHOP LITE10")),
      "COUPON_NOT_FOUND",
    );

    expect(error.message).not.toContain("SHOP LITE10");
  });
});

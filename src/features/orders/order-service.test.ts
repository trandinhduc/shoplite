import { beforeEach, describe, expect, it } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { SHIPPING_OPTIONS } from "@/features/checkout/pricing";
import { findCouponByCode } from "@/features/coupons/coupon-service";
import type { Coupon } from "@/features/coupons/types";
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

describe("previewCoupon", () => {
  const sanPham = getProductById("p010")!;

  /** Service mà mọi sản phẩm có đúng `price` và đủ tồn kho: tạm tính = price × số lượng. */
  const serviceWithPrice = (
    price: number,
    deps: Partial<Parameters<typeof createOrderService>[0]> = {},
  ) =>
    createOrderService({
      repository: createInMemoryOrderRepository(),
      now: () => FIXED_DATE,
      findProduct: () => ({ ...sanPham, price, stock: 10 }),
      ...deps,
    });

  const body = (code: string, extra: Record<string, unknown> = {}) => ({
    code,
    items: [{ productId: "p010", quantity: 1 }],
    ...extra,
  });

  it.each([
    [300_000, 30_000],
    [1_000_000, 100_000],
    [2_000_000, 100_000],
  ])("SHOPLITE10 với tạm tính %i giảm %i (chặn mức tối đa 100.000)", async (price, discount) => {
    const preview = await serviceWithPrice(price).previewCoupon(body("SHOPLITE10"));
    expect(preview.subtotal).toBe(price);
    expect(preview.discount).toBe(discount);
  });

  it("GIAM50K ở đúng 500.000 giảm 50.000 và trả về đúng quy tắc của mã đó", async () => {
    const preview = await serviceWithPrice(500_000).previewCoupon(body("GIAM50K"));
    expect(preview).toEqual({
      coupon: { code: "GIAM50K", type: "fixed", amount: 50_000, minOrderValue: 500_000 },
      subtotal: 500_000,
      discount: 50_000,
    });
  });

  it("quy tắc trả về của mã phần trăm chỉ gồm các trường cần thiết, không có hạn dùng", async () => {
    const preview = await serviceWithPrice(300_000).previewCoupon(body("SHOPLITE10"));
    expect(preview.coupon).toEqual({
      code: "SHOPLITE10",
      type: "percent",
      percent: 10,
      maxDiscount: 100_000,
      minOrderValue: 300_000,
    });
  });

  it("nhận mã viết thường hoặc có khoảng trắng đầu cuối", async () => {
    const preview = await serviceWithPrice(300_000).previewCoupon(body(" shoplite10 "));
    expect(preview.coupon.code).toBe("SHOPLITE10");
  });

  it("bỏ qua tạm tính do client gửi lên, server tự tính từ giá catalog", async () => {
    const preview = await serviceWithPrice(300_000).previewCoupon(
      body("SHOPLITE10", { subtotal: 1, discount: 999_999, total: 1 }),
    );
    expect(preview.subtotal).toBe(300_000);
    expect(preview.discount).toBe(30_000);
  });

  it("dùng danh sách mã và đồng hồ được truyền vào", async () => {
    const rieng: Coupon[] = [{ code: "RIENG5", type: "fixed", amount: 5_000 }];
    const service = serviceWithPrice(100_000, {
      findCoupon: (code) => findCouponByCode(code, rieng),
    });
    expect((await service.previewCoupon(body("rieng5"))).discount).toBe(5_000);
  });

  it("trả lỗi PRODUCT_NOT_FOUND khi sản phẩm không tồn tại", async () => {
    const service = createOrderService({
      repository: createInMemoryOrderRepository(),
      now: () => FIXED_DATE,
    });
    await expectOrderError(
      service.previewCoupon({ code: "GIAM50K", items: [{ productId: "p999", quantity: 1 }] }),
      "PRODUCT_NOT_FOUND",
    );
  });

  it("áp dụng cùng kiểm tra tồn kho như lúc đặt hàng", async () => {
    const service = createOrderService({
      repository: createInMemoryOrderRepository(),
      now: () => FIXED_DATE,
    });
    await expectOrderError(
      service.previewCoupon({ code: "GIAM50K", items: [{ productId: "p011", quantity: 4 }] }),
      "INSUFFICIENT_STOCK",
    );
  });

  it("trả lỗi VALIDATION_ERROR (400) khi dữ liệu không hợp lệ", async () => {
    const service = serviceWithPrice(300_000);
    const error = await expectOrderError(service.previewCoupon(body("   ")), "VALIDATION_ERROR");
    expect(error.httpStatus).toBe(400);
    expect(error.details).toHaveProperty("code");
    await expectOrderError(
      service.previewCoupon({ code: "A".repeat(33), items: [] }),
      "VALIDATION_ERROR",
    );
    await expectOrderError(service.previewCoupon(null), "VALIDATION_ERROR");
  });
});

describe("previewCoupon - lý do từ chối", () => {
  const sanPham = getProductById("p010")!;
  const serviceWithPrice = (price: number) =>
    createOrderService({
      repository: createInMemoryOrderRepository(),
      now: () => FIXED_DATE,
      findProduct: () => ({ ...sanPham, price, stock: 10 }),
    });
  const body = (code: string) => ({ code, items: [{ productId: "p010", quantity: 1 }] });

  it("mã không tồn tại → COUPON_NOT_FOUND (422)", async () => {
    const error = await expectOrderError(
      serviceWithPrice(600_000).previewCoupon(body("ABC123")),
      "COUPON_NOT_FOUND",
    );
    expect(error.httpStatus).toBe(422);
    expect(error.message).toBe('Mã giảm giá "ABC123" không tồn tại');
  });

  it("mã đã hết hạn → COUPON_EXPIRED (422), kiểm tra hết hạn trước đơn tối thiểu", async () => {
    const error = await expectOrderError(
      serviceWithPrice(1).previewCoupon(body("TET2026")),
      "COUPON_EXPIRED",
    );
    expect(error.httpStatus).toBe(422);
  });

  it("chưa đạt đơn tối thiểu → COUPON_MIN_ORDER_NOT_MET (422) kèm số tiền cần mua thêm", async () => {
    const error = await expectOrderError(
      serviceWithPrice(250_000).previewCoupon(body("SHOPLITE10")),
      "COUPON_MIN_ORDER_NOT_MET",
    );
    expect(error.httpStatus).toBe(422);
    expect(error.details).toEqual({ minOrderValue: "300000", missingAmount: "50000" });
  });

  it("tạm tính 299.999 thiếu đúng 1 ₫, tạm tính 300.000 được chấp nhận", async () => {
    const thieu = await expectOrderError(
      serviceWithPrice(299_999).previewCoupon(body("SHOPLITE10")),
      "COUPON_MIN_ORDER_NOT_MET",
    );
    expect(thieu.details?.missingAmount).toBe("1");
    expect((await serviceWithPrice(300_000).previewCoupon(body("SHOPLITE10"))).discount).toBe(
      30_000,
    );
  });
});

describe("placeOrder - mã giảm giá", () => {
  const sanPham = getProductById("p010")!;
  const CON_HAN = new Date("2026-02-28T23:59:59+07:00");
  const HET_HAN = new Date("2026-03-01T00:00:00+07:00");

  /** Mọi sản phẩm có đúng `price` nên tạm tính của đơn 1 sản phẩm = price. */
  function setup(price: number, now: Date = FIXED_DATE) {
    const repository = createInMemoryOrderRepository();
    const service = createOrderService({
      repository,
      now: () => now,
      generateId: () => "SL-TEST-1",
      findProduct: () => ({ ...sanPham, price, stock: 10 }),
    });
    return { repository, service };
  }

  const input = (couponCode?: unknown, extra: Record<string, unknown> = {}) =>
    validInput({
      items: [{ productId: "p010", quantity: 1 }],
      ...(couponCode === undefined ? {} : { couponCode }),
      ...extra,
    });

  it("GIAM50K ở 499.999: từ chối với COUPON_MIN_ORDER_NOT_MET (422) và không lưu đơn", async () => {
    const { repository, service } = setup(499_999);
    const error = await expectOrderError(
      service.placeOrder(input("GIAM50K")),
      "COUPON_MIN_ORDER_NOT_MET",
    );
    expect(error.httpStatus).toBe(422);
    expect(error.details).toEqual({ minOrderValue: "500000", missingAmount: "1" });
    expect(await repository.findAll()).toEqual([]);
  });

  it("GIAM50K ở đúng 500.000: lưu mã và số tiền giảm, tổng đã trừ giảm giá", async () => {
    const { repository, service } = setup(500_000);
    const order = await service.placeOrder(input("giam50k"));

    expect(order).toMatchObject({
      couponCode: "GIAM50K",
      discount: 50_000,
      subtotal: 500_000,
      shippingFee: 0,
      total: 450_000,
    });
    expect(order).not.toHaveProperty("couponNotice");
    expect(await repository.findById(order.id)).toEqual(order);
  });

  it("bỏ qua discount, total, subtotal do client gửi lên", async () => {
    const { service } = setup(600_000);
    const order = await service.placeOrder(
      input("GIAM50K", { discount: 999_999, total: 1, subtotal: 1, shippingFee: 0 }),
    );
    expect(order).toMatchObject({ subtotal: 600_000, discount: 50_000, total: 550_000 });
  });

  it("phí giao hàng vẫn tính trên tạm tính trước giảm giá", async () => {
    const { service } = setup(500_000);
    const express = await service.placeOrder(input("GIAM50K", { shippingMethod: "express" }));
    expect(express.shippingFee).toBe(SHIPPING_OPTIONS.express.fee);
    expect(express.total).toBe(500_000 - 50_000 + SHIPPING_OPTIONS.express.fee);
  });

  it("TET2026 còn hạn đến 23:59:59 ngày 28/02/2026 (giờ Việt Nam): được giảm giá", async () => {
    const { service } = setup(600_000, CON_HAN);
    const order = await service.placeOrder(input("TET2026"));
    expect(order).toMatchObject({ couponCode: "TET2026", discount: 90_000, total: 510_000 });
    expect(order).not.toHaveProperty("couponNotice");
  });

  it("TET2026 hết hạn từ 00:00 ngày 01/03/2026: vẫn tạo đơn theo giá gốc kèm couponNotice", async () => {
    const { repository, service } = setup(600_000, HET_HAN);
    const order = await service.placeOrder(input("TET2026"));

    expect(order).toMatchObject({ discount: 0, subtotal: 600_000, total: 600_000 });
    expect(order.couponCode).toBeUndefined();
    expect(order.couponNotice).toEqual({ code: "COUPON_EXPIRED", couponCode: "TET2026" });

    // couponNotice chỉ có trong response, không được lưu cùng đơn
    const saved = await repository.findById(order.id);
    expect(saved).not.toHaveProperty("couponNotice");
    expect(saved?.couponCode).toBeUndefined();
    expect(saved?.discount).toBe(0);
    expect(await repository.findAll()).toHaveLength(1);
  });

  it("mã không tồn tại: COUPON_NOT_FOUND (422) và không lưu đơn", async () => {
    const { repository, service } = setup(600_000);
    const error = await expectOrderError(service.placeOrder(input("ABC123")), "COUPON_NOT_FOUND");
    expect(error.httpStatus).toBe(422);
    expect(await repository.findAll()).toEqual([]);
  });

  it("mã dài hơn 32 ký tự hoặc sai kiểu: VALIDATION_ERROR (400)", async () => {
    const { service } = setup(600_000);
    await expectOrderError(service.placeOrder(input("A".repeat(33))), "VALIDATION_ERROR");
    await expectOrderError(service.placeOrder(input(123)), "VALIDATION_ERROR");
  });

  it("không gửi mã (hoặc chỉ khoảng trắng): discount 0 và không có couponCode", async () => {
    const { service } = setup(600_000);
    for (const couponCode of [undefined, "   "]) {
      const order = await service.placeOrder(input(couponCode));
      expect(order.discount).toBe(0);
      expect(order.couponCode).toBeUndefined();
      expect(order.total).toBe(600_000);
    }
  });

  it("hủy đơn giữ nguyên couponCode và discount", async () => {
    const { service } = setup(600_000);
    const order = await service.placeOrder(input("GIAM50K"));
    const cancelled = await service.cancelOrder(order.id);
    expect(cancelled).toMatchObject({
      status: "cancelled",
      couponCode: "GIAM50K",
      discount: 50_000,
    });
  });
});

describe("generateOrderId", () => {
  it("có dạng SL-YYYYMMDD-XXXXXX", () => {
    expect(generateOrderId(FIXED_DATE)).toMatch(/^SL-20261021-[0-9A-F]{6}$/);
  });
});

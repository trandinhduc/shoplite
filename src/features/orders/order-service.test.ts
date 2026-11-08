import { beforeEach, describe, expect, it } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { SHIPPING_OPTIONS } from "@/features/checkout/pricing";
import type { CouponDefinition } from "@/features/coupons/types";
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
    // Coupon định nghĩa trong test, không phụ thuộc src/data/coupons.ts.
    const testCoupons: Record<string, CouponDefinition> = {
      SHOPLITE10: {
        code: "SHOPLITE10",
        type: "percent",
        value: 10,
        maxDiscount: 100_000,
        minSubtotal: 300_000,
      },
      GIAM50K: {
        code: "GIAM50K",
        type: "fixed",
        value: 50_000,
        minSubtotal: 500_000,
      },
    };
    // Sản phẩm giả giá 520.000đ để kiểm tra mất miễn phí ship sau giảm.
    const findProduct = (id: string) =>
      id === "fake520"
        ? {
            ...getProductById("p010")!,
            id: "fake520",
            price: 520_000,
            stock: 10,
          }
        : getProductById(id);

    let couponService: OrderService;

    beforeEach(() => {
      couponService = createOrderService({
        repository,
        findProduct,
        findCoupon: (code) => testCoupons[code],
        now: () => FIXED_DATE,
        generateId: () => "SL-TEST-COUPON",
      });
    });

    it("giảm theo mức tối đa và lưu snapshot mã vào đơn", async () => {
      const order = await couponService.placeOrder(
        validInput({
          items: [{ productId: "p001", quantity: 1 }],
          couponCode: "shoplite10",
        }),
      );

      expect(order).toMatchObject({
        subtotal: 1_290_000,
        discount: 100_000,
        shippingFee: 0,
        total: 1_190_000,
        coupon: { code: "SHOPLITE10", discount: 100_000 },
      });
      expect(await repository.findById(order.id)).toEqual(order);
    });

    it("giảm 10% với tạm tính 400.000đ và tính phí ship trên tạm tính sau giảm", async () => {
      const order = await couponService.placeOrder(
        validInput({
          items: [
            { productId: "p010", quantity: 1 },
            { productId: "p007", quantity: 1 },
          ],
          couponCode: "SHOPLITE10",
        }),
      );
      expect(order).toMatchObject({
        subtotal: 400_000,
        discount: 40_000,
        shippingFee: SHIPPING_OPTIONS.standard.fee,
        total: 390_000,
      });
    });

    it("mất miễn phí ship khi tạm tính sau giảm dưới 500.000đ", async () => {
      const order = await couponService.placeOrder(
        validInput({
          items: [{ productId: "fake520", quantity: 1 }],
          couponCode: "GIAM50K",
        }),
      );
      expect(order).toMatchObject({
        subtotal: 520_000,
        discount: 50_000,
        shippingFee: SHIPPING_OPTIONS.standard.fee,
        total: 500_000,
      });
    });

    it("đơn không có mã có discount 0 và không có coupon", async () => {
      const order = await couponService.placeOrder(validInput());
      expect(order.discount).toBe(0);
      expect(order).not.toHaveProperty("coupon");
    });

    it("mã chỉ có khoảng trắng được coi như không có mã", async () => {
      const order = await couponService.placeOrder(validInput({ couponCode: "   " }));
      expect(order.discount).toBe(0);
      expect(order).not.toHaveProperty("coupon");
    });

    it("tổng tiền luôn bằng tạm tính − giảm giá + phí ship", async () => {
      const order = await couponService.placeOrder(
        validInput({
          items: [{ productId: "p006", quantity: 2 }],
          couponCode: "GIAM50K",
        }),
      );
      expect(order.total).toBe(order.subtotal - (order.discount ?? 0) + order.shippingFee);
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

describe("orderService - xác nhận lại mã khi đặt hàng (chống gian lận)", () => {
  const coupons: Record<string, CouponDefinition> = {
    SHOPLITE10: {
      code: "SHOPLITE10",
      type: "percent",
      value: 10,
      maxDiscount: 100_000,
      minSubtotal: 300_000,
    },
    GIAM50K: {
      code: "GIAM50K",
      type: "fixed",
      value: 50_000,
      minSubtotal: 500_000,
    },
    TET2026: {
      code: "TET2026",
      type: "percent",
      value: 15,
      maxDiscount: 200_000,
      expiresOn: "2026-02-28",
    },
  };

  let repository: OrderRepository;
  const serviceAt = (isoTime: string) =>
    createOrderService({
      repository,
      findCoupon: (code) => coupons[code],
      now: () => new Date(isoTime),
      generateId: () => "SL-TEST-FRAUD",
    });

  beforeEach(() => {
    repository = createInMemoryOrderRepository();
  });

  it("từ chối mã không tồn tại và không lưu đơn", async () => {
    const error = await expectOrderError(
      serviceAt("2026-01-10T10:00:00+07:00").placeOrder(validInput({ couponCode: "KHONGCO" })),
      "COUPON_NOT_FOUND",
    );
    expect(error.details).toEqual({ couponCode: "KHONGCO" });
    expect(error.httpStatus).toBe(422);
    expect(await repository.findAll()).toEqual([]);
  });

  it("từ chối TET2026 khi đặt lúc 00:01 ngày 01/03/2026 giờ VN", async () => {
    const error = await expectOrderError(
      serviceAt("2026-03-01T00:01:00+07:00").placeOrder(
        validInput({
          items: [{ productId: "p001", quantity: 1 }],
          couponCode: "TET2026",
        }),
      ),
      "COUPON_EXPIRED",
    );
    expect(error.message).toBe("Mã giảm giá đã hết hạn");
    expect(await repository.findAll()).toEqual([]);
  });

  it("chấp nhận TET2026 khi đặt lúc 23:58 ngày 28/02/2026 giờ VN", async () => {
    const order = await serviceAt("2026-02-28T23:58:00+07:00").placeOrder(
      validInput({
        items: [{ productId: "p001", quantity: 1 }],
        couponCode: "TET2026",
      }),
    );
    expect(order.discount).toBe(193_500); // 15% của 1.290.000, dưới mức tối đa 200.000
    expect(order.coupon).toEqual({ code: "TET2026", discount: 193_500 });
  });

  it("từ chối khi tạm tính tính lại từ catalog chưa đạt ngưỡng", async () => {
    const error = await expectOrderError(
      serviceAt("2026-01-10T10:00:00+07:00").placeOrder(
        validInput({
          items: [{ productId: "p006", quantity: 1 }],
          couponCode: "giam50k",
        }),
      ),
      "COUPON_MIN_SUBTOTAL_NOT_MET",
    );
    expect(error.details).toEqual({
      couponCode: "GIAM50K",
      minSubtotal: "500000",
      shortfall: "50000",
    });
    expect(await repository.findAll()).toEqual([]);
  });

  it("bỏ qua mọi số tiền client tự khai, chỉ giảm theo quy tắc của mã", async () => {
    const order = await serviceAt("2026-01-10T10:00:00+07:00").placeOrder(
      validInput({
        items: [{ productId: "p001", quantity: 1, unitPrice: 1 }],
        couponCode: "SHOPLITE10",
        discount: 500_000,
        total: 1,
        subtotal: 1,
      }),
    );
    expect(order).toMatchObject({
      subtotal: 1_290_000,
      discount: 100_000,
      total: 1_190_000,
    });
    expect(order.items[0].unitPrice).toBe(1_290_000);
  });

  it("kiểm tra sản phẩm/tồn kho trước khi kiểm tra mã", async () => {
    await expectOrderError(
      serviceAt("2026-01-10T10:00:00+07:00").placeOrder(
        validInput({
          items: [{ productId: "p004", quantity: 1 }],
          couponCode: "KHONGCO",
        }),
      ),
      "INSUFFICIENT_STOCK",
    );
  });
});

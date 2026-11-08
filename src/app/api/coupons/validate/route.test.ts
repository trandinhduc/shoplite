// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatCurrency } from "@/lib/format";
import { POST } from "./route";

// Cho phép test đặt giá mọi sản phẩm để dựng đúng tạm tính cần kiểm tra (ví dụ 299.999 ₫).
const catalog = vi.hoisted(() => ({ price: undefined as number | undefined }));

// Thay orderService (ghi file) bằng bản dùng repository trong bộ nhớ.
vi.mock("@/features/orders/server", async () => {
  const { createOrderService } = await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } = await import("@/features/orders/order-repository");
  const { getProductById } = await import("@/features/catalog/catalog-service");
  return {
    orderService: createOrderService({
      repository: createInMemoryOrderRepository(),
      findProduct: (id) => {
        const product = getProductById(id);
        return product && catalog.price !== undefined
          ? { ...product, price: catalog.price, stock: 10 }
          : product;
      },
    }),
  };
});

beforeEach(() => {
  catalog.price = undefined;
});

const postValidate = (body: unknown) =>
  POST(
    new Request("http://localhost/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

// p010 (Cáp USB-C) giá 150.000 ₫ → 2 sản phẩm = tạm tính 300.000 ₫, đúng mức tối thiểu của SHOPLITE10.
const items = [{ productId: "p010", quantity: 2 }];

describe("POST /api/coupons/validate", () => {
  it("200 - mã hợp lệ: trả về quy tắc của đúng mã đó, tạm tính và số tiền giảm", async () => {
    const response = await postValidate({ code: "shoplite10", items });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      coupon: {
        code: "SHOPLITE10",
        type: "percent",
        percent: 10,
        maxDiscount: 100_000,
        minOrderValue: 300_000,
      },
      subtotal: 300_000,
      discount: 30_000,
    });
  });

  it("200 - không lộ thông tin của mã khác hay hạn dùng", async () => {
    const response = await postValidate({ code: "SHOPLITE10", items });
    const text = JSON.stringify(await response.json());
    expect(text).not.toContain("GIAM50K");
    expect(text).not.toContain("TET2026");
    expect(text).not.toContain("expiresOn");
  });

  it("200 - bỏ qua tạm tính do client gửi lên", async () => {
    const response = await postValidate({ code: "SHOPLITE10", items, subtotal: 1 });
    expect(response.status).toBe(200);
    expect((await response.json()).subtotal).toBe(300_000);
  });

  it("400 - body không phải JSON", async () => {
    const response = await postValidate("{oops");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("400 - mã chỉ gồm khoảng trắng", async () => {
    const response = await postValidate({ code: "   ", items });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toHaveProperty("code");
  });
});

describe("POST /api/coupons/validate - lý do từ chối", () => {
  const oneItem = [{ productId: "p010", quantity: 1 }];

  it("422 - mã không tồn tại", async () => {
    const response = await postValidate({ code: "ABC123", items });
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_NOT_FOUND");
    expect(error.message).toBe('Mã giảm giá "ABC123" không tồn tại');
  });

  it("422 - mã đã hết hạn", async () => {
    const response = await postValidate({ code: "tet2026", items });
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_EXPIRED");
    expect(error.message).toBe('Mã giảm giá "TET2026" đã hết hạn');
  });

  it("422 - tạm tính 299.999 ₫: cần mua thêm đúng 1 ₫", async () => {
    catalog.price = 299_999;
    const response = await postValidate({ code: "SHOPLITE10", items: oneItem });
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_MIN_ORDER_NOT_MET");
    expect(error.details).toEqual({ minOrderValue: "300000", missingAmount: "1" });
  });

  it("422 - tạm tính 250.000 ₫: message nêu số tiền cần mua thêm", async () => {
    catalog.price = 250_000;
    const response = await postValidate({ code: "SHOPLITE10", items: oneItem });
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.details.missingAmount).toBe("50000");
    expect(error.message).toContain(`mua thêm ${formatCurrency(50_000)}`);
  });

  it("200 - tạm tính đúng 300.000 ₫ thì được chấp nhận", async () => {
    catalog.price = 300_000;
    const response = await postValidate({ code: "SHOPLITE10", items: oneItem });
    expect(response.status).toBe(200);
    expect((await response.json()).discount).toBe(30_000);
  });

  it("422 - sản phẩm không tồn tại", async () => {
    const response = await postValidate({
      code: "SHOPLITE10",
      items: [{ productId: "p999", quantity: 1 }],
    });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("PRODUCT_NOT_FOUND");
  });
});

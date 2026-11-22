import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

/** Khách hàng hợp lệ theo checkout-schema (họ tên ≥ 2 ký tự, SĐT Việt Nam, địa chỉ ≥ 10 ký tự). */
export const KHACH_MAU = {
  fullName: "Khách E2E",
  phone: "0912345678",
  address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
};

export type KhachHang = typeof KHACH_MAU;

export interface ShopHelpers {
  /** Mở trang chi tiết sản phẩm, chọn số lượng và bấm "Thêm vào giỏ" - đi qua giao diện như khách thật. */
  addToCart(slug: string, quantity?: number): Promise<void>;
  /** Điền form thanh toán bằng KHACH_MAU, ghi đè từng trường nếu cần. */
  fillCheckout(customer?: Partial<KhachHang>): Promise<void>;
  /** Bấm "Đặt hàng", chờ trang chi tiết đơn và trả về mã đơn (SL-YYYYMMDD-XXXXXX). */
  placeOrder(): Promise<string>;
}

function createShopHelpers(page: Page): ShopHelpers {
  return {
    async addToCart(slug, quantity = 1) {
      await page.goto(`/products/${slug}`);
      const panel = page.getByTestId("purchase-panel");
      for (let i = 1; i < quantity; i++) {
        await panel.getByRole("button", { name: "Tăng số lượng" }).click();
      }
      await expect(panel.getByRole("spinbutton", { name: "Số lượng" })).toHaveValue(
        String(quantity),
      );
      await panel.getByRole("button", { name: "Thêm vào giỏ" }).click();
      await expect(panel.getByRole("button", { name: "Đã thêm" })).toBeVisible();
    },

    async fillCheckout(customer = {}) {
      const data = { ...KHACH_MAU, ...customer };
      await page.getByLabel(/Họ và tên/).fill(data.fullName);
      await page.getByLabel(/Số điện thoại/).fill(data.phone);
      await page.getByLabel(/Địa chỉ giao hàng/).fill(data.address);
    },

    async placeOrder() {
      await page.getByRole("button", { name: "Đặt hàng" }).click();
      await expect(page).toHaveURL(/\/orders\/SL-\d{8}-[0-9A-F]{6}\?placed=1/);
      return page.url().match(/SL-\d{8}-[0-9A-F]{6}/)![0];
    },
  };
}

/**
 * Tạo sẵn một đơn "Chờ xác nhận" (1 × Cáp USB-C) qua API, trả về mã đơn.
 * Dùng khi phần cần kiểm không phải là đặt hàng (ví dụ hủy đơn): nhanh và không phụ thuộc giao diện thanh toán.
 */
export async function createPendingOrder(request: APIRequestContext): Promise<string> {
  const response = await request.post("/api/orders", {
    data: {
      customer: KHACH_MAU,
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p010", quantity: 1 }],
    },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

// Tham số thứ hai của fixture đặt tên `provide` thay vì `use` như tài liệu Playwright:
// ESLint của Next (react-hooks/rules-of-hooks) nhầm `use(...)` là React hook.
export const test = base.extend<{ shop: ShopHelpers }>({
  shop: async ({ page }, provide) => {
    await provide(createShopHelpers(page));
  },
});

export { expect };

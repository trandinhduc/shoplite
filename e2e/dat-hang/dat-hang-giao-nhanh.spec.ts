// spec: specs/mua-hang.plan.md
// seed: e2e/seed.spec.ts
import { test, expect } from "../fixtures";

test.describe("Thanh toán và đơn hàng", () => {
  test(
    "DH-2 đặt hàng giao nhanh: đơn mới đúng tổng tiền, giỏ trống, có trong danh sách đơn",
    { tag: "@DH-2" },
    async ({ page, shop, request }) => {
      // 1. Thêm 1 Chuột không dây SwiftClick (450.000đ) vào giỏ, mở /checkout, điền thông tin hợp lệ
      await shop.addToCart("chuot-khong-day-swiftclick");
      await page.goto("/checkout");
      await shop.fillCheckout();

      // 2. Chọn "Giao hàng nhanh": phí 60.000đ, tổng 510.000đ
      await page.getByText("Giao hàng nhanh").click();
      await expect(page.getByTestId("shipping-fee")).toHaveText("60.000 ₫");
      await expect(page.getByTestId("checkout-total")).toHaveText("510.000 ₫");

      // 3. Bấm "Đặt hàng": sang trang đơn, báo thành công, "Chờ xác nhận", tổng 510.000đ, giỏ trống
      const orderId = await shop.placeOrder();
      await expect(page.getByText("Đặt hàng thành công!")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Chờ xác nhận");
      await expect(page.getByText("510.000 ₫")).toBeVisible();
      await expect(page.getByTestId("cart-count")).toHaveCount(0);

      // Server lưu đúng số tiền do chính server tính
      const saved = await request.get(`/api/orders/${orderId}`);
      expect(saved.ok()).toBe(true);
      expect(await saved.json()).toMatchObject({
        status: "pending",
        shippingMethod: "express",
        subtotal: 450_000,
        shippingFee: 60_000,
        total: 510_000,
      });

      // 4. Bấm "Tất cả đơn hàng": dòng có mã đơn vừa đặt hiện "Chờ xác nhận" và 510.000đ
      await page.getByRole("link", { name: "Tất cả đơn hàng" }).click();
      const row = page.getByTestId("order-row").filter({ hasText: orderId });
      await expect(row).toContainText("Chờ xác nhận");
      await expect(row).toContainText("510.000 ₫");
    },
  );
});

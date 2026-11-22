// spec: specs/mua-hang.plan.md
// seed: e2e/seed.spec.ts
import { test, expect } from "../fixtures";

test.describe("Giỏ hàng và phí giao hàng", () => {
  test(
    "GH-4 đúng 500.000đ: miễn phí giao hàng ở giỏ hàng và trang thanh toán",
    { tag: "@GH-4" },
    async ({ page, shop }) => {
      // 1. Thêm 2 Bàn di chuột cỡ lớn DeskMat XL (2 × 250.000đ = 500.000đ, đúng ngưỡng) rồi mở /cart
      await shop.addToCart("ban-di-chuot-deskmat-xl", 2);
      await page.goto("/cart");
      const summary = page.getByRole("complementary").filter({ hasText: "Tóm tắt đơn hàng" });

      // Báo được miễn phí, phí "Miễn phí", tổng 500.000đ
      await expect(
        summary.getByText("Đơn hàng của bạn được miễn phí giao hàng tiêu chuẩn"),
      ).toBeVisible();
      await expect(summary.getByText("Miễn phí", { exact: true })).toBeVisible();
      await expect(page.getByTestId("cart-total")).toHaveText("500.000 ₫");

      // 2. Bấm "Tiến hành thanh toán" (giao tiêu chuẩn mặc định): cũng miễn phí, tổng 500.000đ
      await page.getByRole("link", { name: "Tiến hành thanh toán" }).click();
      await expect(page.getByTestId("shipping-fee")).toHaveText("Miễn phí");
      await expect(page.getByTestId("checkout-total")).toHaveText("500.000 ₫");
    },
  );
});

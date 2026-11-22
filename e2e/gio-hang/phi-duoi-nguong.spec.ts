// spec: specs/mua-hang.plan.md
// seed: e2e/seed.spec.ts
import { test, expect } from "../fixtures";

test.describe("Giỏ hàng và phí giao hàng", () => {
  test(
    "GH-3 dưới 500.000đ: tính phí 30.000đ và gợi ý số tiền cần mua thêm",
    { tag: "@GH-3" },
    async ({ page, shop }) => {
      // 1. Thêm 1 Cáp USB-C bện dù 2m (150.000đ) vào giỏ rồi mở /cart
      await shop.addToCart("cap-usb-c-ben-du-2m");
      await page.goto("/cart");
      const summary = page.getByRole("complementary").filter({ hasText: "Tóm tắt đơn hàng" });

      // Gợi ý mua thêm 350.000đ, phí 30.000đ, tổng 180.000đ
      await expect(
        summary.getByText("Mua thêm 350.000 ₫ để được miễn phí giao hàng"),
      ).toBeVisible();
      await expect(summary.getByText("30.000 ₫", { exact: true })).toBeVisible();
      await expect(page.getByTestId("cart-total")).toHaveText("180.000 ₫");
    },
  );
});

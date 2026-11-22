// spec: specs/mua-hang.plan.md
// seed: e2e/seed.spec.ts
import { test, expect } from "../fixtures";

test.describe("Giỏ hàng và phí giao hàng", () => {
  test(
    "GH-1 thêm sản phẩm còn hàng: giỏ hàng hiện đúng số lượng đã chọn",
    { tag: "@GH-1" },
    async ({ page }) => {
      // 1. Mở trang chi tiết "Chuột không dây SwiftClick"
      await page.goto("/products/chuot-khong-day-swiftclick");
      const panel = page.getByTestId("purchase-panel");

      // 2. Tăng số lượng lên 3 rồi bấm "Thêm vào giỏ"
      await panel.getByRole("button", { name: "Tăng số lượng" }).click();
      await panel.getByRole("button", { name: "Tăng số lượng" }).click();
      await panel.getByRole("button", { name: "Thêm vào giỏ" }).click();

      // 3. Biểu tượng giỏ hàng báo 3 sản phẩm
      const cartLink = page.getByRole("link", { name: "Giỏ hàng (3 sản phẩm)" });
      await expect(cartLink).toBeVisible();

      // 4. Trang giỏ hàng có đúng một dòng SwiftClick, số lượng 3
      await cartLink.click();
      const row = page.getByTestId("cart-item").filter({ hasText: "Chuột không dây SwiftClick" });
      await expect(page.getByTestId("cart-item")).toHaveCount(1);
      await expect(row.getByRole("spinbutton")).toHaveValue("3");
    },
  );

  test(
    "GH-1 sản phẩm hết hàng: không có cách nào thêm vào giỏ",
    { tag: "@GH-1" },
    async ({ page }) => {
      // 1. Mở danh mục Âm thanh, tìm thẻ "Micro thu âm PodCast USB" (tồn kho 0)
      await page.goto("/products?category=am-thanh");
      const card = page.getByTestId("product-card").filter({ hasText: "Micro thu âm PodCast USB" });

      // 2. Nút mua trên thẻ hiện "Hết hàng" và bị vô hiệu
      await expect(card.getByRole("button", { name: "Hết hàng" })).toBeDisabled();

      // 3. Trang chi tiết báo tạm hết hàng, không có khối chọn số lượng / thêm vào giỏ
      await card.getByRole("link", { name: "Micro thu âm PodCast USB" }).click();
      await expect(page.getByText("Sản phẩm tạm hết hàng. Vui lòng quay lại sau.")).toBeVisible();
      await expect(page.getByTestId("purchase-panel")).toHaveCount(0);
    },
  );
});

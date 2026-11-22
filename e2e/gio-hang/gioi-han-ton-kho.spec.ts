// spec: specs/mua-hang.plan.md
// seed: e2e/seed.spec.ts
import { test, expect } from "../fixtures";

test.describe("Giỏ hàng và phí giao hàng", () => {
  test(
    "GH-2 không chọn được nhiều hơn số hàng còn trong kho",
    { tag: "@GH-2" },
    async ({ page }) => {
      // 1. Mở "Giá đỡ laptop nhôm" - kho chỉ còn 3
      await page.goto("/products/gia-do-laptop-nhom");
      await expect(page.getByText("Chỉ còn 3 sản phẩm")).toBeVisible();
      const panel = page.getByTestId("purchase-panel");
      const increase = panel.getByRole("button", { name: "Tăng số lượng" });

      // 2. Bấm "Tăng số lượng" 2 lần: số lượng 3, nút tăng bị khóa
      await increase.click();
      await increase.click();
      await expect(panel.getByRole("spinbutton", { name: "Số lượng" })).toHaveValue("3");
      await expect(increase).toBeDisabled();

      // 3. Bấm "Thêm vào giỏ": báo đã đủ số lượng tối đa, không thêm được nữa
      await panel.getByRole("button", { name: "Thêm vào giỏ" }).click();
      await expect(page.getByRole("link", { name: "Giỏ hàng (3 sản phẩm)" })).toBeVisible();
      await expect(
        panel.getByText("Bạn đã có số lượng tối đa của sản phẩm này trong giỏ."),
      ).toBeVisible();
      await expect(panel.getByRole("button", { name: "Tối đa" })).toBeDisabled();
    },
  );
});

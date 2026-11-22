// spec: specs/mua-hang.plan.md
// seed: e2e/seed.spec.ts
import { test, expect } from "../fixtures";

test.describe("Giỏ hàng và phí giao hàng", () => {
  test("GH-2 tối đa 10 sản phẩm mỗi loại dù kho còn nhiều", { tag: "@GH-2" }, async ({ page }) => {
    // 1. Mở "Cáp USB-C bện dù 2m" - kho còn 200
    await page.goto("/products/cap-usb-c-ben-du-2m");
    const panel = page.getByTestId("purchase-panel");
    const quantity = panel.getByRole("spinbutton", { name: "Số lượng" });

    // 2. Gõ 15 vào ô số lượng: ô tự về 10, nút tăng bị khóa
    await quantity.fill("15");
    await expect(quantity).toHaveValue("10");
    await expect(panel.getByRole("button", { name: "Tăng số lượng" })).toBeDisabled();
  });
});

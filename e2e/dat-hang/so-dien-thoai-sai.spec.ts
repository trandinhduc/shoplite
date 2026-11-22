// spec: specs/mua-hang.plan.md
// seed: e2e/seed.spec.ts
import { test, expect } from "../fixtures";

test.describe("Thanh toán và đơn hàng", () => {
  test(
    "DH-1 số điện thoại sai định dạng: chỉ ô đó báo lỗi",
    { tag: "@DH-1" },
    async ({ page, shop }) => {
      // 1. Thêm 1 Cáp USB-C vào giỏ, mở /checkout, điền hợp lệ nhưng số điện thoại 0123456789
      await shop.addToCart("cap-usb-c-ben-du-2m");
      await page.goto("/checkout");
      await shop.fillCheckout({ phone: "0123456789" });

      // 2. Bấm "Đặt hàng"
      await page.getByRole("button", { name: "Đặt hàng" }).click();

      // Chỉ ô số điện thoại báo lỗi và được đánh dấu aria-invalid; vẫn ở /checkout
      await expect(page.getByText("Số điện thoại không hợp lệ (ví dụ: 0912345678)")).toBeVisible();
      await expect(page.getByLabel(/Số điện thoại/)).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByText("Họ tên phải có ít nhất 2 ký tự")).toHaveCount(0);
      await expect(page.getByText("Địa chỉ phải có ít nhất 10 ký tự")).toHaveCount(0);
      await expect(page).toHaveURL(/\/checkout$/);
    },
  );
});

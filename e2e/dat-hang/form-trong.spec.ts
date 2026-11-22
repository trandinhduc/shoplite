// spec: specs/mua-hang.plan.md
// seed: e2e/seed.spec.ts
import { test, expect } from "../fixtures";

test.describe("Thanh toán và đơn hàng", () => {
  test(
    "DH-1 gửi form trống: báo lỗi từng ô bắt buộc và không tạo đơn",
    { tag: "@DH-1" },
    async ({ page, shop }) => {
      // 1. Thêm 1 Cáp USB-C vào giỏ, mở /checkout
      await shop.addToCart("cap-usb-c-ben-du-2m");
      await page.goto("/checkout");

      // Ghi lại mọi lệnh tạo đơn trình duyệt gửi lên server
      const orderRequests: string[] = [];
      page.on("request", (request) => {
        if (request.method() === "POST" && request.url().endsWith("/api/orders")) {
          orderRequests.push(request.url());
        }
      });

      // 2. Bấm "Đặt hàng" khi chưa điền gì
      await page.getByRole("button", { name: "Đặt hàng" }).click();

      // Ba ô bắt buộc báo lỗi, vẫn ở trang thanh toán, không có lệnh tạo đơn nào
      await expect(page.getByText("Họ tên phải có ít nhất 2 ký tự")).toBeVisible();
      await expect(page.getByText("Số điện thoại không hợp lệ (ví dụ: 0912345678)")).toBeVisible();
      await expect(page.getByText("Địa chỉ phải có ít nhất 10 ký tự")).toBeVisible();
      await expect(page).toHaveURL(/\/checkout$/);
      expect(orderRequests).toHaveLength(0);
    },
  );
});

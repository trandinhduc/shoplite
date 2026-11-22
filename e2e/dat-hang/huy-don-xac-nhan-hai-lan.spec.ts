// spec: specs/mua-hang.plan.md
// seed: e2e/seed.spec.ts
import { test, expect, createPendingOrder } from "../fixtures";

test.describe("Thanh toán và đơn hàng", () => {
  test(
    "DH-3 hủy đơn chờ xác nhận: phải xác nhận lần hai, trạng thái đổi ngay không cần tải lại",
    { tag: "@DH-3" },
    async ({ page, request }) => {
      // 1. Tạo một đơn qua API, mở trang chi tiết: đang "Chờ xác nhận"
      const orderId = await createPendingOrder(request);
      await page.goto(`/orders/${orderId}`);
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toContainText("Chờ xác nhận");

      // 2. Bấm "Hủy đơn hàng" rồi "Không": đơn giữ nguyên
      await page.getByRole("button", { name: "Hủy đơn hàng" }).click();
      await expect(page.getByText("Bạn chắc chắn muốn hủy đơn hàng này?")).toBeVisible();
      await page.getByRole("button", { name: "Không" }).click();
      await expect(heading).toContainText("Chờ xác nhận");

      // 3. Bấm "Hủy đơn hàng" rồi "Xác nhận hủy": server nhận lệnh hủy thành công
      await page.getByRole("button", { name: "Hủy đơn hàng" }).click();
      const cancelResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().endsWith(`/api/orders/${orderId}`),
      );
      await page.getByRole("button", { name: "Xác nhận hủy" }).click();
      expect((await cancelResponse).ok()).toBe(true);

      // Không tải lại trang: trạng thái thành "Đã hủy", nút hủy biến mất
      await expect(heading).toContainText("Đã hủy");
      await expect(page.getByRole("button", { name: "Hủy đơn hàng" })).toHaveCount(0);
    },
  );
});

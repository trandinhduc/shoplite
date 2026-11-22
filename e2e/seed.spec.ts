import { test, expect } from "./fixtures";

// Planner và generator chạy file này trước mọi việc: mở trang chủ, chờ trang sẵn sàng.
// Giỏ hàng nằm trong localStorage nên mỗi test bắt đầu với giỏ trống (context trình duyệt mới).
test("seed", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Đồ công nghệ chất lượng, giá tốt mỗi ngày" }),
  ).toBeVisible();
});

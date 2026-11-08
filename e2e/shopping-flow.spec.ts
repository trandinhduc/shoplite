import { expect, test } from "@playwright/test";

test("khách hàng tìm sản phẩm, thêm vào giỏ và đặt hàng thành công", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Mua sắm ngay" }).click();

  // Tìm kiếm không dấu
  await page.getByLabel("Từ khóa tìm kiếm").fill("chuot khong day");
  await page.getByRole("button", { name: "Tìm kiếm" }).click();
  await expect(page).toHaveURL(/q=chuot\+khong\+day/);
  await expect(page.getByTestId("product-card")).toHaveCount(1);

  // Chi tiết sản phẩm -> thêm 2 sản phẩm vào giỏ
  await page.getByRole("link", { name: "Chuột không dây SwiftClick" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chuột không dây SwiftClick");
  const purchasePanel = page.getByTestId("purchase-panel");
  await purchasePanel.getByRole("button", { name: "Tăng số lượng" }).click();
  await purchasePanel.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("2");

  // Giỏ hàng: 2 x 450.000đ = 900.000đ, miễn phí giao hàng
  await page.getByRole("link", { name: /Giỏ hàng/ }).click();
  await expect(page.getByTestId("cart-total")).toContainText("900.000");
  await page.getByRole("link", { name: "Tiến hành thanh toán" }).click();

  // Thanh toán
  await page.getByLabel(/Họ và tên/).fill("Nguyễn Văn Test");
  await page.getByLabel(/Số điện thoại/).fill("0912345678");
  await page.getByLabel(/Địa chỉ giao hàng/).fill("12 Nguyễn Huệ, Quận 1, TP.HCM");
  await page.getByRole("button", { name: "Đặt hàng" }).click();

  // Trang chi tiết đơn hàng
  await expect(page).toHaveURL(/\/orders\/SL-\d{8}-[0-9A-F]{6}\?placed=1/);
  await expect(page.getByText("Đặt hàng thành công!")).toBeVisible();
  await expect(page.getByTestId("cart-count")).toHaveCount(0);

  const orderId = page.url().match(/SL-\d{8}-[0-9A-F]{6}/)![0];
  await page.getByRole("link", { name: "Tất cả đơn hàng" }).click();
  await expect(page.getByTestId("order-row").filter({ hasText: orderId })).toBeVisible();
});

test("lọc theo danh mục và sắp xếp theo giá", async ({ page }) => {
  await page.goto("/products");
  await page
    .getByRole("link", { name: /Âm thanh/ })
    .first()
    .click();
  await expect(page).toHaveURL(/category=am-thanh/);
  await expect(page.getByTestId("product-card")).toHaveCount(4);

  await page.getByLabel("Sắp xếp").selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page.getByTestId("product-card").first()).toContainText(
    "Loa Bluetooth BeatBox Mini",
  );
});

test("khách hàng áp mã SHOPLITE10 và đặt hàng với giá đã giảm", async ({ page }) => {
  // Tai nghe SoundMax Pro 1.290.000đ → SHOPLITE10 giảm 10% nhưng tối đa 100.000đ
  await page.goto("/products/tai-nghe-khong-day-soundmax-pro");
  await page.getByTestId("purchase-panel").getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  await page.getByRole("link", { name: /Giỏ hàng/ }).click();
  await page.getByRole("link", { name: "Tiến hành thanh toán" }).click();

  // Áp mã (chữ thường vẫn được nhận)
  await page.getByLabel("Mã giảm giá").fill("shoplite10");
  await page.getByRole("button", { name: "Áp dụng" }).click();
  const discountRow = page.getByTestId("checkout-discount");
  await expect(discountRow).toContainText("SHOPLITE10");
  await expect(discountRow).toContainText("100.000");
  await expect(page.getByTestId("shipping-fee")).toHaveText("Miễn phí");
  await expect(page.getByTestId("checkout-total")).toContainText("1.190.000");

  // Đặt hàng
  await page.getByLabel(/Họ và tên/).fill("Nguyễn Văn Mã");
  await page.getByLabel(/Số điện thoại/).fill("0912345678");
  await page.getByLabel(/Địa chỉ giao hàng/).fill("12 Nguyễn Huệ, Quận 1, TP.HCM");
  await page.getByRole("button", { name: "Đặt hàng" }).click();

  // Chi tiết đơn: snapshot mã và số tiền giảm do server tính
  await expect(page).toHaveURL(/\/orders\/SL-\d{8}-[0-9A-F]{6}\?placed=1/);
  await expect(page.getByText("Đặt hàng thành công!")).toBeVisible();
  const orderDiscount = page.getByTestId("order-discount");
  await expect(orderDiscount).toContainText("SHOPLITE10");
  await expect(orderDiscount).toContainText("100.000");
  await expect(page.getByText("Tổng cộng").locator("xpath=following-sibling::dd")).toContainText(
    "1.190.000",
  );
});

import { expect, test } from "@playwright/test";

const SWIFTCLICK = "Chuột không dây SwiftClick";

test("khách hàng thích sản phẩm, xem danh sách yêu thích, thêm vào giỏ rồi bỏ thích", async ({
  page,
}) => {
  await page.goto("/products");
  await page.getByLabel("Từ khóa tìm kiếm").fill("chuot khong day");
  await page.getByRole("button", { name: "Tìm kiếm" }).click();

  // Thích từ thẻ sản phẩm -> header hiện số 1
  const card = page.getByTestId("product-card");
  await expect(card).toHaveCount(1);
  const heart = card.getByRole("button", { name: `Yêu thích ${SWIFTCLICK}` });
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // Tải lại trang vẫn còn
  await page.reload();
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");
  await expect(
    page.getByTestId("product-card").getByRole("button", { name: `Yêu thích ${SWIFTCLICK}` }),
  ).toHaveAttribute("aria-pressed", "true");

  // Trang yêu thích có sản phẩm
  await page.getByRole("link", { name: "Yêu thích (1 sản phẩm)" }).click();
  await expect(page).toHaveURL(/\/wishlist$/);
  const item = page.getByTestId("wishlist-item");
  await expect(item).toHaveCount(1);
  await expect(item).toContainText(SWIFTCLICK);
  await expect(item.getByTestId("price")).toContainText("450.000");

  // Thêm vào giỏ: giỏ tăng, sản phẩm vẫn còn trong danh sách yêu thích
  await item.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await expect(item).toHaveCount(1);
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // Bỏ thích -> trạng thái trống
  await item.getByRole("button", { name: `Bỏ ${SWIFTCLICK} khỏi yêu thích` }).click();
  await expect(page.getByText("Danh sách yêu thích đang trống")).toBeVisible();
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
  await page.getByRole("link", { name: "Khám phá sản phẩm" }).click();
  await expect(page).toHaveURL(/\/products$/);
});

test("trang chi tiết: thích được bằng bàn phím, cả sản phẩm hết hàng, và hiển thị 'Hết hàng' ở trang yêu thích", async ({
  page,
}) => {
  // p004 hết hàng
  await page.goto("/products/micro-thu-am-podcast-usb");
  const heart = page.getByRole("button", { name: "Yêu thích Micro thu âm podcast USB" });
  await expect(heart).toHaveAttribute("aria-pressed", "false");

  await heart.focus();
  await page.keyboard.press("Enter");
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  await page.getByRole("link", { name: "Yêu thích (1 sản phẩm)" }).click();
  const item = page.getByTestId("wishlist-item");
  await expect(item).toHaveCount(1);
  await expect(item.getByRole("button", { name: "Hết hàng" })).toBeDisabled();
  await expect(
    item.getByRole("button", { name: "Bỏ Micro thu âm podcast USB khỏi yêu thích" }),
  ).toBeEnabled();
});

test("trạng thái đã thích ở thẻ sản phẩm liên quan được giữ khi mở trang chi tiết của sản phẩm đó", async ({
  page,
}) => {
  await page.goto("/products/tai-nghe-khong-day-soundmax-pro");
  const related = page.getByRole("heading", { name: "Sản phẩm liên quan" });
  await expect(related).toBeVisible();

  const relatedCard = page.getByTestId("product-card").first();
  const relatedHeart = relatedCard.getByRole("button", { name: /^Yêu thích / });
  await relatedHeart.click();
  await expect(relatedHeart).toHaveAttribute("aria-pressed", "true");

  await relatedCard.getByRole("heading").getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Nút trái tim chính của trang chi tiết nằm cùng hàng với tiêu đề h1
  await expect(
    page.locator("div:has(> h1)").getByRole("button", { name: /^Yêu thích / }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("khi danh sách đã đủ 50 sản phẩm, thích thêm sẽ báo đầy và không thêm được", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const productIds = Array.from({ length: 50 }, (_, i) => `x${i + 1}`);
    window.localStorage.setItem("shoplite:wishlist", JSON.stringify({ productIds }));
  });

  await page.goto("/products/tai-nghe-khong-day-soundmax-pro");
  await expect(page.getByTestId("wishlist-count")).toHaveText("50");

  const heart = page.getByRole("button", { name: "Yêu thích Tai nghe không dây SoundMax Pro" });
  await heart.click();

  await expect(page.getByText(/Danh sách yêu thích đã đầy \(tối đa 50 sản phẩm\)/)).toBeVisible();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("wishlist-count")).toHaveText("50");
});

for (const width of [360, 375]) {
  test(`header có biểu tượng yêu thích và giỏ hàng nhưng không tràn ngang ở ${width}px`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("shoplite:wishlist", JSON.stringify({ productIds: ["p001"] }));
    });
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Yêu thích (1 sản phẩm)" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Giỏ hàng" })).toBeVisible();

    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      header: (() => {
        const row = document.querySelector("header > div")!;
        return row.scrollWidth - row.clientWidth;
      })(),
    }));
    expect(overflow).toEqual({ page: 0, header: 0 });
  });
}

test("đồng bộ giữa hai tab đang mở: thích ở tab này, tab kia cập nhật; bỏ thích thì danh sách ở tab kia cũng đổi", async ({
  context,
}) => {
  const tabA = await context.newPage();
  const tabB = await context.newPage();
  await tabA.goto("/products/tai-nghe-khong-day-soundmax-pro");
  await tabB.goto("/products/tai-nghe-khong-day-soundmax-pro");

  const name = "Yêu thích Tai nghe không dây SoundMax Pro";
  await tabA.getByRole("button", { name }).click();

  // Tab B cập nhật nút trái tim và số lượng ở header mà không tải lại
  await expect(tabB.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
  await expect(tabB.getByTestId("wishlist-count")).toHaveText("1");

  // Tab B mở trang yêu thích; bỏ thích ở tab A thì sản phẩm biến mất ở tab B
  await tabB.goto("/wishlist");
  await expect(tabB.getByTestId("wishlist-item")).toHaveCount(1);
  await tabA.getByRole("button", { name }).click();
  await expect(tabB.getByText("Danh sách yêu thích đang trống")).toBeVisible();
  await expect(tabB.getByTestId("wishlist-count")).toHaveCount(0);
});

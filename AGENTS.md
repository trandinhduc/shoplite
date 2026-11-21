# AGENTS.md - ShopLite

Hướng dẫn cho mọi AI coding agent làm việc trên repo này.

## 1. Tổng quan

ShopLite: cửa hàng đồ công nghệ mẫu. Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind CSS v4 + zod 4. Node >= 22.12.

Dữ liệu được lưu ở ba nơi:

- **Sản phẩm/danh mục:** mảng tĩnh trong `src/data/products.ts`, `src/data/categories.ts`.
- **Giỏ hàng:** `localStorage` của trình duyệt, key `CART_STORAGE_KEY = "shoplite:cart"`.
- **Đơn hàng:** file JSON `process.env.ORDERS_FILE ?? DEFAULT_ORDERS_FILE` (`storage/orders.json`, đã gitignore).

`module123-guides/` là tài liệu bài lab, không phải mã ứng dụng.

## 2. Lệnh thường dùng

```bash
npm run dev                          # http://localhost:3000
npm run check                        # lint + typecheck + test (typecheck chạy `next typegen` trước)
npx vitest run src/features/orders   # test một thư mục (hoặc một file)
npx vitest run -t "<tên test>"       # test theo tên
npm run test:e2e                     # Playwright, tự chạy `npm run dev`; lần đầu: npx playwright install chromium
npm run format                       # Prettier + prettier-plugin-tailwindcss
```

## 3. Codemap

| Capability | Thư mục                                        | File quan trọng                                                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog    | `src/features/catalog/`                        | `catalog-service.ts` (`parseCatalogQuery`, `queryProducts`, `getProductById`, `PAGE_SIZE`), `types.ts`                                                                                                                                                              |
| Cart       | `src/features/cart/`                           | `cart-reducer.ts` (`cartReducer`, `getMaxQuantity`, `MAX_QUANTITY_PER_ITEM`), `cart-store.ts` (`cartStore`), `use-cart.ts` (`useCart`)                                                                                                                              |
| Checkout   | `src/features/checkout/`                       | `pricing.ts` (`calculateOrderTotals`, `FREE_SHIPPING_THRESHOLD`, `SHIPPING_OPTIONS`), `checkout-schema.ts` (`checkoutFormSchema`, `placeOrderSchema`, `toFieldErrors`), `components/checkout-form.tsx`                                                              |
| Orders     | `src/features/orders/`                         | `order-service.ts` (`createOrderService`), `order-repository.ts` (`OrderRepository`), `order-errors.ts` (`OrderError`), `server.ts` (`orderService`)                                                                                                                |
| Coupons    | `src/features/coupons/`, `src/data/coupons.ts` | `coupon-rules.ts` (hàm thuần: `normalizeCouponCode`, `evaluateCoupon`, `calculateCouponDiscount`, `getCouponErrorMessage`), `coupon-schema.ts` (`couponCodeSchema`), `coupon-service.ts` (`findCoupon`, `lookupCoupon` – chỉ server), `components/coupon-field.tsx` |
| API        | `src/app/api/`, `src/lib/http.ts`              | `orders/route.ts`, `orders/[id]/route.ts`, `coupons/[code]/route.ts`, `products/…`; `handleRouteError`, `jsonError`, `readJsonBody`                                                                                                                                 |

**Luồng thêm vào giỏ hàng** (chỉ chạy ở client, không gọi API):

1. `ProductPurchasePanel` / `AddToCartButton` gọi `useCart().addItem(product, quantity)`.
2. `addItem` gọi `cartStore.dispatch({ type: "add", item: toCartItem(product), quantity })`.
3. `cartReducer` giới hạn số lượng bằng `getMaxQuantity(stock)`.
4. `writeToStorage` ghi vào `localStorage`, rồi `emit()` báo cho các component đang dùng `useSyncExternalStore`. Sự kiện `storage` đồng bộ giỏ giữa các tab.

**Luồng đặt hàng:**

1. `CheckoutForm` validate bằng `checkoutFormSchema`.
2. Form gửi `fetch("POST /api/orders")` với body `{ customer, shippingMethod, paymentMethod, items: [{ productId, quantity }], couponCode? }` (không gửi số tiền).
3. `app/api/orders/route.ts` đọc body bằng `readJsonBody`, rồi gọi `orderService.placeOrder` (trong `features/orders/server.ts`).
4. `placeOrder` lần lượt:
   - validate bằng `placeOrderSchema`;
   - gộp dòng trùng `productId`;
   - lấy giá qua `findProduct` (mặc định `getProductById`);
   - kiểm tra `stock`;
   - nếu có `couponCode`: `evaluateCoupon(findCoupon(code), subtotal, now())`, không hợp lệ thì ném `INVALID_COUPON` (422);
   - tính tiền bằng `calculateOrderTotals(lines, method, discount)`;
   - lưu qua `repository.save`, ghi vào `createJsonFileOrderRepository` (ghi file `.tmp` rồi `rename`).
5. Thành công: API trả 201, client gọi `clear()` giỏ và chuyển sang `/orders/{id}?placed=1`.

## 4. Quy ước code

- **Feature-based:**
  - `src/app/` chỉ chứa page và Route Handler. Logic nằm trong `src/features/<feature>/`, kèm `components/` và test đặt cạnh file.
  - UI dùng chung để ở `src/components/`, tiện ích ở `src/lib/`. Import bằng alias `@/`.
- **Đặt tên:** file dạng kebab-case (`order-service.ts`, `add-to-cart-button.tsx`), component dạng PascalCase, test là `*.test.ts(x)`. Service tạo bằng factory `createXxx(deps)` để có thể inject phụ thuộc.
- **Server/Client Component:**
  - Mặc định là Server Component. Page dùng `PageProps<"/route">`, handler dùng `RouteContext<"/api/...">`, và phải `await` `params`/`searchParams`.
  - Chỉ thêm `"use client"` khi cần state, hook hoặc browser API. Hiện có các file như `checkout-form.tsx`, `add-to-cart-button.tsx`, `cancel-order-button.tsx`.
  - UI phụ thuộc giỏ hàng phải kiểm tra `hydrated` vì `getServerSnapshot` trả `EMPTY_CART`.
- **Zod:**
  - Schema để trong `features/checkout/checkout-schema.ts`, dùng chung cho cả client và server.
  - Luôn dùng `safeParse`. Lỗi được chuyển thành map field bằng `toFieldErrors` (key nối bằng dấu `.`, ví dụ `"customer.phone"`).
- **Lỗi API:**
  - Service ném `OrderError(code, message, details?)`. Route handler bọc code bằng `try/catch` → `handleRouteError(error)`.
  - Body lỗi có dạng `{ error: { code, message, details? } }`.
  - Thêm mã lỗi mới: thêm vào `OrderErrorCode` và `HTTP_STATUS_BY_CODE`.
  - Body không phải JSON hợp lệ → `jsonError(400, "VALIDATION_ERROR", …)`.
- **Text tiếng Việt:** UI, thông báo lỗi, comment và tên test đều viết bằng tiếng Việt. Định dạng tiền/ngày dùng `formatCurrency` và `formatDateTime` (`lib/format.ts`). Tìm kiếm không dấu dùng `normalizeText`.

## 5. Quy tắc nghiệp vụ không được phá vỡ

- **Giỏ hàng:** mỗi sản phẩm tối đa `MAX_QUANTITY_PER_ITEM = 10` và không vượt `stock` (`getMaxQuantity`). Sản phẩm `stock = 0` không thêm được. `placeOrderSchema` cũng giới hạn `quantity` tối đa là `MAX_QUANTITY_PER_ITEM`.
- **Phí ship** (`calculateShippingFee`):
  - `standard` 30.000 ₫, `express` 60.000 ₫.
  - `standard` miễn phí khi `subtotal >= FREE_SHIPPING_THRESHOLD` (500.000).
  - `subtotal <= 0` thì phí ship bằng 0.
- **Giá do server tính:** `placeOrder` lấy `unitPrice` từ catalog và tính lại `calculateOrderTotals`. Không bao giờ dùng giá hay tổng tiền client gửi lên.
- **Mã giảm giá:** tối đa một mã/đơn; phí ship tính theo tạm tính **trước** giảm; `0 ≤ discount ≤ subtotal`; hết hạn sau 23:59:59.999 +07:00 của `expiresOn`. `coupon-rules.ts` không import `src/data/` (client không bao giờ nhận danh sách mã). Đơn không dùng mã và đơn cũ không có `couponCode`/`discount`.
- **Hủy đơn:** `cancelOrder` chỉ cho phép khi `status === "pending"`, nếu không thì ném `INVALID_STATUS_TRANSITION` (409). PATCH chỉ nhận `{ "status": "cancelled" }`.

## 6. Testing

- **Vị trí:**
  - Unit/component test đặt cạnh file nguồn (`src/**/*.test.{ts,tsx}`). Chạy bằng Vitest, môi trường `jsdom`, có Testing Library + jest-dom.
  - E2E nằm trong `e2e/`.
- **`vitest.setup.ts`:** gọi `cleanup()` và xóa `localStorage` sau mỗi test. Test store gọi `cartStore.reset()` để đọc lại từ `localStorage`.
- **Code dùng file hệ thống:** thêm `// @vitest-environment node` ở dòng đầu.
  - Repository JSON: test trên thư mục tạm (`mkdtemp(path.join(tmpdir(), "shoplite-orders-"))`), không đụng `storage/` (xem `order-repository.test.ts`).
  - Route handler: `vi.mock("@/features/orders/server", …)` để thay `orderService` bằng `createOrderService({ repository: createInMemoryOrderRepository() })` (xem `app/api/orders/route.test.ts`).
- **Service:** inject `createInMemoryOrderRepository(seed)`, `now`, `generateId`, `findProduct` để test có kết quả xác định.

## 7. Không được làm

- Không import `features/orders/server.ts` (hoặc `node:fs`) từ Client Component.
- Không tin giá, tổng tiền hay phí ship từ client. Không bỏ bước kiểm tra tồn kho trong `placeOrder`.
- Không để route handler tự đọc/ghi file. Mọi truy cập dữ liệu phải đi qua `OrderService` → `OrderRepository`.
- Không trả lỗi API khác dạng `{ error: { code, message, details? } }`.
- Không để test ghi vào `storage/orders.json` thật.
- Không sửa luật tính tiền ở nhiều nơi. Chỉ sửa trong `pricing.ts`.
- Không commit `storage/`, `.env*` hay output build/test (xem `.gitignore`).

## 8. Definition of Done

- `npm run check` pass (lint + typecheck + test).
- Logic mới có test đặt cạnh file. Thay đổi luồng mua hàng thì chạy thêm `npm run test:e2e`.
- Code đã qua `npm run format` (hoặc `npm run format:check` pass).
- Text hiển thị và thông báo lỗi viết bằng tiếng Việt. API giữ đúng format lỗi chuẩn.
- Các quy tắc ở mục 5 vẫn đúng. Nếu thay đổi API hoặc biến môi trường thì cập nhật `README.md`.

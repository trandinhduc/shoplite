# AGENTS.md - ShopLite

Hướng dẫn cho mọi AI coding agent làm việc trên repo này.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Tổng quan

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind v4 + Zod 4. Test: Vitest 5 (jsdom) + Playwright. Node >= 22.12.
- **Không có database.** Sản phẩm và danh mục là mảng tĩnh trong `src/data/products.ts`, `src/data/categories.ts`.
- **Đơn hàng:** file JSON tại `ORDERS_FILE` (mặc định `storage/orders.json`, tính từ `process.cwd()`).
- **Giỏ hàng:** `localStorage` với key `shoplite:cart` (`CART_STORAGE_KEY`).
- **Mã giảm giá:** dữ liệu tĩnh `src/data/coupons.ts` (chỉ import từ server). Mã đã áp ở trang thanh toán giữ trong phiên bằng `sessionStorage["shoplite:coupon"]` — **chỉ chuỗi mã**, không lưu tiền; luôn được kiểm tra lại khi mở trang và khi đặt hàng.

## 2. Lệnh thường dùng

```bash
npm run dev                                   # Dev server (Turbopack), http://localhost:3000
npm run check                                 # lint + typecheck + test (chạy trước khi commit)
npm run lint | npm run typecheck | npm test   # từng bước riêng
npx vitest run src/features/cart              # test một thư mục
npx vitest run src/features/cart/cart-reducer.test.ts   # một file
npx vitest run -t "tên test"                  # theo tên test
npm run test:e2e                              # Playwright (tự chạy npm run dev; chỉ e2e/shopping-flow.spec.ts)
npm run format                                # prettier --write . (plugin Tailwind có trong devDependencies)
```

## 3. Codemap

| Capability | Thư mục                  | File quan trọng                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog    | `src/features/catalog/`  | `catalog-service.ts` (`queryProducts`, `parseCatalogQuery`, `getStockStatus`, `PAGE_SIZE`, `LOW_STOCK_THRESHOLD`), `types.ts`; trang `app/products/page.tsx`, `app/products/[slug]/page.tsx`                                                                                                                                                          |
| Cart       | `src/features/cart/`     | `cart-reducer.ts` (`MAX_QUANTITY_PER_ITEM`, `getMaxQuantity`, `cartReducer`), `cart-store.ts` (`cartStore`), `use-cart.ts` (`useCart`), `components/add-to-cart-button.tsx`, `components/product-purchase-panel.tsx`, `components/cart-view.tsx`; trang `app/cart/page.tsx`                                                                           |
| Checkout   | `src/features/checkout/` | `checkout-schema.ts` (`customerSchema`, `checkoutFormSchema`, `placeOrderSchema`, `VN_PHONE_REGEX`, `toFieldErrors`), `pricing.ts` (`SHIPPING_OPTIONS`, `FREE_SHIPPING_THRESHOLD`, `calculateShippingFee`, `calculateOrderTotals`), `components/checkout-form.tsx`; trang `app/checkout/page.tsx`                                                     |
| Orders     | `src/features/orders/`   | `order-service.ts` (`createOrderService`, `placeOrder`, `cancelOrder`), `order-repository.ts` (`OrderRepository`, `createJsonFileOrderRepository`, `createInMemoryOrderRepository`), `server.ts` (singleton `orderService`), `order-errors.ts` (`OrderError`), `types.ts` (`ORDER_STATUSES`); trang `app/orders/page.tsx`, `app/orders/[id]/page.tsx` |
| Coupons    | `src/features/coupons/`  | `coupon-service.ts` (thuần, dùng chung client/server: `normalizeCouponCode`, `checkCouponAvailability`, `evaluateCouponThreshold`, `evaluateCoupon`, `couponErrorMessage`), `coupon-catalog.ts` (`findCoupon`, **chỉ server**), `coupon-schema.ts` (`validateCouponSchema`), `types.ts`, `components/coupon-field.tsx`; dữ liệu `src/data/coupons.ts` |
| API        | `src/app/api/`           | `products/route.ts` (GET), `orders/route.ts` (GET, POST), `orders/[id]/route.ts` (GET, PATCH chỉ hủy đơn), `coupons/validate/route.ts` (POST `{ code }` → `{ coupon }` của đúng mã đó, theo giờ server); `src/lib/http.ts` (`jsonError`, `handleRouteError`, `readJsonBody`)                                                                          |

**Luồng 1 - Thêm vào giỏ:**
`AddToCartButton` / `ProductPurchasePanel` → `useCart().addItem` (`use-cart.ts`) → `cartStore.dispatch({ type: "add" })` (`cart-store.ts`) → `cartReducer` (`cart-reducer.ts`: bỏ qua nếu tồn kho = 0 hoặc quantity < 1, clamp về `getMaxQuantity(stock)`) → `localStorage["shoplite:cart"]` → `emit()` để React render lại. Tab khác nhận sự kiện `storage`.

**Luồng 2 - Đặt hàng:**
`CheckoutForm` (`checkoutFormSchema.safeParse` ở client) → `fetch POST /api/orders` với `{ customer, shippingMethod, paymentMethod, items: [{ productId, quantity }], couponCode? }` (không gửi giá, không gửi số tiền giảm) → `app/api/orders/route.ts` `POST` → `orderService.placeOrder` (`server.ts`) → `placeOrderSchema.safeParse` → `mergeItems` → `getProductById` lấy giá và tồn kho từ catalog → nếu có mã: `evaluateCoupon(findCoupon(code), subtotal, now())` (lỗi → `couponOrderError`, không lưu đơn) → `calculateOrderTotals(items, method, discount)` → `repository.save` (kèm `discount` và snapshot `coupon`) → `storage/orders.json` (ghi `.tmp` rồi `rename`). Thành công: 201, client gọi `clear()` và `router.push("/orders/{id}?placed=1")`. Lỗi: `OrderError` → `handleRouteError` → `{ error: { code, message, details } }` → hiển thị `submitError`; lỗi `COUPON_*` hiển thị cạnh ô mã và **giữ** mã trên trang.

**Luồng 3 - Áp mã giảm giá:**
`CouponField` → `CheckoutForm.handleApplyCoupon` (`validateCouponSchema` ở client) → `POST /api/coupons/validate` (tồn tại + hạn dùng theo giờ server) → `{ coupon }` → client xét ngưỡng bằng `evaluateCouponThreshold` (không dùng giờ máy khách) → lưu `appliedCoupon` + `sessionStorage["shoplite:coupon"]`. Mỗi lần render tính lại theo tạm tính: dưới ngưỡng thì **tạm ngưng** (không trừ tiền, chặn đặt hàng), đủ ngưỡng thì tự có hiệu lực lại.

## 4. Quy ước code

- **Feature-based:** logic, component và test nằm trong `src/features/<tên>/`. `src/app/` chỉ chứa page, layout và route handler. `src/components/` chỉ có UI dùng chung.
- **Đặt tên file:** kebab-case (`cart-reducer.ts`, `add-to-cart-button.tsx`). Component dùng named export (`export function CheckoutForm`). Page và layout là default export vì Next.js yêu cầu.
- **Client Component:** file có `"use client"` ở đầu, ví dụ `checkout-form.tsx`, `cart-view.tsx`, `add-to-cart-button.tsx`, `cancel-order-button.tsx`, `quantity-input.tsx`. Page, route handler, service và `server.ts` không có `"use client"`.
- **Server Component đọc dữ liệu trực tiếp:** `app/orders/page.tsx` và `app/orders/[id]/page.tsx` gọi `orderService` và đặt `export const dynamic = "force-dynamic"`.
- **Zod 4:** schema nằm trong `checkout-schema.ts`; type lấy bằng `z.infer`; validate bằng `safeParse`, lỗi chuyển bằng `toFieldErrors`. Email dùng `z.email()`.
- **Lỗi API:** service throw `OrderError(code, message, details?)`. Route bắt bằng `handleRouteError`. Mã và HTTP status nằm trong `HTTP_STATUS_BY_CODE` (`order-errors.ts`). Lỗi không phải `OrderError` trả 500 `INTERNAL_ERROR`.
- **Ngôn ngữ:** text UI, thông báo lỗi và comment nghiệp vụ viết tiếng Việt. Tên biến, hàm, type viết tiếng Anh.

## 5. Quy tắc nghiệp vụ (không được phá vỡ)

- **Giỏ hàng:** tối đa `MAX_QUANTITY_PER_ITEM = 10` mỗi sản phẩm, và không vượt tồn kho (`getMaxQuantity`). Sản phẩm `stock <= 0` không thêm được.
- **Phí giao hàng** (`pricing.ts`): `standard` 30.000 (`SHIPPING_OPTIONS.standard.fee`), `express` 60.000. Đơn `standard` có **tạm tính sau giảm giá** (`subtotal − discount`) từ `FREE_SHIPPING_THRESHOLD = 500_000` được miễn phí. Express không bao giờ miễn phí. Subtotal <= 0 thì phí = 0.
- **Mã giảm giá:** mỗi đơn tối đa một mã. Kiểm tra theo thứ tự tồn tại → hết hạn (hết ngày `expiresOn` theo giờ VN) → ngưỡng `minSubtotal` (so với tạm tính trước giảm). Phần trăm làm tròn xuống và không vượt `maxDiscount`; số tiền giảm không vượt tạm tính. Lỗi `COUPON_NOT_FOUND` / `COUPON_EXPIRED` / `COUPON_MIN_SUBTOTAL_NOT_MET` đều **422**. Mã không còn hợp lệ lúc đặt → từ chối tạo đơn (không âm thầm bỏ giảm giá). `Order.discount` / `Order.coupon` là snapshot, optional để đơn cũ vẫn đọc được (`?? 0`).
- **Giá do server tính:** `placeOrderSchema` không có trường giá nên Zod loại bỏ mọi giá client gửi lên. `placeOrder` lấy `unitPrice` và `stock` từ `getProductById`. `OrderItem.unitPrice` là snapshot tại thời điểm đặt.
- **Tồn kho khi đặt:** `mergeItems` cộng các dòng trùng `productId` trước, rồi `quantity > product.stock` → `INSUFFICIENT_STOCK` (409).
- **Hủy đơn:** `cancelOrder` chỉ chạy khi `status === "pending"`, nếu không trả `INVALID_STATUS_TRANSITION` (409). `PATCH /api/orders/[id]` chỉ nhận đúng `{ "status": "cancelled" }`. Đơn mới luôn có `status: "pending"`.

## 6. Testing

- **Vị trí:** test nằm cạnh file nguồn, `src/**/*.test.{ts,tsx}`. Thư mục `e2e/` chỉ dành cho Playwright.
- **Môi trường:** mặc định jsdom. File test chạm file hệ thống hoặc route handler khai báo `// @vitest-environment node`, ví dụ `order-repository.test.ts`, `route.test.ts`.
- **File hệ thống:** `order-repository.test.ts` dùng `mkdtemp(os.tmpdir())` và `rm` sau mỗi test. Test không được ghi vào `storage/orders.json`.
- **Repository in-memory:** `createInMemoryOrderRepository` dùng trong `order-service.test.ts`, và trong `route.test.ts` qua `vi.mock("@/features/orders/server", ...)`.
- **Inject dependency:** `createOrderService` nhận `repository`, `findProduct`, `findCoupon`, `now`, `generateId`. Test cố định thời gian, mã và ID bằng cách truyền các hàm này. Route test cần giờ cố định dùng `vi.useFakeTimers({ toFake: ["Date"] })`.
- **Trạng thái global:** `vitest.setup.ts` xóa `localStorage` và `sessionStorage` sau mỗi test. Giỏ hàng là state module, nên test phải gọi `cartStore.reset()` trước khi dựng dữ liệu (ví dụ `checkout-form.test.tsx`).
- **Mock UI:** `checkout-form.test.tsx` mock `next/navigation` và dùng `vi.stubGlobal("fetch")`.

## 7. Không được làm

- Đưa giá hoặc tổng tiền từ client vào `placeOrderSchema` hoặc `placeOrder`.
- Import `features/orders/server.ts` từ file có `"use client"`. Chỉ import từ `app/**`.
- Import `features/coupons/coupon-catalog.ts` hoặc `src/data/coupons.ts` từ file có `"use client"` (lộ toàn bộ danh sách mã ra trình duyệt).
- Lưu số tiền giảm / tổng tiền vào `sessionStorage` hoặc gửi lên server; client chỉ giữ và gửi **chuỗi mã**.
- Xét hạn dùng mã bằng giờ máy khách; client chỉ dùng `evaluateCouponThreshold`, hạn dùng do server kiểm tra.
- Ghi giỏ hàng thẳng vào `localStorage`. Mọi thay đổi đi qua `cartStore.dispatch`.
- Hardcode phí ship, ngưỡng miễn phí hoặc giới hạn số lượng trong component. Dùng `pricing.ts` và `cart-reducer.ts`.
- Thay repository mà không giữ nguyên interface `OrderRepository`.
- Throw `Error` thường trong `order-service.ts` thay vì `OrderError`.
- Thêm `"use client"` vào page, route handler hoặc service.

## 8. Definition of Done

- `npm run check` pass (lint, typecheck, test).
- Thay đổi logic có test cạnh file nguồn. Nếu đổi hằng số (`MAX_QUANTITY_PER_ITEM`, `SHIPPING_OPTIONS`, `FREE_SHIPPING_THRESHOLD`), cập nhật `pricing.test.ts` và `cart-reducer.test.ts`.
- Đổi contract API: cập nhật `src/app/api/orders/route.test.ts` và mã lỗi trong `order-errors.ts`.
- Đổi luồng giỏ hàng hoặc đặt hàng: chạy `npm run test:e2e` và xác nhận `e2e/shopping-flow.spec.ts` pass.
- Chạy `npm run format` trước khi commit.

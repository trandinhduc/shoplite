# AGENTS.md - ShopLite

Hướng dẫn cho mọi AI coding agent làm việc trên repo này.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Tổng quan

- **Stack:** Next.js 16.4 (App Router, Turbopack) · React 19.3 · TypeScript · Tailwind CSS v4 · Zod 4 · Vitest 5 + Testing Library (jsdom) · Playwright (Chromium). Node >= 22.12.
- **Nơi lưu dữ liệu:**
  - Sản phẩm, danh mục và mã giảm giá: TypeScript tĩnh trong `src/data/` (chỉ đọc).
  - Giỏ hàng: `localStorage`, key `shoplite:cart`, chỉ ở client.
  - Đơn hàng: file JSON, mặc định `storage/orders.json`, đổi bằng env `ORDERS_FILE`.
- Mã UI và comment nghiệp vụ viết bằng tiếng Việt.

## 2. Lệnh thường dùng

```bash
npm run dev                                   # dev server (Turbopack), http://localhost:3000
npm run check                                 # lint + typecheck + test (chạy trước khi commit)
npm test                                      # toàn bộ unit/component test
npx vitest run src/features/cart              # test một thư mục
npx vitest run src/features/cart/cart-reducer.test.ts   # test một file
npx vitest run -t "tên test"                  # test theo tên
npm run test:e2e                              # Playwright (tự khởi động dev server)
npx playwright test e2e/shopping-flow.spec.ts # một spec e2e
npm run format                                # Prettier (kèm sắp xếp class Tailwind)
```

Lần đầu chạy e2e: `npx playwright install chromium`.

## 3. Codemap

| Capability | Thư mục | File quan trọng |
| --- | --- | --- |
| Catalog (lọc, sắp xếp, phân trang) | `src/features/catalog/` | `catalog-service.ts`: `parseCatalogQuery`, `queryProducts`, `PAGE_SIZE = 8`, `LOW_STOCK_THRESHOLD = 5`; `components/catalog-filters.tsx` |
| Giỏ hàng | `src/features/cart/` | `cart-reducer.ts`: `MAX_QUANTITY_PER_ITEM = 10`, `getMaxQuantity`, `cartReducer`; `cart-store.ts`: `CART_STORAGE_KEY`; `use-cart.ts`: `useCart`; `components/add-to-cart-button.tsx` |
| Thanh toán | `src/features/checkout/` | `checkout-schema.ts`: `checkoutFormSchema` (client), `placeOrderSchema` (server), `VN_PHONE_REGEX`; `pricing.ts`: `SHIPPING_OPTIONS`, `FREE_SHIPPING_THRESHOLD`, `calculateOrderTotals(lines, method, discountAmount)`; `components/checkout-form.tsx` |
| Mã giảm giá | `src/features/coupons/` | `coupon-service.ts`: `normalizeCouponCode`, `findCoupon`, `evaluateCoupon`, `describeCouponFailure` (thuần, dùng được ở client); `components/coupon-input.tsx`; dữ liệu mã ở `src/data/coupons.ts` |
| Đơn hàng | `src/features/orders/` | `order-service.ts`: `createOrderService`, `placeOrder`, `cancelOrder`; `order-repository.ts`: `OrderRepository`, `createJsonFileOrderRepository`, `createInMemoryOrderRepository`; `server.ts`: singleton `orderService`; `order-errors.ts`: `OrderError`; `components/order-totals.tsx` |
| API | `src/app/api/` | `products/route.ts`, `products/[slug]/route.ts`, `orders/route.ts`, `orders/[id]/route.ts`; `src/lib/http.ts`: `jsonError`, `handleRouteError`, `readJsonBody` |
| Tiện ích | `src/lib/` | `format.ts`: `formatCurrency`, `normalizeText`; `cn.ts` |

### Luồng 1: thêm vào giỏ hàng

1. `add-to-cart-button.tsx` (hoặc `product-purchase-panel.tsx`) gọi `addItem` từ `useCart()`.
2. `use-cart.ts` dispatch action `add` vào `cartStore.dispatch`.
3. `cart-reducer.ts` kiểm tra: không thêm nếu `getMaxQuantity(stock) === 0`; số lượng được kẹp bởi `clampQuantity` về `min(stock, 10)`.
4. `cart-store.ts` ghi state vào `localStorage["shoplite:cart"]` và phát sự kiện cho `useSyncExternalStore`. Các tab khác đồng bộ qua sự kiện `storage`.

Giỏ hàng không gọi server. Giá trong giỏ chỉ để hiển thị.

### Luồng 2: đặt hàng (component -> lưu trữ)

1. `checkout-form.tsx` validate bằng `checkoutFormSchema`. Nếu lỗi, hiển thị lỗi và dừng.
2. `fetch("POST /api/orders")` với `customer`, `shippingMethod`, `paymentMethod`, `items: [{productId, quantity}]` và tùy chọn `couponCode`. Client không gửi giá, số tiền giảm hay tổng tiền.
3. `src/app/api/orders/route.ts` gọi `orderService.placeOrder(body)`.
4. `placeOrder` validate bằng `placeOrderSchema`, gộp dòng trùng qua `mergeItems`, lấy sản phẩm từ `getProductById`, kiểm tra `quantity > product.stock`, rồi tạo dòng đơn với `unitPrice` từ catalog.
5. Nếu có `couponCode`, `placeOrder` gọi `evaluateCoupon` trên tiền hàng tính từ giá catalog (mã sai thì ném `COUPON_*`); `calculateOrderTotals` (từ `pricing.ts`) tính `subtotal`, `shippingFee`, `discountAmount`, `total`; `order.discount = { code, amount }` chỉ có khi dùng mã.
6. `repository.save(order)` ghi vào file JSON, qua `writeAll` (ghi file `.tmp` rồi `rename`).
7. Trả về `201` với order. Client chuyển đến `/orders/[id]?placed=1` và gọi `clear()` giỏ hàng.

Hủy đơn: `cancel-order-button.tsx` -> `PATCH /api/orders/:id` với `{"status":"cancelled"}` -> `orderService.cancelOrder`, chỉ cho phép khi `status === "pending"`.

## 4. Quy ước code

- **Feature-based:** logic, type, component và test của một tính năng nằm cùng thư mục `src/features/<tên>/`. `src/app/` chỉ chứa page, layout và route handler, không chứa logic nghiệp vụ.
- **Tên file:** kebab-case (`order-service.ts`, `add-to-cart-button.tsx`). Test đặt cạnh file nguồn, đuôi `.test.ts(x)`.
- **Server/Client:** mặc định là Server Component. Chỉ thêm `"use client"` khi cần hook hoặc sự kiện (hiện 11 file). `features/orders/server.ts` đọc và ghi file hệ thống, chỉ được import từ code chạy trên server.
- **Zod:** mọi input từ bên ngoài đều validate bằng schema trong `checkout-schema.ts`. Form client và API dùng chung schema hoặc schema tương ứng, không viết validate thủ công.
- **Lỗi API:** nghiệp vụ throw `OrderError(code, message, details?)`. Route dùng `handleRouteError` để trả `{ error: { code, message, details? } }`. Mã và HTTP status được định nghĩa trong `HTTP_STATUS_BY_CODE` (`order-errors.ts`). Route body sai JSON dùng `readJsonBody` và `jsonError(400, ...)`.
- **Text tiếng Việt:** thông báo lỗi, nhãn và message API hiển thị cho người dùng đều bằng tiếng Việt, giống các chuỗi hiện có.

## 5. Quy tắc nghiệp vụ (không được phá vỡ)

- **Giới hạn giỏ hàng:** mỗi sản phẩm tối đa `MAX_QUANTITY_PER_ITEM = 10` và không vượt tồn kho. Sản phẩm `stock <= 0` không thêm được (`getMaxQuantity`).
- **Phí giao hàng** (`pricing.ts`): `standard` = 30.000 ₫, `express` = 60.000 ₫. Đơn `standard` từ `FREE_SHIPPING_THRESHOLD = 500_000` được miễn phí. Giỏ rỗng (`subtotal <= 0`) thì phí bằng 0. `express` không bao giờ miễn phí.
- **Giá do server tính:** `placeOrder` lấy `price` từ catalog và bỏ qua mọi giá client gửi. Mọi tổng tiền đi qua `calculateOrderTotals`, không tự cộng ở chỗ khác.
- **Hủy đơn:** chỉ khi `status === "pending"`, nếu không trả `INVALID_STATUS_TRANSITION` (409).
- **Tồn kho:** `placeOrder` trả `INSUFFICIENT_STOCK` (409) khi số lượng vượt `stock`, và `PRODUCT_NOT_FOUND` (422) khi không tìm thấy sản phẩm.
- **Mã giảm giá** (`coupons/coupon-service.ts`, dữ liệu `src/data/coupons.ts`): mỗi đơn tối đa một mã; mã nhập tối đa 32 ký tự, không phân biệt hoa thường, bỏ khoảng trắng đầu/cuối. Mức giảm `percent` là `floor(tiền hàng × %)` rồi bị chặn bởi `maxDiscount`; mọi mức giảm không vượt tiền hàng, tổng không âm. Điều kiện `minOrderValue` xét trên tiền hàng trước giảm (đúng bằng thì hợp lệ). Mã hết hạn từ 00:00 ngày kế tiếp (UTC+7). Phí ship và ngưỡng miễn phí 500.000 ₫ luôn xét trên tiền hàng **trước** giảm. Thứ tự báo lỗi: không tồn tại → hết hạn → chưa đủ tối thiểu, tương ứng `COUPON_NOT_FOUND` / `COUPON_EXPIRED` / `COUPON_MIN_ORDER_NOT_MET` (422, `details.shortfall` là số đồng còn thiếu). Client chỉ xem trước; server luôn tính lại và đơn lưu `discount` bất biến. Đơn cũ không có `discount` vẫn hợp lệ.
- **Mã đơn:** dạng `SL-YYYYMMDD-XXXXXX` (`generateOrderId`).

## 6. Testing

- **Vị trí:** unit và component test nằm cạnh file nguồn trong `src/**/*.test.{ts,tsx}`. Vitest chỉ quét `src/`. Cấu hình ở `vitest.config.mts`, setup ở `vitest.setup.ts` (dọn `localStorage` sau mỗi test).
- **Code dùng file hệ thống:** test không đụng `storage/orders.json`. Dùng `createInMemoryOrderRepository(seed?)` và truyền vào `createOrderService({ repository, findProduct?, now?, generateId? })`. Ví dụ: `src/features/orders/order-service.test.ts` và `src/app/api/orders/route.test.ts`.
- **Repository JSON:** được test riêng trong `order-repository.test.ts`, dùng file tạm.
- **E2E:** `e2e/shopping-flow.spec.ts` (chromium). Không nằm trong `npm run check`, cần chạy riêng khi đổi luồng UI.

## 7. Không được làm

- Không tin giá, tổng tiền hay phí ship do client gửi. Không thêm trường giá vào payload `POST /api/orders`.
- Không import `features/orders/server.ts` (hoặc `orderService`) từ file có `"use client"`.
- Không gọi `repository` trực tiếp từ route handler. Route chỉ gọi `orderService`.
- Không ghi trực tiếp vào `storage/orders.json` trong test hoặc code. Dùng repository in-memory.
- Không đặt logic tính tiền, giới hạn số lượng hoặc chuyển trạng thái trong component hoặc route. Đặt trong `pricing.ts`, `cart-reducer.ts`, `order-service.ts`.

## 8. Definition of Done

- `npm run check` pass (lint, typecheck, toàn bộ unit test).
- Logic nghiệp vụ mới hoặc thay đổi có test trong `src/features/<tên>/`, dùng repository in-memory nếu cần đơn hàng.
- Khi đổi luồng giỏ hàng, thanh toán hoặc đặt hàng: chạy `npm run test:e2e` và pass.
- Text người dùng bằng tiếng Việt, lỗi API đi qua `OrderError` / `handleRouteError`.

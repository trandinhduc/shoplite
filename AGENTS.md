# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Tổng quan

- Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Zod 4, Vitest + Testing Library, Playwright. Node >= 22.12.
- Sản phẩm, danh mục: dữ liệu tĩnh trong `src/data/products.ts`, `src/data/categories.ts`.
- Giỏ hàng: chỉ ở trình duyệt, `localStorage` key `CART_STORAGE_KEY = "shoplite:cart"`.
- Đơn hàng: file JSON `DEFAULT_ORDERS_FILE` = `storage/orders.json` (gitignore), đổi bằng env `ORDERS_FILE`.

## 2. Lệnh thường dùng

```bash
npm run dev                                   # http://localhost:3000
npm run check                                 # lint + typecheck + test
npx vitest run src/features/orders            # test một thư mục (hoặc một file)
npx vitest run -t "<tên test>"                # test theo tên
npm run test:e2e                              # Playwright, tự chạy `npm run dev`; lần đầu: npx playwright install chromium
npm run format                                # Prettier (+ prettier-plugin-tailwindcss)
```

`npm run typecheck` chạy `next typegen` trước `tsc` để sinh kiểu `PageProps<"/route">` / `RouteContext<"/api/...">`.

## 3. Codemap

| Capability | Thư mục                                        | File quan trọng                                                                                                                                                                                                                         |
| ---------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog    | `src/features/catalog/`                        | `catalog-service.ts` (`parseCatalogQuery`, `queryProducts`, `getProductById`, `PAGE_SIZE`), `types.ts`                                                                                                                                  |
| Cart       | `src/features/cart/`                           | `cart-reducer.ts` (`cartReducer`, `getMaxQuantity`), `cart-store.ts` (`cartStore`), `use-cart.ts` (`useCart`)                                                                                                                           |
| Checkout   | `src/features/checkout/`                       | `checkout-schema.ts` (`checkoutFormSchema`, `placeOrderSchema`, `toFieldErrors`), `pricing.ts` (`calculateOrderTotals`)                                                                                                                 |
| Orders     | `src/features/orders/`                         | `order-service.ts` (`createOrderService`), `order-repository.ts`, `order-errors.ts` (`OrderError`), `server.ts`                                                                                                                         |
| Coupons    | `src/features/coupons/`, `src/data/coupons.ts` | `coupon-rules.ts` (hàm thuần, client dùng được: `normalizeCouponCode`, `evaluateCoupon`, `isCouponExpired`), `coupon-service.ts` (chỉ server: `findCouponByCode`, `validateCouponCode`, `toCouponError`), `components/coupon-field.tsx` |
| API        | `src/app/api/`, `src/lib/`                     | `api/products/route.ts`, `api/products/[slug]/route.ts`, `api/orders/route.ts`, `api/orders/[id]/route.ts`, `api/coupons/validate/route.ts`, `lib/http.ts`                                                                              |

Trang trong `src/app/**/page.tsx` là Server Component, gọi thẳng service (`queryProducts`, `orderService.listOrders()`), không gọi qua HTTP API.

**Luồng thêm vào giỏ hàng**

1. `ProductPurchasePanel` / `AddToCartButton` (`features/cart/components/`) gọi `useCart().addItem(product, quantity)`.
2. `addItem` → `cartStore.dispatch({ type: "add", item: toCartItem(product), quantity })`.
3. `cartReducer` kẹp số lượng bằng `getMaxQuantity(stock)` (min(stock, `MAX_QUANTITY_PER_ITEM`)).
4. `cartStore` ghi `localStorage[CART_STORAGE_KEY]`, báo cho listener; `useCart` đọc qua `useSyncExternalStore`. Sự kiện `storage` đồng bộ giữa các tab.

**Luồng đặt hàng**

1. (Tùy chọn) `CouponField` gọi `POST /api/coupons/validate` lấy quy tắc của mã; `CheckoutForm` hiển thị số tiền giảm bằng `evaluateCoupon(rule, subtotal)` (chỉ để hiển thị).
   `CheckoutForm` validate bằng `checkoutFormSchema.safeParse`, rồi `fetch("POST /api/orders")` với `items` chỉ gồm `{ productId, quantity }` và `couponCode` (không gửi số tiền).
2. `app/api/orders/route.ts` → `readJsonBody` → `orderService.placeOrder(body)` (từ `features/orders/server.ts`).
3. `placeOrder`: `placeOrderSchema.safeParse` → gộp dòng trùng → `findProduct` (mặc định `getProductById`) lấy giá + kiểm tra tồn kho → nếu có `couponCode`: `findCoupon` → `isCouponExpired(rule, now())` → `evaluateCoupon` (lỗi → `OrderError` `COUPON_*`, không lưu đơn) → `calculateOrderTotals(items, method, discount)` → `repository.save(order)`.
4. `createJsonFileOrderRepository` ghi file tạm `.tmp` rồi `rename` sang `orders.json`.
5. Thành công: form gọi `clear()` giỏ hàng và chuyển tới `/orders/{id}?placed=1`. Lỗi: route trả `handleRouteError(error)`.

## 4. Quy ước code

- Feature-based: logic, component, test của một tính năng nằm trong `src/features/<feature>/`; `src/app/` chỉ chứa route. UI dùng chung ở `src/components/`, tiện ích ở `src/lib/`. Import bằng alias `@/` → `src/`.
- Tên file kebab-case (`order-service.ts`, `cart-item-row.tsx`); test đặt cạnh file: `<tên>.test.ts(x)`.
- Mặc định Server Component. Chỉ thêm `"use client"` cho phần tương tác (cart, checkout form, filters, cancel button…). Dữ liệu chỉ có ở trình duyệt thì dùng `hydrated` từ `useCart()` / `useHydrated()` để tránh lệch hydrate.
- Zod: schema đặt trong `checkout-schema.ts`, dùng chung client và server; chuyển lỗi bằng `toFieldErrors` (key dạng `"customer.phone"`).
- Lỗi API: service ném `OrderError(code, message, details?)`; mã HTTP lấy từ `HTTP_STATUS_BY_CODE` qua `error.httpStatus`. Route handler bọc try/catch và trả `handleRouteError(error)`; lỗi tự tạo dùng `jsonError(status, code, message)`. Body luôn là `{ error: { code, message, details? } }` (`ApiErrorBody`).
- Hằng số dạng `as const` + type suy ra (`SHIPPING_METHODS`, `PAYMENT_METHODS`, `ORDER_STATUSES`, `SORT_OPTIONS`).
- Text hiển thị, thông báo lỗi, comment, tên test viết bằng tiếng Việt. Format tiền/ngày bằng `formatCurrency` / `formatDateTime` (`lib/format.ts`).

## 5. Quy tắc nghiệp vụ không được phá vỡ

- Giỏ hàng: tối đa `MAX_QUANTITY_PER_ITEM = 10` mỗi sản phẩm và không vượt `stock` (`getMaxQuantity`); sản phẩm `stock = 0` không thêm được. `placeOrderSchema` cũng giới hạn `quantity` ≤ `MAX_QUANTITY_PER_ITEM`.
- Phí ship (`pricing.ts`): `standard` 30_000, `express` 60_000 (`SHIPPING_OPTIONS`); `standard` miễn phí khi subtotal ≥ `FREE_SHIPPING_THRESHOLD = 500_000`; subtotal ≤ 0 thì phí 0 (`calculateShippingFee`).
- Giá do server tính: `placeOrder` lấy `unitPrice` từ catalog và tính tổng bằng `calculateOrderTotals`; không bao giờ dùng giá/tổng tiền client gửi lên. Tồn kho cũng kiểm tra lại ở server (`INSUFFICIENT_STOCK`).
- Hủy đơn: `cancelOrder` chỉ cho phép khi `status === "pending"`, ngược lại ném `INVALID_STATUS_TRANSITION` (409). `PATCH /api/orders/:id` chỉ nhận `{ "status": "cancelled" }`.
- Mã giảm giá: mỗi đơn một mã; giảm trên tạm tính, làm tròn xuống, không vượt `maxDiscount` và tạm tính; phí ship xét trên tạm tính TRƯỚC giảm. Server tự tra mã và tính `discount`; hết hạn chỉ xét bằng đồng hồ server (client không tự gỡ mã theo giờ máy). Mã không dùng được lúc đặt hàng → `COUPON_NOT_FOUND` / `COUPON_EXPIRED` / `COUPON_MIN_SUBTOTAL_NOT_MET` (422), không lưu đơn. Đơn không dùng mã không có trường `couponCode`/`discount` (đơn cũ vẫn hiển thị đúng).

## 6. Testing

- Unit/component test: `src/**/*.test.{ts,tsx}` (Vitest, môi trường `jsdom` mặc định). `vitest.setup.ts` gọi `cleanup()` và xóa `localStorage` sau mỗi test. E2E: `e2e/*.spec.ts`.
- Code dùng file hệ thống / Route Handler: thêm dòng đầu `// @vitest-environment node`. Test `createJsonFileOrderRepository` dùng thư mục tạm (`mkdtemp(tmpdir())`), không đụng `storage/`.
- Test route/service: dùng `createInMemoryOrderRepository()` thay file. Route test mock singleton bằng `vi.mock("@/features/orders/server", ...)` trả về `createOrderService({ repository: createInMemoryOrderRepository() })` (xem `app/api/orders/route.test.ts`). `createOrderService` còn nhận `findProduct`, `findCoupon`, `now`, `generateId` để cố định dữ liệu.
- Test `cartStore`: gọi `cartStore.reset()` trong `beforeEach` (store giữ state ở cấp module). `reset()` chỉ buộc đọc lại `localStorage`, không xóa: muốn đổi giỏ trong cùng test thì `localStorage.clear()` trước.

## 7. Không được làm

- Không import `features/orders/server.ts` (hoặc `order-repository.ts` bản file) vào Client Component.
- Không import `src/data/coupons.ts` hay `features/coupons/coupon-service.ts` vào component (`*.tsx`) — ESLint chặn; client chỉ dùng `coupon-rules.ts`.
- Không tin giá, tổng tiền, tồn kho từ client; không bỏ bước `placeOrderSchema` ở server.
- Không ghi trực tiếp `storage/orders.json` hay dùng file thật trong unit test.
- Không đặt business logic trong `src/app/`; đưa vào `src/features/`.
- Không trả lỗi API khác dạng `ApiErrorBody`; không throw `Error` thường cho lỗi nghiệp vụ (dùng `OrderError`, thêm code mới vào `OrderErrorCode` + `HTTP_STATUS_BY_CODE`).
- Không hard-code lại các hằng số nghiệp vụ (10, 30_000, 500_000…) — import từ `cart-reducer.ts` / `pricing.ts`.
- Không bật lại `agentRules` trong `next.config.ts`.

## 8. Definition of Done

- `npm run check` pass (lint + typecheck + test).
- Logic mới có test cạnh file; thay đổi API có test route với repository in-memory.
- Thay đổi luồng mua hàng/đặt hàng: `npm run test:e2e` pass.
- Quy tắc ở mục 5 vẫn đúng; text mới bằng tiếng Việt; đã chạy `npm run format`.

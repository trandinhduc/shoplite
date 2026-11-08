# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Tổng quan

ShopLite - cửa hàng đồ công nghệ mini. Stack: Next.js 16 (App Router) + React 19 + TypeScript strict +
Tailwind CSS v4 + Zod 4. Test: Vitest + Testing Library, Playwright cho E2E. Node >= 22.12.

- Sản phẩm, danh mục: dữ liệu tĩnh `src/data/products.ts`, `src/data/categories.ts` (chỉ đọc).
- Giỏ hàng: localStorage phía trình duyệt, key `CART_STORAGE_KEY = "shoplite:cart"`.
- Đơn hàng: file JSON `storage/orders.json` (đổi bằng env `ORDERS_FILE`). Không có database.

## 2. Lệnh thường dùng

```bash
npm run dev                      # dev server (Turbopack) tại :3000
npm run check                    # lint + typecheck + test - chạy trước khi commit
npx vitest run src/features/cart # test một thư mục (hoặc một file)
npx vitest run -t "tên test"     # test theo tên
npm run test:e2e                 # Playwright, tự chạy `npm run dev` (lần đầu: npx playwright install chromium)
npm run format                   # Prettier; kiểm tra không sửa: npm run format:check
```

`npm run typecheck` chạy `next typegen` trước `tsc` để sinh kiểu `PageProps<...>` / `RouteContext<...>`.

## 3. Codemap

| Capability | Thư mục             | File quan trọng                                                                                                                             |
| ---------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog    | `features/catalog`  | `catalog-service.ts` (`parseCatalogQuery`, `queryProducts`, `PAGE_SIZE`), `types.ts`                                                        |
| Cart       | `features/cart`     | `cart-reducer.ts` (`cartReducer`, `MAX_QUANTITY_PER_ITEM`), `cart-store.ts`, `use-cart.ts`                                                  |
| Checkout   | `features/checkout` | `pricing.ts` (`calculateOrderTotals`), `checkout-schema.ts` (`placeOrderSchema`), `components/checkout-form.tsx`                            |
| Orders     | `features/orders`   | `order-service.ts`, `order-repository.ts`, `order-errors.ts`, `server.ts`                                                                   |
| Coupons    | `features/coupons`  | `coupon-rules.ts` (dùng chung), `coupon-service.ts` (chỉ server), `coupon-store.ts`, `use-applied-coupon.ts`; dữ liệu `src/data/coupons.ts` |
| API        | `app/api`           | `products/route.ts`, `orders/route.ts`, `orders/[id]/route.ts`, `coupons/validate/route.ts`, `lib/http.ts`                                  |

Bộ lọc/sắp xếp/phân trang của trang `/products` nằm trên URL search params, parse bằng `parseCatalogQuery`.

**Luồng thêm vào giỏ hàng** (hoàn toàn phía client):
`ProductPurchasePanel` (trang `/products/[slug]`) hoặc `AddToCartButton` (trong `ProductCard`)
→ `useCart().addItem` → `cartStore.dispatch({ type: "add" })` → `cartReducer` kẹp số lượng bằng
`getMaxQuantity(stock)` → `writeToStorage` ghi localStorage → `useSyncExternalStore` render lại;
sự kiện `storage` đồng bộ giữa các tab.

**Luồng đặt hàng**:
`CheckoutForm` validate bằng `checkoutFormSchema` → `fetch POST /api/orders` (chỉ gửi `productId`, `quantity`)
→ `app/api/orders/route.ts` → `orderService.placeOrder` (`features/orders/server.ts`) → `placeOrderSchema`
→ `mergeItems` → lấy giá/tồn kho qua `getProductById` → `calculateOrderTotals` → `repository.save`
→ `createJsonFileOrderRepository` ghi file tạm rồi `rename` vào `storage/orders.json`
→ client `clear()` giỏ và chuyển tới `/orders/{id}?placed=1`.

**Luồng mã giảm giá**: `CouponField` → `useAppliedCoupon().apply` → `POST /api/coupons/validate`
(`validateCoupon` + giá catalog) → `couponStore` (localStorage `shoplite:coupon`, chỉ để hiển thị)
→ `calculateOrderTotals(lines, method, discount)`. Khi đặt hàng chỉ gửi `couponCode`; `placeOrder` gọi
lại `validateCoupon` theo giờ server và lưu `couponCode`, `discount` vào đơn.

## 4. Quy ước code

- Feature-based: `src/app/` chỉ chứa page và Route Handler; logic, component, test của tính năng nằm ở
  `src/features/<tên>/`. UI dùng chung ở `src/components/`, tiện ích ở `src/lib/`. Import qua alias `@/`.
- Tên file kebab-case (`cart-item-row.tsx`, `order-service.ts`); test đặt cạnh file: `*.test.ts(x)`.
- Mặc định là Server Component; chỉ thêm `"use client"` cho component dùng hook/state/sự kiện
  (`add-to-cart-button.tsx`, `checkout-form.tsx`, `cancel-order-button.tsx`...).
- Dữ liệu phụ thuộc localStorage dùng cờ `hydrated` / `useHydrated()` để tránh lệch khi hydrate.
- Service tạo bằng factory nhận dependency: `createOrderService({ repository, findProduct?, now?, generateId? })`.
- Validate input bằng Zod trong `checkout-schema.ts`; chuyển lỗi sang `{ "field.path": message }` bằng `toFieldErrors`.
- Lỗi nghiệp vụ: ném `OrderError(code, message, details?)`; mã mới phải thêm vào `OrderErrorCode` và
  `HTTP_STATUS_BY_CODE`. Route Handler bọc try/catch và trả `handleRouteError(error)`; lỗi đầu vào dùng
  `jsonError(...)`. Body lỗi luôn là `{ error: { code, message, details? } }`.
- Trang đọc đơn hàng đặt `export const dynamic = "force-dynamic"`.
- Mọi text hiển thị, thông báo lỗi, comment và tên test viết bằng tiếng Việt. Tiền định dạng bằng
  `formatCurrency` (`lib/format.ts`).

## 5. Quy tắc nghiệp vụ không được phá vỡ

- Giỏ hàng: mỗi sản phẩm tối đa `MAX_QUANTITY_PER_ITEM` (10) và không vượt `stock` (`getMaxQuantity`);
  sản phẩm `stock === 0` không thêm được. `placeOrderSchema` cũng giới hạn `quantity` tối đa 10.
- Phí ship (`pricing.ts`): `standard` 30.000 ₫, miễn phí khi tạm tính >= `FREE_SHIPPING_THRESHOLD` (500.000 ₫);
  `express` 60.000 ₫, không bao giờ miễn phí; giỏ trống phí = 0. Chỉ sửa quy tắc tại `calculateShippingFee`.
- Giá do server tính: `placeOrder` lấy `unitPrice` từ catalog và tính lại tổng bằng `calculateOrderTotals`,
  bỏ qua mọi giá client gửi; kiểm tra tồn kho (`INSUFFICIENT_STOCK`).
- Hủy đơn: `cancelOrder` chỉ cho phép khi `status === "pending"` (ngược lại `INVALID_STATUS_TRANSITION`, 409);
  `PATCH /api/orders/:id` chỉ nhận `{ "status": "cancelled" }`.
- Mã giảm giá: giá trị tối thiểu so với tạm tính **trước** giảm; ngưỡng miễn phí ship (`FREE_SHIPPING_THRESHOLD`)
  so với tạm tính **sau** giảm; giảm giá không trừ vào phí ship, tối đa bằng tạm tính. Đơn cũ không có
  `discount`/`couponCode` - đọc bằng `order.discount ?? 0`.
- Mã đơn `SL-YYYYMMDD-XXXXXX` (`generateOrderId`) - E2E kiểm tra đúng định dạng này.

## 6. Testing

- Unit/component test: `src/**/*.test.{ts,tsx}`, môi trường mặc định `jsdom`. E2E: `e2e/*.spec.ts`.
- Code dùng file hệ thống / Route Handler: đặt `// @vitest-environment node` ở dòng đầu file test.
  `order-repository.test.ts` test bản JSON-file trên file tạm, không ghi vào `storage/`.
- Test service và route dùng `createInMemoryOrderRepository()`; test route mock module:
  `vi.mock("@/features/orders/server", ...)` trả về `createOrderService({ repository: createInMemoryOrderRepository() })`.
- Inject `now` / `generateId` vào `createOrderService` để kết quả cố định.
- `vitest.setup.ts` xóa localStorage sau mỗi test; gọi `cartStore.reset()` để store đọc lại localStorage.
- E2E dựa vào label tiếng Việt và `data-testid` (`product-card`, `purchase-panel`, `cart-count`,
  `cart-total`, `order-row`, `shipping-fee`, `checkout-total`, `discount`) - không đổi khi sửa UI trừ khi cập nhật luôn E2E.

## 7. Không được làm

- Không import `@/features/orders/server` (hoặc `order-repository.ts`) từ Client Component - nó dùng `node:fs`.
- Không import `src/data/coupons.ts` hoặc `coupon-service.ts` từ Client Component - lộ danh sách mã ra trình duyệt.
- Không tin giá/tổng tiền từ client; không thêm field giá vào payload `POST /api/orders`.
- Không hard-code phí ship, ngưỡng miễn phí, giới hạn số lượng ngoài `pricing.ts` / `cart-reducer.ts`.
- Không để test ghi vào `storage/orders.json`; không commit `storage/` hay file `.env*`.
- Không bật lại `agentRules` trong `next.config.ts` (đang `false` để `next dev` không tự sửa AGENTS.md).
- Không bỏ qua `npm run check` hay dùng `--no-verify` khi commit.

## 8. Definition of Done

- `npm run check` pass (lint + typecheck + test).
- Logic mới/sửa có test đặt cạnh file; lỗi nghiệp vụ mới có test cho mã lỗi và HTTP status.
- Thay đổi luồng UI (giỏ hàng, thanh toán, đơn hàng) thì chạy thêm `npm run test:e2e`.
- `npm run format:check` sạch.
- Các quy tắc ở mục 5 vẫn đúng; text mới bằng tiếng Việt.

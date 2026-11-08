# ShopLite — Hướng dẫn cho AI Agent (GEMINI.md)

## 1. Tổng quan

- Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4. Validate bằng Zod 4. Node >= 22.12.0.
- Test: Vitest (unit/component, jsdom) + Playwright (e2e).
- Nơi lưu dữ liệu:
  - Sản phẩm/danh mục: dữ liệu tĩnh trong `src/data/products.ts`, `src/data/categories.ts`.
  - Giỏ hàng: `localStorage` của trình duyệt, key `CART_STORAGE_KEY = "shoplite:cart"` (`src/features/cart/cart-store.ts`).
  - Đơn hàng: file JSON trên đĩa, `DEFAULT_ORDERS_FILE = storage/orders.json` (ghi đè qua biến môi trường `ORDERS_FILE`), xem `src/features/orders/order-repository.ts`.

## 2. Lệnh thường dùng

```bash
npm run dev                       # Server phát triển (next dev)
npm run check                     # lint + typecheck + test (chạy trước khi commit)
npx vitest run src/features/cart  # Test một thư mục/đường dẫn cụ thể
npm run test:e2e                  # Playwright e2e (playwright test)
npm run format                    # prettier --write .  (format:check để chỉ kiểm tra)
```

## 3. Codemap

| Capability | Thư mục | File quan trọng |
|---|---|---|
| Catalog | `src/features/catalog` | `catalog-service.ts` (`queryProducts`, `parseCatalogQuery`, `PAGE_SIZE=8`, `LOW_STOCK_THRESHOLD=5`, `getProductById`) |
| Cart | `src/features/cart` | `cart-reducer.ts` (`cartReducer`, `MAX_QUANTITY_PER_ITEM=10`, `getMaxQuantity`), `cart-store.ts`, `use-cart.ts` |
| Checkout | `src/features/checkout` | `pricing.ts` (`calculateOrderTotals`), `checkout-schema.ts` (`placeOrderSchema`, `checkoutFormSchema`) |
| Orders | `src/features/orders` | `order-service.ts` (`createOrderService`, `generateOrderId`), `order-repository.ts`, `order-errors.ts`, `server.ts` |
| API | `src/app/api` | `orders/route.ts` (GET/POST), `orders/[id]/route.ts` (GET/PATCH), `products/route.ts` (GET) |
| Lib dùng chung | `src/lib` | `format.ts` (`normalizeText`, `formatCurrency`), `http.ts` (`handleRouteError`, `jsonError`), `cn.ts`, `use-hydrated.ts` |

Luồng "Thêm vào giỏ hàng":
`AddToCartButton` (`src/features/cart/components/add-to-cart-button.tsx`) → `useCart().addItem` → `cartStore.dispatch({type:"add"})` → `cartReducer` (kẹp số lượng bằng `clampQuantity`/`getMaxQuantity`) → ghi vào `localStorage` key `shoplite:cart`.

Luồng "Đặt hàng":
`CheckoutForm` (`src/features/checkout/components/checkout-form.tsx`) validate bằng `checkoutFormSchema` → `fetch("POST /api/orders")` với `items` chỉ gồm `{productId, quantity}` → `orders/route.ts` gọi `orderService.placeOrder` → validate `placeOrderSchema`, tra giá từ catalog, kiểm tồn kho, tính tiền bằng `calculateOrderTotals` → `repository.save` ghi `storage/orders.json`.

## 4. Quy ước code

- Kiến trúc feature-based (vertical slice): mỗi tính năng tự chứa `types.ts`, service, `components/`, test trong `src/features/*`. `src/app` chỉ chứa route và route handler.
- Đặt tên file: kebab-case (`order-service.ts`, `add-to-cart-button.tsx`). Test đặt cạnh file nguồn với đuôi `.test.ts(x)`.
- Server/Client Component: file có `"use client"` ở đầu là Client Component (ví dụ `checkout-form.tsx`, `add-to-cart-button.tsx`). Code đọc/ghi file hệ thống chỉ import qua `src/features/orders/server.ts` (server-only).
- Zod: mọi input từ người dùng/API validate bằng Zod schema trong `checkout-schema.ts` trước khi xử lý.
- Xử lý lỗi API: ném `OrderError(code, message, details?)`; route handler gói `try/catch` quanh `handleRouteError` để trả JSON `{ error: { code, message, details? } }`. Dùng `jsonError` cho lỗi thủ công.
- Text tiếng Việt: thông điệp hướng tới người dùng viết tiếng Việt; tìm kiếm chuẩn hóa không dấu bằng `normalizeText`; tiền tệ qua `formatCurrency` (VND).

## 5. Quy tắc nghiệp vụ không được phá vỡ

- Giới hạn giỏ hàng: mỗi sản phẩm tối đa `MAX_QUANTITY_PER_ITEM = 10` và không vượt `stock`; `getMaxQuantity(stock)` trả 0 khi hết hàng nên không thêm được sản phẩm `stock <= 0`.
- Phí ship (`src/features/checkout/pricing.ts`): `standard` = 30.000 (miễn phí khi `subtotal >= FREE_SHIPPING_THRESHOLD = 500.000`), `express` = 60.000 (luôn tính). `subtotal <= 0` thì phí = 0.
- Giá do server tính: `placeOrder` bỏ qua mọi giá client gửi, tra `unitPrice` từ catalog qua `getProductById` và tính lại `subtotal`/`shippingFee`/`total` bằng `calculateOrderTotals`.
- Hủy đơn: `cancelOrder` chỉ cho phép khi `status === "pending"`, ngược lại ném `INVALID_STATUS_TRANSITION`. API `PATCH /api/orders/:id` chỉ nhận body `{ "status": "cancelled" }`.
- Mã đơn: `generateOrderId` tạo dạng `SL-YYYYMMDD-XXXXXX`.

## 6. Testing

- Vị trí file test: đặt cạnh file nguồn (`*.test.ts`/`*.test.tsx`), ví dụ `order-service.test.ts`, `cart-reducer.test.ts`. E2E ở `e2e/*.spec.ts`.
- Code dùng file hệ thống: inject dependency qua factory. `createOrderService({ repository, findProduct, now, generateId })` cho phép truyền hàm giả lập; truyền `now`/`generateId` để có kết quả xác định (deterministic).
- Repository in-memory: test đơn hàng dùng `createInMemoryOrderRepository(seed?)` thay vì ghi đĩa; nó `structuredClone` dữ liệu để tránh rò rỉ tham chiếu giữa các test.
- Logic thuần (pricing, cart-reducer, catalog-service, normalizeText) viết dưới dạng pure function và test trực tiếp, không cần mock.

## 7. Không được làm

- Không đặt logic nghiệp vụ/tính toán trong `src/app`; giữ ở `src/features/*`.
- Không tin giá/tiền do client gửi; không bỏ qua `calculateOrderTotals` khi tạo đơn.
- Không import `src/features/orders/server.ts` (hay repository ghi file) từ Client Component.
- Không ghi trực tiếp vào `localStorage` cho giỏ hàng; đi qua `cartStore`/`useCart`.
- Không nới giới hạn `MAX_QUANTITY_PER_ITEM`, ngưỡng phí ship, hay cho hủy đơn ngoài trạng thái `pending` nếu không được yêu cầu.
- Không đọc `localStorage` khi render phía server; dùng `useHydrated`/`getServerSnapshot` để tránh hydration mismatch.

## 8. Definition of Done

- `npm run check` xanh (lint + typecheck + test).
- Code mới có unit test cho logic thuần; đổi hành vi thì cập nhật/thêm test tương ứng.
- Thay đổi chạm luồng mua hàng không phá vỡ quy tắc ở mục 5.
- Lỗi API trả qua `OrderError` + `handleRouteError` theo định dạng `{ error: { code, message } }`.
- Thông điệp người dùng bằng tiếng Việt; đã chạy `npm run format` trước khi commit.

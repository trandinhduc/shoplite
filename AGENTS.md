# AGENTS.md

Hướng dẫn cho mọi AI coding agent làm việc trên repo này.

## 1. Tổng quan

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Zod 4. Node >= 22.12.
- Sản phẩm/danh mục: dữ liệu tĩnh trong `src/data/products.ts`, `src/data/categories.ts`.
- Giỏ hàng: `localStorage` key `CART_STORAGE_KEY = "shoplite:cart"` (chỉ phía client).
- Đơn hàng: file JSON `DEFAULT_ORDERS_FILE` = `storage/orders.json`, đổi bằng env `ORDERS_FILE` (`src/features/orders/server.ts`).
- Alias `@/*` → `src/*`.

## 2. Lệnh thường dùng

```bash
npm run dev                               # dev server (Turbopack), http://localhost:3000
npm run check                             # lint + typecheck + test (bắt buộc trước khi commit)
npx vitest run src/features/cart          # test một thư mục
npx vitest run -t "tên test"              # test theo tên
npm run test:e2e                          # Playwright, tự chạy `npm run dev`
npx playwright install chromium           # lần đầu chạy e2e
npm run format                            # Prettier (+ prettier-plugin-tailwindcss)
```

## 3. Codemap

| Capability | Thư mục | File quan trọng |
| --- | --- | --- |
| Catalog | `src/features/catalog/` | `catalog-service.ts` (`parseCatalogQuery`, `queryProducts`, `getProductById`, `PAGE_SIZE`) |
| Cart | `src/features/cart/` | `cart-reducer.ts` (`cartReducer`, `MAX_QUANTITY_PER_ITEM`, `getMaxQuantity`), `cart-store.ts` (`cartStore`), `use-cart.ts` (`useCart`) |
| Checkout | `src/features/checkout/` | `pricing.ts` (`calculateOrderTotals`, `FREE_SHIPPING_THRESHOLD`, `SHIPPING_OPTIONS`), `checkout-schema.ts` (`placeOrderSchema`, `checkoutFormSchema`, `toFieldErrors`), `components/checkout-form.tsx` |
| Coupons | `src/features/coupons/` + `src/data/coupons.ts` | `coupon-rules.ts` (thuần, dùng được ở client: `evaluateCoupon`, `calculateCouponDiscount`, `deriveCouponStatus`), `coupon-service.ts` (CHỈ server: `findCouponByCode`, `toCouponError`, `couponService`), `coupon-schema.ts` (`couponCodeSchema`, `COUPON_CODE_MAX_LENGTH`), `components/coupon-field.tsx` |
| Orders | `src/features/orders/` | `order-service.ts` (`createOrderService`), `order-repository.ts` (`OrderRepository`), `order-errors.ts` (`OrderError`), `server.ts` (`orderService`) |
| API | `src/app/api/` + `src/lib/http.ts` | `products/route.ts`, `products/[slug]/route.ts`, `orders/route.ts`, `orders/[id]/route.ts`, `coupons/validate/route.ts`; `handleRouteError`, `jsonError`, `readJsonBody` |

Server Component (vd. `app/products/page.tsx`, `app/orders/page.tsx`) gọi thẳng service (`queryProducts`, `orderService`), không fetch API nội bộ. API chỉ dùng cho Client Component.

**Luồng thêm vào giỏ hàng**
1. `AddToCartButton` / `ProductPurchasePanel` (client) gọi `useCart().addItem(product, quantity)`.
2. `addItem` → `cartStore.dispatch({ type: "add", item: toCartItem(product), quantity })`.
3. `cartReducer` kẹp số lượng bằng `getMaxQuantity(stock)` (min của tồn kho và `MAX_QUANTITY_PER_ITEM`); hết hàng → trả state cũ.
4. `cartStore` ghi `localStorage` (`writeToStorage`), `emit()` cho các subscriber; tab khác đồng bộ qua sự kiện `storage`.
5. `useCart` đọc qua `useSyncExternalStore`; `getServerSnapshot` trả `EMPTY_CART` nên UI dùng cờ `hydrated` để tránh nháy.

**Luồng đặt hàng**
1. `CheckoutForm` validate bằng `checkoutFormSchema` → `POST /api/orders` với `{ customer, shippingMethod, paymentMethod, items: [{ productId, quantity }], couponCode? }` (không gửi giá, không gửi số tiền giảm).
2. `app/api/orders/route.ts` `POST`: `readJsonBody` → `orderService.placeOrder(body)`.
3. `placeOrder`: `placeOrderSchema.safeParse` → gộp dòng trùng (`mergeItems`) → lấy giá từ `findProduct` (mặc định `getProductById`) → kiểm tra tồn kho → nếu có `couponCode`: `evaluateCoupon(findCoupon(code), subtotal, now())`, lỗi → `toCouponError` (422, không lưu đơn) → `calculateOrderTotals(items, method, discount)` → `repository.save(order)` với `status: "pending"`, id từ `generateOrderId` (`SL-YYYYMMDD-XXXXXX`).
4. `createJsonFileOrderRepository` ghi file tạm `${filePath}.tmp` rồi `rename` (ghi atomic).
5. Client nhận `201`, gọi `clear()` giỏ hàng, chuyển tới `/orders/{id}?placed=1`. Lỗi → hiển thị `error.message`.

**Luồng mã giảm giá (trang thanh toán)**
1. `CouponField` kiểm định dạng bằng `couponCodeSchema` → `CheckoutForm` gọi `POST /api/coupons/validate` với `{ code, items }`.
2. Server (`couponService.validateCoupon`) tính tạm tính từ catalog, trả `{ coupon, subtotal, discount }` — chỉ quy tắc của đúng mã đó, không bao giờ trả danh sách mã.
3. Client lưu `appliedCoupon = { rule }`; mỗi lần render `deriveCouponStatus(appliedCoupon, subtotal, now)` → `active` (trừ vào tổng) hoặc `error` (chưa đạt tối thiểu thì tự hồi phục khi giỏ đủ).
4. Đặt hàng bị 422 `COUPON_EXPIRED`/`COUPON_NOT_FOUND` → gán `lockedError`, mã giữ trạng thái lỗi đến khi khách gỡ/thay mã.

## 4. Quy ước code

- **Feature-based:** logic nằm trong `src/features/<feature>/`; `src/app/` chỉ chứa page/route mỏng. UI dùng chung ở `src/components/`, tiện ích ở `src/lib/` (`cn`, `format`, `http`).
- **Tên file:** kebab-case (`cart-reducer.ts`, `order-status-badge.tsx`); test đặt cạnh file nguồn `*.test.ts(x)`; component trong `features/<feature>/components/`.
- **Server/Client:** mặc định Server Component. Chỉ thêm `"use client"` khi cần state/hook/trình duyệt. `features/orders/server.ts` đọc/ghi file — chỉ import từ Server Component hoặc Route Handler.
- **Zod:** schema đặt trong `checkout-schema.ts`, dùng chung client và server; dùng `safeParse` + `toFieldErrors` để ra `{ "customer.phone": "..." }`. Hằng số liệt kê dùng `as const` (`SHIPPING_METHODS`, `PAYMENT_METHODS`, `ORDER_STATUSES`) rồi `z.enum(...)`.
- **Lỗi API:** lỗi nghiệp vụ ném `OrderError(code, message, details?)`; HTTP status lấy từ `HTTP_STATUS_BY_CODE` (`VALIDATION_ERROR` 400, `PRODUCT_NOT_FOUND` 422, `INSUFFICIENT_STOCK` 409, `ORDER_NOT_FOUND` 404, `INVALID_STATUS_TRANSITION` 409, `COUPON_NOT_FOUND`/`COUPON_EXPIRED`/`COUPON_MIN_SUBTOTAL_NOT_MET` 422). Route bọc `try/catch` → `handleRouteError`. Body lỗi luôn là `ApiErrorBody` `{ error: { code, message, details? } }`; lỗi lạ → 500 `INTERNAL_ERROR`.
- **Tiếng Việt:** text UI, thông báo lỗi, comment/JSDoc viết bằng tiếng Việt. Định dạng tiền/ngày qua `src/lib/format.ts` (`formatCurrency`, `formatDateTime`).

## 5. Quy tắc nghiệp vụ không được phá vỡ

- **Giỏ hàng:** mỗi sản phẩm tối đa `MAX_QUANTITY_PER_ITEM = 10` và không vượt `stock` (`getMaxQuantity`). `placeOrderSchema` cũng giới hạn `quantity` trong `[1, MAX_QUANTITY_PER_ITEM]`.
- **Phí ship:** `SHIPPING_OPTIONS.standard.fee = 30_000`, `express.fee = 60_000`; miễn phí **chỉ** cho `standard` khi `subtotal >= FREE_SHIPPING_THRESHOLD (500_000)`; `subtotal <= 0` → phí 0 (`calculateShippingFee`).
- **Giá do server tính:** `placeOrder` lấy `unitPrice` từ catalog và tính tổng bằng `calculateOrderTotals`; không bao giờ nhận giá/tổng từ payload.
- **Mã giảm giá:** mỗi đơn tối đa một mã; kiểm tra theo thứ tự tồn tại → còn hạn (`expiresOn` tính hết ngày theo giờ Việt Nam, đồng hồ server) → đạt `minSubtotal`. Phần trăm làm tròn xuống đến đồng rồi giới hạn bởi `maxDiscount`; giảm không vượt tạm tính. Phí ship và mức tối thiểu tính trên tạm tính **trước** giảm. Mã không hợp lệ khi đặt hàng → từ chối, không bao giờ tự bỏ mã. Đơn lưu `couponCode`, `discount`; đơn cũ thiếu hai trường này coi như giảm 0.
- **Hủy đơn:** `cancelOrder` chỉ cho phép khi `status === "pending"`, ngược lại ném `INVALID_STATUS_TRANSITION`. `PATCH /api/orders/:id` chỉ chấp nhận `{ "status": "cancelled" }`.

## 6. Testing

- Vitest chỉ chạy `src/**/*.test.{ts,tsx}`; môi trường mặc định `jsdom`. `vitest.setup.ts` gọi `cleanup()` và `localStorage.clear()` sau mỗi test.
- Code dùng Node/file hệ thống: thêm dòng đầu `// @vitest-environment node`; tạo thư mục tạm bằng `mkdtemp(path.join(tmpdir(), ...))` và xóa ở `afterEach` (xem `order-repository.test.ts`). Không ghi vào `storage/`.
- Service: inject `createInMemoryOrderRepository(seed)` và các dep `findProduct`, `now`, `generateId` vào `createOrderService` để test xác định.
- Route Handler: `vi.mock("@/features/orders/server", ...)` thay `orderService` bằng bản dùng repository in-memory (xem `app/api/orders/route.test.ts`), gọi trực tiếp `GET`/`POST` với `new Request(...)`.
- Cart store: gọi `cartStore.reset()` để buộc đọc lại `localStorage`.
- E2E: `e2e/*.spec.ts`, Playwright chromium, `fullyParallel: false`.

## 7. Không được làm

- Không import `@/features/orders/server` (hoặc `node:fs`) vào Client Component.
- Không import `@/data/coupons` hay `@/features/coupons/coupon-service` vào Client Component (lộ danh sách mã); client chỉ dùng `coupon-rules`, `coupon-schema`, `types`.
- Không tin giá, tổng tiền, phí ship từ client; không bỏ bước kiểm tra tồn kho trong `placeOrder`.
- Không hard-code `10`, `30_000`, `500_000`… — dùng hằng số đã export.
- Không trả lỗi API khác định dạng `ApiErrorBody`, không để exception lọt khỏi route mà không qua `handleRouteError`.
- Không truy cập `localStorage` trực tiếp cho giỏ hàng — đi qua `cartStore`/`useCart`.
- Không đổi `agentRules: false` trong `next.config.ts`; không commit `storage/`, `.env*`.

## 8. Definition of Done

- `npm run check` pass (lint + typecheck + test).
- Logic mới có test co-located; thay đổi luồng mua hàng thì cập nhật/chạy `npm run test:e2e`.
- Quy tắc ở mục 5 vẫn đúng; lỗi mới thêm vào `OrderErrorCode` kèm HTTP status trong `HTTP_STATUS_BY_CODE`.
- Text hiển thị bằng tiếng Việt; code đã chạy `npm run format`.

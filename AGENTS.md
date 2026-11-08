# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Tổng quan

- Next.js 16.4 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind CSS v4 · Zod 4 · Vitest + Testing Library · Playwright. Node >= 22.12.
- Sản phẩm/danh mục: dữ liệu tĩnh `products`, `categories` trong `src/data/` (không có database; tồn kho không bị trừ khi đặt hàng).
- Mã giảm giá: dữ liệu tĩnh `coupons` trong `src/data/coupons.ts` (chỉ server import, không để danh sách mã lọt vào bundle client).
- Giỏ hàng: localStorage của trình duyệt, key `CART_STORAGE_KEY = "shoplite:cart"`; lưu thêm `couponCode` đang áp dụng (chỉ là gợi ý, luôn được hỏi lại server).
- Đơn hàng: file JSON `DEFAULT_ORDERS_FILE` = `storage/orders.json` (ghi đè bằng env `ORDERS_FILE`), đã gitignore.

## 2. Lệnh thường dùng

```bash
npm run dev                          # http://localhost:3000
npm run check                        # lint + typecheck (next typegen && tsc) + vitest
npx vitest run src/features/cart     # test một thư mục (hoặc một file)
npx vitest run -t "tên test"         # test theo tên
npm run test:e2e                     # Playwright, tự chạy `npm run dev`; lần đầu: npx playwright install chromium
npm run format                       # Prettier (+ prettier-plugin-tailwindcss)
```

`npm run typecheck` cần `next typegen` để sinh type toàn cục `PageProps<"/route">`, `RouteContext<"/api/...">`.

## 3. Codemap

| Capability | Thư mục                  | File quan trọng                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog    | `src/features/catalog/`  | `catalog-service.ts` (`parseCatalogQuery`, `queryProducts`, `getProductById`, `PAGE_SIZE`), `types.ts`                                                                                                                                                                             |
| Cart       | `src/features/cart/`     | `cart-reducer.ts` (`cartReducer`, `getMaxQuantity`, `MAX_QUANTITY_PER_ITEM`), `cart-store.ts` (`cartStore`), `use-cart.ts` (`useCart`)                                                                                                                                             |
| Checkout   | `src/features/checkout/` | `pricing.ts` (`calculateOrderTotals`, `calculateCouponDiscount`, `FREE_SHIPPING_THRESHOLD`, `SHIPPING_OPTIONS`), `checkout-schema.ts` (`checkoutFormSchema`, `placeOrderSchema`, `couponCodeSchema`, `validateCouponSchema`, `toFieldErrors`), `components/checkout-form.tsx`      |
| Coupons    | `src/features/coupons/`  | `coupon-rules.ts` (hàm thuần, client dùng được: `evaluateCoupon`, `isCouponExpired`, `normalizeCouponCode`), `coupon-service.ts` (chỉ server: `findCouponByCode`, `toCouponError`, `getExpiredCouponNoticeForOrder`), `components/coupon-field.tsx`; dữ liệu `src/data/coupons.ts` |
| Orders     | `src/features/orders/`   | `order-service.ts` (`createOrderService`: `placeOrder`, `previewCoupon`), `order-repository.ts`, `order-errors.ts` (`OrderError`), `server.ts` (`orderService`)                                                                                                                    |
| API        | `src/app/api/`           | `products/route.ts`, `products/[slug]/route.ts`, `orders/route.ts`, `orders/[id]/route.ts`, `coupons/validate/route.ts`; helper `src/lib/http.ts`                                                                                                                                  |

**Luồng thêm vào giỏ hàng** (hoàn toàn phía client):
`ProductPurchasePanel` / `AddToCartButton` → `useCart().addItem(product, qty)` → `cartStore.dispatch({ type: "add", item: toCartItem(product), quantity })` → `cartReducer` (kẹp số lượng bằng `getMaxQuantity(stock)`) → `writeToStorage` (localStorage) → `emit()` → các component đăng ký qua `useSyncExternalStore` render lại; tab khác đồng bộ qua sự kiện `storage`.

**Luồng đặt hàng**:
`CheckoutForm.handleSubmit` → validate `checkoutFormSchema` → `fetch("POST /api/orders", { customer, shippingMethod, paymentMethod, items: [{ productId, quantity }], couponCode? })` → `app/api/orders/route.ts` `POST` (`readJsonBody`) → `orderService.placeOrder` → validate `placeOrderSchema` → `mergeItems` → `getProductById` + kiểm tra tồn kho → (nếu có `couponCode`) `evaluateCoupon` → `calculateOrderTotals` (có `discount`) → `repository.save` (`createJsonFileOrderRepository`: ghi file `.tmp` rồi `rename`) → 201 + `Order` → client `clear()` giỏ (kèm mã) và `router.push("/orders/{id}?placed=1")`.

Mã giảm giá: mã không tồn tại / chưa đạt đơn tối thiểu → `OrderError` (`COUPON_NOT_FOUND` / `COUPON_MIN_ORDER_NOT_MET`, 422, không tạo đơn). Mã **đã hết hạn** lúc đặt → vẫn tạo đơn theo giá gốc, response kèm `couponNotice` (không lưu vào đơn) và client chuyển tới `?placed=1&couponExpired=CODE`; trang đơn hàng gọi `getExpiredCouponNoticeForOrder` (validate Zod, chỉ báo khi mã thật sự hết hạn).

**Luồng áp mã giảm giá** (trang thanh toán): `CouponField` → `fetch("POST /api/coupons/validate", { code, items })` → `orderService.previewCoupon` (server tự tính tạm tính từ catalog) → trả quy tắc của đúng mã đó → `CheckoutSummary` tính tiền giảm bằng `calculateOrderTotals`. Mã lưu trong giỏ (`useCart().couponCode`) được hỏi lại mỗi khi vào trang hoặc giỏ đổi; không còn hợp lệ thì gỡ hẳn kèm lý do, không tự áp lại.

Trang `/orders` và `/orders/[id]` gọi thẳng `orderService` (Server Component, `dynamic = "force-dynamic"`); hủy đơn từ client qua `CancelOrderButton` → `PATCH /api/orders/:id`.

## 4. Quy ước code

- **Feature-based**: `src/app/` chỉ chứa page/layout/route handler mỏng; logic, component và test nằm trong `src/features/<feature>/`. UI dùng chung ở `src/components/`, tiện ích ở `src/lib/` (`cn`, `formatCurrency`, `normalizeText`...). Import qua alias `@/*` → `src/*`.
- **Đặt tên file**: kebab-case (`cart-reducer.ts`, `checkout-form.tsx`); component export dạng named, PascalCase; test đặt cạnh file: `*.test.ts` / `*.test.tsx`.
- **Server/Client Component**: mặc định là Server Component; chỉ thêm `"use client"` ở component cần state/hook/trình duyệt (cart, form, nút hủy). `features/orders/server.ts` đọc/ghi file hệ thống — chỉ import từ Server Component hoặc Route Handler.
- **Zod**: mọi input từ client validate bằng schema trong `checkout-schema.ts`; dùng `safeParse` + `toFieldErrors` để ra `Record<field, message>`. Cùng schema dùng cho form (client) và service (server).
- **Lỗi API**: service ném `OrderError(code, message, details?)`; mã → HTTP status trong `HTTP_STATUS_BY_CODE`. Route handler bọc try/catch và trả `handleRouteError(error)` hoặc `jsonError(status, code, message)` → body `{ error: { code, message, details? } }`. Thêm mã lỗi mới: cập nhật cả union `OrderErrorCode` lẫn `HTTP_STATUS_BY_CODE`.
- **Service có DI**: `createOrderService({ repository, findProduct?, now?, generateId? })`; repository theo interface `OrderRepository` để có thể thay storage mà không đổi service.
- **Text tiếng Việt**: toàn bộ chuỗi hiển thị, thông báo lỗi, comment và tên test viết bằng tiếng Việt. Tiền định dạng bằng `formatCurrency`.

## 5. Quy tắc nghiệp vụ không được phá vỡ

- **Giới hạn giỏ hàng**: mỗi sản phẩm tối đa `getMaxQuantity(stock)` = min(`stock`, `MAX_QUANTITY_PER_ITEM` = 10); sản phẩm `stock = 0` không thêm được. Server cũng chặn qua `placeOrderSchema` (`quantity` 1..`MAX_QUANTITY_PER_ITEM`) và lỗi `INSUFFICIENT_STOCK`.
- **Phí ship** (`calculateShippingFee`): `standard` 30.000 ₫, miễn phí khi subtotal >= `FREE_SHIPPING_THRESHOLD` (500.000 ₫); `express` 60.000 ₫ luôn tính phí; subtotal <= 0 thì phí 0.
- **Giá do server tính**: `placeOrder` lấy `unitPrice` từ catalog và tính lại bằng `calculateOrderTotals`; không bao giờ đọc giá/tổng tiền từ payload client. Client và server dùng chung `pricing.ts` — sửa quy tắc giá ở đó, không nhân bản.
- **Mã giảm giá**: mỗi đơn tối đa một mã. `percent`: `floor(tạm tính × % / 100)` và không vượt `maxDiscount`; `fixed`: không vượt tạm tính. Đơn tối thiểu so với tạm tính trước giảm (bằng đúng mức thì đạt). Hết hạn từ 00:00 ngày kế tiếp `expiresOn` theo giờ Việt Nam (UTC+7). Phí ship và ngưỡng miễn phí vẫn tính trên tạm tính **trước** giảm giá. Công thức nằm trong `pricing.ts` (`calculateCouponDiscount`).
- **Hủy đơn**: chỉ khi `status === "pending"`, nếu không ném `INVALID_STATUS_TRANSITION` (409). `PATCH` chỉ chấp nhận body `{ "status": "cancelled" }`.

## 6. Testing

- Vitest chỉ chạy `src/**/*.test.{ts,tsx}`, môi trường mặc định `jsdom`. `vitest.setup.ts` gọi `cleanup()` và `localStorage.clear()` sau mỗi test; test dùng `cartStore` cần `cartStore.reset()`.
- Code dùng file hệ thống / Route Handler: thêm `// @vitest-environment node` đầu file. `order-repository.test.ts` ghi vào thư mục tạm (`mkdtemp(tmpdir())`) và xóa sau test — không ghi vào `storage/`.
- Test service và route dùng `createInMemoryOrderRepository()`. Route test mock module singleton: `vi.mock("@/features/orders/server", ...)` trả về `createOrderService({ repository: createInMemoryOrderRepository() })` (xem `src/app/api/orders/route.test.ts`).
- E2E nằm ở `e2e/`, chọn phần tử bằng role/label tiếng Việt và `data-testid` (`product-card`, `purchase-panel`, `cart-count`, `cart-total`) — đổi text/testid thì cập nhật e2e.

## 7. Không được làm

- Không import `@/features/orders/server` (hay `node:fs`) vào Client Component.
- Không import `@/data/coupons` hay `@/features/coupons/coupon-service` vào Client Component (lộ danh sách mã); client chỉ dùng `coupon-rules.ts` và gọi `/api/coupons/validate`.
- Không tin giá, phí ship, tổng tiền từ client; không tính tiền ngoài `pricing.ts`.
- Không bỏ qua validate Zod ở server, không trả lỗi API khác định dạng `{ error: { code, message } }`.
- Không đặt logic nghiệp vụ trong `src/app/`.
- Không đọc localStorage trực tiếp trong component — đi qua `useCart` / `cartStore`; dùng `hydrated`/`useHydrated` để tránh lệch SSR.
- Không ghi vào `storage/orders.json` trong unit test; không commit `storage/`, `.env*`.
- Không xóa `agentRules: false` trong `next.config.ts` (ngăn `next dev` tạo/sửa `AGENTS.md`).

## 8. Definition of Done

- `npm run check` pass (lint, typecheck, vitest).
- Logic mới có test cạnh file; thay đổi API/service có test cả nhánh lỗi (mã lỗi + HTTP status).
- Thay đổi luồng mua hàng/UI chính: `npm run test:e2e` pass.
- Quy tắc ở mục 5 vẫn đúng; chuỗi hiển thị bằng tiếng Việt; `npm run format:check` sạch.

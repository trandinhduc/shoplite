# AGENTS.md - ShopLite

Hướng dẫn cho mọi AI coding agent (Claude Code, Codex, Cursor, Copilot...) làm việc trên repo này.

## Tổng quan

ShopLite là cửa hàng đồ công nghệ mini: Next.js 16 (App Router), React 19, TypeScript (strict),
Tailwind CSS v4, Zod 4. Không có database: sản phẩm là dữ liệu tĩnh trong `src/data/`, đơn hàng
lưu file JSON `storage/orders.json` (gitignored). Giao diện tiếng Việt, tiền tệ VND.

Next.js 16 có nhiều thay đổi so với các phiên bản cũ (params là Promise, `PageProps`/`RouteContext`
toàn cục...). Tài liệu đúng phiên bản nằm ở `node_modules/next/dist/docs/` - đọc trước khi dùng API
chưa chắc chắn.

## Lệnh thường dùng

```bash
npm run dev          # http://localhost:3000
npm run check        # lint + typecheck + unit test - PHẢI pass trước khi báo "xong"
npm test             # Vitest (unit + component), ~2 giây
npx vitest run src/features/cart   # chạy test của một thư mục
npm run test:e2e     # Playwright (cần dev server; lần đầu: npx playwright install chromium)
npm run format       # Prettier (có plugin sắp xếp class Tailwind)
```

## Codemap

| Capability                                  | Thư mục chính                      | File quan trọng                                                                                |
| ------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| Catalog: tìm kiếm, lọc, sắp xếp, phân trang | `src/features/catalog/`            | `catalog-service.ts` (hàm thuần), `components/catalog-filters.tsx`                             |
| Chi tiết sản phẩm                           | `src/app/products/[slug]/page.tsx` | `features/cart/components/product-purchase-panel.tsx`                                          |
| Giỏ hàng (client, localStorage)             | `src/features/cart/`               | `cart-reducer.ts` (quy tắc), `cart-store.ts` (store), `use-cart.ts` (hook)                     |
| Tính tiền & thanh toán                      | `src/features/checkout/`           | `pricing.ts` (phí ship, tổng tiền), `checkout-schema.ts` (Zod), `components/checkout-form.tsx` |
| Đơn hàng (server)                           | `src/features/orders/`             | `order-service.ts` (nghiệp vụ), `order-repository.ts` (lưu JSON), `server.ts` (instance)       |
| API                                         | `src/app/api/`                     | `products/route.ts`, `orders/route.ts`, `orders/[id]/route.ts`                                 |
| UI dùng chung                               | `src/components/`                  | `ui/button.tsx` (`buttonStyles` cho Link), `layout/header.tsx`                                 |
| Dữ liệu mẫu                                 | `src/data/`                        | `products.ts` (16 sản phẩm), `categories.ts`                                                   |

Luồng đặt hàng: `CheckoutForm` → `POST /api/orders` → `orderService.placeOrder()` (validate Zod →
lấy giá từ catalog → kiểm tra tồn kho → `calculateOrderTotals`) → `orderRepository.save()` →
redirect `/orders/[id]?placed=1`.

Luồng giỏ hàng: `AddToCartButton` → `useCart().addItem` → `cartStore.dispatch` → `cartReducer`
→ ghi `localStorage["shoplite:cart"]` → các component dùng `useCart()` render lại (`useSyncExternalStore`).

## Quy ước code

- **Feature-based:** code mới đặt trong `src/features/<feature>/` (logic thuần + `components/` + test cạnh file).
  `src/app/` chỉ chứa route mỏng, gọi sang features.
- Tên file kebab-case (`cart-summary.tsx`), component PascalCase, import qua alias `@/`.
- Server Component mặc định; chỉ thêm `"use client"` khi cần state/effect/event.
- Logic nghiệp vụ viết thành **hàm thuần** (dễ test), không đặt trong component.
- Validate input bằng Zod; schema dùng chung client/server đặt ở feature tương ứng.
- Lỗi nghiệp vụ dùng `OrderError(code, message)`; route trả về `{ error: { code, message, details? } }` qua `handleRouteError`.
- Text hiển thị cho người dùng bằng **tiếng Việt**; định dạng tiền bằng `formatCurrency` (`src/lib/format.ts`).
- Style bằng Tailwind utility; ghép class bằng `cn()`; Link dạng nút dùng `buttonStyles()`.
- Không thêm dependency mới nếu chưa giải thích lý do.

## Quy tắc nghiệp vụ (không được phá vỡ)

- Tối đa 10 sản phẩm mỗi loại trong giỏ (`MAX_QUANTITY_PER_ITEM`) và không vượt tồn kho.
- Phí ship: tiêu chuẩn 30.000đ, **miễn phí khi tạm tính ≥ 500.000đ**; giao nhanh 60.000đ.
- Server luôn tính lại giá từ catalog - không bao giờ tin giá client gửi lên.
- Chỉ hủy được đơn ở trạng thái `pending`.

## Testing

- Vitest + Testing Library, file `*.test.ts(x)` đặt cạnh file nguồn.
- Test cần chạm file hệ thống thêm dòng đầu `// @vitest-environment node`.
- Dùng `createInMemoryOrderRepository()` thay cho file JSON trong test.
- Thêm/sửa nghiệp vụ ⇒ phải có test cho trường hợp biên (ví dụ: đúng ngưỡng 500.000đ).

## Không được làm

- Không sửa `package-lock.json` bằng tay, không commit `storage/` hay file `.env*`.
- Không đổi định dạng dữ liệu `localStorage` mà không xử lý dữ liệu cũ.
- Không dùng `any`; không tắt rule ESLint để "cho qua".

## Definition of Done

1. `npm run check` pass, có test cho hành vi mới.
2. Giao diện đã kiểm tra trên trình duyệt (desktop và mobile 390px).
3. Cập nhật README nếu thêm route, API hoặc lệnh mới.

---
inclusion: fileMatch
fileMatchPattern: '**/*.{test,spec}.{ts,tsx}'
---

# Quy tắc Testing

## Công cụ

- Unit/component: Vitest (môi trường jsdom) + Testing Library.
- E2E: Playwright.

## Lệnh

```bash
npm test                          # vitest run (toàn bộ)
npx vitest run <path>             # chạy một file/thư mục cụ thể
npm run test:watch                # chế độ watch
npm run test:coverage             # đo coverage
npm run test:e2e                  # playwright test
```

## Vị trí file test

- Đặt file test cạnh file nguồn: `*.test.ts` / `*.test.tsx`
  (ví dụ `order-service.test.ts`, `cart-reducer.test.ts`, `product-card.test.tsx`).
- E2E nằm trong `e2e/*.spec.ts`.

## Nguyên tắc

- Logic thuần (pricing, cart-reducer, catalog-service, normalizeText) viết dưới dạng
  pure function và test trực tiếp, không cần mock.
- Code dùng file hệ thống: inject dependency qua factory. `createOrderService({ repository, findProduct, now, generateId })`
  cho phép truyền hàm giả lập; truyền `now` / `generateId` để kết quả xác định (deterministic).
- Test đơn hàng dùng `createInMemoryOrderRepository(seed?)` thay vì ghi đĩa; nó `structuredClone`
  dữ liệu để tránh rò rỉ tham chiếu giữa các test.
- Component test: render bằng Testing Library, ưu tiên truy vấn theo vai trò/nhãn thay vì chi tiết triển khai.

## Khi nào phải thêm/sửa test

- Thêm logic thuần mới -> thêm unit test tương ứng.
- Đổi hành vi -> cập nhật test cũ hoặc thêm test mới phản ánh hành vi mới.
- Thay đổi chạm luồng mua hàng không được phá vỡ quy tắc nghiệp vụ (giới hạn giỏ hàng,
  phí ship, giá do server tính, hủy đơn chỉ khi `pending`).

## Definition of Done cho test

- `npm run check` xanh (lint + typecheck + test) trước khi báo cáo hoàn thành.

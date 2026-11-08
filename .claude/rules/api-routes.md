---
paths:
  - "src/app/api/**/*.ts"
---

# Quy tắc cho Route Handlers

- Route chỉ làm 3 việc: đọc request → gọi service trong `src/features/*` → trả response. Không viết nghiệp vụ trong route.
- Đọc body bằng `readJsonBody(request)`; body không phải JSON ⇒ `jsonError(400, "VALIDATION_ERROR", ...)`.
- Bắt lỗi bằng `handleRouteError(error)` để có format chung `{ error: { code, message, details? } }`.
- Params động trong Next.js 16 là Promise: `const { id } = await ctx.params` với `ctx: RouteContext<"/api/orders/[id]">`.
- Thêm/sửa endpoint ⇒ cập nhật bảng API trong README và viết test trong `route.test.ts` (mock `@/features/orders/server`).

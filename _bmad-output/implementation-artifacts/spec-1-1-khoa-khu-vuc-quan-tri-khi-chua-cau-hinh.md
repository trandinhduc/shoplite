---
title: 'Story 1.1: Khóa khu vực quản trị khi chưa cấu hình'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_commit: '2b9069316e201caff7bcb93c0d36e6a5f7163182'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Repo chưa có khu vực quản trị; bản chưa cấu hình không được lộ `/admin` hay API quản trị, và không được có mật khẩu mặc định.

**Approach:** Dựng chốt chặn server `admin-guard` (đọc `ADMIN_PASSWORD` ở đúng một nơi), hai page tối thiểu `/admin` và `/admin/login`, hàm thuần `sanitizeNext`, mã lỗi `UNAUTHORIZED`, và test tĩnh bắt page/handler thiếu guard. Chưa có phiên (Story 1.2): khi đã cấu hình, mọi truy cập bị coi là chưa đăng nhập.

## Boundaries & Constraints

**Always:** Chưa đặt hoặc rỗng `ADMIN_PASSWORD` → page gọi `notFound()` trước mọi streaming (không `loading.tsx`/Suspense phía trên guard), API trả `new Response(null, { status: 404 })` thân rỗng, không envelope. Chỉ `admin-guard.ts` đọc `process.env.ADMIN_PASSWORD`; không giá trị mặc định ở đâu. `requireAdmin`/`requireAdminApi` là dòng đầu thân page/handler; page `/admin/**` có `export const dynamic = "force-dynamic"`. `UNAUTHORIZED` thêm vào `OrderErrorCode` + `HTTP_STATUS_BY_CODE` (401). Text, comment, tên test bằng tiếng Việt. Không thêm dependency.

**Never:** Không làm phiên, cookie, đăng nhập/đăng xuất, rate limit, AdminLayout, LoginForm (Story 1.2–1.4). Không `proxy.ts`, không Server Action. Không export `metadata`/`generateMetadata` ở hai page (tránh lộ tiêu đề khi chưa cấu hình). Không sửa `playwright.config.ts` (Story 1.5). Không import `admin-guard` vào Client Component.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Page chưa cấu hình | env thiếu hoặc `""`, mở `/admin`, `/admin/login` | 404, trang not-found gốc, HTML không có "Quản trị" | `notFound()` |
| API chưa cấu hình | env thiếu hoặc `""`, `requireAdminApi(req)` | `Response` 404 thân rỗng | N/A |
| API đã cấu hình, chưa phiên | env đặt | 401 `{ error: { code: "UNAUTHORIZED", message } }` | N/A |
| Page đã cấu hình, chưa phiên | `requireAdmin("/admin")` | redirect `/admin/login?next=%2Fadmin` | `redirect()` |
| `sanitizeNext` | `/admin/orders/SL-1` | giữ nguyên | N/A |
| `sanitizeNext` | `//evil.com`, `/orders`, `https://x.com`, `""`, `undefined` | `/admin` | N/A |

</frozen-after-approval>

## Code Map

- `src/features/orders/order-errors.ts` -- `OrderErrorCode` + `HTTP_STATUS_BY_CODE`; thêm `UNAUTHORIZED`
- `src/lib/http.ts` -- `jsonError(status, code, message)` dựng envelope 401; không đổi
- `src/app/not-found.tsx` -- trang 404 gốc ("Không tìm thấy trang"), không đổi
- `src/features/coupons/client-boundary.test.ts` -- `SERVER_ONLY_MODULES`; thêm module guard (mẫu cho test quét mới)
- `src/app/orders/[id]/page.tsx` -- mẫu `force-dynamic` + `notFound()`
- `.gitignore` -- đã có `!.env.example`, không đổi; `src/features/admin/` chưa tồn tại

## Tasks & Acceptance

**Execution:**
- [x] `src/features/orders/order-errors.ts` -- thêm `UNAUTHORIZED` (401) -- mã lỗi cho API chưa đăng nhập
- [x] `src/features/admin/sanitize-next.ts` + `.test.ts` -- hàm thuần `sanitizeNext(raw?: string)`; test từng giá trị trong ma trận -- dùng được ở client (LoginForm 1.4), nên tách khỏi guard
- [x] `src/features/admin/admin-guard.ts` + `.test.ts` -- `isAdminEnabled()`, `assertAdminEnabled()`, `async requireAdmin(currentPath)`, `requireAdminApi(request)`; kiểm phiên tạm `return false` kèm comment `shortcut:` chờ Story 1.2; test env thiếu/rỗng/đặt, mock `next/navigation` -- chốt chặn duy nhất
- [x] `src/app/admin/page.tsx` -- `force-dynamic`, `await requireAdmin("/admin")` dòng đầu, H1 `sr-only` "Hàng việc"
- [x] `src/app/admin/login/page.tsx` -- `force-dynamic`, `assertAdminEnabled()` dòng đầu, H1 "Đăng nhập quản trị"
- [x] `src/features/admin/admin-guard-coverage.test.ts` (`// @vitest-environment node`) -- quét `src/app/admin/**/page.tsx` và `src/app/api/admin/**/route.ts`: dòng đầu thân hàm gọi `requireAdmin`/`requireAdminApi` (login: `assertAdminEnabled`), page có `force-dynamic`; lỗi nêu tên file; test quét `src/` chỉ `admin-guard.ts` chứa `ADMIN_PASSWORD`
- [x] `src/features/coupons/client-boundary.test.ts` -- thêm `@/features/admin/admin-guard` vào danh sách server-only
- [x] `.env.example` -- `ADMIN_PASSWORD=` (trống = tắt khu vực quản trị), `ORDERS_FILE=` (production: đường dẫn tuyệt đối ngoài thư mục release)
- [x] `AGENTS.md` -- thêm dòng Codemap `Admin, src/features/admin/ + src/app/admin/`

**Acceptance Criteria:**
- Given `ADMIN_PASSWORD` thiếu hoặc rỗng, when `next dev` và `curl -i /admin`, `/admin/login`, `/admin/orders/x`, then status 404, có "Không tìm thấy trang", không có "Quản trị"
- Given `ADMIN_PASSWORD=abc`, when `curl -i /admin`, then redirect tới `/admin/login?next=%2Fadmin`; `/admin/login` trả 200
- Given test quét guard, when xóa tạm dòng guard của `/admin`, then test fail nêu `src/app/admin/page.tsx`

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Finding (lớp) | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|
| 1 | `ORDERS_FILE=` rỗng trong `.env.example` làm `server.ts` dùng `??` nên nhận đường dẫn `""` (edge-case) | high → patch | Đã đọc `src/features/orders/server.ts`: `process.env.ORDERS_FILE ?? DEFAULT_ORDERS_FILE`; copy `.env.example` thành `.env.local` thì lưu đơn hỏng. Sửa `??` thành `\|\|` |
| 2 | Test quét coi mọi `*/login/page.tsx` là miễn `requireAdmin` (edge-case) | medium → patch | `name.endsWith("login/page.tsx")` khớp `admin/foo/login/page.tsx`; sửa thành so đường dẫn chính xác |
| 3 | Không test nào chạy page: đổi `requireAdmin("/admin")` thành `requireAdmin("/")` vẫn pass (verification-gap) | medium → patch | Regex chỉ khớp phần đầu lời gọi. Thêm test page mock guard, kiểm đối số |
| 4 | Test `/api/admin/**` chấp nhận lời gọi bỏ qua kết quả, pass rỗng, bỏ sót `export const`/HEAD/OPTIONS (blind, edge-case, verification-gap) | medium → defer | Có thật nhưng chưa có route admin nào; AC 1.1 chỉ yêu cầu gọi ở dòng đầu. Siết khi thêm route đầu tiên (Story 1.2) |
| 5 | Test quét chưa phủ layout/Server Action/`generateMetadata`; regex dòng đầu lỗi với chữ ký nhiều dòng (blind, edge-case) | low → reject | Chưa có file nào như vậy; spec cấm Server Action; sửa bằng AST là phức tạp thêm |
| 6 | Kiểm `ADMIN_PASSWORD` chỉ quét `src/`, không bắt truy cập động (blind, edge-case) | low → reject | Spec quy định "quét toàn bộ `src/`"; không có bằng chứng truy cập động |
| 7 | `sanitizeNext` nhận `/admin/../orders`, mảng, `\`, `%2f` (blind, edge-case) | low → reject | Chưa có nơi gọi (Story 1.4); hệ quả chỉ là chuyển hướng cùng origin sau đăng nhập; ma trận spec đã khóa. Xem lại khi nối vào LoginForm |
| 8 | Mật khẩu chỉ gồm khoảng trắng tính là đã cấu hình (blind, edge-case) | low → reject | Spec: "đặt và không rỗng"; khoảng trắng là giá trị người dùng tự đặt |
| 9 | `UNAUTHORIZED` có hai nguồn status; không ai ném `OrderError` (blind, verification-gap) | low → reject | AC bắt buộc thêm vào `OrderErrorCode` + `HTTP_STATUS_BY_CODE`; test guard đã kiểm 401 + mã |
| 10 | Login page chỉ có H1, thiếu `noindex`; chưa đăng nhập được (blind) | false | Spec ghi rõ page tối thiểu; form là Story 1.4, phiên là 1.2; chưa cấu hình thì 404 |
| 11 | AGENTS.md thiếu mục biến môi trường, "ba module", quy tắc "Không commit `.env*`" (blind) | medium → defer | Sửa file chỉ dẫn agent: không tự sửa, ghi vào deferred-work |
| 12 | Không có test HTTP thật cho 404/redirect; `hasAdminSession` luôn `false` (blind, verification-gap) | maybe-false → defer | Cần chạy server (lệnh bị từ chối); đã ghi là chưa kiểm chứng. Test e2e thêm ở Story 1.5 |

## Design Notes

- `requireAdmin(currentPath)` nhận đường dẫn tường minh (epics ghi `requireAdmin()`): Next 16 không cho Server Component đọc pathname khi không dùng `proxy.ts`. Hàm `async` ngay từ đầu để Story 1.2 đọc `cookies()` mà không đổi chữ ký; test quét chấp nhận `await requireAdmin(...)`.
- `server-only` chưa cài và không được thêm dependency; ranh giới server dựa vào `client-boundary.test.ts` (chỉ bắt import trực tiếp, không bắt bắc cầu).
- Trong lúc chưa có Story 1.2, khi đã cấu hình `/admin` luôn chuyển về `/admin/login` (chưa vào được) — đúng dự kiến.

## Verification

**Commands:**
- `npx vitest run src/features/admin src/features/coupons` -- expected: pass
- `npm run check && npm run format:check` -- expected: pass
- `npm run build` -- expected: `/admin`, `/admin/login` hiển thị là dynamic (ƒ)

**Manual checks (if no CLI):**
- `npm run dev` không đặt biến rồi `curl -i localhost:3000/admin`; sau đó `ADMIN_PASSWORD=abc npm run dev` và `curl -i` lại — khớp ba AC trên.

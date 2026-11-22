---
title: 'Story 1.2: Phiên quản trị ký HMAC và API đăng nhập, đăng xuất'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_commit: '287a57912a42ba72cbe5e1f3d808c8abca8deac1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 1.1 chỉ có chốt chặn giả: `hasAdminSession()` luôn `false`, nên nhân viên chưa thể đăng nhập, và chưa có phiên nào để API/page nhận ra.

**Approach:** Thêm `signed-token` (HMAC-SHA256 thuần), khóa phiên dẫn xuất từ `ADMIN_PASSWORD` bằng scrypt, cookie `shoplite_admin` 12 giờ, `POST /api/admin/login` và `POST /api/admin/logout`; thay phiên giả bằng kiểm cookie thật, guard trả `AdminContext` mờ.

## Boundaries & Constraints

**Always:** Mật khẩu chỉ đọc trong `admin-guard.ts`; không xuất hiện trong response, log (`console.*`) hay bundle client. So mật khẩu bằng SHA-256 hai vế + `timingSafeEqual`; so chữ ký bằng `timingSafeEqual` sau khi so độ dài; cookie rác không bao giờ gây 500. `purpose` trộn vào MAC. Khóa phiên = `scrypt(ADMIN_PASSWORD, "shoplite/admin-session/v1")`, tính lười, cache theo giá trị mật khẩu; chữ ký không dùng thẳng mật khẩu. Thứ tự handler: cổng cấu hình → `readJsonBody` → kiểm tay → so mật khẩu. Kiểm body bằng tay, không thêm Zod. Chỉ `POST`, không `GET` đăng nhập/đăng xuất. Chỉ dùng `node:crypto`, không thêm dependency. Text, comment, tên test tiếng Việt.

**Never:** Không rate limit (Story 1.3), không LoginForm/AdminLayout (1.4), không đổi `requireAdmin(currentPath)` ngoài việc trả `AdminContext`. Không log mật khẩu hay khóa. Không `process-singleton`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Đăng nhập đúng | env đặt, `{ "password": "<đúng>" }` | `204` + `Set-Cookie: shoplite_admin` có `HttpOnly`, `SameSite=Lax`, `Path=/`, hết hạn tuyệt đối 12 giờ; `Secure` khi URL `https` hoặc `x-forwarded-proto: https`, không bật trên HTTP | N/A |
| Mật khẩu sai hoặc `""` | env đặt | `401 UNAUTHORIZED` "Mật khẩu không đúng", không `Set-Cookie`; khác độ dài không ném lỗi | envelope `{ error }` |
| Body xấu | không phải JSON, thiếu `password`, `password` không phải chuỗi | `400 VALIDATION_ERROR`, không `Set-Cookie` | envelope |
| Chưa cấu hình | env thiếu hoặc rỗng, `POST` login hoặc logout | `404` thân rỗng, kể cả đúng mật khẩu giả định | N/A |
| Phiên hợp lệ | cookie `shoplite_admin` hợp lệ | `requireAdmin`/`requireAdminApi` trả `AdminContext` mờ | N/A |
| Phiên không hợp lệ | cookie rác, giả mạo, hết hạn, `purpose` khác, ký bằng mật khẩu cũ, thiếu cookie | coi như chưa đăng nhập: page chuyển `/admin/login?next=`, API `401` | không 500 |
| Đăng xuất | có phiên / không có phiên | `204` + xóa cookie (hết hạn quá khứ) / `401` | N/A |
| Token | đúng; sửa payload, sai chữ ký, `exp` ≤ `now`, khác `purpose`, chữ ký sai độ dài | trả payload / bị từ chối, không ném | N/A |

</frozen-after-approval>

## Code Map

- `src/features/admin/admin-guard.ts` -- hiện có `hasAdminSession()` giả (`shortcut:`) và `requireAdminApi` trả `Response | null`; thay bằng kiểm cookie thật, trả `AdminContext`; thêm hàm cho login/logout (so mật khẩu, ký/xóa cookie) vì chỉ file này được đọc `ADMIN_PASSWORD`
- `src/features/admin/admin-guard.test.ts` -- tests 1.1 cho phiên giả; cập nhật (mock `next/headers` cho page, `Request` + header `cookie` cho API)
- `src/features/admin/admin-guard-coverage.test.ts` -- quét guard dòng đầu; siết: handler API phải `const x = await requireAdminApi(...)` rồi `if (x instanceof Response) return x`; login được miễn guard nhưng dòng đầu phải trả 404 khi chưa cấu hình
- `src/lib/http.ts` -- dùng `jsonError`, `readJsonBody`, `handleRouteError`; không đổi
- `src/app/api/coupons/validate/route.ts` -- mẫu route handler; `src/app/api/admin/` chưa tồn tại
- `src/app/admin/page.tsx` -- đang `await requireAdmin("/admin")`, giữ nguyên
- `AGENTS.md` -- Codemap: thêm `src/lib/signed-token.ts` và route `admin/login`, `admin/logout`

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/signed-token.ts` + `.test.ts` -- `signToken` / `verifyToken` thuần, `now` inject; test từng dòng ma trận Token
- [x] `src/features/admin/admin-guard.ts` + `.test.ts` -- khóa scrypt cache theo mật khẩu, cookie phiên 12 giờ, `AdminContext` mờ, bỏ `shortcut:`; test phiên hợp lệ/không hợp lệ và đổi mật khẩu làm cookie cũ mất hiệu lực
- [x] `src/app/api/admin/login/route.ts` + `.test.ts` -- `POST`; test ma trận (cờ cookie, Secure theo giao thức, 401/400/404, không rò mật khẩu qua body và `console.*`)
- [x] `src/app/api/admin/logout/route.ts` + `.test.ts` -- `POST`, `requireAdminApi` dòng đầu; test 204 xóa cookie, 401, 404, không có `GET`
- [x] `src/features/admin/admin-guard-coverage.test.ts` -- siết như Code Map; cập nhật các test dùng chữ ký cũ của `requireAdminApi`
- [x] `AGENTS.md` -- thêm vào Codemap

**Acceptance Criteria:**
- Given mật khẩu đổi sau khi đăng nhập, when dùng cookie cũ, then bị coi là chưa đăng nhập
- Given `npm run check`, when chạy, then lint, typecheck, test đều pass và `grep` mã nguồn chỉ thấy `ADMIN_PASSWORD` trong `admin-guard.ts`
- Given handler admin mới bỏ qua kết quả `requireAdminApi`, when chạy test quét, then test fail nêu tên file

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Finding (lớp) | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|
| 1 | `checkAdminPassword("")` trả `true` khi chưa đặt mật khẩu vì cả hai vế băm chuỗi rỗng (blind) | low → patch | Đọc `admin-guard.ts`: không kiểm `isAdminEnabled()`; hiện chỉ `adminGate()` ở route chặn. Sửa một dòng để guard tự đóng, thêm test |
| 2 | `Max-Age` tính từ `Date.now()` lần hai nên có thể ra 43199, test `Max-Age=43200` chập chờn; `exp` token và `Expires` cookie lệch vài ms (blind, edge-case) | medium → patch | `cookieHeader` tính `Math.floor((expires - Date.now())/1000)`; sửa: truyền `maxAge` cố định (43200 / 0) |
| 3 | Chưa test đăng nhập → dùng chính cookie do route login trả cho request xác thực (blind) | low → patch | Hai nhánh dùng chung `createSessionCookie` nhưng không test nào nối chúng; thêm một test login → logout |
| 4 | Đăng xuất với cookie hết hạn/giả bị `401` và không xóa cookie (blind, edge-case) | low → reject | Đúng AC đã khóa: "không có phiên thì trả `401`"; sửa là đổi AC của spec |
| 5 | Đăng nhập chưa giới hạn số lần thử (blind, edge-case) | medium → reject | Spec `Never` và epic đặt ở Story 1.3; rủi ro tồn tại đến khi 1.3 xong |
| 6 | Muối scrypt cố định lộ trong mã nguồn; có cookie thì dò mật khẩu ngoại tuyến (blind) | low → reject | AC và AD-11 quy định khóa `scrypt(ADMIN_PASSWORD, muối cố định)`; đổi nguồn khóa là đổi spec |
| 7 | Đăng xuất không thu hồi token, cookie sao chép còn hiệu lực đến 12 giờ (blind, edge-case) | medium → reject | Phiên không trạng thái là thiết kế của epic (chỉ đổi mật khẩu mới thu hồi); sửa cần kho phiên ngoài phạm vi. Nêu trong báo cáo |
| 8 | `AdminContext` chưa có nơi dùng (blind) | low → reject | AC bắt buộc trả `AdminContext`; Epic 2 là nơi dùng |
| 9 | Test quét guard giòn: `isLogin` theo cwd, đọc hai dòng, bỏ sót `export const POST` (blind, edge-case) | low → reject | Chưa có file vi phạm; test chạy từ gốc repo; sửa bằng AST là phức tạp thêm |
| 10 | `readCookie` lấy cookie trùng tên đầu tiên (edge-case) | low → reject | Cookie đặt `Path=/`, không có miền con; trình duyệt không gửi hai cookie cùng tên |
| 11 | `scryptSync` chặn event loop ở request đầu (edge-case) | low → reject | Tính một lần rồi cache; chi phí vài chục ms, không có hệ quả đã chỉ ra |
| 12 | Base64url không chuẩn hóa nên nhiều chuỗi cùng hợp lệ (edge-case) | low → reject | Không nơi nào chặn/loại trùng theo chuỗi token; không có hệ quả |
| 13 | `Secure` sai khi proxy TLS không gửi `x-forwarded-proto` (edge-case) | low → reject | Đã có comment `shortcut:` và epic nêu yêu cầu proxy nối header; AC quy định theo giao thức thực |
| 14 | `scryptSync` ném với mật khẩu dài/lạ (edge-case) | false | `scryptSync` nhận chuỗi độ dài bất kỳ; không có đường ném |
| 15 | AGENTS.md dòng Admin chưa liệt kê hàm/cookie/TTL mới (blind) | medium → defer | Sửa file chỉ dẫn agent: không tự sửa, ghi deferred-work |

## Design Notes

- Token: `base64url(JSON{...payload, exp})` + `.` + `base64url(HMAC-SHA256(key, purpose + "." + body))`; `exp` là mili giây epoch; `verifyToken` bọc `try/catch`, mọi lỗi trả `null`.
- `requireAdminApi` đổi sang `Promise<AdminContext | Response>`; handler: `const ctx = await requireAdminApi(request); if (ctx instanceof Response) return ctx;`. Việc này đóng mục hoãn "siết test quét `/api/admin`" của Story 1.1.
- `x-forwarded-proto` lấy phần tử đầu của danh sách; chỉ đúng khi sau reverse proxy tin cậy (đã nêu ở epic).

## Verification

**Commands:**
- `npx vitest run src/lib src/features/admin src/app/api/admin` -- expected: pass
- `npm run check && npm run format:check` -- expected: pass
- `npm run build` -- expected: `/api/admin/login`, `/api/admin/logout` hiển thị là dynamic

**Manual checks (if no CLI):**
- `ADMIN_PASSWORD=abc npm run dev` rồi `curl -i -X POST localhost:3000/api/admin/login -d '{"password":"abc"}'` thấy `204` + `Set-Cookie` đủ cờ.

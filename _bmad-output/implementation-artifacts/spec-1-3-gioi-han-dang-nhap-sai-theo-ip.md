---
title: 'Story 1.3: Giới hạn đăng nhập sai theo IP'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_commit: '94b21120300819b94010015e8ff0264946d47c28'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `POST /api/admin/login` cho thử mật khẩu không giới hạn, nên ai cũng dò được `ADMIN_PASSWORD` bằng cách thử hàng loạt.

**Approach:** Thêm bộ giới hạn thử sai theo IP (`rate-limit`), lưu bền qua hot reload bằng `process-singleton`, lấy IP qua `getClientKey`, nối vào handler đăng nhập theo thứ tự cố định, và trả `429 TOO_MANY_ATTEMPTS` kèm `Retry-After`.

## Boundaries & Constraints

**Always:** Thứ tự handler đăng nhập: cổng cấu hình (404) → khóa client (429) → `readJsonBody` → kiểm tra hình dạng (400) → so mật khẩu (401). Kiểm khóa chạy trước khi so mật khẩu. Chỉ lần sai mật khẩu (401) được đếm; 400 và lần đúng không làm tăng bộ đếm. Khóa có namespace `login:<client>`. `getClientKey` là chỗ duy nhất đọc IP; không dùng `request.ip`. `TOO_MANY_ATTEMPTS` thêm vào `OrderErrorCode` + `HTTP_STATUS_BY_CODE` (429), mang `details.retryAfterSeconds` (chuỗi số), `handleRouteError` đặt header `Retry-After`. Message đăng nhập là hằng số riêng: "Bạn thử sai quá nhiều lần, vui lòng thử lại sau 15 phút. Trong thời gian này, mọi lần đăng nhập đều bị từ chối." Chỉ `node:*`, không thêm dependency. Text, comment, tên test tiếng Việt.

**Never:** Không giới hạn tra cứu đơn (epic sau), không LoginForm (1.4), không sửa phiên/cookie. Không lưu bộ đếm ra file hay `localStorage`. Không log IP đầy đủ cùng mật khẩu.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Khóa sau 5 lần sai | cùng khóa, 5 lần sai trong 15 phút | lần thứ 5 vẫn `401`; khóa 15 phút tính từ lần thứ 5; sau đó `429` | N/A |
| Hết khóa | qua 15 phút khóa | thử lại được, bộ đếm bắt đầu lại | N/A |
| Đang khóa, đúng mật khẩu | `POST` mật khẩu đúng | `429 TOO_MANY_ATTEMPTS`, không `Set-Cookie`, hàm so mật khẩu không được gọi | envelope + `Retry-After` |
| Đang khóa, body sai hình dạng | body hỏng hoặc thiếu `password` | `429`, không phải `400` | envelope |
| Đếm lỗi | 401 / 400 / đúng mật khẩu | chỉ 401 tăng bộ đếm | N/A |
| Cô lập IP | IP A bị khóa | IP B đăng nhập bình thường | N/A |
| Phản hồi 429 | bị khóa | `details.retryAfterSeconds` là chuỗi số, header `Retry-After` cùng giá trị, đúng message hằng số | N/A |
| `getClientKey` | `"1.1.1.1, 2.2.2.2"`, có khoảng trắng thừa; thiếu; rỗng | `2.2.2.2` (phần tử ngoài cùng bên phải, đã trim); thiếu hoặc rỗng → `"direct"` | N/A |
| Bộ nhớ đầy | `maxKeys = 3`, thêm khóa mới | loại khóa hết hạn trước, rồi khóa cũ nhất chưa bị khóa; không bao giờ loại khóa đang bị khóa | mọi khóa đang bị khóa → từ chối khóa mới bằng `429` |
| `singleton` | hai lần cùng `key` (kể cả nạp lại module) / `key` khác | cùng instance, `init` chạy một lần / instance khác | N/A |

</frozen-after-approval>

## Code Map

- `src/features/admin/admin-guard.ts` -- `adminGate()`, `checkAdminPassword`; không đổi
- `src/app/api/admin/login/route.ts` -- hiện: gate → `readJsonBody` → hình dạng → so mật khẩu; chèn kiểm khóa sau gate, đếm lỗi sau 401; hai dòng đầu (`const gate = adminGate(); if (gate) return gate;`) giữ nguyên vì test quét guard kiểm
- `src/app/api/admin/login/route.test.ts` -- test hiện có; thêm các dòng ma trận (mock `checkAdminPassword` bằng `vi.fn` bọc hàm thật để kiểm "không được gọi")
- `src/features/admin/admin-guard-coverage.test.ts` -- quét guard dòng đầu của login; không đổi
- `src/features/orders/order-errors.ts` -- `OrderErrorCode` + `HTTP_STATUS_BY_CODE`; thêm `TOO_MANY_ATTEMPTS`
- `src/lib/http.ts` -- `handleRouteError` dựng response từ `OrderError`; thêm `Retry-After`
- `src/features/admin/sanitize-next.ts` -- tham chiếu kiểu file thuần cạnh guard; không đổi
- `AGENTS.md` -- Codemap: thêm `src/lib/{process-singleton,rate-limit,client-key}.ts`

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/process-singleton.ts` + `.test.ts` -- `singleton(key, init)` lưu trên `globalThis[Symbol.for("shoplite:" + key)]`; test hai lần gọi, nạp lại module (`vi.resetModules`), key khác
- [x] `src/lib/rate-limit.ts` + `.test.ts` -- `createRateLimiter({ max, windowMs, lockMs, now, maxKeys })` với `check(key)` và `recordFailure(key)`; test từng dòng ma trận (khóa, hết khóa, cửa sổ, đầy bộ nhớ) bằng đồng hồ inject
- [x] `src/lib/client-key.ts` + `.test.ts` -- `getClientKey(request)`; test các giá trị ma trận
- [x] `src/features/orders/order-errors.ts` -- thêm `TOO_MANY_ATTEMPTS` (429)
- [x] `src/lib/http.ts` + `http.test.ts` -- đặt `Retry-After` khi `OrderError` có `details.retryAfterSeconds`; test
- [x] `src/features/admin/admin-messages.ts` -- hằng số message 429 đăng nhập (thuần, dùng được ở client cho 1.4)
- [x] `src/features/admin/login-limiter.ts` -- instance `loginLimiter` qua `singleton("login-limiter", …)` với `max 5`, `windowMs`/`lockMs` 15 phút, `maxKeys 10_000`
- [x] `src/app/api/admin/login/route.ts` + `.test.ts` -- nối limiter theo thứ tự cố định; test ma trận (reset limiter giữa các test)
- [x] `AGENTS.md` -- thêm Codemap

**Acceptance Criteria:**
- Given 5 lần sai liên tiếp rồi một lần đúng từ cùng IP, when `POST` đăng nhập, then `429` không `Set-Cookie`
- Given `npm run check`, when chạy, then lint, typecheck, test đều pass và test quét guard vẫn pass
- Given nạp lại module sau khi limiter có dữ liệu, when gọi `singleton("login-limiter", …)`, then trả cùng limiter

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Finding (lớp) | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|
| 1 | Request song song cùng IP đều qua `check` trước `await readJsonBody`, rồi mới ghi lần sai nên vượt giới hạn 5 lần (blind, edge-case, verification-gap) | high → patch | Đọc `login/route.ts`: `check` (dòng 13) cách `recordFailure` một `await`; `N` request cùng đến đều thấy bộ đếm < 5. Sửa: kiểm khóa lần nữa ngay trước `checkAdminPassword` (đoạn đó không có `await`), giữ nguyên thứ tự AC; thêm test bùng nổ |
| 2 | `recordFailure` trên khóa đang hiệu lực làm `lockedUntil` lùi về sau, kéo dài khóa quá 15 phút từ lần sai thứ 5 (edge-case) | medium → patch | `rate-limit.ts`: `if (entry.count >= max) entry.lockedUntil = t + lockMs` chạy mọi lần. Sửa: bỏ qua khi khóa đang hiệu lực, thêm test |
| 3 | Test route chỉ kiểm `retryAfterSeconds` khớp `/^\d+$/`, không kiểm ~900 nên đổi `lockMs`/`windowMs` vẫn pass (verification-gap) | medium → patch | Đổi `lockMs` còn 1000 thì mọi test vẫn xanh; thêm khẳng định 899–900 |
| 4 | Test "loại khóa hết hạn trước" vẫn pass khi xóa vòng quét khóa hết hạn (verification-gap) | medium → patch | Trạng thái dựng sẵn khiến khóa cũ nhất chưa bị khóa cũng là khóa hết hạn; sắp lại để hai nạn nhân khác nhau |
| 5 | `getClientKey` giả mạo được khi không có reverse proxy; mọi request thiếu header dùng chung bucket `direct` (blind, edge-case, verification-gap) | medium → reject | Thiết kế do AC quy định (phần tử ngoài cùng bên phải, thiếu → `direct`) và epic nêu yêu cầu proxy; sửa là đổi AC. Nêu trong báo cáo |
| 6 | `check()` gọi `makeRoom` nên có thể loại khóa khác dù không ghi lỗi (blind, edge-case, verification-gap) | low → reject | Chỉ xảy ra khi đủ 10.000 khóa; sửa cần tách hàm chỉ-đọc, thêm phức tạp |
| 7 | `maxKeys = 0` làm `retryAfterSeconds` là `Infinity` (edge-case) | low → reject | Cấu hình cố định 10.000, không đường tới |
| 8 | Tùy chọn limiter đổi khi hot reload vẫn dùng giá trị cũ (edge-case) | low → reject | Chỉ ảnh hưởng dev; đã ghi giới hạn trong comment |
| 9 | Đồng hồ hệ thống nhảy làm khóa dài/ngắn bất thường (edge-case) | low → reject | Không có bằng chứng; ngoài phạm vi |
| 10 | Message 429 ghi cứng "15 phút" độc lập với hằng số (blind) | low → reject | AC quy định đúng câu này |
| 11 | Comment nhắc LoginForm chưa tồn tại; chưa có UI xử lý 429 (blind, verification-gap) | low → reject | LoginForm là Story 1.4 |
| 12 | Đăng nhập đúng không xóa bộ đếm (blind) | low → reject | AC: chỉ lần sai được đếm; ghi trong Design Notes. Nêu trong báo cáo |
| 13 | Bộ đếm theo tiến trình, không bảo vệ đa instance; không log khi khóa (blind) | low → reject | Epic: một tiến trình Node; spec cấm log IP cùng mật khẩu |
| 14 | `recordFailure` bỏ qua im lặng khi bộ nhớ đầy khóa (edge-case) | low → reject | `check` đã chặn trước; sau sửa mục 1 không còn đường tới |
| 15 | AGENTS.md chưa ghi quy tắc giới hạn đăng nhập trong "Chính sách" (blind) | medium → defer | Sửa file chỉ dẫn agent: không tự sửa, ghi deferred-work |

## Design Notes

- Cửa sổ đếm tính từ lần sai đầu tiên của chuỗi; quá `windowMs` thì bộ đếm bắt đầu lại. `check` không đổi bộ đếm; chỉ `recordFailure` đếm (và tạo khóa mới). Đăng nhập đúng không đặt lại bộ đếm (đúng AC: chỉ lần sai được đếm).
- `retryAfterSeconds` làm tròn lên (`Math.ceil`), tối thiểu 1. Khóa mới khi bộ nhớ đầy mà mọi khóa đang bị khóa bị từ chối ở `check`, trước khi so mật khẩu.
- Message 429 để file riêng thuần (`admin-messages.ts`) vì LoginForm (client, Story 1.4) cần cùng câu; `admin-guard.ts` là server-only.
- Giới hạn vận hành: một tiến trình Node; bộ đếm mất khi khởi động lại.

## Verification

**Commands:**
- `npx vitest run src/lib src/features/admin src/app/api/admin` -- expected: pass
- `npm run check && npm run format:check` -- expected: pass
- `npm run build` -- expected: pass, các route admin vẫn dynamic

**Manual checks (if no CLI):**
- Smoke `next dev` và `next start` (epic yêu cầu): đặt `ADMIN_PASSWORD=abc`, `curl -i -X POST localhost:3000/api/admin/login -d '{"password":"sai"}'` sáu lần, lần thứ sáu thấy `429` và `Retry-After`; sửa một file để hot reload rồi gọi lại, vẫn `429`.

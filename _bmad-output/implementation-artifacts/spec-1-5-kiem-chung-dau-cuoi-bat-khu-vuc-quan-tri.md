---
title: 'Story 1.5: Kiểm chứng đầu-cuối: bật khu vực quản trị'
type: 'feature'
created: '2026-11-21'
status: 'in-review'
baseline_commit: '6043432c37c99d5a0bddb4ddc68fa4735561b806'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Khu vực quản trị mới chỉ được kiểm bằng unit test với mock; Playwright đang dùng lại server có sẵn, không đặt `ADMIN_PASSWORD`, và chưa có bước kiểm bản build thật (cây `/admin` động, mật khẩu không lọt vào bundle client).

**Approach:** Cấu hình lại Playwright để tự khởi động server có `ADMIN_PASSWORD` test và `ORDERS_FILE` tạm, thêm server thứ hai không đặt mật khẩu, viết E2E cho luồng đăng nhập, khóa đăng nhập và trạng thái chưa cấu hình, thêm một lệnh kiểm bản build, và cập nhật AGENTS.md cho cả Epic 1.

## Boundaries & Constraints

**Always:** Webserver chính nhận `ORDERS_FILE` trỏ file tạm và `ADMIN_PASSWORD` giá trị test, `reuseExistingServer: false`. Mật khẩu test chỉ xuất hiện trong `playwright.config.ts`, không là mặc định của sản phẩm, không xuất hiện trong `.env.example` hay mã nguồn `src/`. `e2e/shopping-flow.spec.ts` và `e2e/wishlist.spec.ts` hiện có phải vẫn xanh. Test khóa đăng nhập dùng header `x-forwarded-for` riêng cho từng test để không ảnh hưởng test khác. Server thứ hai chạy cổng riêng, không đặt `ADMIN_PASSWORD`, và không đụng khóa dev của Next trong cùng thư mục (dùng `distDir` riêng qua biến môi trường đọc trong `next.config.ts`, hoặc cách khác chạy được; ghi lại cách chọn). Bước kiểm build chạy bằng một lệnh npm. Text, tên test, comment tiếng Việt; E2E tìm phần tử theo nhãn tiếng Việt hoặc `data-testid` (`login-error`, `admin-logout`).

**Never:** Không sửa mã sản phẩm trong `src/` (trừ khi E2E lộ lỗi thật, khi đó dừng và báo). Không để mật khẩu test thành giá trị mặc định ở bất kỳ nơi nào ngoài `playwright.config.ts`. Không để E2E ghi vào `storage/orders.json` thật. Không dùng `reuseExistingServer: true`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Chưa đăng nhập | server có mật khẩu, mở `/admin` | chuyển tới `/admin/login` với `next` = `/admin` | N/A |
| Sai mật khẩu | nhập sai | banner "Mật khẩu không đúng" (`login-error`) | N/A |
| Đúng mật khẩu | nhập đúng | vào `/admin`, thấy nút "Đăng xuất" | N/A |
| Đăng xuất | bấm "Đăng xuất" | về `/admin/login`; mở lại `/admin` phải đăng nhập lại | N/A |
| Khóa đăng nhập | cùng IP (header riêng): 5 lần sai rồi 1 lần đúng | thấy câu "Bạn thử sai quá nhiều lần, vui lòng thử lại sau 15 phút…", không vào được | N/A |
| Cô lập IP | IP khác (header khác) | vẫn đăng nhập được | N/A |
| Chưa cấu hình | server thứ hai không `ADMIN_PASSWORD`: `/admin`, `/admin/login` | 404, trang not-found gốc ("Không tìm thấy trang"), không chứa "Quản trị", nội dung nhìn thấy giống URL không tồn tại | N/A |
| API chưa cấu hình | cùng server: `POST /api/admin/login` | 404 thân rỗng | N/A |
| Bản build | sau `next build` | không route nào bắt đầu `/admin` trong `.next/prerender-manifest.json` | lệnh kiểm thoát mã khác 0 và nêu route |
| Bundle client | tìm mật khẩu test trong `.next/static` | không thấy | lệnh kiểm thoát mã khác 0 và nêu file |

</frozen-after-approval>

## Code Map

- `playwright.config.ts` -- hiện: `webServer` đơn (`npm run dev`, `reuseExistingServer: !CI`), cổng từ `PORT`; chuyển sang hai webServer
- `e2e/shopping-flow.spec.ts`, `e2e/wishlist.spec.ts` -- E2E hiện có; không sửa, phải xanh
- `next.config.ts` -- có `agentRules: false` (không bật lại); thêm `distDir` đọc từ biến môi trường nếu chọn cách tách thư mục build
- `src/features/admin/admin-messages.ts` -- `LOGIN_LOCKED_MESSAGE` (câu 429), dùng làm giá trị kỳ vọng
- `src/features/admin/components/login-form.tsx`, `logout-button.tsx` -- nhãn "Mật khẩu", nút "Đăng nhập", `data-testid` `login-error`, `admin-logout`
- `src/app/api/admin/login/route.ts` -- thứ tự 404 → 429 → 400 → 401; không sửa
- `package.json` -- thêm lệnh kiểm build; `.gitignore` -- thêm thư mục build thứ hai nếu có
- `AGENTS.md` -- Codemap/Chính sách/E2E/DoD cần cập nhật; mục hoãn của Story 1.1–1.4 trong `_bmad-output/implementation-artifacts/deferred-work.md` mô tả đúng các chỗ lệch
- Baseline `next build`: `/admin`, `/admin/login`, `/api/admin/*` là `ƒ` động

## Tasks & Acceptance

**Execution:**
- [x] `playwright.config.ts` -- hai webServer (chính có `ADMIN_PASSWORD` test + `ORDERS_FILE` tạm; thứ hai cổng riêng không mật khẩu), `reuseExistingServer: false`; mật khẩu test chỉ ở file này
- [x] `next.config.ts` (+ `.gitignore`) -- tách `distDir` cho server thứ hai nếu cần, không đổi hành vi mặc định
- [x] `e2e/admin-auth.spec.ts` -- luồng chuyển hướng/sai/đúng/đăng xuất và khóa đăng nhập theo ma trận, mỗi test một IP riêng
- [x] `e2e/admin-disabled.spec.ts` -- trỏ `baseURL` sang server thứ hai: hai trang 404, API 404 thân rỗng, không "Quản trị", nội dung nhìn thấy khớp URL không tồn tại
- [x] `scripts/verify-build.mjs` + `package.json` -- kiểm `.next/prerender-manifest.json` và quét `.next/static` tìm mật khẩu test (lấy từ `playwright.config.ts`, không nhân đôi giá trị); lệnh npm chạy build rồi kiểm
- [x] `AGENTS.md` -- Codemap (Admin: `admin-guard` đầy đủ hàm, `components/`, `layout`, nhóm route `(shop)`, `GuestShell`, `src/lib/*`), Chính sách (giới hạn đăng nhập: 5 lần/15 phút/IP, cần reverse proxy tin cậy, bộ đếm theo tiến trình; `.env.example` là ngoại lệ của "Không commit `.env*`"), dòng E2E (server do Playwright khởi động, `ORDERS_FILE` tạm, `ADMIN_PASSWORD` test, không dùng lại server; env chỉ đọc ở `orders/server.ts` và `admin/admin-guard.ts`), DoD (thêm lệnh kiểm build); sửa "ba module" thành bốn trong ghi chú `client-boundary.test.ts`

**Acceptance Criteria:**
- Given `npm run check` và `npm run format:check`, when chạy, then pass
- Given lệnh kiểm build, when chạy sau `next build`, then thoát mã 0, và thoát mã khác 0 khi thêm tạm một route `/admin/x` prerender tĩnh hoặc nhét mật khẩu test vào `.next/static`
- Given `grep` mật khẩu test trong repo, when tìm, then chỉ thấy `playwright.config.ts`
- Given `npm run test:e2e`, when chạy (người dùng chạy tay), then toàn bộ spec cũ và mới xanh

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Finding (lớp) | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|
| 1 | `verify:build` chạy `next build` không đặt `ADMIN_PASSWORD`, nên mật khẩu test không có trong bản build bị quét và kiểm "mật khẩu không lọt vào bundle" luôn pass (blind, edge-case, verification-gap) | high → patch | Đọc `package.json` (`next build && node …`) và `verify-build.mjs`: script chỉ đọc mật khẩu từ `playwright.config.ts` để quét, build không nhận nó. Sửa: script tự chạy `next build` với `ADMIN_PASSWORD` = mật khẩu test và quét cả `.next/static` lẫn đầu ra prerender `.next/server/app` |
| 2 | `.next` ghi cứng trong script trong khi `next.config.ts` có thể đổi `distDir` bằng `NEXT_DIST_DIR` (blind, edge-case, verification-gap) | medium → patch | Cùng sửa với mục 1: script tự chạy build với `NEXT_DIST_DIR` bỏ trống rồi đọc `.next` |
| 3 | Script thiếu bắt lỗi ENOENT và chỉ lọc tiền tố `/admin` (không `/api/admin`) (edge-case, blind) | low → reject | Lỗi vẫn thoát mã khác 0; AC chỉ nói route bắt đầu `/admin`; API admin là route handler động |
| 4 | Script lấy mật khẩu bằng regex từ `playwright.config.ts` nên dễ vỡ khi sửa định dạng (blind, edge-case) | low → reject | Có `if (!password)` báo lỗi rõ; AC quy định mật khẩu chỉ nằm trong file này |
| 5 | `verify:build` không nằm trong `npm run check` hay CI nào (blind, verification-gap) | medium → reject | AC chỉ yêu cầu chạy bằng một lệnh và nằm trong Definition of Done (đã có trong AGENTS.md); repo không có CI. Nêu trong báo cáo |
| 6 | `ORDERS_FILE` tạm cố định, đơn tích lũy giữa các lần chạy; `reuseExistingServer: false` buộc hai cổng trống (blind, edge-case) | low → reject | Spec yêu cầu file tạm và không dùng lại server; AGENTS.md đã nêu cổng; `shopping-flow` lọc theo mã đơn |
| 7 | Điền form trước khi React hydrate có thể gửi form thuần (mật khẩu lên URL), test chập chờn (edge-case) | medium → defer | Chưa chạy được E2E nên chưa biết có xảy ra; kiểm bằng chạy lặp `npm run test:e2e` |
| 8 | Server thứ hai với `distDir` riêng có thể làm Next ghi lại `next-env.d.ts` và `tsconfig.json` (blind, edge-case) | medium → defer | Không kiểm chứng được khi không chạy server; `npm run typecheck` chạy `next typegen` nên tự sửa lại; kiểm bằng `git status` và typecheck sau một lần E2E |
| 9 | Ngữ cảnh trình duyệt tạo tay không đóng, bỏ qua cấu hình trace (blind, edge-case) | low → reject | Đóng cùng trình duyệt cuối worker; đổi cách dựng sẽ thêm thay đổi lên test chưa chạy được |
| 10 | Bộ phủ E2E thiếu: `next` độc hại, cờ cookie, cookie giả/hết hạn, 429 khi sai trong lúc khóa, logout/`/admin/x` trên server thứ hai (blind, edge-case) | low → reject | Ngoài ma trận spec; unit test đã phủ phần lớn |
| 11 | `innerText` cả trang có thể chập chờn vì nội dung động; `randomIp` va chạm; `PORT` không hợp lệ (blind, edge-case) | low → reject | Khung 404 không có nội dung động với trình duyệt mới; xác suất va chạm và cấu hình sai không đáng kể |
| 12 | AGENTS.md mô tả file không có trong diff, `.env.example` thiếu ngoại lệ trong `.gitignore` (blind) | false | Các file đó có từ commit Story 1.1–1.4; `.gitignore` đã có `!.env.example` |
| 13 | Các spec E2E cũ vẫn xanh chưa được kiểm chứng (edge-case) | maybe-false → defer | Chưa chạy được E2E; cần `npm run test:e2e` do người dùng chạy |

## Design Notes

- Môi trường này không khởi động được server (lệnh bị từ chối ở mọi lượt trước), nên E2E và `curl` không chạy được ở đây: spec, config và test được viết nhưng chỉ kiểm bằng typecheck, lint và lệnh kiểm build. `npm run test:e2e` do bạn chạy.
- Next 16 chỉ cho một `next dev` mỗi thư mục build; vì vậy server thứ hai cần `distDir` riêng hoặc chạy `next start` trên bản build.
- "Giống hệt URL không tồn tại" so bằng nội dung nhìn thấy (`innerText`), không so HTML từng byte (HTML Next có phần phụ thuộc đường dẫn).
- Giá trị mật khẩu test nên chứa một chuỗi đủ riêng để việc quét `.next/static` không báo nhầm.

## Verification

**Commands:**
- `npm run check && npm run format:check` -- expected: pass
- lệnh kiểm build mới -- expected: build thành công, thoát mã 0, `/admin*` không bị prerender, mật khẩu test không có trong `.next/static`
- `npx tsc --noEmit` hoặc `npm run typecheck` -- expected: `playwright.config.ts` và `e2e/*.ts` hợp lệ

**Manual checks (if no CLI):**
- `! npm run test:e2e` (người dùng chạy): tất cả spec xanh; `storage/orders.json` thật không bị ghi thêm.

### Review Findings

Code review Epic 1 (commit range `2b90693..HEAD`, 4 lớp: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor; 2026-11-21).

- [x] [Review][Decision] Mô hình tin cậy IP của giới hạn đăng nhập — `getClientKey` tin phần tử ngoài cùng của `x-forwarded-for`: không có reverse proxy thì client tự đặt header để né khóa; request thiếu header dùng chung bucket `direct` (5 lần sai của bất kỳ ai khóa hết người không có header, gồm admin thật); khi 10.000 khóa đều đang khóa, mọi IP mới bị 429. Route handler của Next không có IP socket nên không có lựa chọn thay thế sạch. → Quyết định: giữ nguyên, ghi rõ yêu cầu reverse proxy (mục hoãn AGENTS.md). [src/lib/client-key.ts:2]
- [x] [Review][Decision] Đăng xuất lỗi hoặc mất mạng — AC bắt vẫn chuyển `/admin/login`, nhưng nếu cookie còn nguyên thì trang đăng nhập đẩy về `/admin` và người dùng vẫn đăng nhập mà không biết (máy dùng chung). Token không trạng thái nên cũng không thu hồi được. → Quyết định: giữ theo AC 1.4. [src/features/admin/components/logout-button.tsx:9]
- [x] [Review][Patch] Form đăng nhập chưa hydrate thì gửi form thuần (GET), mật khẩu lên URL và log; khóa nút gửi bằng `useHydrated` (chặn cả bấm lẫn Enter), cũng khử nguồn gây E2E chập chờn [src/features/admin/components/login-form.tsx:86]
- [x] [Review][Patch] `verify:build` luôn tự build lại nên không kiểm được "bản build có sẵn bị nhét mật khẩu vào `.next/static`" như AC 1.5; thêm cờ quét không build lại [scripts/verify-build.mjs]
- [x] [Review][Patch] Chưa có test cho `process.env.ORDERS_FILE || DEFAULT_ORDERS_FILE`; thêm `server.test.ts` (rỗng → mặc định, có giá trị → dùng giá trị) [src/features/orders/server.ts:11]
- [x] [Review][Patch] Chưa có kiểm Header/Footer khách trên trang 404; thêm khẳng định (logo "ShopLite - Trang chủ" và `<footer>`) vào bước URL lạ của E2E [e2e/admin-disabled.spec.ts]
- [x] [Review][Defer] Chưa có `admin/error.tsx`; lỗi trang quản trị dùng giao diện lỗi mặc định của Next sau khi `error.tsx` chuyển vào `(shop)` — deferred: có chủ đích (Design Notes 1.4); thêm khi có trang admin thật (Epic 2+) [src/app/admin/layout.tsx]
- [x] [Review][Defer] AGENTS.md chưa nêu hệ quả request thiếu `x-forwarded-for` dùng chung bucket `direct` — deferred: sửa file chỉ dẫn agent [AGENTS.md]

#### Rejected

- `false`: AC 1.4 "grep Header trong `src/app/admin` không có kết quả" — ý AC là Header/Footer khách; `admin/layout.tsx` buộc phải dùng `AdminHeader` (Tasks cùng spec).
- `false`: "AGENTS.md mô tả file không có trong diff" — các file đó đến từ commit story 1.1–1.4.
- `low`, ngoài thiết kế: khóa phiên dẫn xuất từ mật khẩu với muối cố định (AC/AD-11 quy định); `Secure` theo header (AC quy định theo giao thức thực); nhiều phát hiện về mật khẩu toàn khoảng trắng/độ mạnh (spec: "đặt và không rỗng"); không `noindex`/`frame-ancestors`/log khóa (ngoài AC); `OrderErrorCode` chứa mã xác thực (AGENTS.md quy định thêm vào đó); `scroll-padding-top`, `AdminContext` chưa có nơi dùng, input ẩn `username` bằng `hidden` (đều do AC quy định).
- `low`, sửa phức tạp hơn lợi ích: `check()` có thể loại khóa khác khi bảng đầy (chỉ khi đủ 10.000 khóa); cửa sổ cố định cho tối đa ~8 lần đoán quanh ranh giới; cookie trùng tên; `?next=` dạng mảng hoặc `/admin/../x` (an toàn, cùng origin); `router.push` ném lỗi; `GET`/`HEAD` vào `/api/admin/*` trả 405 khi chưa cấu hình; test quét guard chưa bắt `export const POST`; `client-boundary` chỉ liệt kê `admin-guard`; `verify:build` chỉ quét `static` và `server/app`, regex đọc mật khẩu, không nằm trong CI; test gắn với cấu trúc JSX; ngữ cảnh trình duyệt tự dựng không đóng; file đơn tạm không dọn giữa các lần chạy.

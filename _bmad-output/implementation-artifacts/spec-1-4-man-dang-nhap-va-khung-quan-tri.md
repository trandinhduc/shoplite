---
title: 'Story 1.4: Màn đăng nhập và khung quản trị'
type: 'feature'
created: '2026-11-21'
status: 'in-review'
baseline_commit: '36895bd1acb0f1e85e8092e459afcafcd6c44c28'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/admin/login` chỉ có một dòng H1 và root layout gắn Header/Footer khách vào mọi trang, nên nhân viên chưa có form đăng nhập, khung quản trị riêng hay nút Đăng xuất.

**Approach:** Tách Header/Footer khách khỏi root layout bằng route group `(shop)`, thêm `admin/layout.tsx` với AdminHeader, LoginForm tiếng Việt gọi API đăng nhập sẵn có, và nút Đăng xuất. Not-found gốc tự mang khung khách để URL lạ và `/admin` chưa cấu hình ra cùng một HTML.

## Boundaries & Constraints

**Always:** Chưa đặt `ADMIN_PASSWORD`: mọi `/admin*` hiện đúng trang not-found gốc với Header/Footer khách, giống hệt URL không tồn tại, không có AdminLayout hay chữ "Quản trị". Trang khách (`/`, `/cart`, `/checkout`, `/wishlist`, `/products/[slug]`) giữ nguyên chế độ render trong output `next build` (không bị chuyển sang dynamic). AdminHeader: khung `max-w-6xl px-4 h-16`, ô logo `size-8 rounded-lg bg-indigo-600` + `Store` `size-5` (không phải link), chữ "Quản trị"; chỉ khi đã đăng nhập mới có nút `ghost sm` "Đăng xuất" (`data-testid="admin-logout"`). Không menu khách, giỏ, wishlist, Footer khách trong `/admin*`. Mọi phần tử tương tác mới có `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`; `globals.css` có `html { scroll-padding-top: 5rem }`; không thêm màu, font, bo góc mới. Mật khẩu không lên URL hoặc `<title>`; không dùng modal, toast, spinner. Client Component không import `admin-guard` hay `node:*`. Text, comment, tên test tiếng Việt.

**Never:** Không sửa API đăng nhập/đăng xuất, phiên, rate limit (1.1–1.3). Không `proxy.ts`, không Server Action. Không link nào từ giao diện khách vào `/admin`. Không export `metadata` tĩnh làm lộ tiêu đề khi chưa cấu hình. Không thêm trang `/admin/*` nào khác ngoài hai trang hiện có.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Chưa cấu hình | env thiếu/rỗng, mở `/admin`, `/admin/login`, URL lạ | cùng HTML not-found gốc (🧭 "Không tìm thấy trang") với Header/Footer khách, status 404 | `notFound()` |
| Khung quản trị | `/admin/login` chưa đăng nhập / `/admin` đã đăng nhập | chỉ logo + "Quản trị" / thêm nút "Đăng xuất" | N/A |
| Đã đăng nhập mở login | cookie hợp lệ | chuyển `/admin` | N/A |
| Ô trống | gửi form `""` | lỗi field "Vui lòng nhập mật khẩu" (`aria-invalid` + `aria-describedby`), không gọi API, focus ô | N/A |
| Sai mật khẩu | server `401` | ErrorBanner "Mật khẩu không đúng" (`data-testid="login-error"`, không `role`), ô bị xóa và nhận focus; nút "Đang đăng nhập…" + `disabled` khi chờ | N/A |
| 429 / 500 / mạng | server trả hoặc `fetch` ném | banner: message server (429) / "Đã có lỗi xảy ra, vui lòng thử lại sau" / "Không kết nối được máy chủ, vui lòng thử lại."; banner nhận focus (`tabIndex={-1}`); nút không khóa, ô giữ giá trị | N/A |
| Đăng nhập đúng | `204` | chuyển `sanitizeNext(next)` hoặc `/admin` | N/A |
| Phiên hết hạn | `?next=` có và cookie `shoplite_admin` có nhưng không hợp lệ | thêm câu "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" phía trên ô, focus ô; không cookie thì không hiện | N/A |
| Đăng xuất | bấm nút | `POST /api/admin/logout` không hỏi, rồi chuyển `/admin/login`, kể cả khi lỗi | N/A |
| Tiêu đề | `/admin/login` | `<title>` "Đăng nhập quản trị \| ShopLite" | N/A |

</frozen-after-approval>

## Code Map

- `src/app/layout.tsx` -- root layout hiện render `Header`, `<main>`, `Footer`; thu về `<html>/<body>` + font, bỏ khung khách
- `src/app/not-found.tsx` -- trang 404 gốc; bọc bằng khung khách để vẫn có Header/Footer
- `src/app/error.tsx`, `page.tsx`, `cart/`, `checkout/`, `orders/`, `products/`, `wishlist/` -- trang khách; `git mv` vào `src/app/(shop)/` (URL không đổi)
- `src/components/layout/header.tsx`, `footer.tsx` -- khung khách; dùng lại trong `GuestShell` mới
- `src/features/admin/admin-guard.ts` -- hiện có `isValidSession` nội bộ và `requireAdmin`; thêm hàm đọc trạng thái phiên (`valid`/`invalid`/`none`), giữ `requireAdmin` hoạt động như cũ
- `src/app/admin/login/page.tsx` + `.test.tsx` -- đang chỉ H1; `assertAdminEnabled()` phải còn là dòng đầu (test quét guard)
- `src/app/admin/page.tsx` -- giữ nguyên
- `src/features/checkout/components/checkout-form.tsx` -- mẫu Field, lỗi field, `inputClass`; không sửa
- `src/features/admin/sanitize-next.ts`, `admin-messages.ts` -- thuần, dùng được ở client
- `src/app/globals.css` -- thêm `scroll-padding-top` vào rule `html` hiện có
- Baseline `next build`: `/`, `/cart`, `/checkout`, `/wishlist` là `○` tĩnh; `/products/[slug]` SSG; `/orders*`, `/products` là `ƒ`

## Tasks & Acceptance

**Execution:**
- [x] `src/app/(shop)/` -- `git mv` các trang khách và `error.tsx` vào đây; thêm `layout.tsx` render `GuestShell` -- khung khách không còn ở root
- [x] `src/components/layout/guest-shell.tsx` -- `Header` + `<main className="flex-1">` + `Footer` -- dùng chung bởi `(shop)/layout` và `not-found`
- [x] `src/app/layout.tsx` + `src/app/not-found.tsx` -- root chỉ còn html/body; not-found bọc `GuestShell`
- [x] `src/features/admin/admin-guard.ts` + test -- thêm trạng thái phiên; test ba trạng thái
- [x] `src/app/admin/layout.tsx` -- `assertAdminEnabled()` rồi đọc phiên, render `AdminHeader` + `<main>`
- [x] `src/features/admin/components/admin-header.tsx`, `logout-button.tsx` + tests -- logo + "Quản trị", nút Đăng xuất (`fetch` rồi chuyển, luôn chuyển dù lỗi)
- [x] `src/features/admin/components/login-form.tsx` + test -- test từng dòng ma trận (mock `fetch`, `next/navigation`)
- [x] `src/app/admin/login/page.tsx` + test -- đã đăng nhập thì `redirect("/admin")`, truyền `next` đã `sanitizeNext` và cờ hết hạn cho form, `generateMetadata` gọi `assertAdminEnabled()` rồi trả tiêu đề
- [x] `src/app/globals.css` -- thêm `scroll-padding-top: 5rem`

**Acceptance Criteria:**
- Given `npm run build`, when so với baseline, then `/`, `/cart`, `/checkout`, `/wishlist` vẫn `○`, `/products/[slug]` vẫn SSG, route admin vẫn `ƒ`
- Given `npm run check` và `npm run format:check`, when chạy, then pass, kể cả test quét guard
- Given `grep` mã nguồn, when tìm `Header`/`Footer`/`CartBadge` trong cây `src/app/admin`, then không có

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Finding (lớp) | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|
| 1 | Sau đăng nhập/đăng xuất, `AdminHeader` giữ `loggedIn` cũ vì `admin/layout.tsx` dùng chung và chỉ `router.push` (blind, edge-case, verification-gap) | high → patch | `login-form.tsx` gọi `router.push(next)`, `logout-button.tsx` gọi `router.push("/admin/login")`, không `router.refresh()`; layout dùng chung không dựng lại khi chuyển trang mềm. Kết quả: không có nút Đăng xuất sau khi đăng nhập, còn nút trên trang đăng nhập sau khi đăng xuất. Sửa: thêm `router.refresh()`, test kiểm có gọi (xác nhận bằng đọc code, chưa chạy trên trình duyệt) |
| 2 | `body?.error.message` ném `TypeError` khi JSON hợp lệ nhưng thiếu `error`, bị báo nhầm là lỗi mạng (blind, edge-case) | medium → patch | `login-form.tsx:614,616`; sửa `?.`, thêm test 401 và 429 với thân không chuẩn |
| 3 | Test 401 dùng đúng chữ của hằng dự phòng nên không phân biệt message server với dự phòng (verification-gap) | medium → patch | Gộp vào mục 2: thêm ca 401 message khác, thân không phải JSON |
| 4 | `admin/layout.tsx` không có test: đổi `loggedIn={true}` vẫn pass (verification-gap) | medium → patch | Không file test nào dựng layout; thêm `layout.test.tsx` kiểm `valid` → `true`, `invalid`/`none` → `false`, và `assertAdminEnabled` được gọi |
| 5 | Ô mật khẩu dùng `focus:ring-2 … focus:outline-none` thay vì `focus-visible:outline-2 …` như AC (edge-case) | medium → patch | Đọc `login-form.tsx:559-560`: chép từ form thanh toán; Spec `Always` yêu cầu quy tắc focus này. Sửa lớp CSS |
| 6 | `getAdminSession` không kiểm `isAdminEnabled()`; token ký bằng khóa mật khẩu rỗng đọc thành `valid` khi chưa cấu hình (edge-case) | low → patch | Hiện mọi nơi gọi đều `assertAdminEnabled()` trước nên chưa khai thác được; sửa một dòng cho khớp cách đã vá `checkAdminPassword`, thêm test |
| 7 | Đăng xuất lỗi/mạng rớt thì cookie còn, trang đăng nhập đẩy về `/admin`, người dùng vẫn đăng nhập mà không báo (blind, edge-case) | medium → reject | AC quy định rõ: lỗi (401, mạng) vẫn chuyển `/admin/login`; trang đăng nhập chuyển `/admin` khi đã có phiên cũng là AC. Nêu trong báo cáo |
| 8 | Không test cho trang not-found gốc bọc `GuestShell`; không e2e cho đăng nhập/đăng xuất và khung 404 (blind, verification-gap) | medium → defer | Cần dựng Header đầy đủ hoặc chạy server; e2e là Story 1.5. Ghi deferred-work |
| 9 | `admin/error.tsx` và `noindex` thiếu; lỗi admin dùng giao diện lỗi mặc định (blind, edge-case) | low → reject | Design Notes đã nêu có chủ đích; `noindex` không nằm trong AC |
| 10 | Nút Đăng xuất bấm đúp gửi hai request (edge-case, blind) | low → reject | Yêu cầu thứ hai chỉ trả `401`, hai lần `push` vô hại; sửa thêm state |
| 11 | `router.push` ném hoặc kẹt làm nút khóa mãi (edge-case) | low → reject | Không có bằng chứng đường tới |
| 12 | `?next=` lặp thành mảng rơi về `/admin`; đã đăng nhập bỏ qua `next` (blind, edge-case) | low → reject | `sanitizeNext` an toàn; AC: đã đăng nhập thì chuyển thẳng `/admin` |
| 13 | Input ẩn `username` dùng `hidden` nên một số trình quản lý mật khẩu bỏ qua (blind) | low → reject | AC quy định input ẩn; hành vi trình quản lý mật khẩu không kiểm chứng được |
| 14 | Message 401/ô trống ghi cứng cục bộ, có thể lệch server (blind) | low → reject | Có dự phòng, ưu tiên message server |
| 15 | Banner không `role`/`aria-live`; `scroll-padding-top` toàn trang; câu "hết hạn" ít hiện khi hết hạn tự nhiên (blind, edge-case) | low → reject | Đều do AC quy định (`role` không có, `scroll-padding-top: 5rem`, điều kiện cookie có nhưng không hợp lệ) |
| 16 | Test trang đăng nhập đọc `props.children[1]` nên dễ vỡ khi đổi cấu trúc JSX (blind) | low → reject | Chỉ là độ giòn của test, không có hệ quả hành vi |
| 17 | AGENTS.md chưa nhắc nhóm route `(shop)`, `GuestShell`, component admin, `getAdminSession` (mình thêm khi đọc diff) | medium → defer | Sửa file chỉ dẫn agent: không tự sửa, ghi deferred-work |

## Design Notes

- Not-found tự mang khung khách vì boundary của `notFound()` nằm trên `(shop)/layout` và `admin/layout`: khi `/admin` ném `notFound()`, cả hai layout bị thay bằng not-found gốc. `admin/layout.tsx` vẫn gọi `assertAdminEnabled()` chỉ để không dựng AdminHeader; chốt chặn thật vẫn ở từng page.
- `error.tsx` chuyển vào `(shop)` để lỗi trang khách còn Header; lỗi trang quản trị dùng giao diện lỗi mặc định của Next (chưa có `admin/error.tsx`).
- Không chạy được `next dev` ở phiên này; AC "cùng HTML" và 404 thật cần bạn kiểm bằng `curl`.

## Verification

**Commands:**
- `npx vitest run src/app src/features/admin src/components` -- expected: pass
- `npm run check && npm run format:check` -- expected: pass
- `npm run build` -- expected: pass, bảng route khớp baseline

**Manual checks (if no CLI):**
- Không đặt `ADMIN_PASSWORD`: `curl -s localhost:3000/admin` và `curl -s localhost:3000/khong-ton-tai` ra cùng nội dung có Header/Footer khách. Đặt `ADMIN_PASSWORD=abc`: `/admin` chuyển `/admin/login`, đăng nhập đúng vào được `/admin`, bấm Đăng xuất về `/admin/login`. `npm run test:e2e` (theo AGENTS.md vì đổi layout).

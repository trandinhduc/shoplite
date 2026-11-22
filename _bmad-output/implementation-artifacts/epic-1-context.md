# Epic 1 Context: Khu vực quản trị an toàn

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Chủ shop đặt biến môi trường `ADMIN_PASSWORD` để bật khu vực quản trị; hai nhân viên đăng nhập và đăng xuất được; khi chưa cấu hình, mọi `/admin` và API quản trị trả 404 như URL không tồn tại; đoán sai mật khẩu quá 5 lần thì IP bị khóa 15 phút. Epic này cũng dựng nền tiến trình dùng chung (`process-singleton`, `signed-token`, `rate-limit`, `admin-guard`, AdminLayout) mà mọi epic sau (tra cứu đơn, kho, hàng việc) phụ thuộc, nên không chạy song song với Epic 3.

## Stories

- Story 1.1: Khóa khu vực quản trị khi chưa cấu hình
- Story 1.2: Phiên quản trị ký HMAC và API đăng nhập, đăng xuất
- Story 1.3: Giới hạn đăng nhập sai theo IP
- Story 1.4: Màn đăng nhập và khung quản trị
- Story 1.5: Kiểm chứng đầu-cuối: bật khu vực quản trị

## Requirements & Constraints

- Khu vực quản trị chỉ hoạt động khi mật khẩu quản trị được đặt và không rỗng; không có mật khẩu mặc định. Chưa đặt: mọi trang `/admin` (kể cả `/admin/login`) và API quản trị trả 404. Đã đặt mà chưa đăng nhập: trang chuyển tới đăng nhập, API trả `401 UNAUTHORIZED`.
- 5 lần đăng nhập sai từ cùng IP trong 15 phút thì khóa IP 15 phút với `429 TOO_MANY_ATTEMPTS`; đúng mật khẩu trong lúc khóa vẫn bị từ chối.
- Đăng nhập đúng tạo phiên trên trình duyệt đó; đăng xuất được; phiên hết hạn sau 12 giờ; đổi mật khẩu làm mọi phiên cũ mất hiệu lực.
- Mật khẩu chỉ đến từ biến môi trường, không xuất hiện trong log, response hay mã nguồn client; không log PII đầy đủ.
- Mọi API quản trị kiểm phiên ở server, không chỉ ẩn nút trên giao diện.
- Một máy chủ, file JSON, không database, không dịch vụ ngoài, không thêm dependency (chỉ `node:crypto`, `node:fs`, `node:async_hooks`).
- Text giao diện, message lỗi, comment, tên test mới bằng tiếng Việt; mã lỗi mới phải có trong `OrderErrorCode` + `HTTP_STATUS_BY_CODE`.
- Test bắt buộc: mỗi route admin trả 404 khi chưa đặt mật khẩu và 401 khi chưa đăng nhập; test tĩnh quét `src/app/admin/**` và `src/app/api/admin/**` để mỗi page/handler gọi guard (trừ login); `next build` cho thấy cây `/admin` là động.
- Cập nhật cùng đợt: Codemap AGENTS.md (`admin/`, `src/lib/{signed-token,rate-limit,process-singleton}.ts`), dòng E2E của AGENTS.md (server do Playwright khởi động với `ORDERS_FILE` tạm), thêm `.env.example` (`ADMIN_PASSWORD=` trống = tắt khu vực quản trị; `ORDERS_FILE=`), và `playwright.config.ts` đặt `ORDERS_FILE` trỏ file tạm + `ADMIN_PASSWORD` giá trị test cho webServer, `reuseExistingServer: false`.

## Technical Decisions

- `src/lib/process-singleton.ts`: `singleton(key, init)` lưu trên `globalThis[Symbol.for("shoplite:"+key)]` để bền qua hot reload và các bundle của Next; bắt buộc smoke test `next dev` và `next start`.
- Mã lỗi mới: `UNAUTHORIZED` 401, `TOO_MANY_ATTEMPTS` 429 (kèm `details.retryAfterSeconds` và header `Retry-After` do `handleRouteError` đặt); hai hằng số message 429 riêng (đăng nhập, tra cứu). Thứ tự trong handler nhạy cảm: cổng quản trị/quyền, khóa theo client, `readJsonBody`, Zod, thông tin xác thực, service. Ngoại lệ envelope duy nhất: API quản trị khi chưa đặt mật khẩu trả 404 thân rỗng; log chỉ mã đơn, mã lỗi.
- `admin/admin-guard.ts` (server-only): `requireAdmin()` cho page và `requireAdminApi(request)` cho handler, gọi ở dòng đầu mọi page `/admin/**` (trừ `/admin/login`) và mọi handler `/api/admin/**`; `admin/layout.tsx` không phải chốt chặn. `/admin/**` là `force-dynamic`. Chưa đặt mật khẩu thì `notFound()` trước mọi streaming. `?next=` chỉ nhận đường dẫn bắt đầu `/admin` và không có `//`. `AdminContext` mờ là tham số đầu của mọi hàm service nhân viên. Biến môi trường chỉ được đọc trong `admin-guard.ts`.
- `src/lib/signed-token.ts`: HMAC-SHA256, `purpose` trộn vào MAC, so bằng `timingSafeEqual` sau khi so độ dài. Khóa phiên = `scrypt(ADMIN_PASSWORD, muối cố định)` cache theo mật khẩu (đổi mật khẩu thì phiên cũ vô hiệu). Cookie `shoplite_admin`: `httpOnly`, `sameSite=lax`, `path=/`, 12 giờ, `secure` theo giao thức thực. `POST /api/admin/login` trả 204 + Set-Cookie, sai trả 401 "Mật khẩu không đúng"; `POST /api/admin/logout` trả 204. So mật khẩu bằng SHA-256 hai vế + `timingSafeEqual`.
- `src/lib/rate-limit.ts`: `createRateLimiter({ max, windowMs, lockMs, now, maxKeys })`; kiểm khóa trước kiểm thông tin xác thực; chỉ đếm lần sai; khóa có namespace (`login:`...); tối đa 10.000 khóa, khóa đang bị khóa không bị loại. `getClientKey(request)` lấy phần tử ngoài cùng bên phải của `x-forwarded-for`, thiếu thì `"direct"`.
- Vận hành: một tiến trình Node (`next start`) sau reverse proxy nối `x-forwarded-for`; không serverless/nhiều instance.
- Ranh giới client/server: Client Component không được import `admin/admin-guard` hay `node:*`, kể cả bắc cầu. Không dùng `proxy.ts` và không dùng Server Action cho thao tác quản trị.

## UX & Interaction Patterns

- `/admin*` dùng layout riêng: AdminHeader thay Header khách (khung `max-w-6xl px-4 h-16`, logo `size-8 rounded-lg bg-indigo-600` không phải link, chữ "Quản trị", nút ghost `sm` "Đăng xuất"); không có menu khách, giỏ, wishlist hay Footer khách. Root layout phải phân nhánh hoặc tách Header/Footer khách ra. Ở `/admin/login` chỉ có logo + "Quản trị". Không có link nào từ giao diện khách vào `/admin`.
- Chưa đặt mật khẩu: mọi `/admin*` hiện đúng trang not-found gốc của app, giống hệt URL không tồn tại (không AdminLayout, không chữ "Quản trị").
- Tiêu đề trang đăng nhập: "Đăng nhập quản trị".
- LoginForm: thẻ hẹp `max-w-md`, `py-16`; trường "Mật khẩu" `type="password"` `autoComplete="current-password"` kèm input ẩn `autoComplete="username"` giá trị `admin`; không chặn dán; `noValidate`. Ô trống: "Vui lòng nhập mật khẩu"; sai: "Mật khẩu không đúng", xóa ô, focus ô, `aria-invalid` + `aria-describedby`; 429: câu "Bạn thử sai quá nhiều lần, vui lòng thử lại sau 15 phút. Trong thời gian này, mọi lần đăng nhập đều bị từ chối." và nút không bị khóa; đến từ 401 (`?next=`): "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" + focus ô. Đúng thì về `next` hợp lệ hoặc `/admin`; đã đăng nhập mở `/admin/login` thì chuyển `/admin`. Nút "Đăng nhập"/"Đang đăng nhập…" `primary lg w-full`.
- Sau Đăng xuất (kể cả lỗi) chuyển `/admin/login`. Thao tác trả 401 hoặc tải trang khi chưa đăng nhập thì chuyển `/admin/login?next=<trang hiện tại>`.
- Mọi phần tử tương tác mới dùng focus ring `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`; thêm `html { scroll-padding-top: 5rem }`; không thêm màu, font, bo góc, shadow hay token tùy biến. Focus không bao giờ rơi về `body`; mọi input có `<label>` hiển thị.
- Mật khẩu không bao giờ lên URL hoặc `<title>`; không hiện mã lỗi thô; không dùng modal, toast, spinner (nút đang gửi: chữ "Đang…" + `disabled`). Testid `login-error`, `admin-logout`.

## Cross-Story Dependencies

- Epic 2 dùng `requireAdminApi`/`AdminContext` (khóa `GET /api/orders`); Epic 3 dùng `process-singleton.ts`; mọi epic thêm route admin về sau phải mở rộng test tĩnh quét guard.

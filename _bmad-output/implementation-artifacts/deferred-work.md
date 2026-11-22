- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-khoa-khu-vuc-quan-tri-khi-chua-cau-hinh.md`
  summary: Siết test quét `src/app/api/admin/**/route.ts` khi thêm route admin đầu tiên (Story 1.2).
  evidence: Test hiện chấp nhận handler gọi `requireAdminApi` nhưng bỏ qua `Response | null` trả về, pass rỗng khi chưa có route, và bỏ sót `export const POST =`, HEAD, OPTIONS; cần yêu cầu `const x = await requireAdminApi(...)` + `if (x) return x`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-khoa-khu-vuc-quan-tri-khi-chua-cau-hinh.md`
  summary: Cập nhật AGENTS.md: liệt kê `ADMIN_PASSWORD`/`.env.example`, sửa "ba module" thành bốn trong ghi chú `client-boundary.test.ts`, và làm rõ quy tắc "Không commit `.env*`" (trừ `.env.example`).
  evidence: Review phát hiện AGENTS.md lệch với thay đổi của Story 1.1; sửa file chỉ dẫn agent nên không tự động vá.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-khoa-khu-vuc-quan-tri-khi-chua-cau-hinh.md`
  summary: Kiểm chứng đầu-cuối 404/redirect của `/admin` và `/admin/login` bằng server thật (Story 1.5).
  evidence: Chưa chạy `curl` vì lệnh khởi động server bị từ chối; unit test chỉ mock `notFound`/`redirect`. Chưa kiểm chứng HTML 404 không chứa chữ "Quản trị" khi chưa đặt mật khẩu.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-phien-quan-tri-ky-hmac-va-api-dang-nhap-dang-xuat.md`
  summary: Cập nhật dòng Admin trong AGENTS.md: thêm `adminGate`, `checkAdminPassword`, `createSessionCookie`, `clearSessionCookie`, kiểu trả `AdminContext | Response`, cookie `shoplite_admin` 12 giờ, và test quét kiểm cả dòng sau guard.
  evidence: Review phát hiện dòng Admin của AGENTS.md chỉ liệt kê hàm của Story 1.1; sửa file chỉ dẫn agent nên không tự động vá.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-gioi-han-dang-nhap-sai-theo-ip.md`
  summary: Ghi quy tắc giới hạn đăng nhập sai vào mục "Chính sách" của AGENTS.md: 5 lần sai trong 15 phút thì khóa IP 15 phút, tính theo `x-forwarded-for` ngoài cùng bên phải (cần reverse proxy tin cậy), bộ đếm theo tiến trình và mất khi khởi động lại.
  evidence: Review phát hiện AGENTS.md chỉ có Codemap cho limiter, thiếu quy tắc nghiệp vụ; sửa file chỉ dẫn agent nên không tự động vá.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-man-dang-nhap-va-khung-quan-tri.md`
  summary: Thêm e2e (Story 1.5) cho đăng nhập/đăng xuất (header đổi nút Đăng xuất đúng sau mỗi bước), và kiểm trang 404 gốc có Header/Footer khách giống hệt giữa URL lạ và `/admin` khi chưa cấu hình.
  evidence: Chưa chạy được `npm run test:e2e` và `curl` vì không khởi động được server; unit test mock `useRouter` nên không bắt được lỗi layout dùng chung; không test nào dựng `not-found.tsx` bọc `GuestShell`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-man-dang-nhap-va-khung-quan-tri.md`
  summary: Cập nhật AGENTS.md: ghi nhóm route `src/app/(shop)/`, `GuestShell`, `admin/layout.tsx`, `src/features/admin/components/` (`admin-header`, `login-form`, `logout-button`) và `getAdminSession`; lưu ý not-found gốc tự bọc `GuestShell`.
  evidence: Story 1.4 chuyển các trang khách vào `(shop)` và thêm component admin; AGENTS.md chưa phản ánh. Sửa file chỉ dẫn agent nên không tự động vá.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-kiem-chung-dau-cuoi-bat-khu-vuc-quan-tri.md`
  summary: Chạy `npm run test:e2e` (người dùng chạy tay) và sửa nếu fail: hai spec mới `admin-auth`, `admin-disabled` và hai spec cũ `shopping-flow`, `wishlist` chưa từng chạy với cấu hình hai server.
  evidence: Môi trường làm việc không khởi động được server (lệnh bị từ chối); các rủi ro cần xem: hai `next dev` song song với `distDir` riêng, so sánh `innerText` 404, header `x-forwarded-for` tới API đăng nhập, điền form trước khi hydrate (có thể gửi form thuần, đưa mật khẩu lên URL), và `next-env.d.ts`/`tsconfig.json` bị ghi lại sau khi chạy; kiểm bằng `git status` và `npm run typecheck`.

## Deferred from: code review of Epic 1 (2026-11-21)

- Thêm `src/app/admin/error.tsx` (giao diện lỗi tiếng Việt kèm nút thử lại) khi có trang admin thật ở Epic 2 trở đi. `error.tsx` gốc đã chuyển vào `(shop)` nên lỗi trang quản trị hiện dùng giao diện lỗi mặc định của Next. Nguồn: `spec-1-4-man-dang-nhap-va-khung-quan-tri.md` (Design Notes).
- Ghi vào AGENTS.md (mục Chính sách, giới hạn đăng nhập) rằng request thiếu `x-forwarded-for` dùng chung bucket `direct`, nên 5 lần sai của bất kỳ ai có thể khóa mọi client không có header, gồm cả admin thật. Nguồn: review Epic 1 (verification-gap).

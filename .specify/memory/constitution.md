<!--
Sync Impact Report
- Version change: (template, chưa có version) → 1.0.0
- Modified principles (placeholder → tên mới):
  - [PRINCIPLE_1_NAME] → I. Kiến trúc theo tính năng
  - [PRINCIPLE_2_NAME] → II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Server là nguồn sự thật về tiền
  - [PRINCIPLE_4_NAME] → IV. Đơn giản trước
  - [PRINCIPLE_5_NAME] → V. Trải nghiệm tiếng Việt và dễ tiếp cận
- Added sections: Ràng buộc kỹ thuật, Quy trình phát triển, Governance (điền nội dung)
- Removed sections: không có
- Templates: không sửa (plan/spec/tasks template đọc constitution lúc chạy)
- Follow-up TODOs: không có. Ratification date = ngày phê chuẩn lần đầu (2026-11-08).
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

- Logic nghiệp vụ, component và test của một tính năng MUST nằm trong
  `src/features/<feature>/` (hiện có `catalog`, `cart`, `checkout`, `orders`).
- `src/app/` MUST chỉ là route mỏng:
  - Page lấy dữ liệu từ service của feature rồi render component.
  - Route Handler chỉ đọc request, gọi service rồi trả response.
  - Route MUST NOT chứa quy tắc nghiệp vụ, không truy cập file hay dữ liệu trực tiếp.
- Truy cập dữ liệu đơn hàng MUST đi qua service → repository (`createOrderService` →
  `OrderRepository`). Service SHOULD được tạo bằng factory nhận dependency (`repository`, `now`,
  `findProduct`…) để test được.
- UI dùng chung đặt ở `src/components/`, tiện ích ở `src/lib/`. Import MUST dùng alias `@/`.
  File đặt tên kebab-case.

**Lý do:** Ai đọc một thư mục feature cũng hiểu trọn tính năng đó. Route mỏng giúp nghiệp vụ test
được mà không cần dựng Next.js.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

- Mọi quy tắc về tính tiền, giới hạn số lượng/tồn kho và chuyển trạng thái đơn hàng MUST có unit
  test được viết **trước** khi cài đặt. Test phải fail trước, sau đó mới viết code cho pass.
- Test MUST bao phủ giá trị biên, ví dụ:
  - `FREE_SHIPPING_THRESHOLD - 1`, `FREE_SHIPPING_THRESHOLD`, `subtotal = 0`;
  - `MAX_QUANTITY_PER_ITEM` và `stock = 0`;
  - mọi trạng thái không phải `pending` khi hủy đơn.
- Test MUST đặt cạnh file nguồn (`*.test.ts(x)`). Code dùng file hệ thống MUST được test bằng
  repository in-memory hoặc thư mục tạm, MUST NOT ghi vào `storage/`.
- `npm run check` (lint + typecheck + test) MUST pass trước khi commit hoặc merge. Thay đổi
  luồng mua hàng SHOULD chạy thêm `npm run test:e2e`.

**Lý do:** Sai một quy tắc tiền hay trạng thái gây thiệt hại trực tiếp. Test viết trước là đặc
tả có thể thực thi được.

### III. Server là nguồn sự thật về tiền

- Giá, phí ship, giảm giá và tổng tiền MUST do server tính lại từ dữ liệu catalog và hàm dùng
  chung (`calculateOrderTotals` trong `features/checkout/pricing.ts`). Mọi giá trị tiền do
  client gửi lên MUST bị bỏ qua.
- Luật tính tiền MUST chỉ được định nghĩa ở một nơi (`pricing.ts` hoặc module cùng feature).
  Client MAY dùng lại các hàm này để hiển thị, nhưng không được tự viết lại công thức.
- Mọi input từ bên ngoài (body API, query, form) MUST được validate bằng Zod qua `safeParse`.
  Schema SHOULD dùng chung giữa client và server (`checkout-schema.ts`).
- Lỗi nghiệp vụ MUST là lỗi có `code` (như `OrderError`). Route MUST trả lỗi qua
  `handleRouteError`/`jsonError` theo đúng format `{ error: { code, message, details? } }`.
- Tồn kho MUST được kiểm tra lại trên server khi tạo đơn.

**Lý do:** Client có thể bị sửa. Chỉ khi server tính lại thì số tiền khách trả mới đúng.

### IV. Đơn giản trước

- Tính năng mới MUST dùng stack hiện có: Next.js App Router, React, TypeScript strict, Tailwind
  CSS v4, Zod, Vitest/Testing Library, Playwright.
- Thêm dependency mới, database, dịch vụ ngoài hoặc tầng trừu tượng mới MUST NOT xảy ra nếu
  `plan.md` không ghi rõ lý do và phương án đơn giản hơn đã bị loại.
- Lưu trữ MUST tiếp tục dùng dữ liệu tĩnh trong `src/data/`, `localStorage` (giỏ hàng) và
  repository file JSON (đơn hàng), trừ khi plan đã giải thích lý do thay đổi.
- Code SHOULD giải quyết đúng yêu cầu hiện tại (YAGNI). Không thêm cấu hình hay mở rộng cho
  nhu cầu giả định.

**Lý do:** ShopLite là dự án mẫu cho bài lab: phải đủ nhỏ để đọc hiểu trong một buổi.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

- Mọi text hiển thị, thông báo lỗi (cả lỗi API) MUST viết bằng tiếng Việt có dấu.
  Comment và tên test SHOULD viết bằng tiếng Việt.
- Số tiền MUST hiển thị qua `formatCurrency` và ngày giờ qua `formatDateTime` (`src/lib/format.ts`).
  Không tự format thủ công.
- Tìm kiếm MUST không phân biệt dấu (`normalizeText`).
- Mọi trường form MUST có `<label>` gắn với input. Lỗi validate MUST hiển thị ngay tại từng
  trường (map từ `toFieldErrors`), không chỉ một thông báo chung.
- Control tương tác SHOULD có tên truy cập được (label, `aria-*`) để Testing Library và Playwright
  tìm bằng role/label.

**Lý do:** Người dùng là khách hàng Việt Nam. Form dễ tiếp cận cũng là form dễ test.

## Ràng buộc kỹ thuật

- Node.js >= 22.12, npm 10+. Next.js 16 (App Router, Turbopack), React 19, TypeScript `strict`.
- Page/handler dùng type sinh tự động `PageProps<"/route">` / `RouteContext<"/api/...">` và
  MUST `await` `params`/`searchParams`. Script `typecheck` chạy `next typegen` trước `tsc`.
- Mặc định là Server Component. Chỉ dùng `"use client"` khi cần state, hook hoặc browser API.
  Client Component MUST NOT import `features/orders/server.ts` hay `node:fs`.
- UI phụ thuộc `localStorage` MUST xử lý trạng thái chưa hydrate (`useHydrated`, `hydrated`).
- Cấu hình qua biến môi trường. Đơn hàng lưu tại `ORDERS_FILE` (mặc định `storage/orders.json`).
  `storage/` và `.env*` MUST NOT được commit.
- Code MUST qua ESLint (`eslint-config-next`) và Prettier (`prettier-plugin-tailwindcss`).

## Quy trình phát triển

- Mỗi tính năng MUST làm trên nhánh riêng, không commit trực tiếp lên `main`.
- Trình tự theo Spec Kit: `specify` → `clarify` → `plan` → `tasks` → `implement`.
- MUST NOT bắt đầu viết code khi `spec.md` còn câu hỏi mở (`[NEEDS CLARIFICATION]`)
  chưa được giải quyết.
- `plan.md` MUST có mục Constitution Check đối chiếu 5 nguyên tắc. Mọi vi phạm phải được ghi
  vào bảng Complexity Tracking kèm lý do.
- `tasks.md` MUST xếp task viết test trước task cài đặt cho các quy tắc thuộc Nguyên tắc II.
- Trước khi báo hoàn thành:
  - `npm run check` pass;
  - code đã format;
  - `README.md` đã cập nhật nếu thay đổi API, biến môi trường hoặc quy tắc nghiệp vụ.

## Governance

- Constitution này có hiệu lực cao hơn mọi hướng dẫn khác trong repo. Khi `AGENTS.md`/`CLAUDE.md`
  mâu thuẫn với constitution thì constitution được ưu tiên, và file kia phải được sửa cho khớp.
- **Sửa đổi:**
  - Đề xuất qua pull request, ghi rõ nội dung thay đổi và lý do.
  - Mỗi lần sửa MUST tăng version theo semver và cập nhật `Last Amended`.
  - Nếu thay đổi làm code hiện tại vi phạm thì PR MUST kèm kế hoạch chuyển đổi.
- **Quy tắc version:**
  - MAJOR: bỏ hoặc định nghĩa lại một nguyên tắc theo cách không tương thích.
  - MINOR: thêm nguyên tắc hoặc mục mới, hoặc mở rộng đáng kể hướng dẫn.
  - PATCH: làm rõ câu chữ, sửa lỗi chính tả, không đổi ý nghĩa.
- **Tuân thủ:** Mọi review PR và mọi `plan.md` MUST kiểm tra tuân thủ constitution. Độ phức tạp
  vượt Nguyên tắc IV MUST được biện minh bằng văn bản.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08

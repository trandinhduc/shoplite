<!--
Sync Impact Report
- Version change: (template, chưa có) → 1.0.0
- Nguyên tắc (mới, thay cho placeholder của template):
  - [PRINCIPLE_1_NAME] → I. Kiến trúc theo tính năng
  - [PRINCIPLE_2_NAME] → II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Server là nguồn sự thật về tiền
  - [PRINCIPLE_4_NAME] → IV. Đơn giản trước
  - [PRINCIPLE_5_NAME] → V. Trải nghiệm tiếng Việt và dễ tiếp cận
- Mục thêm mới: Ràng buộc kỹ thuật, Quy trình phát triển, Governance
- Mục bị xóa: không có
- Templates: không sửa (plan/spec/tasks template đọc constitution lúc chạy)
- TODO hoãn lại: không có. Ratified = ngày áp dụng lần đầu (2026-11-08).
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

- Logic, component và test của một tính năng MUST nằm trong `src/features/<feature>/`
  (hiện có: `catalog`, `cart`, `checkout`, `orders`).
- `src/app/` MUST chỉ chứa route mỏng: page (Server Component) gọi thẳng service của feature,
  Route Handler chỉ đọc request → gọi service → trả response. Business logic MUST NOT nằm trong
  `src/app/`.
- UI dùng chung MUST đặt ở `src/components/`, tiện ích ở `src/lib/`; import bằng alias `@/`.
- Tên file MUST là kebab-case; test MUST đặt cạnh file với tên `<tên>.test.ts(x)`.
- Mặc định là Server Component; `"use client"` chỉ SHOULD dùng cho phần tương tác. Client
  Component MUST NOT import `features/orders/server.ts` hoặc repository bản file.

**Lý do**: Gom theo tính năng giúp đọc hiểu, test và mở rộng một tính năng mà không phải lần
khắp codebase; route mỏng giữ logic có thể unit test mà không cần dựng HTTP.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

- Mọi quy tắc về tính tiền, giới hạn (số lượng, tồn kho) và chuyển trạng thái MUST có unit test
  được viết TRƯỚC khi hiện thực, và test MUST fail trước khi code được viết (Red → Green →
  Refactor).
- Test MUST bao phủ giá trị biên: ngay dưới, đúng bằng và ngay trên ngưỡng (ví dụ subtotal so với
  `FREE_SHIPPING_THRESHOLD`, quantity so với `MAX_QUANTITY_PER_ITEM` và `stock`, `stock = 0`,
  subtotal ≤ 0), cùng mọi chuyển trạng thái hợp lệ và không hợp lệ.
- Thay đổi API MUST có test route dùng `createInMemoryOrderRepository()`; unit test MUST NOT dùng
  file thật hay ghi vào `storage/`.
- `npm run check` (lint + typecheck + test) MUST pass trước khi commit/merge. Thay đổi luồng mua
  hàng/đặt hàng MUST pass thêm `npm run test:e2e`.

**Lý do**: Sai một quy tắc tiền hay trạng thái là lỗi trực tiếp gây thiệt hại cho khách và cửa
hàng; test viết trước buộc quy tắc được hiểu rõ và khóa lại hành vi ở biên.

### III. Server là nguồn sự thật về tiền

- Giá đơn vị, phí ship, giảm giá, subtotal và tổng tiền MUST do server tính lại từ catalog và
  `calculateOrderTotals`; server MUST NOT dùng giá, tổng tiền hay tồn kho do client gửi lên.
  Client chỉ gửi `{ productId, quantity }` và lựa chọn của người dùng.
- Tồn kho MUST được kiểm tra lại ở server (`INSUFFICIENT_STOCK`).
- Mọi input từ client MUST được validate bằng Zod (`placeOrderSchema` và các schema trong
  `checkout-schema.ts`, dùng chung client/server); server MUST NOT bỏ bước validate này.
- Hằng số nghiệp vụ (10, 30_000, 60_000, 500_000…) MUST được import từ `cart-reducer.ts` /
  `pricing.ts`, MUST NOT hard-code lại.
- Lỗi nghiệp vụ MUST ném `OrderError` (code mới thêm vào `OrderErrorCode` +
  `HTTP_STATUS_BY_CODE`); response lỗi MUST có dạng `ApiErrorBody`
  `{ error: { code, message, details? } }`.

**Lý do**: Client có thể bị sửa tùy ý; chỉ khi server tự tính và tự kiểm tra thì số tiền trên đơn
hàng mới đáng tin.

### IV. Đơn giản trước

- Tính năng mới MUST dùng stack hiện có: Next.js App Router, React, TypeScript, Tailwind CSS,
  Zod, Vitest/Testing Library, Playwright; lưu trữ bằng file JSON và `localStorage`.
- Thêm dependency mới, database, dịch vụ ngoài hoặc tầng trừu tượng mới MUST NOT xảy ra trừ khi
  `plan.md` ghi rõ lý do, phương án đơn giản hơn đã cân nhắc và vì sao bị loại (mục Complexity
  Tracking).
- Giải pháp SHOULD là phiên bản nhỏ nhất đáp ứng spec (YAGNI); không thêm cấu hình hay tính năng
  "để sau dùng".

**Lý do**: ShopLite là dự án mẫu cần đọc hiểu được trong một buổi; mỗi phụ thuộc mới là chi phí
học, bảo trì và rủi ro.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

- Text hiển thị, thông báo lỗi, comment và tên test MUST viết bằng tiếng Việt.
- Tiền MUST hiển thị qua `formatCurrency`, ngày giờ qua `formatDateTime` (`src/lib/format.ts`);
  MUST NOT tự format thủ công.
- Mọi trường form MUST có `<label>` gắn với input; lỗi validate MUST hiển thị theo từng trường
  (key dạng `"customer.phone"` qua `toFieldErrors`) và SHOULD được liên kết bằng
  `aria-describedby` / `aria-invalid`.
- Phần tử tương tác SHOULD dùng được bằng bàn phím và có tên truy cập (accessible name); dữ liệu
  chỉ có ở trình duyệt MUST dùng `hydrated` / `useHydrated()` để tránh lệch hydrate.

**Lý do**: Người dùng là khách hàng Việt Nam; text nhất quán, tiền đúng định dạng và form dễ
tiếp cận giảm nhầm lẫn khi thanh toán.

## Ràng buộc kỹ thuật

- Runtime: Node.js ≥ 22.12, npm 10+. Stack: Next.js 16 (App Router, Turbopack), React 19,
  TypeScript, Tailwind CSS v4, Zod 4, Vitest + Testing Library (jsdom), Playwright.
- Dữ liệu sản phẩm/danh mục là dữ liệu tĩnh trong `src/data/`. Giỏ hàng chỉ ở trình duyệt
  (`localStorage` key `CART_STORAGE_KEY = "shoplite:cart"`). Đơn hàng lưu ở `storage/orders.json`
  (gitignore, đổi bằng env `ORDERS_FILE`), ghi qua file tạm rồi `rename`; MUST NOT ghi trực tiếp
  file này ngoài repository.
- Quy tắc nghiệp vụ hiện hành MUST luôn đúng: tối đa `MAX_QUANTITY_PER_ITEM = 10` và không vượt
  `stock`; ship `standard` 30_000 (miễn phí khi subtotal ≥ 500_000), `express` 60_000, subtotal ≤ 0
  thì phí 0; chỉ hủy đơn khi `status === "pending"` (ngược lại `INVALID_STATUS_TRANSITION`, 409).
- Test dùng file hệ thống / Route Handler MUST khai báo `// @vitest-environment node`.
- MUST NOT bật lại `agentRules` trong `next.config.ts`.
- Hướng dẫn chi tiết khi phát triển nằm ở `AGENTS.md`; khi mâu thuẫn, constitution này được ưu
  tiên và `AGENTS.md` MUST được cập nhật cho khớp.

## Quy trình phát triển

- Mỗi tính năng MUST làm trên nhánh riêng, không commit thẳng vào `main`.
- Trình tự Spec Kit: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks`
  → `/speckit-implement`. MUST NOT bắt đầu viết code khi spec còn câu hỏi mở (marker
  `[NEEDS CLARIFICATION]` hoặc câu hỏi chưa trả lời).
- `plan.md` MUST có mục Constitution Check đối chiếu 5 nguyên tắc; mọi vi phạm MUST được giải
  thích trong Complexity Tracking.
- Definition of Done: `npm run check` pass; logic mới có test cạnh file; thay đổi API có test
  route in-memory; thay đổi luồng mua/đặt hàng pass `npm run test:e2e`; đã chạy `npm run format`;
  text mới bằng tiếng Việt.
- Review/PR MUST xác nhận tuân thủ constitution trước khi merge.

## Governance

- Constitution này có hiệu lực cao hơn mọi quy ước khác của dự án (bao gồm `AGENTS.md`,
  `CLAUDE.md`).
- Mọi sửa đổi MUST qua pull request, mô tả thay đổi và lý do, kèm cập nhật các tài liệu phụ thuộc
  (`AGENTS.md`, template Spec Kit) nếu cần.
- Mỗi sửa đổi MUST tăng version theo semver:
  - MAJOR: xóa hoặc định nghĩa lại nguyên tắc/quy tắc governance theo cách không tương thích.
  - MINOR: thêm nguyên tắc/mục mới hoặc mở rộng đáng kể hướng dẫn.
  - PATCH: làm rõ câu chữ, sửa lỗi chính tả, thay đổi không ảnh hưởng ngữ nghĩa.
- `Last Amended` MUST cập nhật theo ngày sửa (ISO `YYYY-MM-DD`); `Ratified` giữ nguyên.
- Tuân thủ được kiểm tra ở mỗi PR và ở bước Constitution Check của `/speckit-plan`; độ phức tạp
  thêm vào MUST được giải trình.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08

<!--
Sync Impact Report
- Version change: (template, chưa có version) → 1.0.0
- Nguyên tắc (mới, thay cho placeholder của template):
  - [PRINCIPLE_1_NAME] → I. Kiến trúc theo tính năng
  - [PRINCIPLE_2_NAME] → II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Server là nguồn sự thật về tiền
  - [PRINCIPLE_4_NAME] → IV. Đơn giản trước
  - [PRINCIPLE_5_NAME] → V. Trải nghiệm tiếng Việt và dễ tiếp cận
- Mục thêm: Ràng buộc kỹ thuật, Quy trình phát triển, Governance (điền nội dung)
- Mục bỏ: không có
- Template phụ thuộc: không sửa (đọc constitution lúc chạy)
- TODO hoãn lại: không có
- Ghi chú: README nói `storage/` đã gitignore nhưng `.gitignore` thực tế chưa có (đúng như
  AGENTS.md mục 7) — nên thêm `storage/` vào `.gitignore` và sửa README.
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

- Logic nghiệp vụ (service, rule thuần, repository, schema, component riêng của tính năng, test)
  MUST nằm trong `src/features/<feature>/` (hiện có `catalog`, `cart`, `checkout`, `orders`).
- `src/app/` MUST chỉ chứa page, layout và Route Handler. Route Handler MUST mỏng:
  parse input (`readJsonBody`) → gọi service → map lỗi qua `handleRouteError` / `jsonError`.
- UI dùng chung đặt ở `src/components/`, tiện ích chung ở `src/lib/`, dữ liệu mẫu ở `src/data/`.
- Tên file MUST kebab-case; test MUST đặt cạnh file nguồn (`<tên>.test.ts[x]`); import SHOULD
  dùng alias `@/`.
- Code `"use client"` MUST NOT import `node:fs`, `features/orders/server.ts` hoặc
  `order-repository.ts`. Chỉ `server.ts` được wiring `createJsonFileOrderRepository`.

**Lý do:** Mỗi tính năng đọc hiểu và test độc lập được; route mỏng giúp quy tắc nghiệp vụ
không bị phân tán vào tầng HTTP và luôn test được bằng unit test thuần.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

- Mọi quy tắc về tính tiền (giá, phí ship, giảm giá, tổng), giới hạn (số lượng, tồn kho, độ dài
  field) và chuyển trạng thái (đơn hàng) MUST có unit test được viết **trước** khi cài đặt,
  chạy thấy fail rồi mới viết code cho pass (Red → Green → Refactor).
- Test MUST bao phủ giá trị biên: ngay dưới / bằng / ngay trên ngưỡng (ví dụ subtotal
  499_999 / 500_000 với `FREE_SHIPPING_THRESHOLD`, số lượng 10 / 11 với `MAX_QUANTITY_PER_ITEM`,
  tồn kho 0, subtotal <= 0).
- Service MUST test bằng DI (`createOrderService({ repository, now, generateId })`) với ngày cố
  định và ID tăng dần; test MUST NOT gọi `new Date()` hoặc `crypto.randomUUID`.
- Test chạm file hệ thống MUST dùng `// @vitest-environment node` và thư mục tạm (`mkdtemp`),
  MUST NOT ghi vào `storage/`.
- `npm run check` (lint + typecheck + test) MUST pass trước khi commit hoặc báo hoàn thành.
  Đổi luồng mua hàng hoặc `data-testid` MUST chạy thêm `npm run test:e2e`.

**Lý do:** Sai một con số trong tiền hay giới hạn gây thiệt hại trực tiếp; test viết trước buộc
quy tắc phải được định nghĩa rõ, và giá trị biên là nơi lỗi thường xảy ra.

### III. Server là nguồn sự thật về tiền

- Giá, phí ship, giảm giá và tổng tiền MUST do server tính lại từ dữ liệu sản phẩm
  (`getProductById`) và `calculateOrderTotals`; giá trị client gửi MUST NOT được dùng.
- Schema input của server (`placeOrderSchema` và các schema mới) MUST NOT khai báo trường giá,
  tổng tiền hay tồn kho.
- Mọi input từ client (body, query, params) MUST được validate bằng Zod 4 với `safeParse`;
  lỗi theo field đi qua `toFieldErrors`.
- Quy tắc phí ship chỉ được đổi trong `src/features/checkout/pricing.ts`; UI MUST NOT hard-code
  phí hoặc ngưỡng.
- Lỗi nghiệp vụ MUST ném `OrderError(code, message, details?)`; mã mới MUST thêm vào
  `OrderErrorCode` và `HTTP_STATUS_BY_CODE` kèm test. Ràng buộc số lượng MUST được kiểm cả sau
  khi gộp dòng trùng (`mergeItems`).

**Lý do:** Client có thể bị sửa tùy ý; chỉ khi server tự tính lại thì số tiền lưu vào đơn mới
đáng tin.

### IV. Đơn giản trước

- Tính năng mới MUST dùng stack hiện có: Next.js App Router, React, TypeScript, Zod, Tailwind,
  Vitest, Playwright; lưu trữ bằng mảng tĩnh, localStorage và file JSON.
- Thêm dependency, database, dịch vụ ngoài hoặc lớp trừu tượng mới MUST NOT xảy ra trừ khi
  `plan.md` ghi rõ lý do, phương án đơn giản hơn đã cân nhắc và vì sao bị loại (mục
  Complexity Tracking).
- Chỉ cài đặt những gì spec yêu cầu (YAGNI); SHOULD tái sử dụng hàm sẵn có (`formatCurrency`,
  `calculateOrderTotals`, `getMaxQuantity`...) thay vì viết lại.
- Đổi `CART_STORAGE_KEY` hoặc shape `CartState` MUST kèm xử lý dữ liệu cũ để khách không mất giỏ.

**Lý do:** ShopLite là dự án mẫu phải đọc hiểu được trong một buổi; mỗi phụ thuộc mới làm tăng
chi phí học, bảo trì và rủi ro.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

- Mọi text người dùng thấy và message lỗi MUST viết tiếng Việt có dấu, theo giọng văn trong
  `order-service.ts`; MUST NOT để text tiếng Anh trên UI.
- Số tiền hiển thị MUST đi qua `formatCurrency` (`src/lib/format.ts`); MUST NOT tự format chuỗi.
- Mọi trường form MUST có `<label>` gắn với input; lỗi validate MUST hiển thị theo từng trường
  (`data-testid="error-<field>"`), liên kết với input (ví dụ `aria-invalid`, `aria-describedby`).
- Thành phần tương tác MUST dùng được bằng bàn phím và có tên truy cập được; `data-testid` hiện
  có MUST được giữ hoặc cập nhật cùng spec E2E.

**Lý do:** Khách hàng là người Việt; tiền tệ hiển thị nhất quán và form dễ tiếp cận giảm lỗi
nhập liệu và đơn bị bỏ dở.

## Ràng buộc kỹ thuật

- Runtime: Node.js >= 22.12.0; Next.js 16.4.2 App Router, React 19.3.0, TypeScript, Zod 4,
  Tailwind CSS 4. Test: Vitest 5 + jsdom + Testing Library; E2E: Playwright (chromium).
- Lưu trữ: sản phẩm/danh mục ở `src/data/`; giỏ ở localStorage key `"shoplite:cart"`; đơn hàng ở
  file JSON (`ORDERS_FILE`, mặc định `storage/orders.json`), ghi qua `<file>.tmp` rồi `rename`.
- Lỗi API MUST có dạng `{ error: { code, message, details } }`; lỗi không phải `OrderError` → 500
  `INTERNAL_ERROR`.
- Component dùng hook/state/event handler MUST có `"use client"` ở dòng đầu.
- MUST NOT commit `storage/orders.json`; MUST NOT đưa giá trị trong `.env.local` vào code, docs
  hay commit; MUST NOT đổi `agentRules: false` trong `next.config.ts`.
- Quy tắc nghiệp vụ hiện hành (giới hạn 10/dòng, phí ship 30_000/60_000, ngưỡng miễn phí
  500_000, chỉ hủy đơn `pending`, ràng buộc thông tin khách) được mô tả ở `AGENTS.md` mục 5;
  thay đổi chúng MUST cập nhật `AGENTS.md`.

## Quy trình phát triển

- Mỗi tính năng MUST làm trên nhánh riêng, không commit thẳng vào `main`.
- Thứ tự: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`. MUST NOT viết code khi `spec.md` còn câu hỏi mở
  (`[NEEDS CLARIFICATION]`) chưa được trả lời.
- `plan.md` MUST có mục Constitution Check đối chiếu 5 nguyên tắc; mọi vi phạm MUST được ghi
  và giải trình trong Complexity Tracking.
- Thay đổi chạm hơn 3 file SHOULD trình bày kế hoạch trước khi sửa.
- Definition of Done: `npm run check` pass; `npm run format:check` pass khi có sửa file; logic
  nghiệp vụ mới có unit test; đổi luồng mua hàng hoặc `data-testid` thì `npm run test:e2e` pass.
- Review MUST kiểm tra tuân thủ constitution trước khi merge.

## Governance

- Constitution này có hiệu lực cao hơn mọi quy ước khác trong repo; `AGENTS.md` / `CLAUDE.md`
  là hướng dẫn vận hành chi tiết và MUST không mâu thuẫn với nó.
- Sửa constitution MUST qua pull request, ghi rõ lý do, ảnh hưởng và kế hoạch chuyển đổi
  (nếu có), và MUST tăng version theo semver:
  - MAJOR: bỏ hoặc định nghĩa lại nguyên tắc/quy tắc governance theo cách không tương thích.
  - MINOR: thêm nguyên tắc/mục mới hoặc mở rộng đáng kể hướng dẫn.
  - PATCH: làm rõ câu chữ, sửa lỗi chính tả, thay đổi không đổi ngữ nghĩa.
- Mỗi lần sửa MUST cập nhật **Last Amended**; **Ratified** giữ nguyên.
- Mọi PR và review MUST xác nhận tuân thủ; độ phức tạp vượt nguyên tắc IV MUST được giải trình.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08

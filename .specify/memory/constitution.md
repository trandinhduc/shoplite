<!--
Sync Impact Report
- Version change: (template chưa điền) → 1.0.0
- Nguyên tắc (thay toàn bộ placeholder):
  - [PRINCIPLE_1_NAME] → I. Kiến trúc theo tính năng
  - [PRINCIPLE_2_NAME] → II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Server là nguồn sự thật về tiền
  - [PRINCIPLE_4_NAME] → IV. Đơn giản trước
  - [PRINCIPLE_5_NAME] → V. Trải nghiệm tiếng Việt và dễ tiếp cận
- Mục thêm mới: Ràng buộc kỹ thuật, Quy trình phát triển, Governance (điền nội dung)
- Mục bị xóa: không có
- Template cần đồng bộ: plan-template.md (Constitution Check đọc file này lúc chạy) ✅ không cần sửa;
  spec-template.md ✅; tasks-template.md ✅ (không sửa template trong lệnh này)
- TODO hoãn lại: không có. RATIFICATION_DATE đặt là ngày phê chuẩn lần đầu 2026-11-08.
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

- Logic nghiệp vụ, component và test của một tính năng MUST nằm trong `src/features/<feature>/`
  (ví dụ `catalog`, `cart`, `checkout`, `orders`).
- `src/app/` MUST chỉ chứa page và Route Handler mỏng: đọc input, gọi service của feature,
  trả kết quả. Không đặt quy tắc nghiệp vụ trong `src/app/`.
- UI dùng chung MUST đặt ở `src/components/`; tiện ích dùng chung ở `src/lib/`.
- Server Component MUST gọi thẳng service (ví dụ `queryProducts`, `orderService`), không fetch
  API nội bộ; API chỉ phục vụ Client Component.
- Code đọc/ghi file hệ thống (`features/orders/server.ts`, `node:fs`) MUST NOT được import vào
  Client Component.
- Tên file MUST theo kebab-case; test SHOULD đặt cạnh file nguồn (`*.test.ts(x)`).

**Lý do:** gom mọi thứ của một tính năng về một chỗ giúp đọc, test và thay đổi độc lập; route mỏng
giữ ranh giới server/client rõ ràng.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

- Mọi quy tắc tính tiền, giới hạn (số lượng, tồn kho, ngưỡng miễn phí ship) và chuyển trạng thái
  đơn hàng MUST có unit test được viết **trước** khi viết code hiện thực, và test đó MUST fail
  trước khi code được thêm vào (Red → Green → Refactor).
- Test MUST bao phủ giá trị biên: ngay dưới, bằng và ngay trên mỗi ngưỡng (ví dụ
  `FREE_SHIPPING_THRESHOLD - 1`, `FREE_SHIPPING_THRESHOLD`; số lượng `0`, `1`,
  `MAX_QUANTITY_PER_ITEM`, `MAX_QUANTITY_PER_ITEM + 1`; tồn kho bằng 0).
- Service MUST test được một cách xác định bằng cách inject phụ thuộc (repository in-memory,
  `findProduct`, `now`, `generateId`); test MUST NOT ghi vào `storage/`.
- `npm run check` (lint + typecheck + test) MUST pass trước mọi commit và trước khi báo hoàn thành.
- Thay đổi luồng mua hàng (giỏ hàng → thanh toán → đơn hàng) MUST chạy lại `npm run test:e2e`.

**Lý do:** sai một quy tắc tiền hoặc trạng thái gây thiệt hại trực tiếp cho khách và cửa hàng; test
viết trước buộc quy tắc được nêu rõ trước khi hiện thực.

### III. Server là nguồn sự thật về tiền

- Giá đơn vị, phí ship, giảm giá và tổng tiền MUST do server tính lại từ dữ liệu catalog và hằng số
  nghiệp vụ (`calculateOrderTotals`, `SHIPPING_OPTIONS`, `FREE_SHIPPING_THRESHOLD`).
- Server MUST NOT nhận hay tin bất kỳ giá, phí hay tổng tiền nào từ payload của client; client chỉ
  gửi định danh và số lượng.
- Mọi input vào server (body API, query, params) MUST được validate bằng schema Zod qua
  `safeParse`; schema dùng chung client/server đặt trong feature tương ứng
  (ví dụ `checkout-schema.ts`).
- Kiểm tra tồn kho khi đặt hàng MUST NOT bị bỏ qua.
- Hằng số nghiệp vụ MUST được import từ nơi đã export, không hard-code (`10`, `30_000`,
  `500_000`...).
- Lỗi nghiệp vụ MUST ném `OrderError` có mã trong `OrderErrorCode` với HTTP status khai báo trong
  `HTTP_STATUS_BY_CODE`; mọi phản hồi lỗi API MUST có dạng `ApiErrorBody` và đi qua
  `handleRouteError`.

**Lý do:** client có thể bị sửa đổi; chỉ con số do server tính mới đáng tin để ghi vào đơn hàng.

### IV. Đơn giản trước

- Tính năng mới MUST dùng stack hiện có: Next.js App Router, React, TypeScript, Tailwind CSS,
  Zod, Vitest, Playwright, cùng các thư viện đang có trong `package.json`.
- Thêm dependency runtime mới, database, dịch vụ bên ngoài hoặc tầng trừu tượng mới MUST NOT được
  thực hiện trừ khi `plan.md` giải thích lý do và vì sao giải pháp đơn giản hơn không đủ
  (ghi ở mục Complexity Tracking).
- Lưu trữ SHOULD tiếp tục dùng dữ liệu tĩnh (`src/data/`), `localStorage` qua `cartStore` và file
  JSON đơn hàng cho tới khi có yêu cầu được ghi nhận rõ ràng cần thay đổi.
- Chỉ hiện thực những gì spec yêu cầu (YAGNI); không thêm cấu hình hay mở rộng "phòng khi cần".

**Lý do:** ShopLite là dự án mẫu cần đọc hiểu được trong một buổi; mỗi dependency hay tầng thêm vào
làm tăng chi phí học và bảo trì.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

- Mọi text hiển thị cho người dùng, thông báo lỗi, comment và JSDoc MUST viết bằng tiếng Việt.
- Tiền MUST hiển thị qua `formatCurrency`, ngày giờ qua `formatDateTime` (`src/lib/format.ts`);
  MUST NOT tự định dạng tiền/ngày tại chỗ.
- Mọi trường form MUST có `<label>` gắn với input (`htmlFor`/`id`).
- Lỗi validate MUST hiển thị theo từng trường (dùng `toFieldErrors`, khóa dạng
  `"customer.phone"`), ngay cạnh trường bị lỗi, và trường lỗi MUST đánh dấu `aria-invalid`.
- Thành phần tương tác SHOULD dùng được bằng bàn phím và có tên truy cập được (nút chỉ có icon
  MUST có `aria-label`).

**Lý do:** người dùng là khách hàng Việt Nam; label và lỗi theo từng trường giúp mọi người, kể cả
người dùng trình đọc màn hình, hoàn tất mua hàng.

## Ràng buộc kỹ thuật

- Runtime: Node.js >= 22.12, npm 10+.
- Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Zod 4.
  Alias `@/*` → `src/*`.
- Dữ liệu: sản phẩm/danh mục tĩnh trong `src/data/`; giỏ hàng trong `localStorage` key
  `shoplite:cart`, chỉ truy cập qua `cartStore`/`useCart`; đơn hàng trong file JSON
  (`storage/orders.json`, đổi bằng env `ORDERS_FILE`) ghi atomic qua file tạm + `rename`.
- Quy tắc nghiệp vụ hiện hành MUST được giữ: tối đa `MAX_QUANTITY_PER_ITEM` mỗi sản phẩm và không
  vượt tồn kho; phí ship theo `SHIPPING_OPTIONS`, miễn phí chỉ cho `standard` khi subtotal đạt
  `FREE_SHIPPING_THRESHOLD`; chỉ hủy được đơn ở trạng thái `pending`.
- Test: Vitest (`src/**/*.test.{ts,tsx}`, mặc định jsdom; code Node dùng
  `// @vitest-environment node`), Playwright cho e2e (`e2e/*.spec.ts`).
- MUST NOT commit `storage/` hay `.env*`; MUST NOT đổi `agentRules: false` trong `next.config.ts`.
- Code MUST được định dạng bằng `npm run format` (Prettier + prettier-plugin-tailwindcss).

## Quy trình phát triển

- Mỗi tính năng hoặc bản sửa MUST làm trên nhánh riêng, không commit thẳng lên `main`.
- Thứ tự: spec (`/speckit-specify`) → làm rõ (`/speckit-clarify`) → plan (`/speckit-plan`) →
  tasks (`/speckit-tasks`) → hiện thực.
- MUST NOT viết code hiện thực khi spec còn câu hỏi mở (`[NEEDS CLARIFICATION]` hoặc câu hỏi chưa
  được trả lời).
- `plan.md` MUST qua bước Constitution Check trước Phase 0 và kiểm tra lại sau Phase 1; mọi vi phạm
  MUST được ghi và giải thích ở Complexity Tracking, nếu không thì plan bị chặn.
- Thay đổi chạm nhiều hơn 3 file SHOULD trình bày kế hoạch trước khi sửa.
- Definition of Done: `npm run check` pass; logic mới có test co-located; e2e chạy lại nếu đụng
  luồng mua hàng; quy tắc nghiệp vụ vẫn đúng; text tiếng Việt; code đã format.
- Review (người hoặc agent) MUST xác nhận thay đổi tuân thủ các nguyên tắc I–V.

## Governance

- Constitution này có hiệu lực cao hơn mọi hướng dẫn khác trong repo. Khi `AGENTS.md`, `README.md`
  hay `CLAUDE.md` mâu thuẫn với constitution, constitution được ưu tiên và tài liệu kia MUST được
  cập nhật cho khớp.
- Sửa constitution MUST đi kèm commit/PR riêng nêu lý do, cập nhật Sync Impact Report và tăng
  version theo semver:
  - **MAJOR:** bỏ hoặc định nghĩa lại một nguyên tắc/quy tắc quản trị theo cách không tương thích.
  - **MINOR:** thêm nguyên tắc/mục mới hoặc mở rộng đáng kể hướng dẫn.
  - **PATCH:** làm rõ câu chữ, sửa lỗi chính tả, thay đổi không mang ý nghĩa.
- Mỗi lần sửa MUST cập nhật `Last Amended`; `Ratified` giữ nguyên ngày phê chuẩn lần đầu.
- Mọi PR và review MUST kiểm tra tuân thủ; độ phức tạp vượt nguyên tắc IV MUST được giải thích
  trong plan.
- Hướng dẫn vận hành hằng ngày cho agent nằm ở `AGENTS.md`.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08

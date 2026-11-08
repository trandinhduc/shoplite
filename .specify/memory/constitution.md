<!--
Sync Impact Report
- Version change: (template chưa điền) → 1.0.0
- Nguyên tắc: thêm mới I–V (Kiến trúc theo tính năng; Test trước cho nghiệp vụ; Server là nguồn
  sự thật về tiền; Đơn giản trước; Trải nghiệm tiếng Việt và dễ tiếp cận)
- Mục thêm: Ràng buộc kỹ thuật, Quy trình phát triển, Governance
- Mục xóa: không
- TODO hoãn lại: không
-->
# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

- Logic, type, component và test của một tính năng MUST nằm cùng thư mục `src/features/<feature>/`.
- `src/app/` chỉ chứa page, layout và route handler mỏng; MUST NOT chứa logic nghiệp vụ.
- Route handler MUST chỉ gọi service (ví dụ `orderService`), MUST NOT gọi `repository` trực tiếp.
- Mặc định là Server Component; chỉ thêm `"use client"` khi cần hook hoặc sự kiện.
  Code `"use client"` MUST NOT import `features/orders/server.ts`.
- Tên file SHOULD là kebab-case; test đặt cạnh file nguồn với đuôi `.test.ts(x)`.

Lý do: giữ ranh giới rõ ràng để mỗi tính năng đọc, test và mở rộng độc lập.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

- Mọi quy tắc tính tiền, giới hạn số lượng và chuyển trạng thái MUST có unit test được viết
  TRƯỚC khi cài đặt (red → green → refactor).
- Test MUST bao gồm giá trị biên (ví dụ `subtotal = 0`, đúng `FREE_SHIPPING_THRESHOLD`,
  `quantity = stock`, `quantity = MAX_QUANTITY_PER_ITEM`, `stock <= 0`).
- Test MUST dùng repository in-memory; MUST NOT ghi vào `storage/orders.json`.
- `npm run check` (lint + typecheck + test) MUST pass trước khi commit hoặc merge.
- Khi đổi luồng giỏ hàng, thanh toán hoặc đặt hàng, `npm run test:e2e` MUST pass.

Lý do: sai sót về tiền và trạng thái đơn gây thiệt hại trực tiếp; test trước là hàng rào rẻ nhất.

### III. Server là nguồn sự thật về tiền

- Giá, phí giao hàng, giảm giá và tổng tiền MUST được server tính lại; MUST bỏ qua mọi giá trị
  do client gửi. Payload `POST /api/orders` MUST NOT có trường giá.
- Mọi phép tính tiền MUST đi qua `calculateOrderTotals` (`pricing.ts`); MUST NOT tự cộng ở nơi khác.
- Mọi input từ bên ngoài MUST được validate bằng Zod schema (`checkout-schema.ts`); form client và
  API MUST dùng chung schema hoặc schema tương ứng, MUST NOT validate thủ công.
- Lỗi nghiệp vụ MUST throw `OrderError` và route MUST trả lỗi qua `handleRouteError`.
- Giảm giá mới (nếu có) MUST được định nghĩa và tính ở server, cùng module với `pricing.ts`.

Lý do: client không đáng tin; chỉ một nơi tính tiền thì kết quả luôn nhất quán và kiểm thử được.

### IV. Đơn giản trước

- MUST dùng stack hiện có (Next.js, React, TypeScript, Tailwind, Zod, Vitest, Playwright).
- MUST NOT thêm dependency mới hoặc database nếu `plan.md` không giải thích lý do và phương án
  đơn giản hơn đã bị loại.
- Lưu trữ hiện tại (dữ liệu tĩnh, `localStorage` cho giỏ hàng, file JSON cho đơn hàng) SHOULD được
  giữ cho đến khi có yêu cầu cụ thể không đáp ứng được.
- Code SHOULD giải quyết yêu cầu hiện tại, tránh trừu tượng hóa cho nhu cầu giả định (YAGNI).

Lý do: dự án dùng làm mẫu thực hành, độ phức tạp tăng thêm phải trả giá bằng khả năng đọc hiểu.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

- Nhãn, thông báo lỗi và message API hiển thị cho người dùng MUST bằng tiếng Việt.
- Số tiền MUST được hiển thị bằng `formatCurrency`; MUST NOT tự định dạng.
- Mỗi trường form MUST có `label` gắn với input và MUST hiển thị lỗi theo từng trường.
- Lỗi SHOULD được liên kết với input bằng thuộc tính ARIA (`aria-describedby`, `aria-invalid`).
- Giao diện SHOULD thao tác được bằng bàn phím và có trạng thái focus nhìn thấy được.

Lý do: người dùng mục tiêu nói tiếng Việt; form rõ ràng giúp mọi người hoàn tất đơn hàng.

## Ràng buộc kỹ thuật

- Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Zod 4,
  Vitest + Testing Library, Playwright (Chromium). Node MUST >= 22.12.
- Dữ liệu: sản phẩm và danh mục là TypeScript tĩnh trong `src/data/` (chỉ đọc); giỏ hàng ở
  `localStorage["shoplite:cart"]`, chỉ ở client; đơn hàng ở file JSON (`ORDERS_FILE`, mặc định
  `storage/orders.json`) ghi qua file `.tmp` rồi `rename`.
- Quy tắc nghiệp vụ bất biến: tối đa `MAX_QUANTITY_PER_ITEM = 10` mỗi sản phẩm và không vượt tồn
  kho; phí `standard` 30.000 ₫, `express` 60.000 ₫; `standard` từ 500.000 ₫ được miễn phí,
  `express` không bao giờ miễn phí; hủy đơn chỉ khi `pending` (nếu không trả
  `INVALID_STATUS_TRANSITION`, 409); mã đơn dạng `SL-YYYYMMDD-XXXXXX`.
- Thay đổi các giá trị trên MUST đi kèm cập nhật test và tài liệu liên quan.

## Quy trình phát triển

- Mỗi tính năng hoặc sửa lỗi MUST được làm trên nhánh riêng, không commit trực tiếp vào `main`.
- MUST NOT bắt đầu code khi `spec.md` còn câu hỏi mở (`[NEEDS CLARIFICATION]`); phải chạy
  làm rõ spec trước.
- Thứ tự: spec → plan → tasks → test (đỏ) → cài đặt (xanh) → `npm run check`.
- Tính năng chạm nhiều hơn 3 file SHOULD được lên kế hoạch và trình bày trước khi sửa.
- Plan MUST có mục kiểm tra tuân thủ constitution; mọi vi phạm MUST được ghi và biện minh.
- Definition of Done: `npm run check` pass; logic mới có test; luồng giỏ hàng/thanh toán/đặt
  hàng có `npm run test:e2e` pass; text người dùng bằng tiếng Việt.

## Governance

- Constitution này có hiệu lực cao hơn mọi quy ước khác; khi xung đột với `AGENTS.md` hoặc tài
  liệu khác, constitution được ưu tiên.
- Sửa đổi MUST được thực hiện qua pull request, nêu lý do và tác động, và MUST tăng version theo
  semver:
  - MAJOR: xóa hoặc định nghĩa lại nguyên tắc theo hướng không tương thích ngược.
  - MINOR: thêm nguyên tắc/mục mới hoặc mở rộng đáng kể hướng dẫn.
  - PATCH: làm rõ câu chữ, sửa lỗi chính tả, tinh chỉnh không đổi ngữ nghĩa.
- Mọi PR và review MUST kiểm tra tuân thủ; phức tạp phát sinh MUST được biện minh trong plan.
- Hướng dẫn vận hành hằng ngày cho agent nằm ở `AGENTS.md`.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08

<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: lần phê chuẩn đầu tiên, thay 5 placeholder bằng:
  I. Kiến trúc theo tính năng · II. Test trước cho nghiệp vụ (NON-NEGOTIABLE) ·
  III. Server là nguồn sự thật về tiền · IV. Đơn giản trước ·
  V. Trải nghiệm tiếng Việt và dễ tiếp cận
- Added sections: Ràng buộc kỹ thuật, Quy trình phát triển, Governance
- Removed sections: none
- Templates: plan/spec/tasks template đọc constitution lúc chạy, không cần sửa
- Follow-up TODOs: none
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

- Logic, component và test của một tính năng MUST nằm trong `src/features/<feature>/`
  (hiện có `catalog`, `cart`, `checkout`, `orders`).
- `src/app/` MUST chỉ là route mỏng: page và Route Handler gọi service/component của feature,
  không chứa quy tắc nghiệp vụ.
- UI dùng chung MUST đặt ở `src/components/`, tiện ích ở `src/lib/`; import qua alias `@/`.
- Code chạy trên server (đọc/ghi file, `features/orders/server.ts`) MUST NOT bị import từ
  Client Component.

Lý do: mỗi tính năng đọc hiểu và test được độc lập; route đổi không kéo theo đổi nghiệp vụ.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

- Mọi quy tắc tính tiền, giới hạn số lượng/tồn kho và chuyển trạng thái đơn hàng MUST có unit
  test viết trước code, và test MUST fail trước khi code được viết.
- Mỗi quy tắc có ngưỡng MUST có test cho giá trị biên: dưới / bằng / trên ngưỡng
  (ví dụ `FREE_SHIPPING_THRESHOLD`, `MAX_QUANTITY_PER_ITEM`).
- Test MUST đặt cạnh file (`*.test.ts(x)`), không ghi vào `storage/` (dùng
  `createInMemoryOrderRepository` hoặc file tạm) và không gọi mạng thật.
- `npm run check` (lint + typecheck + test) MUST pass trước khi một thay đổi được coi là xong.

Lý do: tiền và tồn kho sai là lỗi gây thiệt hại trực tiếp; test biên bắt lỗi lệch một đơn vị.

### III. Server là nguồn sự thật về tiền

- Giá, phí ship, giảm giá (nếu có) và tổng tiền MUST được server tính lại từ dữ liệu catalog,
  qua các hàm trong `features/checkout/pricing.ts`; mọi con số tiền do client gửi MUST bị bỏ qua.
- Payload gửi lên API MUST NOT chứa trường giá; client chỉ gửi định danh và số lượng.
- Mọi input từ client MUST được validate bằng Zod (`checkout-schema.ts`) trước khi xử lý.
- Lỗi nghiệp vụ MUST được ném dưới dạng lỗi có mã (`OrderError`) và trả về dạng
  `{ error: { code, message, details? } }` với HTTP status tương ứng.
- Phí ship và ngưỡng miễn phí MUST chỉ được định nghĩa một lần trong `pricing.ts`; client SHOULD
  dùng chung hàm đó để hiển thị.

Lý do: client có thể bị sửa tùy ý; một nguồn tính tiền duy nhất tránh lệch giữa giỏ hàng và đơn.

### IV. Đơn giản trước

- Tính năng mới MUST dùng stack hiện có: Next.js App Router, React, TypeScript strict,
  Tailwind CSS, Zod, Vitest/Testing Library, Playwright.
- Thêm dependency, database hay dịch vụ ngoài MUST NOT xảy ra nếu plan không ghi rõ lý do và
  phương án đơn giản hơn đã bị loại vì sao.
- Lưu trữ MUST đi qua interface repository (`OrderRepository`) để đổi nơi lưu không phải sửa service.
- SHOULD chọn giải pháp nhỏ nhất đáp ứng spec; không thêm cấu hình hay trừu tượng cho nhu cầu
  giả định.

Lý do: ShopLite là dự án mẫu để đọc hiểu trong một buổi; mỗi phụ thuộc mới là chi phí cho mọi người.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

- Mọi text hiển thị, thông báo lỗi và tên test MUST viết bằng tiếng Việt.
- Số tiền MUST hiển thị qua `formatCurrency` (`src/lib/format.ts`), không tự ghép chuỗi.
- Mọi trường form MUST có label gắn với input; lỗi validate MUST hiển thị theo từng trường
  (dùng `toFieldErrors` để map lỗi Zod sang `field.path`).
- Phần tử tương tác SHOULD truy cập được bằng role và tên (test ưu tiên `getByRole`,
  `getByLabelText`).

Lý do: người dùng là khách hàng Việt Nam; label và lỗi rõ ràng giúp cả người dùng lẫn test E2E.

## Ràng buộc kỹ thuật

- Node.js >= 22.12; Next.js 16 (App Router), React 19, TypeScript `strict`, Tailwind CSS v4, Zod 4.
- Sản phẩm và danh mục là dữ liệu tĩnh chỉ đọc trong `src/data/`; giỏ hàng lưu ở localStorage;
  đơn hàng lưu file JSON qua `ORDERS_FILE` (mặc định `storage/orders.json`).
- Quy tắc nghiệp vụ hiện hành MUST được giữ nguyên trừ khi spec thay đổi chúng một cách tường minh:
  tối đa `MAX_QUANTITY_PER_ITEM` mỗi sản phẩm và không vượt tồn kho; ship tiêu chuẩn 30.000 ₫,
  miễn phí từ 500.000 ₫; ship nhanh 60.000 ₫; chỉ hủy được đơn ở trạng thái `pending`.
- Trang đọc dữ liệu đơn hàng MUST render động (`export const dynamic = "force-dynamic"`).
- File bí mật (`.env*`) và dữ liệu `storage/` MUST NOT được commit.

## Quy trình phát triển

- Mỗi tính năng MUST được phát triển trên nhánh riêng; không commit thẳng vào `main`.
- Thứ tự: spec (`/speckit-specify`) → làm rõ (`/speckit-clarify`) → plan → tasks → implement.
- MUST NOT bắt đầu code khi spec còn câu hỏi mở (`[NEEDS CLARIFICATION]`) chưa được trả lời.
- Plan MUST có mục kiểm tra constitution, đối chiếu từng nguyên tắc I-V; vi phạm phải được giải
  thích trong mục Complexity Tracking.
- Definition of Done: `npm run check` pass; logic mới có test cạnh file; đổi luồng UI giỏ hàng /
  thanh toán / đơn hàng thì chạy thêm `npm run test:e2e`.

## Governance

- Constitution này có hiệu lực cao hơn mọi quy ước khác; `AGENTS.md` là hướng dẫn vận hành hằng
  ngày và MUST NOT mâu thuẫn với nó.
- Mọi sửa đổi MUST qua pull request, ghi rõ lý do và tác động lên spec/plan đang làm.
- Mọi sửa đổi MUST tăng version theo semver: MAJOR khi bỏ hoặc định nghĩa lại nguyên tắc; MINOR khi
  thêm nguyên tắc/mục hoặc mở rộng đáng kể; PATCH khi sửa câu chữ, làm rõ.
- Review plan và PR MUST kiểm tra tuân thủ constitution; độ phức tạp vượt nguyên tắc IV MUST được
  giải thích bằng văn bản.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08

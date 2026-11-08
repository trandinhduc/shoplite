<!--
SYNC IMPACT REPORT (scratch, xóa trước khi commit)
- Version change: (template chưa điền) → 1.0.0
- Lý do bump: MAJOR.MINOR.PATCH áp dụng từ bản ratify đầu tiên; coi như khởi tạo = 1.0.0.
- Principles (mới, thay toàn bộ placeholder):
  1. Kiến trúc theo tính năng
  2. Test trước cho nghiệp vụ (NON-NEGOTIABLE)
  3. Server là nguồn sự thật về tiền
  4. Đơn giản trước
  5. Trải nghiệm tiếng Việt và dễ tiếp cận
- Added sections: Ràng buộc kỹ thuật, Quy trình phát triển
- Removed sections: không có (template placeholder bị thay thế)
- Nguồn: AGENTS.md, README.md, cấu trúc src/features/*, .claude/rules/testing.md
- RATIFICATION_DATE = 2026-11-08 (ngày tạo constitution; chưa có lịch sử trước đó).
- Code hiện tại chưa tuân thủ (follow-up, không sửa trong lệnh này):
  - TODO(ZOD_CATALOG_QUERY): parseCatalogQuery (catalog-service.ts) validate query thủ công, chưa dùng Zod.
  - TODO(ZOD_PATCH_ORDER): PATCH /api/orders/[id] kiểm tra body thủ công, chưa dùng Zod schema.
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

- Logic nghiệp vụ, component và test của mỗi tính năng MUST nằm trong `src/features/<feature>/`.
- `src/app/` MUST chỉ chứa page, layout và route handler mỏng: đọc tham số, gọi hàm từ `features/`, trả kết quả. Route handler KHÔNG được chứa quy tắc nghiệp vụ.
- `src/components/` CHỈ dành cho UI dùng chung giữa nhiều tính năng. Component chỉ dùng trong một tính năng MUST nằm trong `src/features/<feature>/components/`.
- Tính năng được phép import module của tính năng khác (ví dụ `orders` dùng `checkout/pricing.ts`), nhưng quy tắc nghiệp vụ MUST chỉ định nghĩa ở một tính năng và nơi khác dùng lại, không chép lại.
- `src/features/orders/server.ts` MUST chỉ được import từ `src/app/**`, không từ file có `"use client"`.
- Lý do: mỗi tính năng đọc hiểu được trong một lần, và thay đổi một tính năng không kéo theo cả codebase.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

- Mọi quy tắc tính tiền, giới hạn số lượng và chuyển trạng thái MUST có unit test được viết TRƯỚC khi viết code thực thi. Quy trình bắt buộc: viết test → chạy thấy FAIL → viết code → chạy thấy PASS → refactor.
- Mỗi quy tắc nghiệp vụ MUST có test cho giá trị biên: dưới, bằng và trên ngưỡng. Ví dụ: đơn standard đúng 500.000 ₫ được miễn phí ship; 499.999 ₫ thì không; `MAX_QUANTITY_PER_ITEM` = 10 phải cho thêm, 11 phải bị chặn.
- Các quy tắc hiện có (giỏ hàng, phí ship, tồn kho, hủy đơn) MUST giữ test tương ứng; không được xóa hoặc làm yếu test để code pass.
- `npm run check` (lint + typecheck + test) MUST pass trước khi báo cáo hoàn thành và trước khi commit.
- Test MUST NOT gọi mạng thật (dùng `vi.stubGlobal("fetch", ...)`) và MUST NOT ghi vào `storage/orders.json` (dùng thư mục tạm).
- Test E2E (`e2e/shopping-flow.spec.ts`) MUST pass khi thay đổi luồng giỏ hàng hoặc đặt hàng.

### III. Server là nguồn sự thật về tiền

- Giá sản phẩm, phí giao hàng, giảm giá (nếu có), và tổng tiền MUST được server tính lại từ dữ liệu catalog và `pricing.ts`. Client MUST NOT gửi và server MUST NOT tin các giá trị này.
- Request đặt hàng MUST chỉ chứa định danh và số lượng (`productId`, `quantity`). Schema đầu vào MUST NOT có trường giá; mọi trường giá client gửi lên MUST bị bỏ qua hoặc từ chối.
- `OrderItem.unitPrice` MUST là snapshot giá tại thời điểm đặt, không tính lại khi xem đơn cũ.
- Mọi input từ client (form, query string, body) MUST được validate bằng Zod 4 ở server trước khi dùng. Validate ở client chỉ để trải nghiệm, không thay thế validate ở server. Endpoint mới MUST dùng Zod ngay từ đầu; endpoint cũ đang validate thủ công MUST chuyển sang Zod khi được sửa.
- Hằng số nghiệp vụ (phí ship, ngưỡng miễn phí, giới hạn số lượng) MUST định nghĩa một lần trong `pricing.ts` hoặc `cart-reducer.ts` và MUST NOT hardcode trong component.

### IV. Đơn giản trước

- Dự án MUST dùng stack hiện có (Next.js 16, React 19, TypeScript strict, Tailwind v4, Zod 4, Vitest, Playwright). Tính năng MUST ưu tiên giải pháp dùng lại thư viện và code đã có.
- Thêm dependency mới, database, service ngoài hoặc tầng trừu tượng mới MUST có lý do được ghi trong plan: vấn đề gì không giải quyết được nếu không thêm, và đã cân nhắc phương án nhỏ hơn nào.
- Lưu trữ hiện tại (mảng tĩnh cho sản phẩm, file JSON cho đơn hàng, localStorage cho giỏ hàng) là đủ cho phạm vi dự án. Chuyển sang database SHOULD chỉ khi có nhu cầu cụ thể (nhiều người dùng ghi đồng thời, cần truy vấn phức tạp), và phải qua Governance.
- Interface `OrderRepository` là điểm mở rộng duy nhất cho lưu trữ: thay implementation MUST giữ nguyên interface.
- Không thêm code "phòng khi cần" (YAGNI). Abstraction mới SHOULD chỉ được thêm khi giải quyết một nhu cầu có thật trong spec.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

- Toàn bộ text giao diện, thông báo lỗi và comment nghiệp vụ MUST viết bằng tiếng Việt có dấu. Tên biến, hàm và type MUST viết bằng tiếng Anh.
- Mọi số tiền hiển thị MUST đi qua `formatCurrency` trong `src/lib/format.ts`; MUST NOT tự nối chuỗi hoặc dùng `toLocaleString` trực tiếp trong component.
- Mọi ô nhập trong form MUST có `<label>` liên kết (ví dụ `htmlFor`/`id` hoặc bọc input). Placeholder MUST NOT thay thế label.
- Lỗi validate MUST hiển thị cạnh đúng trường lỗi, dùng `toFieldErrors` để ánh xạ lỗi Zod theo từng field, và input lỗi MUST có `aria-invalid`. Lỗi chung (ví dụ hết hàng, lỗi mạng) MUST hiển thị ở vị trí dễ thấy với `role="alert"`.
- Giao diện SHOULD điều khiển được bằng bàn phím: nút, link và input có focus state nhìn thấy được.
- Trạng thái trống và trạng thái lỗi (không có sản phẩm, không có đơn, trang không tồn tại) MUST có thông báo tiếng Việt rõ ràng, không để màn hình trắng.

## Ràng buộc kỹ thuật

- **Runtime:** Node.js >= 22.12. Next.js 16 (App Router), React 19, TypeScript ở chế độ strict.
- **Style:** Tailwind CSS v4. Quy tắc class do `prettier-plugin-tailwindcss` quản lý; chạy `npm run format` trước khi commit.
- **Validation:** Zod 4. Schema đặt trong `checkout-schema.ts` (hoặc file schema cùng tính năng); type suy ra bằng `z.infer`; validate bằng `safeParse`. Email dùng `z.email()`.
- **Lỗi API:** service throw `OrderError(code, message, details?)`; route dùng `handleRouteError`; mã và HTTP status định nghĩa trong `order-errors.ts`. Lỗi không phải `OrderError` MUST được trả về dạng 500 `INTERNAL_ERROR`, không lộ chi tiết nội bộ.
- **Client/Server:** file có `"use client"` MUST NOT import `features/orders/server.ts`. Page, route handler, service và `server.ts` MUST NOT có `"use client"`.
- **Dữ liệu:** sản phẩm và danh mục là dữ liệu tĩnh trong `src/data/`. Đơn hàng lưu tại `ORDERS_FILE` (mặc định `storage/orders.json`), ghi qua file `.tmp` rồi `rename`. Giỏ hàng lưu tại localStorage key `shoplite:cart` và MUST đi qua `cartStore.dispatch`.
- **Biến môi trường:** hiện chỉ có `ORDERS_FILE`. Thêm biến mới MUST được ghi vào bảng biến môi trường trong README.

## Quy trình phát triển

- **Nhánh:** mọi thay đổi MUST làm trên nhánh riêng, không commit trực tiếp lên nhánh chính. Tên nhánh SHOULD theo dạng `feature/<mô-tả>` hoặc `fix/<mô-tả>`.
- **Spec trước code:** tính năng mới hoặc thay đổi hành vi MUST có spec (`/speckit-specify`) và plan (`/speckit-plan`) trước khi viết code. Plan MUST nêu rõ các file sẽ chạm và lý do thêm dependency nếu có.
- **Không code khi spec còn câu hỏi mở:** nếu spec hoặc plan còn mục "cần làm rõ" hoặc `[NEEDS CLARIFICATION]`, MUST NOT viết code cho phần đó. Phải giải quyết câu hỏi bằng `/speckit-clarify` hoặc hỏi người phụ trách trước.
- **Thứ tự triển khai:** tasks MUST đi theo thứ tự: test nghiệp vụ (đỏ) → code (xanh) → refactor → test UI/E2E nếu cần.
- **Kiểm tra trước khi báo cáo:** `npm run check` pass; `npm run format` đã chạy; nếu chạm luồng giỏ hàng hoặc đặt hàng thì `npm run test:e2e` pass.
- **Review:** thay đổi SHOULD đi qua pull request. Người review (hoặc chính tác giả khi tự review) MUST kiểm tra: test biên có đủ không, server có tự tính lại tiền không, text tiếng Việt và label form có đúng không.
- **Tài liệu:** thay đổi contract API hoặc quy tắc nghiệp vụ MUST cập nhật `AGENTS.md` và `README.md` trong cùng pull request.

## Governance

- Constitution này có hiệu lực cao nhất. Khi có mâu thuẫn với README, AGENTS.md hoặc thói quen cá nhân, constitution thắng; các tài liệu đó MUST được sửa để khớp.
- **Sửa constitution** MUST làm trong commit hoặc pull request riêng, nêu rõ phần thay đổi và lý do.
- **Versioning** theo semantic versioning:
  - MAJOR: xóa hoặc đổi nghĩa một nguyên tắc, làm thay đổi bắt buộc khiến code hiện có không còn tuân thủ.
  - MINOR: thêm nguyên tắc hoặc section mới, hoặc mở rộng đáng kể một quy tắc hiện có.
  - PATCH: sửa lỗi chính tả, làm rõ câu chữ, không đổi ý nghĩa.
- Mỗi lần sửa constitution MUST tăng `CONSTITUTION_VERSION` tương ứng và cập nhật `Last Amended`. Commit message SHOULD theo dạng `docs: amend constitution to vX.Y.Z (<tóm tắt>)`.
- **Kiểm tra tuân thủ:** mỗi lần review MUST xác nhận không vi phạm các nguyên tắc II và III. `/speckit-plan` MUST có bước Constitution Check đối chiếu plan với cả 5 nguyên tắc.
- **Độ phức tạp:** mọi ngoại lệ với nguyên tắc IV (dependency mới, abstraction mới) MUST được nêu trong plan với lý do cụ thể.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08

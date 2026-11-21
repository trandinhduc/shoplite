<!--
Ví dụ một constitution "tốt" cho ShopLite - dùng để so sánh với kết quả của /speckit-constitution.
Kết quả thật của bạn sẽ khác về câu chữ, nhưng nên có đủ các ý dưới đây.
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng (Feature-based)

Mỗi tính năng nằm trong `src/features/<feature>/` gồm logic thuần, `components/` và test đặt cạnh file.
`src/app/` chỉ chứa route mỏng gọi sang features. Không tạo thư mục "utils" chung chung cho logic nghiệp vụ.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

Mọi quy tắc nghiệp vụ (tính tiền, giới hạn số lượng, điều kiện áp dụng, chuyển trạng thái) MUST có unit
test viết trước khi cài đặt, bao gồm giá trị biên. Luồng người dùng quan trọng MUST có component test hoặc
E2E test. `npm run check` MUST pass trước khi merge.

### III. Server là nguồn sự thật về tiền

Giá, phí giao hàng, giảm giá và tổng tiền MUST được server tính lại khi tạo đơn hàng. Con số hiển thị
ở client chỉ mang tính xem trước. Mọi input từ client MUST được validate bằng Zod.

### IV. Đơn giản trước (YAGNI)

Dùng stack hiện có: Next.js App Router, TypeScript strict, Zod, Tailwind, Vitest, Playwright. Không thêm
dependency, database hay dịch vụ ngoài nếu không có lý do được ghi trong plan (mục Complexity Tracking).

### V. Trải nghiệm người dùng tiếng Việt và dễ tiếp cận

Text giao diện bằng tiếng Việt, tiền định dạng VND qua `formatCurrency`. Form có label, thông báo lỗi
cụ thể theo từng trường. Giao diện hoạt động ở độ rộng 390px trở lên.

## Ràng buộc kỹ thuật

- Next.js 16 App Router, React 19, TypeScript `strict`, không dùng `any`.
- Dữ liệu tĩnh trong `src/data/`, dữ liệu ghi được qua repository (hiện là file JSON).
- API trả lỗi theo format `{ error: { code, message, details? } }`.

## Quy trình phát triển

- Mỗi tính năng phát triển trên nhánh riêng, spec trong `specs/<NNN-tên>/`.
- Thứ tự: spec → plan → tasks → implement → converge. Không code khi spec còn `[NEEDS CLARIFICATION]`.
- Review code bắt buộc trước khi merge vào `main`.

## Governance

Constitution có hiệu lực cao hơn mọi tài liệu hướng dẫn khác. Thay đổi constitution MUST tăng version
theo semver (MAJOR: bỏ/đổi nguyên tắc, MINOR: thêm nguyên tắc, PATCH: sửa câu chữ) và ghi lý do.
Plan nào vi phạm nguyên tắc MUST giải thích trong mục Complexity Tracking.

**Version**: 1.0.0 | **Ratified**: 2026-10-21 | **Last Amended**: 2026-10-21

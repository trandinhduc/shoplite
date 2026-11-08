<!--
Sync Impact Report:
- Version change: Initial template -> v1.0.0
- List of modified principles:
  1. I. Kiến trúc theo tính năng (Feature-Driven Architecture)
  2. II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)
  3. III. Server là nguồn sự thật về tiền (Server-Authoritative Pricing)
  4. IV. Đơn giản trước (Simplicity & YAGNI First)
  5. V. Trải nghiệm tiếng Việt và dễ tiếp cận (Vietnamese Localization & Accessibility)
- Added sections:
  - Ràng buộc kỹ thuật (Technical Constraints)
  - Quy trình phát triển (Development Workflow)
  - Governance
- Removed sections: N/A (Initial ratification)
- Follow-up TODOs: None
-->

# ShopLite Constitution

Tài liệu này xác lập các nguyên tắc kiến trúc cốt lõi, ràng buộc kỹ thuật và quy trình phát triển bắt buộc cho toàn bộ đội ngũ phát triển và AI coding agents khi làm việc trên dự án ShopLite.

## Core Principles

### I. Kiến trúc theo tính năng (Feature-Driven Architecture)
Mọi mã nguồn mới MUST được tổ chức theo từng tính năng bên trong `src/features/<feature>/`. Mỗi module tính năng phải tự chứa đầy đủ logic nghiệp vụ thuần, components giao diện (`components/`), schema validation và unit test tương ứng đặt cạnh file nguồn. Thư mục `src/app/` (Next.js App Router) MUST chỉ đóng vai trò là "route mỏng" (thin routes/pages/API handlers), có nhiệm vụ tiếp nhận HTTP request, parse tham số, ủy quyền xử lý cho feature tương ứng và trả về response; tuyệt đối MUST NOT chứa logic nghiệp vụ nặng hay quản lý trạng thái phức tạp trực tiếp trong route.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)
Mọi quy tắc nghiệp vụ liên quan đến tính toán tiền tệ, ngưỡng cấu hình (ví dụ: `MAX_QUANTITY_PER_ITEM`, `FREE_SHIPPING_THRESHOLD`), điều kiện trạng thái đơn hàng (ví dụ: chỉ cho phép hủy khi đơn ở trạng thái `pending`), và logic cập nhật giỏ hàng MUST có unit test được thiết kế và viết trước khi triển khai (Test-First/TDD). Bộ test MUST bao phủ đầy đủ các giá trị biên (dưới ngưỡng, đúng ngưỡng, trên ngưỡng). Toàn bộ bài kiểm tra chất lượng `npm run check` (bao gồm ESLint, TypeScript compilation và Vitest) MUST vượt qua 100% trước khi bất kỳ tính năng nào được coi là hoàn tất.

### III. Server là nguồn sự thật về tiền (Server-Authoritative Pricing)
Server là nguồn sự thật duy nhất và tối cao đối với toàn bộ dữ liệu tài chính của đơn hàng. Mọi thông tin về đơn giá sản phẩm, phí giao hàng, giảm giá (nếu có), và tổng số tiền thanh toán MUST được server tính toán lại độc lập từ dữ liệu catalog gốc (`calculateOrderTotals`); server MUST NOT tin tưởng hoặc chấp nhận giá tiền, phí ship hay tổng tiền do phía client gửi lên. Mọi dữ liệu đầu vào (payload) từ client MUST được kiểm tra và validate nghiêm ngặt bằng Zod schema dùng chung trước khi đưa vào luồng xử lý.

### IV. Đơn giản trước (Simplicity & YAGNI First)
Hệ thống MUST tối đa hóa sự đơn giản và tuân thủ triệt để nguyên lý YAGNI (You Aren't Gonna Need It). Mọi giải pháp phát triển MUST ưu tiên khai thác tối đa tech stack hiện có: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Zod 4, Vitest và lưu trữ file JSON cục bộ (`storage/orders.json`). Lập trình viên và AI Agent MUST NOT tự ý cài đặt thêm dependency, thư viện ngoài hoặc tích hợp cơ sở dữ liệu bên ngoài nếu kế hoạch triển khai (plan) chưa giải trình lý do rõ ràng và chưa nhận được sự phê duyệt của người dùng.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận (Vietnamese Localization & Accessibility)
Giao diện người dùng ShopLite phục vụ người tiêu dùng Việt Nam, do đó toàn bộ văn bản hiển thị, thông điệp phản hồi, trạng thái và lỗi MUST sử dụng tiếng Việt tự nhiên, chính xác, không nửa Anh nửa Việt. Mọi giá trị tiền tệ hiển thị MUST được định dạng chuẩn qua hàm `formatCurrency` (`src/lib/format.ts`) với ký hiệu tiền tệ VND (`₫`). Mọi form nhập liệu tương tác MUST có nhãn `<label>` rõ ràng, tuân thủ tiêu chuẩn tiếp cận (accessibility/a11y) và hiển thị thông báo lỗi chi tiết theo từng trường (field-level validation errors).

## Ràng buộc kỹ thuật

- **Môi trường & Ngôn ngữ:** Dự án yêu cầu Node.js >= 22.12; TypeScript ở chế độ nghiêm ngặt (`strict: true`). Tuyệt đối MUST NOT sử dụng kiểu `any` hoặc tắt các quy tắc kiểm tra linter (ESLint disable) để né tránh lỗi kiểu dữ liệu.
- **Mô hình Server Components:** Mặc định toàn bộ components trong `src/app/` và `src/features/` là React Server Components. Chỉ bổ sung chỉ thị `"use client"` khi component thực sự cần quản lý state cục bộ, effect, hoặc lắng nghe sự kiện tương tác của người dùng.
- **Bảo mật dữ liệu & Quản lý file:** MUST NOT sửa đổi thủ công file `package-lock.json`. File dữ liệu đơn hàng `storage/orders.json` và các file môi trường `.env*` phải nằm trong `.gitignore` và MUST NOT bao giờ bị commit vào Git.
- **Tương thích lưu trữ Client:** Trạng thái giỏ hàng lưu trữ tại `localStorage["shoplite:cart"]` MUST có cơ chế kiểm tra và migration an toàn đối với dữ liệu phiên bản cũ, không được gây lỗi trắng trang (crash) khi cấu trúc dữ liệu giỏ hàng thay đổi.

## Quy trình phát triển

- **Phát triển theo nhánh độc lập:** Mọi tính năng, bản vá hoặc bài thực hành MUST được thực hiện trên một nhánh Git riêng biệt (ví dụ: `binhna/module-1`, `feature/<ten-tinh-nang>`), tuyệt đối không commit trực tiếp lên nhánh `main`.
- **Nguyên tắc "Không code khi spec còn câu hỏi mở":** Lập trình viên và AI Agent MUST NOT bắt đầu viết code khi tài liệu đặc tả (specification) còn chứa các giả định chưa rõ hoặc câu hỏi chưa được giải đáp (open questions). Bất kỳ điểm mơ hồ nào MUST được làm rõ (clarify) trước khi lập kế hoạch (plan) và tạo task.
- **Quality Gates:** Mã nguồn trước khi commit MUST vượt qua pre-commit hook tự động (`npm run check`). Mọi thao tác push mã nguồn lên remote repository MUST có sự phê duyệt rõ ràng từ người dùng.

## Governance

Bản Hiến pháp này là văn bản quản trị kỹ thuật có hiệu lực cao nhất trong dự án ShopLite, vượt lên trên mọi hướng dẫn thông thường khác. Mọi kế hoạch triển khai (Spec Kit Plan), đặc tả tính năng (Specification) và pull request đều MUST đối chiếu và tuân thủ nghiêm ngặt các nguyên tắc trong tài liệu này.

Mọi đề xuất sửa đổi hoặc bổ sung Hiến pháp MUST được lập thành văn bản và tăng số hiệu phiên bản theo chuẩn Semantic Versioning (SemVer):
- **MAJOR:** Khi thay đổi, tái định nghĩa hoặc bãi bỏ các nguyên tắc cốt lõi hiện có, làm thay đổi căn bản quy trình phát triển.
- **MINOR:** Khi bổ sung thêm nguyên tắc mới, phần hướng dẫn mới hoặc mở rộng các ràng buộc mà không mâu thuẫn với các nguyên tắc trước đó.
- **PATCH:** Khi đính chính lỗi chính tả, làm rõ câu từ hoặc cập nhật tài liệu tham khảo mà không làm thay đổi ngữ nghĩa quản trị.

Mọi lần sửa đổi MUST cập nhật mục `Last Amended` với ngày tháng theo định dạng chuẩn ISO (YYYY-MM-DD).

---

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08

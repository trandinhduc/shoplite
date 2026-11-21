# Hiến Chương Dự Án ShopLite (ShopLite Project Constitution)

<!--
Version: 1.0.0
Trạng thái: Active
Phạm vi: Toàn bộ dự án ShopLite
-->

Tài liệu này xác lập các nguyên tắc kỹ thuật, tiêu chuẩn chất lượng và quy trình phát triển cốt lõi cho dự án **ShopLite**. Mọi nhà phát triển và AI coding agent tham gia dự án **MUST** tuân thủ nghiêm ngặt các điều khoản trong hiến chương này.

---

## I. Năm Nguyên Tắc Cốt Lõi (Core Principles)

### 1. Kiến trúc theo tính năng (Feature-based Architecture)
- **1.1 (MUST):** Mọi logic nghiệp vụ, components chuyên biệt, types, helper và tests **MUST** được tổ chức tự chứa trong thư mục `src/features/<feature>/` (theo kiến trúc vertical slice: `catalog`, `cart`, `checkout`, `orders`...).
- **1.2 (MUST):** Thư mục `src/app/` **MUST** chỉ đóng vai trò là tầng định tuyến mỏng (Thin Routes & Route Handlers). Tầng này chỉ tiếp nhận request, gọi service tương ứng trong `src/features/*`, và trả về response hoặc render page. Tuyệt đối **MUST NOT** nhồi nhét logic tính toán nghiệp vụ trong `src/app/`.
- **1.3 (MUST):** Mã nguồn server-only (như đọc/ghi hệ thống file qua `fs`, repository thao tác đĩa) **MUST** chỉ được import qua `src/features/orders/server.ts` hoặc các entrypoint server chuyên biệt. Client Components (`"use client"`) **MUST NOT** import trực tiếp các module này.

### 2. Test trước cho nghiệp vụ (Test-First for Business Logic) — NON-NEGOTIABLE
- **2.1 (MUST):** Mọi quy tắc tính toán tiền bạc, giới hạn số lượng, xử lý tồn kho và chuyển đổi trạng thái đơn hàng **MUST** áp dụng phương pháp Test-Driven Development (TDD) — viết unit test trước khi viết code triển khai.
- **2.2 (MUST):** Bộ unit test **MUST** bao phủ đầy đủ các ca kiểm thử biên (boundary test cases: dưới ngưỡng, tại ngưỡng và vượt ngưỡng). Ví dụ: ngưỡng miễn phí giao hàng, giới hạn 10 sản phẩm/loại, sản phẩm hết hàng (`stock <= 0`).
- **2.3 (MUST):** Trước khi hoàn thành bất kỳ tác vụ nào, lệnh `npm run check` (bao gồm `lint`, `typecheck` và `vitest`) **MUST** vượt qua 100% không có lỗi. Logic thuần **SHOULD** được viết dưới dạng pure function và test trực tiếp không cần mock phức tạp.

### 3. Server là nguồn sự thật về tiền và dữ liệu (Server as Source of Truth)
- **3.1 (MUST):** Server **MUST** là cơ quan duy nhất có thẩm quyền quyết định về giá bán, phí giao hàng, giảm giá và tổng tiền thanh toán. Quy trình tạo đơn (`POST /api/orders`) **MUST** bỏ qua toàn bộ giá client gửi lên, tự tra cứu giá gốc từ catalog (`getProductById`) và tính toán lại bằng `calculateOrderTotals`.
- **3.2 (MUST):** Mọi dữ liệu đầu vào từ người dùng (form) hoặc qua API **MUST** được validate chặt chẽ bằng Zod schema (`checkout-schema.ts`) trước khi xử lý nghiệp vụ.
- **3.3 (MUST):** Lỗi API **MUST** được chuẩn hóa thông qua `OrderError` và xử lý bởi `handleRouteError` theo cấu trúc JSON thống nhất: `{ error: { code, message, details? } }`.

### 4. Đơn giản trước (Simplicity First — YAGNI)
- **4.1 (MUST):** Luôn ưu tiên giải pháp tối giản nhất giải quyết trọn vẹn yêu cầu. **MUST NOT** xây dựng thừa các tính năng trừu tượng hóa, cấu trúc phức tạp hay tối ưu hóa sớm khi chưa có nhu cầu thực tế.
- **4.2 (MUST):** **MUST** tận dụng triệt để stack công nghệ và các tiện ích có sẵn trong dự án. **MUST NOT** tự ý cài đặt thêm dependency (npm package), cơ sở dữ liệu ngoài (database), hay hạ tầng đám mây nếu kế hoạch (Spec/Plan) không giải trình lý do rõ ràng và chưa được phê duyệt.
- **4.3 (SHOULD):** Giữ nguyên mô hình lưu trữ cục bộ: dữ liệu danh mục tĩnh (`src/data/`), đơn hàng lưu file JSON (`storage/orders.json`), và giỏ hàng lưu `localStorage` (`shoplite:cart`).

### 5. Trải nghiệm tiếng Việt và Dễ tiếp cận (Vietnamese Localization & Accessibility)
- **5.1 (MUST):** Toàn bộ giao diện người dùng, nhãn (label), văn bản thông báo, trạng thái đơn hàng và thông báo lỗi **MUST** được thể hiện bằng tiếng Việt tự nhiên, chính xác, thân thiện.
- **5.2 (MUST):** Tiền tệ **MUST** được định dạng nhất quán thông qua hàm `formatCurrency` theo định dạng chuẩn VND (ví dụ: `500.000 ₫`).
- **5.3 (MUST):** Form nhập liệu **MUST** có nhãn truy cập (accessible label) cho từng ô nhập và hiển thị thông báo lỗi chi tiết theo từng trường (`field-level errors`).
- **5.4 (SHOULD):** Các tính năng tìm kiếm văn bản **SHOULD** sử dụng `normalizeText` để hỗ trợ tìm kiếm tiếng Việt không dấu linh hoạt.

---

## II. Ràng Buộc Kỹ Thuật (Technical Constraints)

1. **Môi trường & Ngôn ngữ:**
   - Node.js runtime: `>= 22.12.0`.
   - Framework: Next.js 16 (App Router + Turbopack).
   - UI Library: React 19.
   - Ngôn ngữ: TypeScript cấu hình nghiêm ngặt (`tsc --noEmit`).
2. **Kiểu dáng & Giao diện:**
   - Styling: Tailwind CSS v4.
   - Icon: `lucide-react`.
3. **Validation & State:**
   - Schema validation: Zod 4.
   - Giỏ hàng: `localStorage` với key `shoplite:cart`, đồng bộ qua `useHydrated` để ngăn chặn hydration mismatch.
4. **Kiểm thử & Định dạng:**
   - Unit & Component test: Vitest + React Testing Library + jsdom.
   - End-to-end test: Playwright (`e2e/*.spec.ts`).
   - Linter & Code style: ESLint 9 (flat config) + Prettier (Tailwind plugin).

---

## III. Quy Trình Phát Triển (Development Workflow)

1. **Làm việc trên nhánh riêng (Branching Policy):**
   - Mọi công việc **MUST** được thực hiện trên một nhánh riêng (ví dụ: `vanttc`, `feature/<name>`), **MUST NOT** commit hoặc push trực tiếp vào nhánh `main`.
2. **Không code khi còn câu hỏi mở (Spec-First Gate):**
   - **MUST NOT** bắt đầu viết code khi tài liệu đặc tả (Spec) hoặc kế hoạch triển khai (Plan) vẫn còn câu hỏi mở (Open Questions / Unresolved Decisions) hoặc còn điểm mơ hồ về hành vi hệ thống. Mọi ca biên và ràng buộc **MUST** được làm rõ trước.
3. **Quy trình TDD bắt buộc:**
   - Viết test (Red) ➔ Viết mã triển khai vừa đủ (Green) ➔ Tối ưu và dọn dẹp mã (Refactor).
4. **Tiêu chuẩn hoàn thành (Definition of Done - DoD):**
   - `npm run check` vượt qua toàn bộ (0 lỗi lint, 0 lỗi typecheck, 100% unit tests pass).
   - Code mới có unit test đầy đủ cho các hàm xử lý logic thuần.
   - Đã chạy `npm run format` để chuẩn hóa định dạng mã nguồn.

---

## IV. Quản Trị Hiến Chương (Governance)

1. **Phiên bản hóa ngữ nghĩa (Semantic Versioning):**
   Hiến chương này được quản lý phiên bản theo quy chuẩn SemVer (`MAJOR.MINOR.PATCH`):
   - **PATCH (ví dụ 1.0.0 ➔ 1.0.1):** Sửa lỗi chính tả, câu chữ, định dạng, hoặc làm rõ giải thích mà không thay đổi bất kỳ ý nghĩa hay quy tắc nào.
   - **MINOR (ví dụ 1.0.0 ➔ 1.1.0):** Bổ sung thêm nguyên tắc mới mang tính khuyến nghị (`SHOULD`), bổ sung công cụ hỗ trợ hoặc hướng dẫn thực thi mà không làm mất hiệu lực của các quy tắc trước đó.
   - **MAJOR (ví dụ 1.0.0 ➔ 2.0.0):** Thay đổi, nới lỏng, thay thế hoặc xóa bỏ các nguyên tắc bắt buộc (`MUST` / `NON-NEGOTIABLE`), hoặc tái cấu trúc kiến trúc cốt lõi.

2. **Quy trình sửa đổi:**
   - Mọi đề xuất thay đổi Hiến chương **MUST** được thảo luận, ghi nhận lý do vào mục Lịch sử thay đổi (Changelog) phía dưới và được review cẩn trọng trước khi hợp nhất.

---

## V. Lịch Sử Thay Đổi (Changelog)

- **v1.0.0 (2026-11-08):**
  - Khởi tạo Hiến chương dự án ShopLite dựa trên `AGENTS.md`, `README.md` và mã nguồn hiện tại.
  - Ban hành 5 nguyên tắc cốt lõi, ràng buộc kỹ thuật, quy trình làm việc Spec-Driven và cơ chế quản trị SemVer.


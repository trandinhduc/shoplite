# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

- Logic nghiệp vụ, component và test của một tính năng MUST nằm trong `src/features/<feature>/`
  (hiện có: `catalog`, `cart`, `checkout`, `orders`).
- `src/app/` MUST chỉ chứa page, layout và Route Handler mỏng: nhận request/params, gọi hàm
  trong `src/features/`, trả response. Không đặt quy tắc nghiệp vụ, phép tính tiền hay truy cập
  storage trực tiếp trong `src/app/`.
- UI dùng chung MUST đặt ở `src/components/`, tiện ích dùng chung ở `src/lib/`; import qua alias
  `@/*`.
- Mặc định là Server Component; `"use client"` chỉ được thêm khi component cần state, hook hoặc
  API trình duyệt. Client Component MUST NOT import `@/features/orders/server` hay `node:fs`.
- Service MUST nhận phụ thuộc qua DI (ví dụ `createOrderService({ repository, ... })`) và truy cập
  dữ liệu qua interface repository, để thay storage mà không sửa service.
- Tên file SHOULD dùng kebab-case; component export dạng named, PascalCase; test đặt cạnh file.

**Lý do**: Gom mọi thứ của một tính năng vào một chỗ giúp đọc, test và mở rộng độc lập; route mỏng
giữ ranh giới server/client rõ ràng và tránh rò rỉ code hệ thống file sang trình duyệt.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

- Mọi quy tắc tính tiền (giá, phí ship, giảm giá, tổng tiền), giới hạn (số lượng, tồn kho,
  ngưỡng) và chuyển trạng thái (ví dụ hủy đơn chỉ khi `pending`) MUST có unit test được viết
  **trước** phần cài đặt, và test MUST fail trước khi code được viết để làm nó pass.
- Mỗi quy tắc có ngưỡng MUST có test cho giá trị biên: dưới, bằng và trên ngưỡng (ví dụ subtotal
  499.999 ₫ / 500.000 ₫ / 500.001 ₫ với `FREE_SHIPPING_THRESHOLD`; số lượng 0 / 1 / 10 / 11 với
  `MAX_QUANTITY_PER_ITEM`).
- Thay đổi API hoặc service MUST có test cho cả nhánh lỗi, kiểm tra mã lỗi và HTTP status.
- Test MUST NOT gọi mạng thật (dùng `vi.stubGlobal("fetch", ...)`) và MUST NOT ghi vào
  `storage/orders.json` (dùng `createInMemoryOrderRepository()` hoặc thư mục tạm).
- `npm run check` (lint + typecheck + vitest) MUST pass trước khi coi một thay đổi là xong.
  Thay đổi luồng mua hàng hoặc UI chính MUST thêm `npm run test:e2e` pass.

**Lý do**: Lỗi ở quy tắc tiền và trạng thái gây thiệt hại trực tiếp cho khách và cửa hàng; test
viết trước buộc quy tắc được định nghĩa rõ, còn test biên bắt đúng loại lỗi off-by-one hay gặp nhất.

### III. Server là nguồn sự thật về tiền

- Giá đơn vị, phí ship, giảm giá và tổng tiền MUST do server tính lại từ catalog
  (`getProductById`) và `calculateOrderTotals`. Server MUST NOT đọc hay tin bất kỳ giá trị tiền
  nào trong payload client; payload chỉ mang `productId`, `quantity` và lựa chọn của người dùng.
- Mọi quy tắc tính tiền MUST nằm trong `src/features/checkout/pricing.ts`, dùng chung cho client
  (hiển thị) và server (quyết định). Không được nhân bản công thức ở nơi khác.
- Mọi input từ client MUST được validate bằng schema Zod (`safeParse`) ở server, kể cả khi client
  đã validate. Schema SHOULD dùng chung giữa form và service (`checkout-schema.ts`).
- Giới hạn tồn kho và số lượng MUST được kiểm tra ở server (`placeOrderSchema`,
  `INSUFFICIENT_STOCK`), không chỉ ở giỏ hàng phía client.
- Lỗi API MUST theo định dạng `{ error: { code, message, details? } }`; mã lỗi mới MUST được thêm
  vào cả union `OrderErrorCode` lẫn `HTTP_STATUS_BY_CODE`.

**Lý do**: Client (localStorage, request body) có thể bị sửa tùy ý; chỉ server được quyết định số
tiền khách phải trả. Một nguồn công thức duy nhất tránh lệch giữa giá hiển thị và giá thật.

### IV. Đơn giản trước

- Tính năng mới MUST dùng stack hiện có: Next.js App Router, React, TypeScript strict, Tailwind
  CSS, Zod, Vitest, Testing Library, Playwright; dữ liệu tĩnh trong `src/data/` và đơn hàng lưu
  file JSON qua `OrderRepository`.
- Thêm dependency mới, database, dịch vụ bên ngoài hoặc tầng trừu tượng mới MUST NOT xảy ra trừ
  khi `plan.md` ghi rõ lý do, phương án đơn giản hơn đã cân nhắc và vì sao bị loại (mục
  Complexity Tracking).
- Giải pháp SHOULD là phiên bản nhỏ nhất đáp ứng spec; không xây trước cho nhu cầu giả định.

**Lý do**: ShopLite là dự án mẫu phải đọc hiểu được trong một buổi. Mỗi dependency hay tầng mới
làm tăng chi phí học, bảo trì và bề mặt lỗi.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

- Toàn bộ chuỗi hiển thị, thông báo lỗi, comment và tên test MUST viết bằng tiếng Việt.
- Số tiền hiển thị MUST đi qua `formatCurrency`; không tự ghép chuỗi hay định dạng tiền thủ công.
- Mọi trường form MUST có `<label>` gắn với input; lỗi validate MUST hiển thị theo từng trường
  (dùng `toFieldErrors` → `Record<field, message>`) và gắn với trường bằng thuộc tính ARIA phù hợp
  (ví dụ `aria-invalid`, `aria-describedby`).
- Phần tử tương tác MUST dùng được bằng bàn phím và có tên truy cập được; test SHOULD chọn phần tử
  bằng `getByRole`/`getByLabelText`, `getByTestId` là lựa chọn cuối.
- Component đọc trạng thái trình duyệt MUST đi qua `useCart`/`cartStore` và
  `hydrated`/`useHydrated` để tránh lệch SSR; không đọc localStorage trực tiếp trong component.

**Lý do**: Người dùng mục tiêu là người Việt; label và lỗi theo từng trường giúp mọi người, kể cả
người dùng trình đọc màn hình, hoàn tất thanh toán mà không đoán.

## Ràng buộc kỹ thuật

- Runtime: Node.js >= 22.12, npm 10+. Next.js 16 (App Router, Turbopack), React 19,
  TypeScript strict, Tailwind CSS v4, Zod 4.
- Kiểm thử: Vitest chạy `src/**/*.test.{ts,tsx}` (mặc định `jsdom`; code dùng file hệ thống hoặc
  Route Handler thêm `// @vitest-environment node`); E2E bằng Playwright trong `e2e/`.
- Lưu trữ: sản phẩm/danh mục là dữ liệu tĩnh trong `src/data/`; giỏ hàng ở localStorage key
  `shoplite:cart`; đơn hàng ở `storage/orders.json` (ghi đè bằng env `ORDERS_FILE`), ghi nguyên tử
  (file `.tmp` rồi `rename`). Tồn kho không bị trừ khi đặt hàng.
- Quy tắc nghiệp vụ hiện hành MUST được giữ nguyên trừ khi spec thay đổi chúng một cách tường minh:
  - Mỗi sản phẩm trong giỏ tối đa `min(stock, MAX_QUANTITY_PER_ITEM = 10)`; `stock = 0` không thêm
    được.
  - Phí ship `standard` 30.000 ₫, miễn phí khi subtotal >= 500.000 ₫; `express` 60.000 ₫ luôn tính;
    subtotal <= 0 thì phí 0.
  - Hủy đơn chỉ khi `status === "pending"`, ngược lại `INVALID_STATUS_TRANSITION` (409); `PATCH`
    chỉ nhận `{ "status": "cancelled" }`.
- MUST NOT commit `storage/` hay `.env*`; MUST NOT xóa `agentRules: false` trong `next.config.ts`.
- Code MUST sạch theo `npm run format:check` (Prettier + prettier-plugin-tailwindcss).

## Quy trình phát triển

- Mỗi tính năng hoặc thay đổi MUST được làm trên nhánh riêng; không commit trực tiếp lên `main`.
- Luồng chuẩn: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`.
- MUST NOT bắt đầu viết code khi spec còn câu hỏi mở (đánh dấu `[NEEDS CLARIFICATION]` hoặc chưa
  được trả lời ở bước clarify). Câu hỏi phát sinh giữa chừng MUST được cập nhật vào spec trước khi
  code tiếp.
- `plan.md` MUST qua bước "Constitution Check" đối chiếu năm nguyên tắc ở trên; mọi ngoại lệ MUST
  được ghi vào Complexity Tracking kèm lý do.
- Trong `tasks.md`, task viết test cho quy tắc nghiệp vụ MUST đứng trước task cài đặt tương ứng.
- Thay đổi chạm hơn 3 file SHOULD được trình bày kế hoạch trước khi sửa.
- Definition of Done: `npm run check` pass; logic mới có test cạnh file; thay đổi API/service có
  test nhánh lỗi; thay đổi luồng mua hàng/UI chính có `npm run test:e2e` pass; `npm run
  format:check` sạch; đổi text hoặc `data-testid` thì cập nhật e2e tương ứng.

## Governance

- Constitution này có hiệu lực cao hơn mọi quy ước khác trong repo. `AGENTS.md`/`CLAUDE.md` là
  hướng dẫn vận hành chi tiết và MUST không mâu thuẫn với constitution; khi mâu thuẫn, constitution
  thắng và tài liệu kia MUST được sửa.
- Mọi sửa đổi constitution MUST được thực hiện qua pull request riêng, nêu rõ nội dung thay đổi,
  lý do và ảnh hưởng tới spec/plan/tasks đang dở.
- Mọi sửa đổi MUST tăng version theo semver:
  - MAJOR: bỏ hoặc định nghĩa lại một nguyên tắc/quy tắc theo cách không tương thích ngược.
  - MINOR: thêm nguyên tắc/mục mới hoặc mở rộng đáng kể hướng dẫn hiện có.
  - PATCH: làm rõ câu chữ, sửa lỗi chính tả, thay đổi không đổi ngữ nghĩa.
- `Last Amended` MUST được cập nhật theo ngày sửa (định dạng YYYY-MM-DD).
- Mọi review PR MUST kiểm tra tuân thủ constitution; độ phức tạp tăng thêm MUST có lý do được ghi
  lại trong plan.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08

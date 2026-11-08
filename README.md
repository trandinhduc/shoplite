# ShopLite 🛍️

Cửa hàng đồ công nghệ mini viết bằng **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**.
Dự án dùng làm mẫu cho các bài thực hành phát triển phần mềm: đủ nhỏ để đọc hiểu trong một buổi,
đủ thật để mở rộng thêm nhiều tính năng.

> Dữ liệu sản phẩm là dữ liệu mẫu, đơn hàng được lưu vào file JSON trên máy - không cần database,
> không cần tài khoản dịch vụ bên ngoài.

## Tính năng

| #   | Tính năng           | Đường dẫn          | Mô tả                                                                                 |
| --- | ------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| 1   | Trang chủ           | `/`                | Banner, danh mục, sản phẩm nổi bật                                                    |
| 2   | Danh mục & tìm kiếm | `/products`        | Tìm kiếm không dấu, lọc theo danh mục / khoảng giá / còn hàng, sắp xếp, phân trang    |
| 3   | Chi tiết sản phẩm   | `/products/[slug]` | Thông tin, thông số kỹ thuật, tình trạng kho, chọn số lượng, sản phẩm liên quan       |
| 4   | Giỏ hàng            | `/cart`            | Thêm/sửa/xóa, giới hạn theo tồn kho, lưu trong localStorage, gợi ý miễn phí giao hàng |
| 5   | Thanh toán          | `/checkout`        | Form có validate, chọn giao hàng & thanh toán, áp mã giảm giá, tạo đơn qua API        |
| 6   | Đơn hàng            | `/orders`          | Lịch sử đơn hàng, chi tiết đơn, hủy đơn khi đang "Chờ xác nhận"                       |

## Yêu cầu

- Node.js **22.12** trở lên (`node -v`)
- npm 10+

## Bắt đầu

```bash
npm install
npm run dev
```

Mở <http://localhost:3000>.

## Các lệnh

| Lệnh                    | Mô tả                                           |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Chạy môi trường phát triển (Turbopack)          |
| `npm run build`         | Build production                                |
| `npm start`             | Chạy bản build production                       |
| `npm run lint`          | Kiểm tra code bằng ESLint                       |
| `npm run typecheck`     | Kiểm tra kiểu TypeScript                        |
| `npm run format`        | Định dạng code bằng Prettier                    |
| `npm test`              | Chạy unit test & component test (Vitest)        |
| `npm run test:watch`    | Chạy test ở chế độ watch                        |
| `npm run test:coverage` | Chạy test và đo độ bao phủ                      |
| `npm run test:e2e`      | Chạy end-to-end test (Playwright)               |
| `npm run check`         | lint + typecheck + test - chạy trước khi commit |

> Lần đầu chạy E2E cần cài trình duyệt: `npx playwright install chromium`

## Cấu trúc thư mục

```text
src/
├── app/                    # Routes (App Router) - chỉ chứa trang và API, logic nằm ở features/
│   ├── api/                # Route Handlers: /api/products, /api/orders, /api/coupons
│   ├── products/ cart/ checkout/ orders/
│   └── layout.tsx
├── features/               # Mỗi thư mục là một tính năng: logic + component + test
│   ├── catalog/            # Tìm kiếm, lọc, sắp xếp, phân trang sản phẩm
│   ├── cart/               # Giỏ hàng (reducer + store localStorage)
│   ├── checkout/           # Quy tắc tính tiền, validate form thanh toán
│   ├── coupons/            # Mã giảm giá: quy tắc tính giảm, kiểm tra mã, ô nhập mã
│   └── orders/             # Tạo / xem / hủy đơn hàng, lưu trữ JSON
├── components/             # UI dùng chung (button, layout...)
├── data/                   # Dữ liệu mẫu: sản phẩm, danh mục, mã giảm giá (coupons.ts - chỉ server)
└── lib/                    # Tiện ích: format tiền/ngày, cn, http helpers
e2e/                        # Playwright end-to-end tests
storage/                    # (tự tạo khi chạy) orders.json - đã được gitignore
```

## Quy tắc nghiệp vụ chính

- **Giỏ hàng:** tối đa 10 sản phẩm mỗi loại và không vượt quá tồn kho. Sản phẩm hết hàng không thể thêm.
- **Phí giao hàng:** tiêu chuẩn 30.000 ₫ (miễn phí cho đơn từ 500.000 ₫), giao nhanh 60.000 ₫.
- **Đặt hàng:** server tự tính lại giá từ dữ liệu sản phẩm, không tin giá do client gửi lên.
- **Hủy đơn:** chỉ được hủy khi đơn đang ở trạng thái _Chờ xác nhận_.
- **Mã giảm giá:** mỗi đơn một mã; hai loại là giảm theo % (có mức tối đa) và giảm số tiền cố định,
  có thể kèm giá trị đơn tối thiểu và ngày hết hạn. Giảm trên tạm tính, làm tròn xuống đến đồng; phí
  giao hàng vẫn xét trên tạm tính trước giảm. Server tự kiểm tra mã và tính lại số tiền khi đặt hàng.
  Mã có sẵn (`src/data/coupons.ts`): `SHOPLITE10` (10%, tối đa 100.000 ₫, đơn từ 300.000 ₫),
  `GIAM50K` (50.000 ₫, đơn từ 500.000 ₫), `TET2026` (15%, tối đa 200.000 ₫, hết hạn sau 28/02/2026).

## API

| Method  | Endpoint                | Mô tả                                                                             |
| ------- | ----------------------- | --------------------------------------------------------------------------------- |
| `GET`   | `/api/products`         | Danh sách sản phẩm. Query: `q, category, minPrice, maxPrice, inStock, sort, page` |
| `GET`   | `/api/products/:slug`   | Chi tiết sản phẩm                                                                 |
| `GET`   | `/api/orders`           | Danh sách đơn hàng                                                                |
| `POST`  | `/api/orders`           | Tạo đơn hàng (tùy chọn `couponCode`)                                              |
| `GET`   | `/api/orders/:id`       | Chi tiết đơn hàng                                                                 |
| `PATCH` | `/api/orders/:id`       | Hủy đơn: `{ "status": "cancelled" }`                                              |
| `POST`  | `/api/coupons/validate` | Kiểm tra mã còn dùng được: `{ "code": "SHOPLITE10" }` → quy tắc của mã đó         |

Lỗi trả về dạng `{ "error": { "code": "...", "message": "...", "details": { ... } } }`.

Ví dụ tạo đơn hàng:

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": { "fullName": "Nguyễn Văn A", "phone": "0912345678", "address": "12 Nguyễn Huệ, Quận 1, TP.HCM" },
    "shippingMethod": "standard",
    "paymentMethod": "cod",
    "items": [{ "productId": "p006", "quantity": 2 }],
    "couponCode": "SHOPLITE10"
  }'
```

## Biến môi trường

| Biến          | Mặc định              | Mô tả                       |
| ------------- | --------------------- | --------------------------- |
| `ORDERS_FILE` | `storage/orders.json` | Đường dẫn file lưu đơn hàng |

## Giấy phép

[MIT](./LICENSE)

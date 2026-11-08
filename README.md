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
| 5   | Thanh toán          | `/checkout`        | Form có validate, chọn phương thức giao hàng & thanh toán, tạo đơn qua API            |
| 6   | Đơn hàng            | `/orders`          | Lịch sử đơn hàng, chi tiết đơn, hủy đơn khi đang "Chờ xác nhận"                       |
| 7   | Yêu thích           | `/wishlist`        | Nút trái tim trên thẻ và trang chi tiết, lưu trong localStorage, đồng bộ giữa các tab |

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
│   ├── api/                # Route Handlers: /api/products, /api/orders
│   ├── products/ cart/ checkout/ orders/ wishlist/
│   └── layout.tsx
├── features/               # Mỗi thư mục là một tính năng: logic + component + test
│   ├── catalog/            # Tìm kiếm, lọc, sắp xếp, phân trang sản phẩm
│   ├── cart/               # Giỏ hàng (reducer + store localStorage)
│   ├── checkout/           # Quy tắc tính tiền, validate form thanh toán
│   ├── coupons/            # Mã giảm giá: tra mã, kiểm tra hạn dùng và đơn tối thiểu
│   ├── orders/             # Tạo / xem / hủy đơn hàng, lưu trữ JSON
│   └── wishlist/           # Danh sách yêu thích (reducer + store localStorage, nút trái tim, trang /wishlist)
├── components/             # UI dùng chung (button, layout...)
├── data/                   # Dữ liệu mẫu: sản phẩm, danh mục
└── lib/                    # Tiện ích: format tiền/ngày, cn, http helpers
e2e/                        # Playwright end-to-end tests
storage/                    # (tự tạo khi chạy) orders.json - đã được gitignore
```

## Quy tắc nghiệp vụ chính

- **Giỏ hàng:** tối đa 10 sản phẩm mỗi loại và không vượt quá tồn kho. Sản phẩm hết hàng không thể thêm.
- **Phí giao hàng:** tiêu chuẩn 30.000 ₫ (miễn phí cho đơn từ 500.000 ₫), giao nhanh 60.000 ₫.
- **Mã giảm giá:** nhập ở trang thanh toán, mỗi đơn một mã. Mã giảm theo phần trăm (có mức giảm tối đa) hoặc một số tiền cố định, có thể kèm đơn tối thiểu và ngày hết hạn (dùng được hết ngày hết hạn, giờ Việt Nam). Giảm giá chỉ tính trên tiền hàng; phí giao hàng và ngưỡng miễn phí vẫn tính trên tạm tính trước giảm giá. Mã có sẵn: `SHOPLITE10`, `GIAM50K` và `TET2026` (đã hết hạn, dùng để thử).
- **Đặt hàng:** server tự tính lại giá và số tiền giảm từ dữ liệu của mình, không tin giá hay tổng tiền do client gửi lên. Mã hết hạn lúc đặt thì đơn vẫn được tạo theo giá gốc kèm thông báo.
- **Hủy đơn:** chỉ được hủy khi đơn đang ở trạng thái _Chờ xác nhận_.
- **Yêu thích:** tối đa 50 sản phẩm (đủ 50 thì báo cho khách, bỏ thích vẫn được), lưu trên trình duyệt, không cần đăng nhập. Chỉ lưu mã sản phẩm; giá và tồn kho luôn lấy mới nhất từ server khi mở trang. Sản phẩm hết hàng vẫn nằm trong danh sách nhưng không thêm vào giỏ được.

## API

| Method  | Endpoint                | Mô tả                                                                              |
| ------- | ----------------------- | ---------------------------------------------------------------------------------- |
| `GET`   | `/api/products`         | Danh sách sản phẩm. Query: `q, category, minPrice, maxPrice, inStock, sort, page`  |
| `GET`   | `/api/products/:slug`   | Chi tiết sản phẩm                                                                  |
| `GET`   | `/api/products/by-ids`  | Sản phẩm hiện hành theo danh sách mã: `?ids=p001,p002` (tối đa 50 mã)              |
| `POST`  | `/api/coupons/validate` | Xem trước mã giảm giá: `{ "code": "...", "items": [{ "productId", "quantity" }] }` |
| `GET`   | `/api/orders`           | Danh sách đơn hàng                                                                 |
| `POST`  | `/api/orders`           | Tạo đơn hàng (có thể kèm `couponCode`)                                             |
| `GET`   | `/api/orders/:id`       | Chi tiết đơn hàng                                                                  |
| `PATCH` | `/api/orders/:id`       | Hủy đơn: `{ "status": "cancelled" }`                                               |

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
    "couponCode": "GIAM50K"
  }'
```

## Biến môi trường

| Biến          | Mặc định              | Mô tả                       |
| ------------- | --------------------- | --------------------------- |
| `ORDERS_FILE` | `storage/orders.json` | Đường dẫn file lưu đơn hàng |

## Giấy phép

[MIT](./LICENSE)

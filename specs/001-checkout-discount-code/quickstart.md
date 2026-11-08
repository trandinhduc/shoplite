# Quickstart: Kiểm chứng tính năng mã giảm giá

Hướng dẫn chạy và kiểm tra tính năng sau khi cài đặt. Chi tiết hợp đồng xem
[contracts/api.md](./contracts/api.md), [contracts/ui.md](./contracts/ui.md) và
[data-model.md](./data-model.md).

## Chuẩn bị

```bash
npm install
npx playwright install chromium   # chỉ lần đầu
```

Hôm nay là sau 28/02/2026 nên `TET2026` đã hết hạn sẵn. Test tự động không phụ thuộc ngày thật vì
`now` được inject.

## 1. Kiểm tra tự động

```bash
npm run check                        # lint + typecheck + toàn bộ unit/component test
npx vitest run src/features/coupons  # quy tắc mã: giá trị biên, hạn dùng, làm tròn
npx vitest run src/features/checkout # pricing có discount, freeship trước giảm
npx vitest run src/features/orders   # placeOrder với mã hợp lệ / INVALID_COUPON / bỏ qua tiền từ client
npx vitest run src/app/api           # route /api/coupons/[code] và /api/orders
npm run test:e2e                     # luồng mua hàng có mã
```

Kỳ vọng: tất cả pass. Test ghi file chỉ dùng thư mục tạm hoặc repository in-memory, `storage/`
không đổi.

## 2. Kiểm tra API thủ công

```bash
npm run dev
```

| Lệnh                                                                     | Kỳ vọng                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `GET /api/coupons/shoplite10`                                            | 200, `coupon.code = "SHOPLITE10"`                           |
| `GET /api/coupons/KHONGCO`                                               | 404 `COUPON_NOT_FOUND`                                      |
| `POST /api/orders` với `p006` × 2 và `"couponCode": "TET2026"`           | 422 `INVALID_COUPON`, `reason: "expired"`, không có đơn mới |
| `POST /api/orders` có mã hợp lệ và thêm `"discount": 999999, "total": 1` | 201, `discount`/`total` do server tính                      |

(Dùng trình duyệt, REST client hoặc `fetch` trong DevTools. Settings của dự án đang chặn `curl` cho
agent.)

## 3. Kiểm tra giao diện (theo spec)

Mở <http://localhost:3000>:

1. Thêm sản phẩm cho tạm tính ≥ 300.000đ → `/checkout` → nhập `shoplite10` → "Áp dụng". Tóm tắt
   hiện `Giảm giá (SHOPLITE10)` và tổng tiền giảm đúng 10% (tối đa 100.000đ). (US1)
2. Nhập `KHONGCO`: hiện "Mã giảm giá không tồn tại". Gỡ mã rồi nhập `TET2026`: hiện "Mã giảm giá đã
   hết hạn". (US2)
3. Áp dụng `GIAM50K` với tạm tính ≥ 500.000đ. Sang `/cart`, giảm số lượng xuống dưới 500.000đ rồi
   quay lại `/checkout`: mã vẫn hiện, kèm lỗi "Mua thêm … để sử dụng mã GIAM50K", nút "Đặt hàng"
   bị khóa. Tăng lại số lượng: mã tự có hiệu lực lại. (US2 kịch bản 6–7, FR-019)
4. Tải lại trang `/checkout`: mã vẫn còn. Bấm "Gỡ mã": dòng giảm giá biến mất. (US3)
5. Đặt hàng với `SHOPLITE10` → trang `/orders/{id}` hiện `Giảm giá (SHOPLITE10)`. Giỏ hàng trống,
   mã đã bị bỏ. (US4)
6. Mở một đơn đặt trước khi có tính năng: không có dòng giảm giá, không lỗi. (FR-016)
7. Freeship: tạm tính 520.000đ + `SHOPLITE10` + giao tiêu chuẩn → phí giao hàng "Miễn phí", tổng
   468.000đ. (FR-013)

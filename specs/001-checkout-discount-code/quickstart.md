# Quickstart: kiểm chứng tính năng mã giảm giá

Tham chiếu: [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md).

## Chuẩn bị

```bash
git switch -c 001-checkout-discount-code   # nhánh riêng (constitution)
npm install
npx playwright install chromium            # lần đầu
```

Dùng file đơn tạm để không đụng `storage/orders.json`:

```bash
ORDERS_FILE=./tmp/orders.dev.json npm run dev
```

## 1. Kiểm tra tự động

```bash
npx vitest run src/features/coupons          # rule thuần + bất biến dữ liệu mã
npx vitest run src/features/checkout         # pricing có discount, schema couponCode, form
npx vitest run src/features/orders           # placeOrder với mã, đơn cũ
npx vitest run src/app/api                   # route coupons/validate, orders
npm run check && npm run format:check
npm run test:e2e                             # có đổi luồng mua hàng
```

Kỳ vọng: tất cả pass. Các ca biên bắt buộc có test: 299_999/300_000 (SHOPLITE10),
499_999/500_000 (GIAM50K), 1_000_000/1_000_010 (chạm trần 100_000), TET2026 lúc
`2026-02-28T23:59:59+07:00` (hợp lệ) và `2026-03-01T00:00:00+07:00` (hết hạn), subtotal 520_000
với SHOPLITE10 (vẫn miễn ship).

## 2. Kiểm tra API bằng curl

```bash
# Hợp lệ → 200, discount 10% có trần
curl -s -X POST localhost:3000/api/coupons/validate -H "Content-Type: application/json" \
  -d '{"code":" shoplite10 ","items":[{"productId":"p001","quantity":1}]}'

# Hết hạn → 422 COUPON_EXPIRED
curl -s -X POST localhost:3000/api/coupons/validate -H "Content-Type: application/json" \
  -d '{"code":"TET2026","items":[{"productId":"p001","quantity":1}]}'

# Gian lận: gửi kèm discount/total giả → đơn vẫn lưu số do server tính
curl -s -X POST localhost:3000/api/orders -H "Content-Type: application/json" -d '{
  "customer":{"fullName":"Nguyễn Văn A","phone":"0912345678","address":"12 Nguyễn Huệ, Quận 1, TP.HCM"},
  "shippingMethod":"standard","paymentMethod":"cod",
  "items":[{"productId":"p001","quantity":1}],
  "couponCode":"SHOPLITE10","discount":999999,"total":1}'
```

Chọn sản phẩm có giá phù hợp từ `src/data/products.ts` để thử ngưỡng 300.000/500.000.

## 3. Kiểm tra thủ công trên trình duyệt

1. Giỏ ~400.000 ₫ → thanh toán → nhập `shoplite10` → "Áp dụng": thấy dòng giảm 40.000 ₫, tổng mới.
2. Nhập `KHONGCO` → "Mã giảm giá không tồn tại", mã cũ vẫn giữ.
3. Nhập `TET2026` → "Mã giảm giá đã hết hạn".
4. Áp `GIAM50K` với giỏ 600.000 ₫ → về `/cart` xóa bớt còn < 500.000 ₫ → quay lại: "chưa đủ
   điều kiện", báo số tiền cần mua thêm; thêm lại hàng → tự giảm lại.
5. Đặt hàng với mã → trang chi tiết có dòng "Giảm giá (GIAM50K)" và tổng khớp lúc đặt.
6. Mở một đơn cũ (tạo trước tính năng) → hiển thị như trước, không có dòng giảm giá.
7. Chỉ dùng bàn phím: Tab tới ô mã, Enter để áp dụng; screen reader đọc được lỗi gắn với ô.

# Quickstart: kiểm chứng tính năng Mã giảm giá

Hướng dẫn chạy và kiểm tra; chi tiết hợp đồng xem [contracts/](./contracts/), dữ liệu xem
[data-model.md](./data-model.md).

## Chuẩn bị

```bash
npm install
npx playwright install chromium   # lần đầu
```

Sản phẩm dùng trong kịch bản (giá trong `src/data/products.ts`):

| id     | Tên ngắn            | Giá       |
| ------ | ------------------- | --------- |
| `p010` | (150.000 ₫)         | 150.000   |
| `p007` | (250.000 ₫)         | 250.000   |
| `p006` | Chuột SwiftClick    | 450.000   |
| `p003` | (2.450.000 ₫)       | 2.450.000 |

## 1. Kiểm tra tự động

```bash
npx vitest run src/features/coupons          # quy tắc mã: biên tối thiểu, mức tối đa, hết hạn, làm tròn
npx vitest run src/features/checkout         # pricing có discount, schema có couponCode
npx vitest run src/features/orders           # placeOrder: giảm giá, từ chối mã lỗi, bỏ qua số client
npx vitest run src/app/api                   # route /api/coupons/validate và /api/orders
npm run check                                # MUST pass
npm run test:e2e                             # MUST pass (đổi luồng đặt hàng)
```

## 2. Kiểm tra API bằng tay (`npm run dev`)

```bash
# Hợp lệ → 200, trả quy tắc của SHOPLITE10
curl -s -X POST localhost:3000/api/coupons/validate -H 'Content-Type: application/json' \
  -d '{"code":" shoplite10 "}'

# Hết hạn → 422 COUPON_EXPIRED
curl -s -X POST localhost:3000/api/coupons/validate -H 'Content-Type: application/json' \
  -d '{"code":"TET2026"}'

# Đặt hàng 2 × p006 (900.000) với SHOPLITE10, cố gửi total giả → 201, discount 90000, total 810000
curl -s -X POST localhost:3000/api/orders -H 'Content-Type: application/json' -d '{
  "customer": {"fullName":"Nguyễn Văn A","phone":"0912345678","address":"12 Nguyễn Huệ, Quận 1, TP.HCM"},
  "shippingMethod":"standard","paymentMethod":"cod",
  "items":[{"productId":"p006","quantity":2}],
  "couponCode":"shoplite10","discount":999999,"total":1}'

# GIAM50K với 1 × p006 (450.000) → 422 COUPON_MIN_SUBTOTAL_NOT_MET, cần mua thêm 50.000 ₫
```

Lưu ý: lệnh đặt hàng ghi vào `storage/orders.json` của máy dev — chỉ chạy khi chấp nhận dữ liệu thử.

## 3. Kiểm tra giao diện (`/checkout`)

| # | Giỏ hàng          | Thao tác                         | Kết quả mong đợi                                                   |
| - | ----------------- | -------------------------------- | ------------------------------------------------------------------ |
| 1 | 2 × p010 (300k)   | Áp dụng `SHOPLITE10`             | Giảm 30.000 ₫ (đúng biên tối thiểu), tổng 300k − 30k + 30k ship    |
| 2 | 1 × p003 (2,45tr) | Áp dụng `SHOPLITE10`             | Giảm 100.000 ₫ (mức tối đa)                                        |
| 3 | 1 × p006 (450k)   | Áp dụng `GIAM50K`                | Lỗi tại ô mã: cần mua thêm 50.000 ₫; tổng không đổi                |
| 4 | bất kỳ            | Áp dụng `TET2026`                | Lỗi "đã hết hạn"                                                   |
| 5 | bất kỳ            | Áp dụng `KHONGCO` / bấm khi trống | "không tồn tại" / "Vui lòng nhập mã giảm giá"                     |
| 6 | 2 × p006 (900k)   | `GIAM50K` → về giỏ bớt còn 1     | Mã "chưa đủ điều kiện, cần mua thêm 50.000 ₫"; tăng lại 2 → tự giảm 50k |
| 7 | như #6 (chưa đủ)  | Bấm "Đặt hàng"                   | Không tạo đơn; yêu cầu mua thêm hoặc gỡ mã                         |
| 8 | 2 × p006          | `SHOPLITE10` → "Gỡ mã" → `GIAM50K` | Chỉ còn GIAM50K, giảm 50k; ship vẫn miễn phí (xét trước giảm)    |
| 9 | 2 × p006 + mã     | Đặt hàng → mở chi tiết đơn       | Thấy mã và dòng "Giảm giá"; tổng khớp lúc đặt                      |
| 10 | —                | Mở một đơn cũ                    | Hiển thị bình thường, không có dòng giảm giá                       |

Kịch bản #6 cần đổi giỏ khi trang thanh toán đang mở ở tab khác (giỏ đồng bộ qua sự kiện
`storage`), hoặc giảm số lượng ở tab `/cart` rồi quay lại — khi quay lại cần áp dụng lại mã vì mã
không lưu cùng giỏ.

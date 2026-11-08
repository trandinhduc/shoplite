# Quickstart validation: Mã giảm giá khi thanh toán

## Prerequisites

```bash
npm install
```

Không cần database, dịch vụ ngoài hoặc dependency mới.

## Automated checks

```bash
npm run check
npx vitest run src/features/coupons src/features/checkout src/features/orders src/app/api/orders
npm run test:e2e
```

Nếu chạy E2E lần đầu, cài Chromium theo hướng dẫn README của project.

## Unit and integration scenarios

1. Tra mã không phân biệt hoa thường: `shoplite10` → `SHOPLITE10`.
2. `SHOPLITE10`: subtotal 300.000đ được giảm 30.000đ; subtotal đủ lớn bị cap
   ở 100.000đ.
3. `GIAM50K`: subtotal 499.999đ bị từ chối và báo cần thêm 1đ; subtotal
   500.000đ được giảm 50.000đ.
4. `TET2026`: ngày 28/02/2026 theo `Asia/Ho_Chi_Minh` còn hợp lệ; ngày
   01/03/2026 hết hạn.
5. Fixed discount không làm subtotal sau giảm âm; giảm phần trăm làm tròn xuống
   đến đồng Việt Nam.
6. `calculateOrderTotals` tính `subtotal - discount + shippingFee`; phí ship
   không dùng để đạt minimum và không bị giảm.
7. POST orders bỏ qua discount amount/total giả mạo, tự lấy giá catalog và tính
   lại mã.
8. POST orders trả lỗi phân biệt mã không tồn tại, hết hạn và chưa đủ minimum.
9. Order mới lưu code/discount; order cũ thiếu field vẫn đọc và render bình thường.

## Component scenarios

1. Checkout hiển thị input có label, nút “Áp dụng”, thông báo lỗi tiếng Việt theo
   trạng thái và dòng giảm giá trong summary.
2. Áp dụng mã hợp lệ cập nhật số tiền giảm/tổng tiền ngay, không gọi network
   preview; gỡ mã trả summary về trạng thái không giảm.
3. Đổi giỏ hàng hoặc phương thức giao hàng tính lại preview; mã mất điều kiện
   bị gỡ với lý do rõ ràng.
4. Submit gửi `couponCode` nhưng không gửi discount amount/total; lỗi server
   hiển thị ở form và không xóa dữ liệu giỏ hàng.
5. Order detail chỉ hiển thị dòng mã/giảm khi order có dữ liệu giảm; order cũ
   vẫn hiển thị subtotal, ship và total như trước.

## Manual smoke flow

1. Mở `/products`, thêm `p006` số lượng 1 rồi vào `/checkout`.
2. Nhập `shoplite10`, bấm “Áp dụng”; xác nhận mã được chuẩn hóa, giảm giá và
   tổng tiền cập nhật.
3. Gỡ mã, xác nhận tổng tiền ban đầu trở lại; áp dụng lại rồi đặt đơn.
4. Mở chi tiết đơn và xác nhận thấy `SHOPLITE10`, số tiền giảm và tổng sau giảm.
5. Thử `GIAM50K` với subtotal dưới 500.000đ và `TET2026` sau ngày hết hạn;
   xác nhận thông báo tiếng Việt và không có discount.
6. Kiểm tra viewport 390px và điều hướng bằng label/role trên form.

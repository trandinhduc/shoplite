# Quickstart: Hướng dẫn Kiểm thử Tính năng Mã giảm giá (Coupon Code)

Tài liệu này cung cấp các kịch bản kiểm thử thủ công và tự động từ đầu đến cuối (End-to-End Validation Scenarios) nhằm chứng minh tính năng mã giảm giá hoạt động chính xác theo đúng đặc tả yêu cầu và hợp đồng API.

---

## 1. Chuẩn bị môi trường (Prerequisites)

1. Máy chủ phát triển ShopLite đang chạy:
   ```bash
   npm run dev
   # Ứng dụng chạy tại http://localhost:3000
   ```
2. Đảm bảo toàn bộ bài kiểm tra tĩnh và unit tests vượt qua:
   ```bash
   npm run check
   ```

---

## 2. Các Kịch bản Kiểm thử Nghiệp vụ (Validation Scenarios)

### Kịch bản 1: Áp dụng mã phần trăm có mức giảm tối đa (`SHOPLITE10`)

- **Mục tiêu**: Kiểm tra tính toán giảm 10% nhưng bị chặn ở mức trần tối đa 100.000 ₫ cho đơn hàng lớn.
- **Các bước thực hiện**:
  1. Truy cập `http://localhost:3000/products/tai-nghe-khong-day-soundmax-pro`.
  2. Bấm "Thêm vào giỏ hàng" (sản phẩm có giá 1.290.000 ₫).
  3. Mở giỏ hàng và chuyển tới trang thanh toán `/checkout`.
  4. Tại ô "Mã giảm giá", nhập `SHOPLITE10` và bấm "Áp dụng".
- **Kết quả mong đợi**:
  - Dòng "Giảm giá (SHOPLITE10)" xuất hiện hiển thị `-100.000 ₫` (thay vì 129.000 ₫ vì trần tối đa là 100.000 ₫).
  - Phí giao hàng: "Miễn phí" (do tạm tính 1.290.000 ₫ $\ge$ 500.000 ₫).
  - Tổng thanh toán: đúng `1.190.000 ₫`.

---

### Kịch bản 2: Áp dụng mã giảm tiền cố định (`GIAM50K`)

- **Mục tiêu**: Kiểm tra mã giảm tiền cố định 50.000 ₫ cho đơn từ 500.000 ₫.
- **Các bước thực hiện**:
  1. Thêm sản phẩm "Loa Bluetooth BeatBox Mini" (giá 690.000 ₫) vào giỏ hàng.
  2. Đi tới trang thanh toán `/checkout`.
  3. Nhập mã `GIAM50K` và bấm "Áp dụng".
- **Kết quả mong đợi**:
  - Dòng "Giảm giá (GIAM50K)" hiển thị `-50.000 ₫`.
  - Phí giao hàng: "Miễn phí" (ngưỡng freeship 500.000 ₫ tính trên tạm tính trước giảm 690.000 ₫).
  - Tổng thanh toán: đúng `640.000 ₫`.

---

### Kịch bản 3: Gỡ bỏ mã giảm giá đã áp dụng

- **Mục tiêu**: Xác nhận khách hàng có thể hủy áp dụng mã để trở về trạng thái đơn hàng ban đầu.
- **Các bước thực hiện**:
  1. Khi mã `GIAM50K` đang được áp dụng, bấm nút "Gỡ bỏ" (hoặc "Gỡ") bên cạnh mã.
- **Kết quả mong đợi**:
  - Dòng giảm giá biến mất.
  - Tổng thanh toán trở lại `690.000 ₫`.
  - Ô nhập mã trở về trạng thái trống, sẵn sàng nhập mã mới.

---

### Kịch bản 4: Xử lý thông báo lỗi (Mã không tồn tại / Hết hạn / Chưa đủ tối thiểu)

- **Các bước thực hiện & Kết quả mong đợi**:
  1. **Mã không tồn tại**: Nhập `KHONGTONTAI` $\rightarrow$ Thông báo lỗi màu đỏ: *"Mã giảm giá không tồn tại"*.
  2. **Mã hết hạn**: Nhập `TET2026` (hạn dùng 28/02/2026) $\rightarrow$ Thông báo lỗi: *"Mã giảm giá đã hết hạn sử dụng"*.
  3. **Chưa đủ giá trị tối thiểu**: Thêm 1 sản phẩm 200.000 ₫ vào giỏ hàng, nhập `SHOPLITE10` (đòi hỏi đơn từ 300.000 ₫) $\rightarrow$ Thông báo lỗi: *"Đơn hàng chưa đạt giá trị tối thiểu 300.000 ₫ (cần mua thêm 100.000 ₫)"*.

---

### Kịch bản 5: Mã hết hạn tại thời điểm bấm Đặt hàng (Server Rejection)

- **Mục tiêu**: Chứng minh server từ chối tạo đơn và giao diện chuyển mã sang trạng thái `[đã hết hạn]`, yêu cầu khách tự gỡ mã.
- **Các bước thực hiện**:
  1. Giả lập một phiên thanh toán có mã giảm giá bị hết hạn ngay trước khi bấm "Đặt hàng".
  2. Bấm nút "Đặt hàng".
- **Kết quả mong đợi**:
  - Đơn hàng KHÔNG được tạo.
  - Trên màn hình checkout, mã vẫn nằm trong ô nhưng hiển thị trạng thái `[đã hết hạn]`.
  - Nút "Đặt hàng" bị khóa cho đến khi khách hàng bấm "Gỡ mã".

---

### Kịch bản 6: Lưu đơn hàng và hiển thị trên trang chi tiết `/orders/[id]`

- **Mục tiêu**: Xác nhận mã và số tiền giảm được lưu vĩnh viễn vào đơn hàng.
- **Các bước thực hiện**:
  1. Hoàn tất đặt hàng với mã `SHOPLITE10`.
  2. Trình duyệt chuyển hướng đến `/orders/SL-XXXXXXXX-XXXXXX?placed=1`.
- **Kết quả mong đợi**:
  - Phần tóm tắt thanh toán hiển thị rõ ràng dòng *"Giảm giá (SHOPLITE10): -100.000 ₫"*.
  - Tổng cộng khớp chính xác với số tiền hiển thị ở trang checkout.

---

### Kịch bản 7: Tương thích ngược với đơn hàng cũ (Legacy Orders)

- **Mục tiêu**: Đảm bảo các đơn hàng đã tạo từ trước (không có trường `couponCode` hay `discount`) không bị lỗi hiển thị.
- **Các bước thực hiện**:
  1. Mở trang danh sách đơn hàng `/orders` hoặc xem chi tiết một đơn hàng cũ trong hệ thống.
- **Kết quả mong đợi**:
  - Trang hiển thị trơn tru, không có dòng giảm giá, không xuất hiện `NaN ₫` hay `undefined`, và không có lỗi console.

---

### Kịch bản 8: Chống gian lận phía máy chủ (Anti-Fraud Server-Authoritative)

- **Mục tiêu**: Xác thực rằng server tính lại toàn bộ tiền và không thể bị gian lận qua API.
- **Kiểm thử bằng lệnh curl**:
  ```bash
  curl -X POST http://localhost:3000/api/orders \
    -H "Content-Type: application/json" \
    -d '{
      "customer": {
        "fullName": "Test Fraud",
        "phone": "0912345678",
        "address": "123 Đường Test, Quận 1, TP. Hồ Chí Minh"
      },
      "shippingMethod": "standard",
      "paymentMethod": "cod",
      "items": [{ "productId": "p001", "quantity": 1 }],
      "couponCode": "SHOPLITE10",
      "discount": 500000,
      "total": 790000
    }'
  ```
- **Kết quả mong đợi**:
  - Server hoàn toàn phớt lờ số tiền `discount: 500000` và `total: 790000` mà client cố tình gửi lên.
  - Bản ghi đơn hàng trả về có `discount: 100000` và `total: 1190000` theo đúng công thức tính toán độc lập của catalog.


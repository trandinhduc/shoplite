# Research: Mã giảm giá khi thanh toán

## Decision 1: Dùng dữ liệu tĩnh trong `src/data/`

- **Decision**: Tạo `src/data/coupons.ts` chứa ba mã ban đầu và metadata cần cho
  việc tính giảm.
- **Rationale**: Phạm vi không có quản trị mã, lượt sử dụng hoặc phân nhóm khách;
  cách này nhất quán với catalog tĩnh và không cần database.
- **Alternatives considered**: Database hoặc file runtime có thể hỗ trợ chỉnh sửa
  động nhưng vượt phạm vi và tạo migration/đồng bộ không cần thiết.

## Decision 2: Một logic thuần dùng cho client và server

- **Decision**: Đặt lookup, chuẩn hóa, kiểm tra điều kiện và tính discount trong
  `src/features/coupons/`; `pricing.ts` gọi logic này khi dựng order totals.
- **Rationale**: Client phản hồi ngay không cần gọi mạng; server có thể gọi lại
  cùng hàm sau khi lấy giá catalog, giảm nguy cơ hai phía tính khác nhau.
- **Alternatives considered**: Endpoint preview coupon riêng sẽ thêm round-trip
  và route mới; chỉ tính ở client không đáp ứng yêu cầu chống gian lận.

## Decision 3: Payload chỉ gửi mã

- **Decision**: Mở rộng schema POST orders bằng `couponCode` optional; không nhận
  discount amount, subtotal hoặc total do client gửi.
- **Rationale**: Giữ request nhỏ và làm rõ server là nguồn sự thật; client chỉ
  gửi ý định chọn mã.
- **Alternatives considered**: Gửi toàn bộ preview totals sẽ tăng bề mặt gian lận
  và vẫn phải bỏ qua các giá trị đó ở server.

## Decision 4: Quy tắc ngày hết hạn theo ngày lịch Việt Nam

- **Decision**: Mã lưu ngày hết hạn dạng `YYYY-MM-DD`, so sánh ngày hiện tại theo
  múi giờ `Asia/Ho_Chi_Minh`; mã còn hiệu lực hết ngày hết hạn.
- **Rationale**: Phù hợp người dùng ShopLite tại Việt Nam và tránh phụ thuộc múi
  giờ máy khách; dễ test tại các mốc 00:00 và 23:59.
- **Alternatives considered**: UTC hoặc thời điểm đầu ngày sẽ gây bất ngờ cho
  chương trình ghi rõ “hết hạn ngày 28/02/2026”.

## Decision 5: Tương thích dữ liệu đơn hàng cũ không migration

- **Decision**: `discountCode` và `discountAmount` là optional khi đọc/render
  Order; đơn mới có mã lưu hai giá trị, đơn không mã có discount amount bằng 0
  trong tính toán nhưng không bắt buộc ghi field, đơn cũ vẫn dùng totals cũ.
- **Rationale**: Không sửa dữ liệu runtime hoặc cần migration; UI chỉ hiển thị
  dòng giảm khi có discount hợp lệ.
- **Alternatives considered**: Migration toàn bộ dữ liệu cũ làm tăng rủi ro và
  không tạo giá trị cho feature.

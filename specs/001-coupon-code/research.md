# Research & Technical Decisions: Mã giảm giá (Coupon Code)

Tài liệu này ghi nhận các quyết định kiến trúc và kỹ thuật chính (Phase 0) để hiện thực hóa tính năng mã giảm giá cho ShopLite, giải quyết toàn bộ các yêu cầu nghiệp vụ và đảm bảo tuân thủ tuyệt đối Constitution.

---

## 1. Lưu trữ danh mục mã giảm giá (Coupon Catalog Storage)

- **Decision**: Sử dụng mảng dữ liệu tĩnh (static in-memory array) tại `src/data/coupons.ts` với kiểu dữ liệu `Coupon[]`, tương tự như cách lưu trữ danh mục sản phẩm tại `src/data/products.ts`.
- **Rationale**:
  - Tuân thủ nguyên tắc IV (Đơn giản trước - Simplicity & YAGNI First) trong Constitution: ShopLite là ứng dụng học tập, không dùng cơ sở dữ liệu ngoài.
  - Phù hợp hoàn toàn với phạm vi Out of Scope của spec (chưa cần giao diện Admin tạo/sửa/xóa mã động).
  - Cho phép import trực tiếp và an toàn cả trên server (API routes, order service) lẫn trong unit test mà không phát sinh độ trễ I/O hoặc rủi ro đọc file.
- **Alternatives considered**:
  - *Lưu trong file JSON `storage/coupons.json`:* Bị từ chối vì làm tăng độ phức tạp đọc/ghi bất đồng bộ không cần thiết và dễ gặp lỗi race condition khi đọc file tĩnh.
  - *Tích hợp SQLite / PostgreSQL:* Bị từ chối vì vi phạm trực tiếp Hiến pháp dự án (không thêm database nếu không có lý do cấp thiết).

---

## 2. Kiểm tra mã giảm giá phía Client và Server (Client Validation vs Server Authorization)

- **Decision**: Kết hợp hai tầng:
  1. **Tầng Client / API kiểm tra nhanh:** Cung cấp endpoint mỏng `POST /api/coupons/validate` (nhận `code` và `subtotal`), đồng thời sử dụng hàm thuần `validateCoupon` từ `src/features/coupons/coupon-service.ts`. Khi người dùng bấm "Áp dụng", client gọi API để nhận kết quả xác thực tức thì và tính toán số tiền giảm để hiển thị trước (preview).
  2. **Tầng Server bắt buộc (Server-Authoritative Pricing):** Khi người dùng bấm "Đặt hàng", client chỉ gửi `{ couponCode: string }` trong payload `POST /api/orders`. Phía server gọi `orderService.placeOrder` độc lập kiểm tra lại mã, hạn sử dụng, và tự tính lại số tiền giảm từ catalog gốc.
- **Rationale**:
  - Đáp ứng yêu cầu: "Client cần kiểm tra mã trước khi đặt hàng để hiển thị ngay số tiền giảm".
  - Đáp ứng nguyên tắc III (Server-Authoritative Pricing) của Constitution: Tuyệt đối không nhận số tiền giảm giá hay tổng tiền từ client gửi lên để ngăn chặn mọi hành vi can thiệp hoặc gian lận giá qua DevTools / curl.
- **Alternatives considered**:
  - *Chỉ kiểm tra thuần ở client không qua API:* Tuy nhanh nhưng không kiểm tra được tính nhất quán với múi giờ server hoặc logic server sau này, và thiếu một API contract chuẩn mực.
  - *Gửi số tiền giảm từ client lên khi đặt hàng:* Bị từ chối vì vi phạm nguyên tắc bảo mật tài chính tối cao của dự án.

---

## 3. Kiến trúc Module Tính tiền dùng chung (Shared Pure Pricing Engine)

- **Decision**: Đặt toàn bộ logic xác thực quy tắc mã giảm giá và tính toán số tiền khấu trừ vào hàm thuần (pure function) trong module `src/features/coupons/coupon-service.ts`. Hàm `calculateOrderTotals` trong `src/features/checkout/pricing.ts` được mở rộng để nhận tham số tùy chọn `coupon?: AppliedCoupon | null`.
- **Rationale**:
  - Đảm bảo logic tính toán chỉ viết duy nhất một nơi (DRY), tái sử dụng cho cả trang giỏ hàng/thanh toán phía client lẫn luồng xử lý đơn hàng phía server.
  - Hàm thuần nhận dữ liệu đầu vào là các giá trị số và trả về kết quả số, cực kỳ dễ dàng viết unit test kiểm tra độc lập và bao phủ 100% các giá trị biên.
  - Tách bạch rõ ranh giới nghiệp vụ: module `coupons` chỉ lo nghiệp vụ mã ưu đãi; module `checkout` quản lý quy tắc tổng thể giỏ hàng và phí ship.
- **Alternatives considered**:
  - *Viết logic tính giảm giá trực tiếp bên trong component React:* Bị từ chối vì vi phạm nguyên tắc mã nguồn sạch (Separation of Concerns) và không tái sử dụng được ở server API.
  - *Viết 2 hàm tính giảm giá riêng biệt cho client và server:* Bị từ chối vì nguy cơ lệch pha (drift) logic nghiệp vụ giữa 2 bên.

---

## 4. Xử lý Mã hết hạn tại thời điểm Bấm Đặt Hàng (Expiration at Order Placement)

- **Decision**: Theo thống nhất với người dùng tại vòng clarify:
  1. Server từ chối tạo đơn hàng (không lưu vào `storage/orders.json`), trả về mã lỗi `COUPON_EXPIRED` kèm HTTP 422/400.
  2. Giao diện trang thanh toán giữ nguyên mã trong ô nhập nhưng hiển thị nhãn/trạng thái lỗi `[đã hết hạn]`.
  3. Nút "Đặt hàng" bị vô hiệu hóa; khách hàng bắt buộc phải bấm nút "Gỡ mã" (hoặc nhập mã khác hợp lệ) mới có thể kích hoạt lại nút "Đặt hàng".
- **Rationale**:
  - Tránh tình trạng khách hàng bị trừ tiền theo giá gốc ngoài ý muốn (tạo cảm giác bị "lừa" nếu hệ thống tự ý bỏ mã rồi tạo đơn giá cao hơn).
  - Minh bạch trạng thái lỗi và trao quyền quyết định xử lý rõ ràng cho người mua.
- **Alternatives considered**:
  - *Tự động bỏ mã và âm thầm tạo đơn giá gốc:* Bị từ chối vì gây trải nghiệm tiêu cực cho khách hàng.

---

## 5. Xử lý Thay đổi Giỏ hàng làm Tụt Tạm tính Dưới Ngưỡng Tối thiểu

- **Decision**:
  - Khi khách hàng quay lại trang thanh toán sau khi đã xóa bớt sản phẩm trong giỏ hàng khiến `subtotal < coupon.minOrderValue`: Hệ thống tự động hủy áp dụng mã giảm giá.
  - Hiển thị thông báo giải thích rõ lý do: `"Mã [CODE] đã bị hủy do đơn hàng chưa đạt giá trị tối thiểu [X] ₫ (cần mua thêm [Y] ₫)"`.
  - Cập nhật lại tổng thanh toán không giảm giá.
- **Rationale**:
  - Trải nghiệm mượt mà, khách hàng không bị chặn đơn oan uổng mà biết chính xác cần mua thêm bao nhiêu tiền nếu muốn tiếp tục sử dụng mã khuyến mãi.
- **Alternatives considered**:
  - *Chặn đặt hàng và ép khách tự bấm nút gỡ:* Khiến luồng thanh toán bị nghẽn không cần thiết khi giỏ hàng đã thay đổi rõ rệt.

---

## 6. Tương thích Ngược với Đơn hàng Cũ (Legacy Orders Compatibility)

- **Decision**: Trong kiểu dữ liệu `Order` (`src/features/orders/types.ts`), các trường liên quan đến mã giảm giá được khai báo dưới dạng tùy chọn (optional):
  ```typescript
  export interface Order {
    // ... các trường hiện tại
    couponCode?: string;
    discount?: number;
  }
  ```
  Tại trang chi tiết đơn hàng (`src/app/orders/[id]/page.tsx`), dòng giảm giá chỉ render khi `order.discount !== undefined && order.discount > 0`.
- **Rationale**:
  - Đảm bảo các đơn hàng đã tạo trước đó trong `storage/orders.json` (hoặc dữ liệu đơn hàng seed trong test) không có trường `couponCode` hay `discount` vẫn được hiển thị trơn tru, không gây lỗi runtime hoặc crash trang.
  - Không đòi hỏi migration dữ liệu phức tạp cho các bản ghi cũ.
- **Alternatives considered**:
  - *Chạy script cập nhật lại toàn bộ `storage/orders.json` gán `discount: 0`:* Bị từ chối vì vi phạm YAGNI, tiềm ẩn nguy cơ làm hỏng file dữ liệu đơn hàng đang có.


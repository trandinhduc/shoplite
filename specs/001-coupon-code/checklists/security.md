# Security & Anti-Fraud Checklist: Mã giảm giá (Coupon Code)

**Purpose**: Thẩm định các yêu cầu bảo mật, ngăn chặn gian lận tiền tệ, kiểm soát tính hợp lệ của dữ liệu đầu vào và đảm bảo nguyên tắc Server-Authoritative Pricing.  
**Created**: 2026-11-08  
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [contracts/orders-post.md](../contracts/orders-post.md)  

## 1. Tính toàn vẹn giá & Chống gian lận (Server-Authoritative Pricing)

- [x] CHK001 Phía client tuyệt đối không gửi số tiền giảm (`discountAmount`) hoặc tổng thanh toán (`total`) lên endpoint `POST /api/orders`; server tự tính lại 100% từ catalog gốc.
- [x] CHK002 Server tự động tra cứu mã coupon từ `src/data/coupons.ts` và tính toán lại số tiền giảm; từ chối hoặc bỏ qua mọi giá trị giảm do client cố tình gửi kèm trong payload.
- [x] CHK003 Số tiền giảm giá được giới hạn trần (`maxDiscount`) đối với mã % và không bao giờ vượt quá tạm tính tiền hàng (`discount <= subtotal`).
- [x] CHK004 Giảm giá chỉ trừ vào tiền hàng, tuyệt đối không được trừ vào phí vận chuyển.

## 2. Kiểm soát điều kiện & Hạn sử dụng (Lifecycle & Expiration Protection)

- [x] CHK005 Server kiểm tra lại hạn sử dụng của mã tại thời điểm tạo đơn hàng (now); từ chối tạo đơn nếu mã đã hết hạn giữa lúc xem và lúc bấm đặt hàng.
- [x] CHK006 Khi server từ chối vì mã hết hạn, hệ thống trả về mã lỗi `COUPON_EXPIRED` và không tạo bất kỳ bản ghi đơn hàng nào vào `storage/orders.json`.
- [x] CHK007 Server kiểm tra lại điều kiện giá trị đơn hàng tối thiểu (`minOrderValue`) dựa trên tạm tính thực tế do server tính toán lại.

## 3. Xác thực dữ liệu đầu vào (Input Sanitization & Schema Validation)

- [x] CHK008 Input `couponCode` được validate bằng Zod (chuỗi string, giới hạn độ dài tối đa 30 ký tự, tự động `.trim()`).
- [x] CHK009 Mã coupon tự động được chuẩn hóa sang chữ in hoa (`.toUpperCase()`) trước khi tra cứu, ngăn chặn lỗi bypass do khác biệt chữ hoa/thường.
- [x] CHK010 Endpoint `POST /api/coupons/validate` xác thực dữ liệu đầu vào và chỉ trả về thông tin công khai cần thiết của coupon, không để lộ thông tin nhạy cảm.

## 4. Tương thích ngược & Khả năng phục hồi (Backward Compatibility & Resilience)

- [x] CHK011 Kiểu dữ liệu `Order` khai báo `couponCode?: string` và `discount?: number` là trường tùy chọn, đảm bảo các đơn hàng cũ trong `storage/orders.json` không bị lỗi.
- [x] CHK012 Trang chi tiết đơn hàng kiểm tra an toàn `order.discount !== undefined && order.discount > 0` trước khi render dòng giảm giá, ngăn chặn crash hoặc hiển thị `NaN ₫`.

## Notes
- Toàn bộ 12 tiêu chí bảo mật và chống gian lận đã được thẩm định và thỏa mãn trong tài liệu đặc tả, kế hoạch triển khai và hợp đồng API.


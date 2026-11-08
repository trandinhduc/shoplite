# Research: Mã giảm giá khi thanh toán

Mọi quyết định dưới đây dùng stack hiện có, không thêm dependency hay database (nguyên tắc IV).

## R1. Nơi lưu danh sách mã

- **Decision**: Mảng tĩnh `coupons` trong `src/data/coupons.ts`, giống `src/data/products.ts`.
- **Rationale**: Spec loại trừ trang quản trị; 3 mã cố định. Dữ liệu tĩnh đọc được đồng bộ, test
  không cần mock I/O.
- **Alternatives considered**: File JSON trong `storage/` (cần repository + I/O, không có lợi ích vì
  không ai sửa mã lúc chạy); database (vi phạm nguyên tắc IV).

## R2. Client kiểm tra mã bằng cách nào

- **Decision**: Thêm `POST /api/coupons/validate`. Client gửi mã + `items` (`productId`, `quantity`);
  server tra mã, tính tạm tính từ catalog và trả về quy tắc của đúng mã đó kèm số tiền giảm. Sau đó
  client tự tính lại khi giỏ hàng đổi bằng cùng hàm thuần (`coupon-rules.ts`), không gọi API thêm.
- **Rationale**: Nếu client import `src/data/coupons.ts`, toàn bộ danh sách mã (kể cả mã chưa công
  bố) lộ trong bundle JS. API chỉ trả quy tắc của mã khách đã biết. Tính lại phía client theo quy tắc
  đó đáp ứng FR-006/FR-016 tức thì; server vẫn kiểm tra lại khi đặt hàng (FR-010, nguyên tắc III).
- **Alternatives considered**: Kiểm tra hoàn toàn phía client (lộ mã); gọi API mỗi lần giỏ hàng đổi
  (thêm độ trễ và request, không tăng độ an toàn vì server kiểm tra lại khi đặt hàng); Server Action
  (dự án chưa dùng, Route Handler là pattern sẵn có).

## R3. Tách logic dùng chung client/server

- **Decision**: `src/features/coupons/coupon-rules.ts` chứa kiểu và hàm thuần
  (`normalizeCouponCode`, `isCouponExpired`, `calculateCouponDiscount`, `checkCouponEligibility`),
  không import dữ liệu. `coupon-service.ts` (chỉ server) import `src/data/coupons.ts` và gọi rules.
- **Rationale**: Client Component chỉ import `coupon-rules.ts`, nên dữ liệu mã không vào bundle.
  Giống cách `pricing.ts` được dùng chung.
- **Alternatives considered**: Package `server-only` để chặn import nhầm (thêm dependency - bỏ; quy
  ước được ghi trong plan và kiểm tra khi review).

## R4. Tích hợp với `pricing.ts` và ngưỡng miễn phí ship

- **Decision**: `calculateOrderTotals(lines, method, discount = 0)` trả thêm `discount`; phí ship tính
  bằng `calculateShippingFee(subtotal - discount, method)`; `total = subtotal - discount + shippingFee`.
  Số tiền giảm được kẹp trong `[0, subtotal]`.
- **Rationale**: FR-017 (ngưỡng so với tạm tính sau giảm), FR-005 (không trừ vào phí ship). Tham số
  mặc định `0` giữ nguyên kết quả của mọi chỗ gọi hiện có và đơn không dùng mã.
- **Alternatives considered**: Hàm mới riêng cho đơn có mã (hai nguồn tính tiền, vi phạm nguyên tắc III).

## R5. Ngày hết hạn và múi giờ

- **Decision**: Lưu `expiresOn` dạng `"YYYY-MM-DD"`; mã hết hạn khi
  `now > new Date(`${expiresOn}T23:59:59.999+07:00`)`. `now` được inject vào service để test cố định.
- **Rationale**: Assumption của spec: dùng được đến hết 23:59:59 ngày hết hạn, giờ Việt Nam. `Date`
  với offset `+07:00` đủ dùng, không cần thư viện ngày (`dayjs` đã cài nhưng không cần cho tính năng này).
- **Alternatives considered**: `dayjs` + plugin timezone (thêm plugin, không cần cho một phép so sánh).

## R6. Mã lỗi và HTTP status

- **Decision**: Thêm vào `OrderErrorCode`: `COUPON_NOT_FOUND` (422), `COUPON_EXPIRED` (422),
  `COUPON_MIN_ORDER_NOT_MET` (422, `details`: `minOrderValue`, `amountNeeded` dạng chuỗi số). Cả
  `/api/coupons/validate` và `POST /api/orders` dùng chung qua `handleRouteError`.
- **Rationale**: Tái dùng định dạng lỗi `{ error: { code, message, details? } }` và `toFieldErrors`
  sẵn có; 422 giống `PRODUCT_NOT_FOUND` (input đúng cú pháp nhưng không xử lý được).
  `details` hiện là `Record<string, string>` nên số được truyền dạng chuỗi.
- **Alternatives considered**: Lớp lỗi `CouponError` riêng (phải sửa `handleRouteError`, thêm một kiểu
  lỗi cho cùng một luồng thanh toán).

## R7. Giữ mã đã áp dụng phía client (FR-018)

- **Decision**: Store nhỏ `coupon-store.ts` theo đúng pattern `cart-store.ts` (localStorage key
  `shoplite:coupon`, `useSyncExternalStore`), lưu `{ code, rule }` trả về từ API. Khi trang thanh toán
  hiển thị, gọi lại `/api/coupons/validate` một lần; khi giỏ hàng đổi, tính lại bằng `coupon-rules`.
  Mã bị xóa khi khách gỡ, khi tự gỡ (FR-016/FR-018) và khi đặt hàng thành công.
- **Rationale**: Nhất quán với giỏ hàng (đã lưu localStorage), đồng bộ giữa tab bằng sự kiện `storage`.
- **Alternatives considered**: `sessionStorage` (mất khi đóng tab - không đúng câu trả lời đã chốt);
  lưu trong state React (mất khi tải lại).

## R8. Đơn hàng cũ không có trường giảm giá

- **Decision**: `Order` thêm `couponCode?: string` và `discount?: number` (tùy chọn). Hiển thị dùng
  `order.discount ?? 0`; dòng giảm giá chỉ hiện khi `> 0`. Không migrate `storage/orders.json`.
- **Rationale**: `storage/orders.json` hiện có 1 đơn chỉ có `subtotal`, `shippingFee`, `total`; đơn cũ
  đã có `total` đúng nên không cần tính lại. Không cần script migrate.
- **Alternatives considered**: Migrate file khi khởi động (thêm rủi ro ghi dữ liệu thật, không cần thiết).

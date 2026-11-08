# Proposal

## Why

Khách thường xem nhiều sản phẩm nhưng chưa mua ngay. Hiện chỉ có giỏ hàng để "để dành", nên họ phải bỏ tạm sản phẩm vào giỏ, làm sai số lượng và tạm tính của giỏ. Cần một danh sách yêu thích riêng để khách lưu lại, quay lại so sánh và mua sau.

## What Changes

- Thêm nút trái tim (bật/tắt) trên thẻ sản phẩm (`ProductCard`) và ở trang chi tiết sản phẩm. Trạng thái "đã thích" nhìn thấy rõ (không chỉ dựa vào màu) và đọc được bằng screen reader.
- Thêm biểu tượng trái tim kèm số lượng sản phẩm yêu thích vào header, bấm vào mở trang `/wishlist`.
- Thêm trang `/wishlist`: liệt kê sản phẩm đã thích với giá và tồn kho mới nhất, mỗi sản phẩm có nút bỏ thích và nút thêm vào giỏ; có trạng thái trống mời khách khám phá sản phẩm.
- Lưu danh sách ngay trên trình duyệt (localStorage, không cần đăng nhập), giữ nguyên khi tải lại trang và đồng bộ giữa các tab đang mở.
- Giới hạn tối đa 50 sản phẩm; khi đầy thì báo cho khách biết.
- Sản phẩm hết hàng vẫn nằm trong danh sách, hiển thị "Hết hàng" và không thêm vào giỏ được.
- Thêm endpoint đọc `GET /api/products/by-ids?ids=...` để trang `/wishlist` lấy giá và tồn kho hiện hành từ catalog (danh sách chỉ lưu `productId`, không lưu ảnh chụp giá/tồn kho như giỏ hàng).

Ngoài phạm vi: lưu wishlist lên server, chia sẻ wishlist, thông báo khi sản phẩm có hàng trở lại. Wishlist không ảnh hưởng tới giỏ hàng, giá, phí ship, mã giảm giá hay luồng đặt hàng.

## Capabilities

### New Capabilities

- `wishlist`: quản lý danh sách yêu thích phía trình duyệt: thêm/bỏ sản phẩm bằng nút trái tim ở thẻ sản phẩm và trang chi tiết, chỉ báo số lượng ở header, giới hạn 50 sản phẩm, lưu trong localStorage và đồng bộ giữa các tab.
- `wishlist-page`: trang `/wishlist` hiển thị sản phẩm đã thích với giá và tồn kho mới nhất (nút bỏ thích, thêm vào giỏ, trạng thái hết hàng, trạng thái trống) và endpoint `GET /api/products/by-ids` phục vụ trang này.

### Modified Capabilities

<!-- Không có: `openspec/specs/` hiện chưa có spec nào. Hành vi giỏ hàng, catalog và checkout giữ nguyên. -->

## Impact

- **Code mới**: `src/features/wishlist/` (store, hook, nút trái tim, chỉ báo header, view trang yêu thích, test cạnh file); `src/app/wishlist/page.tsx` (page mỏng); `src/app/api/products/by-ids/route.ts` (+ test); `getProductsByIds` trong `src/features/catalog/catalog-service.ts`.
- **Code sửa**: `ProductCard` (thêm nút trái tim), `src/app/products/[slug]/page.tsx` (nút trái tim), `src/components/layout/header.tsx` (chỉ báo yêu thích cạnh giỏ hàng).
- **Tests**: unit/component test cho store, nút, header, view; test route cả nhánh lỗi; thêm 1 kịch bản e2e trong `e2e/` (`data-testid` mới: `wishlist-count`, `wishlist-item`).
- **Docs**: cập nhật `AGENTS.md` (codemap, luồng, quy tắc giới hạn 50) và `README.md`.
- **Không đổi**: dữ liệu `src/data/`, schema đơn hàng, `pricing.ts`, API đơn hàng/mã giảm giá, không thêm dependency.

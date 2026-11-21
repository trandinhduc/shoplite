# Feature brief - Danh sách yêu thích (Wishlist)

## Nội dung để dán vào /opsx:propose

```text
Thêm tính năng Danh sách yêu thích (wishlist) cho ShopLite.

Vì sao: khách thường xem nhiều sản phẩm nhưng chưa mua ngay; họ cần một chỗ lưu lại để quay lại so sánh
và mua sau, thay vì bỏ tạm vào giỏ hàng.

Yêu cầu:
- Nút trái tim trên thẻ sản phẩm (ProductCard) và ở trang chi tiết sản phẩm để thêm/bỏ sản phẩm khỏi
  danh sách yêu thích (bấm lần nữa để bỏ). Trạng thái "đã thích" phải nhìn thấy rõ và đọc được bằng
  screen reader.
- Header có biểu tượng trái tim kèm số lượng sản phẩm yêu thích; bấm vào mở trang /wishlist.
- Trang /wishlist liệt kê các sản phẩm đã thích (giá và tồn kho luôn là số liệu mới nhất), mỗi sản phẩm có
  nút bỏ thích và nút thêm vào giỏ; có trạng thái trống với lời mời khám phá sản phẩm.
- Danh sách lưu ngay trên trình duyệt, không cần đăng nhập; giữ nguyên khi tải lại trang và đồng bộ giữa
  các tab đang mở.
- Tối đa 50 sản phẩm; khi đầy thì báo cho khách biết.
- Sản phẩm hết hàng vẫn nằm trong danh sách nhưng hiển thị "Hết hàng" và không thêm vào giỏ được.

Ngoài phạm vi: lưu wishlist lên server, chia sẻ wishlist, thông báo khi sản phẩm có hàng trở lại.
```

## Ghi chú cho giảng viên

Những điểm nên xuất hiện trong design/explore (nếu không, gợi ý sinh viên hỏi agent):

| Chủ đề        | Kỳ vọng                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pattern       | Tái sử dụng pattern giỏ hàng: reducer/hàm thuần + store `useSyncExternalStore` + localStorage + sự kiện `storage` để đồng bộ tab   |
| Dữ liệu lưu   | Chỉ lưu `productId` (khác giỏ hàng lưu snapshot) để giá/tồn kho luôn mới; bỏ qua id không còn trong catalog                        |
| Hydration     | Dùng `useHydrated()` để tránh nháy trạng thái trái tim/badge khi render server                                                     |
| Accessibility | Nút trái tim dùng `aria-pressed` và `aria-label` thay đổi theo trạng thái                                                          |
| Không phá vỡ  | Link ảnh trong ProductCard đang `aria-hidden`; nút trái tim không được lồng trong `<Link>`                                         |
| Test          | Unit test cho reducer (toggle, giới hạn 50, id không tồn tại), test store (persist, dữ liệu hỏng), component test cho nút và trang |

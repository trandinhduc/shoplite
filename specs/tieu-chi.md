# Bộ tiêu chí chấp nhận - Giỏ hàng & Đặt hàng (đáp án tham khảo)

> Dùng ở bài [6.1](../6.1-chon-luong-va-tieu-chi.md) để đối chiếu, và là đầu vào của planner ở bài
> [6.4](../6.4-planner-generator-healer.md). Bản của bạn có thể khác câu chữ. Điều cần đối chiếu:
> mỗi tiêu chí **nhìn thấy được trên màn hình**, có **số liệu cụ thể**, và mỗi luồng có ít nhất một
> trường hợp **biên** và một trường hợp **bị từ chối**.

**Nguồn sự thật** (theo thứ tự ưu tiên): `README.md` mục _Quy tắc nghiệp vụ chính_ → `AGENTS.md` mục
_Quy tắc nghiệp vụ (không được phá vỡ)_ → những gì khách nhìn thấy khi tự bấm thử. **Không lấy kỳ vọng từ
code**: code chỉ cho biết app _đang_ làm gì, không cho biết app _phải_ làm gì.

Dữ liệu mẫu lấy từ `src/data/products.ts` (16 sản phẩm tĩnh, không đổi giữa các lần chạy).

## Luồng A - Giỏ hàng và phí giao hàng

| Mã   | Tiêu chí                                                                                                                                                                                                    | Dữ liệu mẫu                                                                        | Nguồn             |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------- |
| GH-1 | **Cho** sản phẩm còn hàng, **khi** khách chọn số lượng rồi bấm _Thêm vào giỏ_, **thì** biểu tượng giỏ hàng báo đúng tổng số lượng. Sản phẩm hết hàng **không có cách nào** thêm vào giỏ.                   | 3 × Chuột không dây SwiftClick; Micro thu âm PodCast USB (kho 0)                   | README, màn hình  |
| GH-2 | **Không** chọn được nhiều hơn số hàng còn trong kho, và **không quá 10** sản phẩm mỗi loại dù kho còn nhiều.                                                                                                 | Giá đỡ laptop nhôm (kho 3); Cáp USB-C bện dù 2m (kho 200)                          | README, AGENTS.md |
| GH-3 | **Cho** tạm tính **dưới** 500.000đ, **thì** phí giao tiêu chuẩn là 30.000đ và giỏ hàng gợi ý _"Mua thêm <500.000đ − tạm tính> để được miễn phí giao hàng"_.                                                 | 1 × Cáp USB-C = 150.000đ → mua thêm 350.000đ, tổng 180.000đ                        | README, màn hình  |
| GH-4 | **Cho** tạm tính **đúng bằng** 500.000đ, **thì** được miễn phí giao tiêu chuẩn **ở cả** giỏ hàng **và** trang thanh toán.                                                                                    | 2 × Bàn di chuột cỡ lớn DeskMat XL (2 × 250.000đ) → tổng 500.000đ                  | README ("từ")     |

## Luồng B - Thanh toán và đơn hàng

| Mã   | Tiêu chí                                                                                                                                                                                                                                                        | Dữ liệu mẫu                                                       | Nguồn             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------- |
| DH-1 | **Khi** gửi form thanh toán thiếu hoặc sai, **thì** lỗi hiện ngay dưới từng ô sai, **không** tạo đơn, khách vẫn ở trang thanh toán.                                                                                                                              | Form trống; số điện thoại `0123456789`                            | Màn hình          |
| DH-2 | **Khi** đặt hàng hợp lệ, **thì** khách sang trang đơn mã `SL-YYYYMMDD-XXXXXX`, thấy _"Đặt hàng thành công!"_, trạng thái _Chờ xác nhận_, giỏ hàng trống, đơn có trong trang _Đơn hàng_. Giao nhanh **luôn** tính 60.000đ. Số tiền lưu lại do **server** tính. | 1 × SwiftClick (450.000đ) + giao nhanh → 510.000đ                 | README            |
| DH-3 | Đơn _Chờ xác nhận_ hủy được sau khi **xác nhận lần hai**; chọn _Không_ thì đơn giữ nguyên. Xác nhận xong, trạng thái đổi thành _Đã hủy_ **ngay trên trang, không cần tải lại**, nút hủy biến mất. Đơn đã hủy **không** hủy lại được.                             | Đơn tạo sẵn qua `POST /api/orders`                                | README, màn hình  |

## Cố ý không đưa vào E2E

| Hành vi                                              | Để tầng nào lo                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| Tìm kiếm không dấu, lọc danh mục, sắp xếp            | 2 test E2E có sẵn trong `e2e/shopping-flow.spec.ts` + unit test `catalog-service` |
| Đồng bộ giỏ giữa các tab, dữ liệu localStorage hỏng   | Unit test `cart-store.test.ts`                                                    |
| Server không tin giá client gửi lên                   | Unit test `order-service.test.ts`; test API ở bài 6.6 (mã giảm giá)               |
| Trang _Đơn hàng_ khi chưa có đơn nào                  | Không làm: dữ liệu đơn dùng chung với dev server (xem bài 6.2)                    |

## Ghi chú cho giảng viên

- **GH-4 là tiêu chí quan trọng nhất của bộ này.** README viết _"miễn phí cho đơn **từ** 500.000 ₫"_ - "từ"
  nghĩa là `>=`. Đây đúng là chỗ bản vá lỗi số 1 ở bài 6.5 làm sai (`>` thay cho `>=`). Agent đọc code để
  viết tiêu chí sẽ chép lại đúng hành vi đang có trong code, kể cả khi code sai.
- **DH-3 có vế "không cần tải lại".** Đây là thứ chỉ E2E mới kiểm được (unit test của component không chạy
  `router.refresh()` thật). Bản vá lỗi số 2 ở bài 6.5 xóa đúng dòng này.
- Nếu sinh viên viết tiêu chí kiểu _"hàm `calculateShippingFee` trả về 0"_ - đó là tiêu chí của unit test,
  không phải của E2E. Hỏi lại: _khách nhìn thấy gì?_

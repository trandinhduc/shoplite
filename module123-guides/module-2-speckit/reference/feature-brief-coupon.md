# Feature brief - Mã giảm giá (Coupon)

> Đây là "đề bài" từ phía nghiệp vụ. Dán phần **Nội dung để dán vào /speckit-specify** cho agent.
> Brief chỉ nói **CÁI GÌ** và **TẠI SAO**, không nói **LÀM THẾ NÀO** - phần kỹ thuật để dành cho `/speckit-plan`.

## Nội dung để dán vào /speckit-specify

```text
Tính năng: Mã giảm giá khi thanh toán cho ShopLite.

Bối cảnh: Bộ phận marketing muốn chạy chương trình khuyến mãi bằng mã giảm giá để tăng tỷ lệ chốt đơn
và tăng giá trị trung bình mỗi đơn hàng. Hiện tại khách hàng không có cách nào nhận ưu đãi khi đặt hàng.

Mong muốn:
- Ở trang thanh toán, khách hàng nhập một mã giảm giá và bấm "Áp dụng". Nếu hợp lệ, khách thấy ngay
  số tiền được giảm và tổng tiền mới trong phần tóm tắt đơn hàng. Khách có thể gỡ mã đã áp dụng.
- Có hai loại mã: giảm theo phần trăm (có mức giảm tối đa) và giảm một số tiền cố định.
- Mỗi mã có thể có điều kiện giá trị đơn hàng tối thiểu và ngày hết hạn.
- Mỗi đơn hàng chỉ áp dụng được một mã.
- Khi mã không hợp lệ, khách nhận thông báo rõ lý do: mã không tồn tại, mã đã hết hạn,
  hoặc đơn chưa đạt giá trị tối thiểu (cho biết cần mua thêm bao nhiêu).
- Đơn hàng sau khi đặt phải lưu lại mã đã dùng và số tiền được giảm, hiển thị trong trang chi tiết đơn hàng.
- Không được để khách gian lận: số tiền giảm và tổng tiền cuối cùng phải được hệ thống xác nhận lại
  khi đặt hàng, không phụ thuộc vào con số hiển thị trên trình duyệt.

Các mã khuyến mãi ban đầu:
- SHOPLITE10: giảm 10%, tối đa 100.000đ, cho đơn từ 300.000đ.
- GIAM50K: giảm 50.000đ, cho đơn từ 500.000đ.
- TET2026: giảm 15%, tối đa 200.000đ, hết hạn ngày 28/02/2026 (dùng để kiểm thử mã hết hạn).

Ngoài phạm vi: trang quản trị để tạo/sửa mã, giới hạn số lượt sử dụng mỗi mã, mã dành riêng cho từng khách hàng.
```

## Ghi chú cho giảng viên - những điểm mơ hồ cố ý để lại

`/speckit-specify` nên đánh dấu (hoặc `/speckit-clarify` nên hỏi) một số câu sau. Nếu agent không tự
phát hiện, đó là chủ đề thảo luận tốt về chất lượng spec.

| #   | Câu hỏi                                                                                 | Gợi ý trả lời                             |
| --- | --------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1   | Mã có phân biệt chữ hoa/thường không? (`shoplite10` có hợp lệ?)                         | Không phân biệt, tự bỏ khoảng trắng 2 đầu |
| 2   | Ngưỡng miễn phí giao hàng (500.000đ) tính trên tạm tính **trước** hay **sau** giảm giá? | Trước giảm giá (đơn giản cho khách)       |
| 3   | Giảm giá có áp dụng lên phí giao hàng không?                                            | Không, chỉ trừ vào tạm tính               |
| 4   | Số tiền giảm có thể lớn hơn tạm tính không?                                             | Không, tối đa bằng tạm tính               |
| 5   | Mã đã áp dụng có được giữ lại khi tải lại trang / quay lại giỏ hàng không?              | Giữ trong phiên (localStorage)            |
| 6   | Nếu giỏ hàng thay đổi làm đơn không còn đạt giá trị tối thiểu thì sao?                  | Tự gỡ mã và thông báo                     |
| 7   | Mã hết hạn tính theo múi giờ nào, hết hạn cuối ngày hay đầu ngày?                       | Hết 23:59:59 ngày hết hạn, giờ Việt Nam   |
| 8   | Nếu mã hợp lệ lúc áp dụng nhưng hết hạn lúc bấm đặt hàng?                               | Server từ chối, báo lỗi, không tạo đơn    |

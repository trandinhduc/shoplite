# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `001-checkout-discount-codes`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Tính năng: Mã giảm giá khi thanh toán cho ShopLite."

## Clarifications

### Session 2026-11-08

- Q: Mã giảm giá có nên không phân biệt chữ hoa/thường, để `shoplite10` được xem
  là hợp lệ như `SHOPLITE10` không? → A: Không phân biệt chữ hoa/thường;
  `shoplite10` hợp lệ như `SHOPLITE10`.
- Q: Mã giảm giá nên được tính theo múi giờ nào và hết hạn vào thời điểm nào? →
  A: Dùng múi giờ `Asia/Ho_Chi_Minh`; mã còn hiệu lực đến hết ngày 28/02/2026
  và hết hạn từ đầu ngày 01/03/2026.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Áp dụng và gỡ mã giảm giá (Priority: P1)

Khách hàng đang thanh toán có thể nhập một mã giảm giá hợp lệ và áp dụng để
nhận ưu đãi ngay trên đơn hàng. Khách cũng có thể gỡ mã đã áp dụng trước khi
đặt hàng.

**Why this priority**: Đây là luồng cốt lõi tạo giá trị trực tiếp cho khách hàng
và mục tiêu tăng tỷ lệ chốt đơn.

**Independent Test**: Với một giỏ hàng đạt điều kiện, nhập `SHOPLITE10`, bấm
"Áp dụng", xác nhận số tiền giảm và tổng tiền thay đổi, rồi bấm gỡ mã và xác
nhận tổng tiền trở về trước khi giảm.

**Acceptance Scenarios**:

1. **Given** giỏ hàng có giá trị hàng hóa từ 300.000đ, **When** khách nhập
   `SHOPLITE10` và bấm "Áp dụng", **Then** hệ thống hiển thị mã đang dùng,
   số tiền giảm bằng 10% giá trị hàng hóa nhưng không quá 100.000đ, và tổng
   tiền mới.
2. **Given** khách đã áp dụng một mã, **When** khách chọn gỡ mã, **Then** mã
   giảm giá và dòng giảm giá biến mất, tổng tiền được tính lại không còn khoản
   giảm.
3. **Given** khách đã áp dụng một mã, **When** khách thử áp dụng mã thứ hai,
   **Then** hệ thống không áp dụng mã mới và giữ nguyên mã đang dùng.

---

### User Story 2 - Nhận phản hồi rõ ràng khi mã không hợp lệ (Priority: P1)

Khách hàng nhận được lý do cụ thể khi mã không thể dùng, để biết cần sửa mã
hay mua thêm hàng trước khi tiếp tục thanh toán.

**Why this priority**: Phản hồi rõ ràng giảm bỏ dở thanh toán và giúp khách
hiểu cách nhận ưu đãi.

**Independent Test**: Thử mã không tồn tại, mã đã hết hạn và mã chưa đạt giá
trị tối thiểu; xác nhận mỗi trường hợp có thông báo riêng và không làm thay đổi
giá trị đơn hàng.

**Acceptance Scenarios**:

1. **Given** mã nhập không có trong danh sách mã khả dụng, **When** khách bấm
   "Áp dụng", **Then** hiển thị thông báo mã không tồn tại và không có giảm giá.
2. **Given** ngày hiện tại sau 28/02/2026, **When** khách nhập `TET2026`,
   **Then** hiển thị thông báo mã đã hết hạn và không có giảm giá.
3. **Given** giá trị hàng hóa là 420.000đ, **When** khách nhập `GIAM50K`,
   **Then** hiển thị thông báo đơn chưa đạt tối thiểu 500.000đ và cho biết cần
   mua thêm 80.000đ.
4. **Given** mã hợp lệ được nhập với khoảng trắng đầu/cuối hoặc khác hoa
   thường, **When** khách bấm "Áp dụng", **Then** hệ thống chuẩn hóa cách nhập
   và áp dụng đúng mã tương ứng.

---

### User Story 3 - Đặt hàng với ưu đãi được xác nhận (Priority: P1)

Khách hàng đặt hàng và thấy mã đã dùng cùng số tiền giảm trong chi tiết đơn.
Giá trị cuối cùng phải phản ánh kết quả xác nhận của hệ thống, kể cả khi dữ
liệu hiển thị trên trình duyệt bị thay đổi.

**Why this priority**: Lưu lại ưu đãi giúp đơn hàng minh bạch; xác nhận lại
trên hệ thống bảo vệ doanh thu và ngăn gian lận.

**Independent Test**: Đặt một đơn có mã hợp lệ, sau đó kiểm tra chi tiết đơn
hiển thị đúng mã, số tiền giảm và tổng tiền cuối cùng; đồng thời gửi dữ liệu
giảm giá không đúng và xác nhận kết quả đặt hàng không dùng số tiền bị giả mạo.

**Acceptance Scenarios**:

1. **Given** mã hợp lệ đã được áp dụng, **When** khách đặt hàng, **Then** đơn
   hàng lưu mã đã dùng, số tiền giảm được xác nhận và tổng tiền cuối cùng
   tương ứng.
2. **Given** dữ liệu gửi khi đặt hàng chứa số tiền giảm hoặc tổng tiền khác
   với kết quả hợp lệ, **When** hệ thống xử lý đơn, **Then** hệ thống bỏ qua
   các giá trị không đáng tin, tự xác nhận lại mã và lưu tổng tiền đúng.
3. **Given** mã trở nên không hợp lệ trước lúc đặt hàng, **When** khách gửi
   đơn, **Then** đơn không được hưởng mã đó và khách nhận thông báo cần kiểm tra
   lại mã hoặc đơn hàng.
4. **Given** đơn đã đặt thành công có dùng mã, **When** khách mở trang chi
   tiết đơn hàng, **Then** thấy mã giảm giá, số tiền được giảm và tổng tiền sau
   giảm bên cạnh các khoản tiền hiện có.

### Edge Cases

- Mã rỗng hoặc chỉ gồm khoảng trắng không được áp dụng và phải yêu cầu khách
  nhập mã.
- Mã có số tiền giảm lớn hơn giá trị hàng hóa không được làm tổng tiền hàng
  âm; số tiền giảm tối đa bằng giá trị hàng hóa.
- Mã phần trăm phải áp dụng mức giảm tối đa nếu phần trăm tính ra vượt mức đó.
- Đơn đúng bằng giá trị tối thiểu phải được áp dụng mã.
- Khi khách thay đổi giỏ hàng sau khi áp dụng mã, hệ thống phải tính lại điều
  kiện và số tiền giảm; nếu không còn đủ điều kiện, mã bị gỡ và khách được báo
  lý do.
- Phí giao hàng không được tính vào giá trị tối thiểu hoặc số tiền giảm; giảm
  giá chỉ áp dụng trên giá trị hàng hóa trước phí giao hàng.
- Chỉ một mã được áp dụng cho mỗi đơn; không cộng dồn hoặc thay thế ngầm mã
  đang dùng.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Hệ thống MUST cho phép khách nhập mã giảm giá tại trang thanh toán
  và bấm "Áp dụng".
- **FR-002**: Hệ thống MUST chuẩn hóa mã bằng cách bỏ khoảng trắng đầu/cuối và
  không phân biệt chữ hoa, chữ thường khi đối chiếu; ví dụ `shoplite10` MUST
  được xem là `SHOPLITE10`.
- **FR-003**: Hệ thống MUST hỗ trợ mã giảm theo phần trăm có mức giảm tối đa và
  mã giảm một số tiền cố định.
- **FR-004**: Hệ thống MUST kiểm tra giá trị hàng hóa tối thiểu của mã trước khi
  áp dụng; giá trị đúng bằng mức tối thiểu được xem là đạt.
- **FR-005**: Hệ thống MUST kiểm tra ngày hết hạn của mã theo múi giờ
  `Asia/Ho_Chi_Minh` và từ chối mã từ đầu ngày sau ngày hết hạn. Ngày 28/02/2026
  đến 23:59:59 là thời gian sử dụng cuối cùng của `TET2026`.
- **FR-006**: Hệ thống MUST cung cấp đúng ba mã khuyến mãi ban đầu: `SHOPLITE10`
  giảm 10%, tối đa 100.000đ, tối thiểu 300.000đ; `GIAM50K` giảm 50.000đ, tối
  thiểu 500.000đ; `TET2026` giảm 15%, tối đa 200.000đ, tối thiểu 0đ, hết hạn
  ngày 28/02/2026.
- **FR-007**: Hệ thống MUST cho phép tối đa một mã trên mỗi đơn và MUST giữ mã
  hiện tại nếu khách thử áp dụng thêm mã khác.
- **FR-008**: Hệ thống MUST hiển thị ngay số tiền giảm và tổng tiền mới sau khi
  áp dụng mã hợp lệ, đồng thời cho phép gỡ mã đã áp dụng.
- **FR-009**: Khi từ chối mã, hệ thống MUST phân biệt tối thiểu ba lý do: mã
  không tồn tại, mã đã hết hạn và đơn chưa đạt giá trị tối thiểu.
- **FR-010**: Với mã chưa đạt giá trị tối thiểu, hệ thống MUST cho biết số tiền
  hàng hóa cần mua thêm để đạt điều kiện.
- **FR-011**: Hệ thống MUST tính số tiền giảm trên giá trị hàng hóa trước phí
  giao hàng, không cho tổng tiền hàng sau giảm nhỏ hơn 0, và không áp dụng giảm
  vượt mức tối đa của mã phần trăm.
- **FR-012**: Khi đặt hàng, hệ thống MUST xác nhận lại mã, điều kiện, số tiền
  giảm và tổng tiền từ dữ liệu đáng tin cậy; không được phụ thuộc vào số tiền
  giảm hoặc tổng tiền do trình duyệt gửi lên.
- **FR-013**: Đơn hàng MUST lưu mã đã dùng và số tiền được giảm khi đặt hàng
  thành công.
- **FR-014**: Trang chi tiết đơn hàng MUST hiển thị mã đã dùng và số tiền được
  giảm; đơn không dùng mã không được hiển thị khoản giảm giả.
- **FR-015**: Khi mã không còn hợp lệ tại thời điểm đặt hàng, hệ thống MUST từ
  chối ưu đãi đó và thông báo cho khách thay vì lưu một khoản giảm chưa được
  xác nhận.
- **FR-016**: Tính năng MUST không bao gồm giao diện quản trị tạo/sửa mã, giới
  hạn số lượt sử dụng hoặc mã dành riêng cho từng khách hàng.

### Key Entities _(include if feature involves data)_

- **Mã giảm giá**: Mã khách nhập, loại giảm, giá trị giảm, mức giảm tối đa
  (nếu là phần trăm), giá trị hàng hóa tối thiểu và ngày hết hạn (nếu có).
- **Khoản giảm giá**: Kết quả áp dụng một mã cho giá trị hàng hóa của đơn,
  gồm mã được xác nhận và số tiền giảm.
- **Đơn hàng**: Đơn đã đặt, có thể tham chiếu mã đã dùng, số tiền giảm và tổng
  tiền cuối cùng sau khi hệ thống xác nhận.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Trong kiểm thử nghiệm thu, ít nhất 95% lượt áp dụng mã hợp lệ
  hiển thị số tiền giảm và tổng tiền mới trong vòng 1 giây sau thao tác.
- **SC-002**: 100% mã không hợp lệ trong bộ kiểm thử được phân loại đúng theo
  lý do và, với lỗi tối thiểu, hiển thị đúng số tiền cần mua thêm.
- **SC-003**: 100% đơn hàng dùng mã trong bộ kiểm thử lưu đúng mã, số tiền giảm
  và tổng tiền đã xác nhận khi xem chi tiết đơn.
- **SC-004**: 100% trường hợp gửi số tiền giảm hoặc tổng tiền bị thay đổi trong
  bộ kiểm thử gian lận bị bỏ qua và không làm giảm số tiền khách phải trả.
- **SC-005**: Người dùng hoàn thành được việc áp dụng hoặc gỡ mã mà không cần
  rời trang thanh toán, với thông báo tiếng Việt rõ ràng cho cả thành công và
  thất bại.

## Assumptions

- Giá trị tối thiểu và số tiền giảm được tính trên tổng giá trị sản phẩm trong
  giỏ hàng, trước phí giao hàng và trước giảm giá.
- Mã không phân biệt hoa thường; khoảng trắng đầu/cuối là lỗi nhập liệu có thể
  tự chuẩn hóa.
- Ngày hết hạn được diễn giải theo múi giờ `Asia/Ho_Chi_Minh`; mã là hợp lệ đến
  23:59:59 của ngày hết hạn và bị từ chối từ 00:00:00 ngày kế tiếp.
- Số tiền giảm phần trăm được làm tròn xuống đến đồng Việt Nam; số tiền giảm
  cuối cùng không vượt giá trị hàng hóa.
- Khi giỏ hàng thay đổi làm mã không còn đủ điều kiện, mã bị gỡ tự động và
  khách nhận thông báo; khách có thể áp dụng lại sau khi điều chỉnh giỏ hàng.
- Bộ mã ban đầu là dữ liệu cố định phục vụ chương trình đầu tiên; việc tạo,
  sửa hoặc quản trị mã nằm ngoài phạm vi tính năng này.

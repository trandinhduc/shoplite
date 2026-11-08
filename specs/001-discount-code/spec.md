# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `001-discount-code`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Mã giảm giá khi thanh toán cho ShopLite: khách nhập mã ở trang thanh toán, thấy ngay số tiền giảm và tổng mới; hai loại mã (phần trăm có mức giảm tối đa, số tiền cố định); điều kiện đơn tối thiểu và ngày hết hạn; mỗi đơn một mã; thông báo lỗi rõ lý do; đơn lưu mã và số tiền giảm; hệ thống xác nhận lại khi đặt hàng."

## Clarifications

### Session 2026-11-08

- Q: Ngưỡng miễn phí giao hàng 500.000đ cho đơn `standard` xét trên tiền hàng trước hay sau giảm giá? → A: Trước giảm giá

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Áp dụng mã hợp lệ để được giảm giá (Priority: P1)

Khách hàng đang ở trang thanh toán, nhập một mã giảm giá và bấm "Áp dụng". Nếu mã hợp lệ, khách thấy ngay
dòng giảm giá, số tiền được giảm và tổng tiền mới trong phần tóm tắt đơn hàng, rồi đặt hàng với mức giá đó.

**Why this priority**: Đây là giá trị cốt lõi của tính năng: mang lại ưu đãi để tăng tỷ lệ chốt đơn và
giá trị trung bình mỗi đơn. Chỉ riêng câu chuyện này đã là một bản MVP dùng được.

**Independent Test**: Thêm sản phẩm với tổng tiền hàng 600.000đ vào giỏ, vào trang thanh toán, nhập
`SHOPLITE10`, bấm "Áp dụng" và kiểm tra tóm tắt đơn hiển thị giảm 60.000đ cùng tổng tiền mới.

**Acceptance Scenarios**:

1. **Given** tiền hàng 600.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** tóm tắt hiển thị giảm 60.000đ và tổng tiền được tính lại theo mức giảm đó.
2. **Given** tiền hàng 2.000.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** mức giảm là 100.000đ (chạm mức tối đa, không phải 200.000đ).
3. **Given** tiền hàng 500.000đ, **When** khách áp dụng `GIAM50K`, **Then** tóm tắt hiển thị giảm 50.000đ.
4. **Given** khách nhập mã bằng chữ thường hoặc có khoảng trắng thừa (ví dụ ` giam50k `), **When** bấm "Áp dụng", **Then** mã vẫn được nhận diện đúng.
5. **Given** khách đã áp dụng một mã, **When** khách đặt hàng thành công, **Then** đơn được tạo với số tiền đã giảm.

---

### User Story 2 - Hiểu rõ vì sao mã không dùng được (Priority: P1)

Khi mã không hợp lệ, khách nhận thông báo bằng tiếng Việt nêu rõ lý do để biết cách xử lý tiếp,
thay vì một lỗi chung chung.

**Why this priority**: Không có thông báo rõ ràng, khách dễ bỏ giỏ hàng; thông báo "cần mua thêm bao nhiêu"
còn thúc đẩy tăng giá trị đơn, đúng mục tiêu marketing.

**Independent Test**: Nhập lần lượt một mã không tồn tại, `TET2026` và `SHOPLITE10` với tiền hàng 200.000đ;
kiểm tra mỗi trường hợp hiện đúng một thông báo lý do riêng.

**Acceptance Scenarios**:

1. **Given** khách nhập mã không có trong hệ thống, **When** bấm "Áp dụng", **Then** hiển thị thông báo mã không tồn tại và tóm tắt đơn không đổi.
2. **Given** khách nhập `TET2026` (đã hết hạn), **When** bấm "Áp dụng", **Then** hiển thị thông báo mã đã hết hạn.
3. **Given** tiền hàng 200.000đ, **When** khách áp dụng `SHOPLITE10` (tối thiểu 300.000đ), **Then** thông báo cho biết cần mua thêm 100.000đ để dùng mã.
4. **Given** khách để trống ô nhập, **When** bấm "Áp dụng", **Then** hiển thị thông báo yêu cầu nhập mã.

---

### User Story 3 - Gỡ hoặc đổi mã đã áp dụng (Priority: P2)

Khách có thể gỡ mã đã áp dụng để trở về giá gốc, hoặc áp dụng mã khác. Mỗi đơn chỉ có một mã tại một thời điểm.

**Why this priority**: Cho khách quyền kiểm soát và so sánh ưu đãi, nhưng không cản trở luồng chính.

**Independent Test**: Áp dụng `GIAM50K`, gỡ mã và kiểm tra tổng tiền về giá gốc; áp dụng lại bằng `SHOPLITE10` và kiểm tra chỉ còn một dòng giảm giá.

**Acceptance Scenarios**:

1. **Given** đã áp dụng một mã, **When** khách bấm gỡ mã, **Then** dòng giảm giá biến mất và tổng tiền trở về giá gốc.
2. **Given** đã áp dụng `GIAM50K`, **When** khách áp dụng thành công `SHOPLITE10`, **Then** mã mới thay mã cũ, chỉ một mã được tính.
3. **Given** đã áp dụng một mã, **When** khách áp dụng một mã không hợp lệ, **Then** hiển thị lỗi và mã đang áp dụng được giữ nguyên.

---

### User Story 4 - Hệ thống xác nhận lại giảm giá khi đặt hàng (Priority: P1)

Khi khách đặt hàng, hệ thống tự kiểm tra lại mã và tính lại số tiền giảm cũng như tổng tiền, không dựa vào
con số hiển thị trên trình duyệt. Nếu mã không còn hợp lệ ở thời điểm đặt, đơn không được tạo với giảm giá sai.

**Why this priority**: Ngăn gian lận và thất thoát doanh thu; đây là yêu cầu bắt buộc theo nguyên tắc
"server là nguồn sự thật về tiền" của dự án.

**Independent Test**: Gửi yêu cầu đặt hàng với mã không đủ điều kiện (hoặc kèm số tiền giảm/tổng tiền bị sửa)
và kiểm tra đơn không bao giờ được tạo với mức giảm sai.

**Acceptance Scenarios**:

1. **Given** yêu cầu đặt hàng chứa mã hợp lệ, **When** hệ thống xử lý, **Then** đơn lưu mức giảm do hệ thống tự tính, bất kể con số nào trình duyệt hiển thị.
2. **Given** yêu cầu đặt hàng kèm số tiền giảm hoặc tổng tiền do người dùng tự điền, **When** hệ thống xử lý, **Then** các giá trị đó bị bỏ qua.
3. **Given** mã không tồn tại, đã hết hạn hoặc đơn chưa đạt giá trị tối thiểu tại thời điểm đặt, **When** hệ thống xử lý, **Then** đơn bị từ chối kèm thông báo lý do giống như khi áp dụng mã, và khách không bị trừ ưu đãi sai.
4. **Given** khách xóa bớt sản phẩm sau khi áp dụng mã làm tiền hàng thấp hơn mức tối thiểu, **When** khách đặt hàng, **Then** đơn bị từ chối vì chưa đạt giá trị tối thiểu.

---

### User Story 5 - Xem mã đã dùng trong chi tiết đơn hàng (Priority: P2)

Sau khi đặt hàng, trang chi tiết đơn hàng hiển thị mã giảm giá đã dùng và số tiền được giảm, để khách
và bộ phận marketing đối chiếu.

**Why this priority**: Minh bạch và phục vụ đo lường hiệu quả khuyến mãi; không chặn việc đặt hàng.

**Independent Test**: Đặt đơn có `GIAM50K`, mở trang chi tiết đơn và thấy mã cùng số tiền giảm; mở một đơn cũ không dùng mã và thấy trang vẫn hiển thị bình thường.

**Acceptance Scenarios**:

1. **Given** đơn đã đặt có mã giảm giá, **When** khách mở chi tiết đơn, **Then** thấy tên mã, số tiền giảm và tổng tiền khớp với lúc đặt.
2. **Given** đơn đặt không dùng mã (hoặc đơn tạo trước khi có tính năng), **When** mở chi tiết, **Then** không hiển thị dòng giảm giá và trang vẫn hoạt động bình thường.
3. **Given** mã sau này hết hạn hoặc bị thay đổi, **When** mở lại đơn cũ, **Then** số tiền giảm của đơn không đổi.

---

### Edge Cases

- Mức giảm không bao giờ vượt quá tiền hàng; tổng tiền không bao giờ âm (ví dụ `GIAM50K` với đơn đúng 500.000đ vẫn hợp lệ, tổng tiền không âm).
- Đúng giá trị biên: tiền hàng bằng đúng mức tối thiểu (300.000đ với `SHOPLITE10`, 500.000đ với `GIAM50K`) thì mã được áp dụng; thấp hơn 1đ thì bị từ chối.
- Mức giảm phần trăm được làm tròn thành số tiền nguyên đồng; kết quả cuối cùng không có phần lẻ.
- Mã hết hạn đúng ngày ghi trên mã: mã còn dùng được đến hết ngày đó (giờ Việt Nam) và hết hiệu lực từ ngày kế tiếp.
- Giỏ hàng thay đổi (tăng giảm số lượng, xóa sản phẩm) sau khi đã áp dụng mã: mã được kiểm tra lại với tiền hàng mới.
- Giỏ hàng rỗng: không thể áp dụng mã.
- Khách tải lại trang thanh toán: mã đã áp dụng có thể phải nhập lại (xem Assumptions).
- Hai tab hoặc yêu cầu đặt hàng được gửi lặp lại: mỗi đơn vẫn chỉ mang tối đa một mã.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Trang thanh toán MUST có ô nhập mã giảm giá và nút "Áp dụng".
- **FR-002**: Khi mã hợp lệ, hệ thống MUST hiển thị ngay trong tóm tắt đơn: mã đang áp dụng, số tiền được giảm và tổng tiền mới.
- **FR-003**: Khách MUST có thể gỡ mã đã áp dụng và quay về giá gốc.
- **FR-004**: Hệ thống MUST hỗ trợ hai loại mã: giảm theo phần trăm (có mức giảm tối đa) và giảm số tiền cố định.
- **FR-005**: Mỗi mã MAY có giá trị đơn hàng tối thiểu và ngày hết hạn; mã không khai báo thì không bị ràng buộc điều kiện đó.
- **FR-006**: Mỗi đơn hàng MUST chỉ áp dụng tối đa một mã; áp dụng mã mới thành công thì thay mã cũ.
- **FR-007**: Mã MUST không phân biệt chữ hoa/thường và bỏ qua khoảng trắng đầu/cuối khi nhập.
- **FR-008**: Khi mã không hợp lệ, hệ thống MUST hiển thị thông báo tiếng Việt nêu đúng một trong các lý do: mã không tồn tại; mã đã hết hạn; đơn chưa đạt giá trị tối thiểu kèm số tiền cần mua thêm; chưa nhập mã.
- **FR-009**: Mức giảm MUST không vượt quá tiền hàng và tổng tiền cuối cùng MUST không âm.
- **FR-010**: Khi đặt hàng, hệ thống MUST tự kiểm tra lại mã và tính lại số tiền giảm cùng tổng tiền, MUST bỏ qua mọi số tiền giảm hoặc tổng tiền do trình duyệt gửi.
- **FR-011**: Nếu mã không hợp lệ tại thời điểm đặt hàng, hệ thống MUST từ chối đơn kèm thông báo lý do, không tạo đơn với mức giảm sai.
- **FR-012**: Đơn hàng đã đặt MUST lưu mã đã dùng và số tiền được giảm, và các giá trị này MUST không thay đổi về sau dù thông tin mã thay đổi.
- **FR-013**: Trang chi tiết đơn hàng MUST hiển thị mã đã dùng và số tiền giảm khi đơn có dùng mã; đơn không có mã vẫn hiển thị bình thường.
- **FR-014**: Hệ thống MUST cung cấp ba mã khởi tạo: `SHOPLITE10` (10%, tối đa 100.000đ, đơn từ 300.000đ), `GIAM50K` (giảm 50.000đ, đơn từ 500.000đ), `TET2026` (15%, tối đa 200.000đ, hết hạn 28/02/2026).
- **FR-015**: Mọi số tiền hiển thị MUST theo định dạng tiền tệ chuẩn của ShopLite; ô nhập có nhãn rõ ràng và lỗi hiển thị ngay cạnh ô nhập.
- **FR-016**: Phí giao hàng MUST vẫn tuân theo quy tắc hiện có và không bị giảm bởi mã giảm giá; ngưỡng miễn phí giao hàng của đơn `standard` MUST xét trên tiền hàng trước khi giảm giá (ví dụ đơn 520.000đ dùng `GIAM50K` vẫn miễn phí ship, tổng 470.000đ).

### Key Entities *(include if feature involves data)*

- **Mã giảm giá**: mã định danh, loại (phần trăm hoặc số tiền cố định), giá trị giảm, mức giảm tối đa (với loại phần trăm), giá trị đơn tối thiểu (tùy chọn), ngày hết hạn (tùy chọn).
- **Đơn hàng**: bổ sung thông tin giảm giá đã áp dụng gồm mã đã dùng và số tiền được giảm; liên quan đến tiền hàng, phí giao hàng và tổng tiền hiện có.
- **Kết quả kiểm tra mã**: hợp lệ kèm số tiền giảm, hoặc không hợp lệ kèm lý do (không tồn tại, hết hạn, chưa đủ tối thiểu kèm số tiền còn thiếu).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Khách có thể áp dụng một mã hợp lệ và thấy tổng tiền mới trong vòng 2 giây sau khi bấm "Áp dụng".
- **SC-002**: 100% đơn hàng lưu mức giảm do hệ thống tự tính; không đơn nào lưu mức giảm khác với kết quả tính lại, kể cả khi trình duyệt gửi số liệu bị chỉnh sửa.
- **SC-003**: 100% trường hợp mã không hợp lệ hiển thị đúng một lý do cụ thể bằng tiếng Việt; trường hợp thiếu giá trị tối thiểu luôn nêu đúng số tiền cần mua thêm.
- **SC-004**: Mọi quy tắc giảm giá được kiểm chứng ở các giá trị biên (đúng mức tối thiểu, chạm mức giảm tối đa, hết hạn đúng ngày) với kết quả đúng.
- **SC-005**: Khách hoàn tất đơn có mã giảm giá trong không nhiều hơn một bước bổ sung so với đặt hàng không mã.
- **SC-006**: Bộ phận marketing xác định được mã và số tiền giảm của 100% đơn có dùng mã từ dữ liệu đơn hàng.

## Assumptions

- Mức giảm tính trên tiền hàng (tổng giá sản phẩm), không áp dụng cho phí giao hàng; điều kiện đơn tối thiểu cũng xét trên tiền hàng trước giảm.
- Mức giảm phần trăm được làm tròn xuống đồng gần nhất.
- Ngày hết hạn tính hết ngày đó theo giờ Việt Nam (UTC+7).
- Danh sách mã khởi tạo cố định trong hệ thống; không có trang quản trị để tạo hoặc sửa mã.
- Mã đã áp dụng không cần giữ lại khi khách tải lại trang thanh toán; khách nhập lại nếu cần.
- Hiện tại `TET2026` đã hết hạn (28/02/2026 đã qua) nên luôn bị từ chối; mã này dùng để kiểm thử trường hợp hết hạn.
- Đơn hàng cũ tạo trước tính năng này không có thông tin giảm giá và vẫn hiển thị bình thường.
- Ngoài phạm vi: trang quản trị mã, giới hạn số lượt dùng mỗi mã, mã dành riêng cho từng khách hàng.

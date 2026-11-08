# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `001-discount-codes`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Mã giảm giá khi thanh toán cho ShopLite: khách nhập mã ở trang thanh toán, thấy ngay số tiền giảm và tổng mới; hai loại mã (phần trăm có mức giảm tối đa, số tiền cố định); điều kiện đơn tối thiểu và ngày hết hạn; mỗi đơn một mã; thông báo lỗi rõ lý do; đơn hàng lưu mã và số tiền giảm; hệ thống xác nhận lại số tiền khi đặt hàng."

## Clarifications

### Session 2026-11-08

- Q: Nếu mã còn hợp lệ lúc khách bấm "Áp dụng" nhưng đã hết hạn lúc bấm "Đặt hàng", hệ thống nên xử lý thế nào? → A: Vẫn tạo đơn nhưng không áp giảm giá, rồi báo cho khách sau khi đặt xong.
- Q: Khi khách đã áp mã ở trang thanh toán rồi quay về giỏ hàng xóa bớt sản phẩm, mã có được giữ lại khi khách quay lại trang thanh toán không, và nếu tiền hàng xuống dưới mức tối thiểu thì xử lý thế nào? → A: Giữ mã; khi tiền hàng xuống dưới mức tối thiểu thì tự gỡ mã hẳn và báo lý do (kèm số tiền cần mua thêm); muốn dùng lại khách phải nhập lại.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Áp dụng mã hợp lệ và thấy ưu đãi ngay (Priority: P1)

Khách hàng đang ở trang thanh toán, nhập một mã giảm giá vào ô "Mã giảm giá" rồi bấm "Áp dụng".
Nếu mã hợp lệ với giỏ hàng hiện tại, phần tóm tắt đơn hàng lập tức hiện thêm dòng giảm giá
(kèm tên mã) và tổng tiền mới đã trừ số tiền được giảm.

**Why this priority**: Đây là giá trị cốt lõi marketing cần: khách nhìn thấy ưu đãi ngay trước khi
quyết định đặt hàng, từ đó tăng tỷ lệ chốt đơn. Không có câu chuyện này thì tính năng không có ý nghĩa.

**Independent Test**: Thêm sản phẩm vào giỏ để tạm tính đạt 300.000 ₫ trở lên, vào trang thanh toán,
nhập `SHOPLITE10`, bấm "Áp dụng" và kiểm tra dòng giảm giá cùng tổng tiền mới trong phần tóm tắt.

**Acceptance Scenarios**:

1. **Given** giỏ hàng có tạm tính 500.000 ₫ và khách chọn giao hàng tiêu chuẩn,
   **When** khách nhập `SHOPLITE10` và bấm "Áp dụng",
   **Then** phần tóm tắt hiện giảm giá 50.000 ₫ và tổng tiền là 450.000 ₫.
2. **Given** giỏ hàng có tạm tính 2.000.000 ₫,
   **When** khách áp dụng `SHOPLITE10`,
   **Then** số tiền giảm là 100.000 ₫ (chạm mức giảm tối đa, không phải 200.000 ₫).
3. **Given** giỏ hàng có tạm tính 500.000 ₫,
   **When** khách áp dụng `GIAM50K`,
   **Then** số tiền giảm đúng 50.000 ₫ và tổng tiền mới giảm tương ứng.
4. **Given** khách nhập mã bằng chữ thường hoặc có khoảng trắng thừa (ví dụ ` shoplite10 `),
   **When** khách bấm "Áp dụng",
   **Then** mã vẫn được nhận diện và áp dụng như `SHOPLITE10`.
5. **Given** khách đã áp dụng một mã,
   **When** khách đổi phương thức giao hàng,
   **Then** số tiền giảm giữ nguyên và tổng tiền được cập nhật theo phí giao hàng mới.

---

### User Story 2 - Đặt hàng với mã, hệ thống xác nhận lại và lưu vào đơn (Priority: P1)

Khi khách bấm đặt hàng với một mã đã áp dụng, hệ thống tự kiểm tra lại mã và tính lại số tiền giảm
cùng tổng tiền cuối cùng, không dựa vào các con số đang hiển thị trên trình duyệt. Đơn được tạo sẽ
lưu mã đã dùng và số tiền được giảm; trang chi tiết đơn hàng hiển thị hai thông tin này.

**Why this priority**: Ưu đãi chỉ có giá trị thật và an toàn khi số tiền khách phải trả do hệ thống
quyết định. Không có câu chuyện này, khách có thể sửa số liệu để gian lận và marketing không đối
soát được đơn nào đã dùng mã.

**Independent Test**: Đặt một đơn có mã `GIAM50K`, mở trang chi tiết đơn và kiểm tra mã cùng số tiền
giảm; gửi thử yêu cầu đặt hàng có số tiền giảm hoặc tổng tiền bị sửa và kiểm tra hệ thống vẫn tính theo quy tắc.

**Acceptance Scenarios**:

1. **Given** khách đã áp dụng `GIAM50K` cho giỏ 600.000 ₫,
   **When** khách đặt hàng thành công,
   **Then** đơn lưu mã `GIAM50K`, số tiền giảm 50.000 ₫, và trang chi tiết đơn hiển thị cả hai cùng tổng tiền đã trừ giảm giá.
2. **Given** yêu cầu đặt hàng mang số tiền giảm hoặc tổng tiền khác với quy tắc của mã,
   **When** hệ thống xử lý,
   **Then** đơn được lưu với số tiền do hệ thống tính lại, giá trị do trình duyệt gửi lên bị bỏ qua.
3. **Given** khách áp dụng mã hợp lệ rồi mã hết hạn trước khi bấm đặt hàng,
   **When** khách đặt hàng,
   **Then** đơn vẫn được tạo nhưng không có giảm giá (không lưu mã, số tiền giảm bằng 0, tổng tiền là giá gốc),
   và trang xác nhận đơn báo rõ mã đã hết hạn nên không được áp dụng, kèm số tiền chênh lệch so với lúc áp mã.
4. **Given** yêu cầu đặt hàng chứa mã không tồn tại,
   **When** hệ thống xử lý,
   **Then** đơn không được tạo và khách nhận thông báo "mã không tồn tại".
5. **Given** đơn đặt không dùng mã,
   **When** xem chi tiết đơn,
   **Then** không có dòng mã hay giảm giá, và các đơn cũ đã lưu trước đây vẫn hiển thị bình thường.

---

### User Story 3 - Hiểu rõ vì sao mã không dùng được (Priority: P2)

Khi nhập mã không dùng được, khách thấy thông báo nêu đúng lý do: mã không tồn tại, mã đã hết hạn,
hoặc đơn chưa đạt giá trị tối thiểu (kèm số tiền cần mua thêm).

**Why this priority**: Thông báo rõ ràng giúp khách sửa lỗi nhập hoặc mua thêm để đạt điều kiện, thay
vì bỏ giỏ hàng; đặc biệt trường hợp "mua thêm X ₫" còn góp phần tăng giá trị đơn trung bình.

**Independent Test**: Lần lượt nhập `ABC123`, `TET2026` và `SHOPLITE10` với giỏ 299.999 ₫; kiểm tra
ba thông báo khác nhau, đúng lý do, và tổng tiền không đổi.

**Acceptance Scenarios**:

1. **Given** khách nhập mã không có trong danh sách (ví dụ `ABC123`),
   **When** bấm "Áp dụng",
   **Then** hiện thông báo mã không tồn tại và đơn hàng không thay đổi.
2. **Given** khách nhập `TET2026` (hạn dùng 28/02/2026, đã qua),
   **When** bấm "Áp dụng",
   **Then** hiện thông báo mã đã hết hạn và đơn hàng không thay đổi.
3. **Given** giỏ hàng có tạm tính 250.000 ₫,
   **When** khách nhập `SHOPLITE10` (yêu cầu tối thiểu 300.000 ₫),
   **Then** thông báo cho biết đơn chưa đạt giá trị tối thiểu và cần mua thêm 50.000 ₫.
4. **Given** giỏ hàng có tạm tính 299.999 ₫ và 300.000 ₫,
   **When** khách lần lượt áp dụng `SHOPLITE10`,
   **Then** lần đầu bị từ chối (cần mua thêm 1 ₫), lần sau được chấp nhận.
5. **Given** khách để trống ô mã,
   **When** bấm "Áp dụng",
   **Then** hiện nhắc nhập mã và đơn hàng không thay đổi.

---

### User Story 4 - Gỡ mã đã áp dụng (Priority: P3)

Khách đã áp dụng một mã có thể bấm "Gỡ mã" để bỏ ưu đãi, đưa phần tóm tắt về giá gốc và có thể nhập mã khác.

**Why this priority**: Giúp khách thử mã khác hoặc sửa nhầm lẫn mà không phải tải lại trang; ít quan trọng
hơn vì khách vẫn đặt hàng được nếu thiếu thao tác này.

**Independent Test**: Áp dụng `GIAM50K`, bấm "Gỡ mã", kiểm tra dòng giảm giá biến mất, tổng tiền về
giá gốc và ô nhập mã dùng lại được.

**Acceptance Scenarios**:

1. **Given** khách đã áp dụng một mã,
   **When** khách bấm "Gỡ mã",
   **Then** dòng giảm giá biến mất và tổng tiền trở về giá trị khi chưa có mã.
2. **Given** khách vừa gỡ mã,
   **When** khách nhập mã khác và bấm "Áp dụng",
   **Then** mã mới được kiểm tra và áp dụng bình thường.
3. **Given** khách đã áp dụng một mã,
   **When** khách muốn dùng mã thứ hai,
   **Then** khách phải gỡ mã hiện tại trước (mỗi đơn chỉ một mã), không thể cộng dồn.
4. **Given** khách đã áp dụng `SHOPLITE10` cho giỏ 350.000 ₫, rồi quay về giỏ hàng xóa bớt sản phẩm còn 250.000 ₫,
   **When** khách quay lại trang thanh toán,
   **Then** mã bị gỡ hẳn, tổng tiền về giá gốc, và khách thấy thông báo mã đã được gỡ vì đơn cần tối thiểu 300.000 ₫ (cần mua thêm 50.000 ₫);
   nếu sau đó khách thêm hàng đạt lại mức tối thiểu, mã không tự áp dụng lại mà khách phải nhập lại.
5. **Given** khách đã áp dụng một mã rồi quay về giỏ hàng chỉnh sửa nhưng tạm tính vẫn đạt mức tối thiểu (hoặc tải lại trang),
   **When** khách quay lại trang thanh toán,
   **Then** mã vẫn được áp dụng và số tiền giảm được tính lại theo giỏ hàng mới.

---

### Edge Cases

- Mã nhập sai hoa/thường hoặc thừa khoảng trắng đầu/cuối vẫn được nhận diện.
- Phần trăm ra số lẻ (ví dụ 10% của 333.335 ₫ = 33.333,5 ₫): làm tròn xuống đến đồng.
- Mã giảm số tiền cố định lớn hơn tiền hàng: số tiền giảm không vượt quá tiền hàng, tổng tiền hàng không bao giờ âm.
- Khách đổi phương thức giao hàng sau khi áp mã: giảm giá không đổi, phí giao hàng tính theo quy tắc hiện hành.
- Mã hết hạn giữa lúc áp mã và lúc đặt hàng: đơn vẫn được tạo với giá gốc (không giảm), trang xác nhận đơn báo mã đã hết hạn và số tiền chênh lệch.
- Yêu cầu đặt hàng gửi kèm số tiền giảm hoặc tổng tiền tự khai: bị bỏ qua, hệ thống luôn tính lại.
- Đơn đã dùng mã bị hủy: thông tin mã và số tiền giảm vẫn được giữ trong đơn để đối soát.
- Đơn cũ tạo trước khi có tính năng này không có thông tin mã: vẫn xem được bình thường.
- Rời trang thanh toán, sửa giỏ hàng hoặc tải lại trang: mã đã áp dụng được giữ và kiểm tra lại khi khách quay lại trang thanh toán; nếu không còn hợp lệ (chưa đạt tối thiểu, hết hạn) thì mã bị gỡ hẳn kèm thông báo lý do.
- Đặt hàng thành công: mã đã áp dụng được xóa cùng giỏ hàng.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Trang thanh toán MUST có ô nhập mã giảm giá và nút "Áp dụng".
- **FR-002**: Khi mã hợp lệ, hệ thống MUST hiển thị ngay trong phần tóm tắt đơn hàng: mã đã áp dụng, số tiền giảm và tổng tiền mới.
- **FR-003**: Khách MUST có thể gỡ mã đã áp dụng và khi gỡ, phần tóm tắt MUST trở về giá khi chưa có mã.
- **FR-004**: Hệ thống MUST hỗ trợ hai loại mã: giảm theo phần trăm (kèm mức giảm tối đa) và giảm số tiền cố định.
- **FR-005**: Mỗi mã MAY có giá trị đơn hàng tối thiểu và ngày hết hạn; hệ thống MUST kiểm tra cả hai khi áp dụng và khi đặt hàng.
- **FR-006**: Điều kiện giá trị tối thiểu MUST được so với tạm tính (tổng tiền hàng trước giảm giá, chưa gồm phí giao hàng); bằng đúng mức tối thiểu thì đạt.
- **FR-007**: Mã MUST còn hiệu lực đến hết ngày hết hạn (giờ Việt Nam) và MUST bị coi là hết hạn từ ngày kế tiếp.
- **FR-008**: Mỗi đơn hàng MUST chỉ áp dụng tối đa một mã; muốn dùng mã khác khách MUST gỡ mã hiện tại trước.
- **FR-009**: Số tiền giảm của mã phần trăm MUST bằng tạm tính nhân phần trăm, làm tròn xuống đến đồng, và MUST không vượt mức giảm tối đa của mã.
- **FR-010**: Số tiền giảm của mã cố định MUST là số tiền ghi trên mã, nhưng MUST NOT vượt quá tạm tính.
- **FR-011**: Giảm giá MUST chỉ áp dụng trên tiền hàng; phí giao hàng và quy tắc miễn phí giao hàng hiện có MUST giữ nguyên (ngưỡng miễn phí vẫn tính trên tạm tính trước giảm giá).
- **FR-012**: Mã không hợp lệ MUST cho thông báo tiếng Việt nêu đúng một trong các lý do: mã không tồn tại, mã đã hết hạn, hoặc đơn chưa đạt giá trị tối thiểu kèm số tiền cần mua thêm.
- **FR-013**: Nhận diện mã MUST không phân biệt hoa/thường và MUST bỏ khoảng trắng đầu/cuối; ô để trống MUST nhắc khách nhập mã.
- **FR-014**: Khi đặt hàng, hệ thống MUST kiểm tra lại mã và tính lại số tiền giảm cùng tổng tiền cuối cùng từ dữ liệu của mình, và MUST bỏ qua mọi số tiền giảm hoặc tổng tiền do trình duyệt gửi lên.
- **FR-015**: Nếu lúc đặt hàng mã không tồn tại hoặc tạm tính không đạt giá trị tối thiểu của mã, hệ thống MUST từ chối đặt, MUST không tạo đơn, và MUST nêu rõ lý do theo FR-012.
- **FR-015a**: Nếu lúc đặt hàng mã đã hết hạn, hệ thống MUST vẫn tạo đơn nhưng MUST NOT áp giảm giá (đơn không lưu mã, tổng tiền là giá gốc), và trang xác nhận đơn ngay sau khi đặt MUST báo rõ mã đã hết hạn nên không được áp dụng, kèm số tiền chênh lệch so với lúc áp mã.
- **FR-016**: Đơn hàng được tạo MUST lưu mã đã dùng và số tiền được giảm; trang chi tiết đơn MUST hiển thị cả hai cùng tổng tiền sau giảm.
- **FR-017**: Đơn không dùng mã và các đơn đã tạo trước tính năng này MUST tiếp tục hiển thị bình thường, không có dòng mã hay giảm giá.
- **FR-018**: Khi giỏ hàng thay đổi làm mã đã áp dụng không còn đủ điều kiện (tạm tính dưới mức tối thiểu, hoặc mã đã hết hạn), hệ thống MUST gỡ mã hẳn (không tự áp dụng lại khi giỏ đạt lại điều kiện) và MUST báo khách lý do, kèm số tiền cần mua thêm nếu lý do là chưa đạt tối thiểu.
- **FR-020**: Mã đã áp dụng MUST được giữ cùng giỏ hàng khi khách rời trang thanh toán, sửa giỏ hàng hoặc tải lại trang, và MUST được kiểm tra lại mỗi khi khách quay lại trang thanh toán hoặc giỏ hàng thay đổi; mã MUST được xóa khi khách gỡ mã hoặc đặt hàng thành công.
- **FR-019**: Ba mã ban đầu MUST có sẵn: `SHOPLITE10` (giảm 10%, tối đa 100.000 ₫, đơn từ 300.000 ₫), `GIAM50K` (giảm 50.000 ₫, đơn từ 500.000 ₫) và `TET2026` (giảm 15%, tối đa 200.000 ₫, hết hạn 28/02/2026).

### Key Entities *(include if feature involves data)*

- **Mã giảm giá**: Một chương trình ưu đãi do marketing định nghĩa. Gồm: mã (chuỗi khách nhập), loại (phần trăm hoặc số tiền cố định), giá trị giảm, mức giảm tối đa (chỉ với loại phần trăm), giá trị đơn tối thiểu (tùy chọn) và ngày hết hạn (tùy chọn).
- **Kết quả áp mã**: Kết quả kiểm tra một mã với một giỏ hàng: hợp lệ hay không, số tiền giảm nếu hợp lệ, hoặc lý do bị từ chối (không tồn tại, hết hạn, chưa đạt tối thiểu kèm số tiền còn thiếu).
- **Đơn hàng (mở rộng)**: Đơn hiện có, bổ sung mã đã dùng và số tiền được giảm; tổng tiền của đơn đã trừ số tiền giảm. Đơn không dùng mã thì không có hai thông tin này.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Khách áp dụng một mã hợp lệ và thấy số tiền giảm cùng tổng tiền mới trong vòng 1 giây sau khi bấm "Áp dụng".
- **SC-002**: 100% mã bị từ chối hiển thị đúng một trong ba lý do (không tồn tại, hết hạn, chưa đạt tối thiểu); riêng lý do chưa đạt tối thiểu luôn nêu đúng số tiền cần mua thêm.
- **SC-003**: 100% đơn đặt có mã lưu đúng số tiền giảm theo quy tắc của mã, kể cả khi yêu cầu đặt hàng bị sửa số liệu tiền; số tiền khách phải trả không bao giờ thấp hơn mức quy tắc cho phép.
- **SC-004**: 100% đơn đã dùng mã hiển thị đúng mã và số tiền giảm ở trang chi tiết đơn; đơn không mã và đơn cũ hiển thị không thay đổi.
- **SC-005**: Khách có thể áp dụng mã và hoàn tất đặt hàng chỉ thêm tối đa một bước nhập và một lần bấm so với luồng đặt hàng hiện tại.
- **SC-006**: Marketing đo được tỷ lệ chốt đơn và giá trị đơn trung bình của nhóm đơn có mã so với nhóm không mã, nhờ mỗi đơn đều lưu mã và số tiền giảm.

## Assumptions

- Giảm giá chỉ áp dụng trên tiền hàng (tạm tính), không giảm phí giao hàng. Phí giao hàng và ngưỡng miễn phí 500.000 ₫ giữ nguyên theo tạm tính trước giảm giá.
- Điều kiện đơn tối thiểu so với tạm tính trước giảm giá; đúng bằng mức tối thiểu là đạt.
- Làm tròn xuống đến đồng vì tiền Việt Nam không dùng số lẻ.
- "Hết hạn ngày 28/02/2026" nghĩa là mã dùng được hết ngày 28/02/2026 theo giờ Việt Nam; vì hiện đã sau ngày đó, `TET2026` luôn bị coi là hết hạn và dùng làm mã kiểm thử trường hợp này.
- Danh sách mã do đội phát triển định nghĩa sẵn (ba mã ban đầu); marketing chưa tự tạo hay sửa mã.
- Mã đã áp dụng được giữ cùng giỏ hàng trên trình duyệt của khách (kể cả khi tải lại trang) cho tới khi khách gỡ mã, mã bị gỡ tự động, hoặc đặt hàng xong.
- Khách phải gỡ mã hiện tại trước khi nhập mã khác (không thay thế tự động).
- Hủy đơn không làm mất thông tin mã trong đơn; không có hoàn lượt dùng vì chưa giới hạn lượt dùng.
- Tính năng chỉ ở trang thanh toán; trang giỏ hàng chưa có ô nhập mã.
- Ngoài phạm vi: trang quản trị tạo/sửa mã, giới hạn số lượt dùng mỗi mã, mã dành riêng cho từng khách hàng.
- Phụ thuộc: luồng thanh toán và lưu đơn hàng hiện có; quy tắc phí giao hàng hiện hành không đổi.

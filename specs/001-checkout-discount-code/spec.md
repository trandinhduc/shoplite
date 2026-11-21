# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `001-checkout-discount-code`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Mã giảm giá khi thanh toán cho ShopLite: khách nhập mã ở trang thanh
toán, hai loại mã (phần trăm có mức tối đa, số tiền cố định), điều kiện đơn tối thiểu và ngày hết hạn,
một mã mỗi đơn, thông báo rõ lý do khi mã không hợp lệ, đơn hàng lưu mã và số tiền giảm, hệ thống
xác nhận lại số tiền khi đặt hàng. Mã ban đầu: SHOPLITE10, GIAM50K, TET2026. Ngoài phạm vi: trang
quản trị mã, giới hạn lượt dùng, mã riêng cho từng khách."

## Clarifications

### Session 2026-11-08

- Q: Nếu khách đã áp dụng mã thành công nhưng tới lúc bấm "Đặt hàng" mã đã hết hạn, hệ thống xử lý
  thế nào? → A: Từ chối đặt hàng và báo lý do, giữ mã trong tóm tắt (đánh dấu lỗi); khách phải tự
  gỡ mã rồi đặt lại.
- Q: Khách đã áp dụng mã rồi xóa bớt sản phẩm khiến tạm tính dưới mức tối thiểu, mã xử lý thế nào?
  → A: Giữ mã trong tóm tắt, đánh dấu lỗi "cần mua thêm X đ", không trừ tiền, chặn đặt hàng; mã tự
  có hiệu lực lại khi tạm tính đạt tối thiểu.
- Q: Khi khách rời trang thanh toán để sửa giỏ hàng rồi quay lại, mã đã áp dụng có được giữ không?
  → A: Có, giữ cùng giỏ hàng (qua chuyển trang và tải lại trang) cho tới khi khách gỡ mã, đặt hàng
  thành công hoặc giỏ hàng trống.
- Q: Ngưỡng miễn phí giao hàng tiêu chuẩn (500.000đ) so với tạm tính trước hay sau giảm giá? → A:
  Trước giảm giá; dùng mã không bao giờ làm mất freeship.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Áp dụng mã giảm giá hợp lệ và đặt hàng với giá đã giảm (Priority: P1)

Ở trang thanh toán, khách nhập một mã giảm giá rồi bấm "Áp dụng". Nếu mã hợp lệ, phần tóm tắt đơn
hàng hiện ngay mã đã áp dụng, số tiền được giảm và tổng tiền mới. Khi khách đặt hàng, hệ thống tự
tính lại số tiền giảm và tổng tiền. Đơn được tạo với đúng số tiền khách đã thấy.

**Why this priority**: Đây là giá trị cốt lõi cho marketing: khách thực sự nhận được ưu đãi khi
mua. Nếu thiếu luồng này, tính năng không có ý nghĩa.

**Independent Test**: Thêm sản phẩm vào giỏ (tạm tính 400.000đ), áp dụng `SHOPLITE10`, kiểm tra
tóm tắt hiện giảm 40.000đ. Đặt hàng và kiểm tra đơn được tạo có tổng tiền đã trừ 40.000đ.

**Acceptance Scenarios**:

1. **Given** giỏ hàng tạm tính 400.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** tóm tắt
   hiện "Giảm giá (SHOPLITE10): −40.000đ" và tổng tiền bằng tạm tính − 40.000đ + phí giao hàng.
2. **Given** giỏ hàng tạm tính 1.500.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** số tiền
   giảm là 100.000đ (mức tối đa), không phải 150.000đ.
3. **Given** giỏ hàng tạm tính 600.000đ, **When** khách áp dụng `GIAM50K`, **Then** số tiền giảm
   là 50.000đ.
4. **Given** khách đã áp dụng mã hợp lệ, **When** khách đặt hàng thành công, **Then** số tiền giảm
   và tổng tiền của đơn khớp với số đã hiển thị ở trang thanh toán.
5. **Given** giỏ hàng tạm tính đúng bằng 300.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** mã
   được chấp nhận (điều kiện tối thiểu tính cả giá trị bằng ngưỡng).

---

### User Story 2 - Nhận thông báo rõ ràng khi mã không hợp lệ (Priority: P1)

Khi mã không dùng được, khách nhận một thông báo bằng tiếng Việt ngay tại ô nhập mã, nêu đúng lý
do. Có ba lý do: mã không tồn tại, mã đã hết hạn, hoặc đơn chưa đạt giá trị tối thiểu. Với lý do
thứ ba, thông báo cho biết khách cần mua thêm bao nhiêu tiền. Tổng tiền không thay đổi.

**Why this priority**: Nếu không biết lý do, khách sẽ bỏ cuộc hoặc liên hệ hỗ trợ. Thông báo
"cần mua thêm X" còn khuyến khích khách tăng giá trị đơn, đúng mục tiêu của marketing.

**Independent Test**: Lần lượt nhập `KHONGCO`, `TET2026` và `GIAM50K` (với giỏ 450.000đ). Kiểm tra
mỗi lần hiện đúng thông báo và tổng tiền giữ nguyên.

**Acceptance Scenarios**:

1. **Given** mọi giỏ hàng, **When** khách áp dụng `KHONGCO`, **Then** hiện "Mã giảm giá không tồn
   tại" và không có giảm giá nào được áp dụng.
2. **Given** ngày hiện tại sau 28/02/2026, **When** khách áp dụng `TET2026`, **Then** hiện "Mã giảm
   giá đã hết hạn".
3. **Given** giỏ hàng tạm tính 450.000đ, **When** khách áp dụng `GIAM50K`, **Then** hiện thông báo
   cho biết cần mua thêm 50.000đ để dùng mã.
4. **Given** ô nhập mã để trống, **When** khách bấm "Áp dụng", **Then** hiện yêu cầu nhập mã giảm
   giá và hệ thống không kiểm tra mã.
5. **Given** khách đã áp dụng `TET2026` khi còn hạn và mã hết hạn trước khi khách bấm "Đặt hàng",
   **When** khách bấm "Đặt hàng", **Then** đơn không được tạo, mã vẫn hiện trong tóm tắt kèm lỗi
   "Mã giảm giá đã hết hạn", và khách chỉ đặt hàng được sau khi gỡ mã.
6. **Given** đang áp dụng `GIAM50K` với tạm tính 600.000đ, **When** khách xóa bớt sản phẩm còn
   450.000đ, **Then** mã vẫn hiện trong tóm tắt kèm lỗi cần mua thêm 50.000đ, tổng tiền không trừ
   giảm giá, và khách chưa đặt hàng được.
7. **Given** tình huống ở kịch bản 6, **When** khách thêm sản phẩm để tạm tính đạt 500.000đ trở lên,
   **Then** mã tự có hiệu lực lại, dòng giảm 50.000đ xuất hiện và khách đặt hàng được.

---

### User Story 3 - Gỡ hoặc thay mã đã áp dụng (Priority: P2)

Khách có thể gỡ mã đang áp dụng. Khi đó tổng tiền quay về như chưa giảm. Muốn dùng mã khác, khách
gỡ mã cũ rồi áp dụng mã mới. Mỗi đơn chỉ có tối đa một mã.

**Why this priority**: Giúp khách tự chọn mã có lợi nhất và sửa khi nhập nhầm. Tính năng vẫn dùng
được khi chưa có story này, nên đặt sau P1.

**Independent Test**: Áp dụng `SHOPLITE10`, gỡ mã và kiểm tra tổng tiền về giá trị ban đầu. Áp dụng
`GIAM50K` và kiểm tra chỉ có một mã trong tóm tắt.

**Acceptance Scenarios**:

1. **Given** đang áp dụng `SHOPLITE10`, **When** khách gỡ mã, **Then** dòng giảm giá biến mất và
   tổng tiền bằng tạm tính + phí giao hàng.
2. **Given** đang áp dụng một mã, **When** khách xem ô nhập mã, **Then** khách không thể áp dụng
   thêm mã thứ hai cùng lúc. Muốn dùng mã khác, khách phải gỡ mã hiện tại trước.

---

### User Story 4 - Xem mã đã dùng trong chi tiết đơn hàng (Priority: P2)

Sau khi đặt hàng, trang chi tiết đơn hiện mã giảm giá đã dùng và số tiền được giảm, cạnh tạm tính,
phí giao hàng và tổng tiền.

**Why this priority**: Khách cần đối chiếu số tiền phải trả. Cửa hàng cần biết đơn nào dùng mã nào
để đánh giá chương trình khuyến mãi.

**Independent Test**: Đặt một đơn có dùng `GIAM50K` và một đơn không dùng mã. Mở chi tiết từng đơn
và kiểm tra dòng giảm giá chỉ xuất hiện ở đơn có mã.

**Acceptance Scenarios**:

1. **Given** đơn được đặt với `GIAM50K`, **When** khách mở chi tiết đơn, **Then** thấy dòng "Giảm
   giá (GIAM50K): −50.000đ" và tổng tiền đã trừ khoản giảm.
2. **Given** đơn được đặt không có mã, **When** khách mở chi tiết đơn, **Then** không có dòng giảm
   giá và các số tiền hiển thị như hiện nay.
3. **Given** các đơn đã có trước khi ra mắt tính năng, **When** khách xem lại, **Then** đơn vẫn
   hiển thị bình thường, không có dòng giảm giá.

---

### Edge Cases

- Khách nhập mã chữ thường hoặc có khoảng trắng thừa (`shoplite10`): mã vẫn được nhận như
  `SHOPLITE10`.
- Khách xóa bớt sản phẩm sau khi đã áp dụng mã và tạm tính tụt dưới mức tối thiểu: mã vẫn hiện
  trong tóm tắt kèm lỗi "cần mua thêm X đ", không trừ tiền, chưa đặt hàng được. Khách thêm sản phẩm
  cho đủ tối thiểu thì mã tự có hiệu lực lại (FR-014).
- Khách thay đổi giỏ hàng sau khi đã áp dụng mã giảm theo phần trăm: số tiền giảm được tính lại
  theo tạm tính mới.
- Mã hết hạn trong khoảng thời gian từ lúc áp dụng tới lúc đặt hàng: đơn không được tạo, mã vẫn
  hiện trong tóm tắt kèm lỗi "Mã giảm giá đã hết hạn", khách gỡ mã rồi đặt lại (FR-012).
- Ngày hết hạn: mã dùng được đến hết ngày ghi trong điều kiện (23:59:59 giờ Việt Nam), hết hiệu
  lực từ 00:00 ngày hôm sau.
- Số tiền giảm không bao giờ vượt quá tạm tính. Tổng tiền không bao giờ âm.
- Giảm theo phần trăm ra số lẻ đồng: làm tròn xuống tới đồng.
- Khách sửa dữ liệu gửi lên để tự khai số tiền giảm hay tổng tiền: hệ thống bỏ qua các con số này
  và tự tính lại từ mã và giỏ hàng.
- Khách xóa hết sản phẩm trong giỏ khi đang có mã: mã bị bỏ. Lần sau thêm sản phẩm, khách phải
  nhập lại mã (FR-019).
- Giỏ hàng trống: không hiện khu vực nhập mã (trang thanh toán đã hiện trạng thái giỏ trống).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Trang thanh toán MUST có ô nhập mã giảm giá kèm nút "Áp dụng". Ô nhập MUST có nhãn
  hiển thị.
- **FR-002**: Hệ thống MUST hỗ trợ hai loại mã:
  (a) giảm theo phần trăm của tạm tính, có mức giảm tối đa;
  (b) giảm một số tiền cố định.
- **FR-003**: Mỗi mã MAY có điều kiện giá trị đơn tối thiểu (so với tạm tính, tính cả giá trị bằng
  ngưỡng) và MAY có ngày hết hạn. Mã không có ngày hết hạn thì không bao giờ hết hạn.
- **FR-004**: Hệ thống MUST so khớp mã không phân biệt chữ hoa/thường và bỏ khoảng trắng ở đầu và
  cuối.
- **FR-005**: Khi mã hợp lệ, phần tóm tắt đơn hàng MUST hiện ngay mã đã áp dụng, số tiền được giảm
  và tổng tiền mới, không cần tải lại trang.
- **FR-006**: Khi mã không hợp lệ, hệ thống MUST hiện đúng một trong ba lý do bằng tiếng Việt, ngay
  tại ô nhập mã:
  (a) mã không tồn tại;
  (b) mã đã hết hạn;
  (c) đơn chưa đạt giá trị tối thiểu, kèm số tiền cần mua thêm (= mức tối thiểu − tạm tính hiện tại).
- **FR-007**: Mỗi đơn hàng MUST có tối đa một mã giảm giá.
- **FR-008**: Khách MUST gỡ được mã đang áp dụng. Sau khi gỡ, tổng tiền trở về giá trị chưa giảm.
- **FR-009**: Số tiền giảm MUST được tính như sau:
  - mã phần trăm: tạm tính × phần trăm, làm tròn xuống tới đồng, rồi lấy giá trị nhỏ hơn giữa kết
    quả này và mức giảm tối đa;
  - mã cố định: giá trị của mã;
  - trong mọi trường hợp, số tiền giảm không vượt quá tạm tính.
- **FR-010**: Tổng tiền MUST bằng tạm tính − số tiền giảm + phí giao hàng. Phí giao hàng được xác
  định theo FR-013.
- **FR-011**: Khi đặt hàng, hệ thống MUST tự xác định lại tính hợp lệ của mã, số tiền giảm và tổng
  tiền, dựa trên giỏ hàng và ngày hiện tại. Mọi số tiền giảm hay tổng tiền do trình duyệt gửi lên
  MUST bị bỏ qua.
- **FR-012**: Nếu tới lúc đặt hàng mã không còn hợp lệ (ví dụ đã hết hạn), hệ thống MUST từ chối
  tạo đơn và hiện lý do theo FR-006 tại ô mã giảm giá. Mã MUST vẫn nằm trong tóm tắt, được đánh dấu
  lỗi, và không được trừ vào tổng tiền. Khách MUST NOT đặt hàng được khi mã lỗi còn đó; khách phải tự
  gỡ mã (FR-008) rồi bấm đặt hàng lại. Hệ thống MUST NOT tự tạo đơn với giá chưa giảm.
- **FR-013**: Ngưỡng miễn phí giao hàng tiêu chuẩn (đơn từ 500.000đ) MUST được so với tạm tính
  **trước** khi giảm giá. Áp dụng mã MUST NOT làm thay đổi phí giao hàng. Ví dụ: tạm tính 520.000đ,
  dùng `SHOPLITE10` (giảm 52.000đ), giao tiêu chuẩn → phí giao hàng 0đ, tổng tiền 468.000đ.
- **FR-014**: Khi giỏ hàng thay đổi sau khi đã áp dụng mã, hệ thống MUST kiểm tra lại điều kiện và
  tính lại số tiền giảm theo tạm tính mới. Nếu tạm tính dưới mức tối thiểu:
  - mã MUST vẫn nằm trong tóm tắt, được đánh dấu lỗi kèm số tiền cần mua thêm (FR-006(c)), và không
    được trừ vào tổng tiền;
  - khách MUST NOT đặt hàng được cho tới khi gỡ mã hoặc tạm tính đạt lại mức tối thiểu;
  - khi tạm tính đạt lại mức tối thiểu, mã MUST tự có hiệu lực lại mà khách không cần áp dụng lại.
- **FR-015**: Đơn hàng đã đặt MUST lưu mã đã dùng và số tiền được giảm. Đơn không dùng mã thì không
  có hai thông tin này.
- **FR-016**: Trang chi tiết đơn hàng MUST hiển thị mã đã dùng và số tiền được giảm (nếu có). Các
  đơn tạo trước khi ra mắt tính năng MUST vẫn hiển thị đúng.
- **FR-017**: Hệ thống MUST có sẵn ba mã ban đầu:
  - `SHOPLITE10`: giảm 10%, tối đa 100.000đ, đơn tối thiểu 300.000đ, không hết hạn;
  - `GIAM50K`: giảm 50.000đ, đơn tối thiểu 500.000đ, không hết hạn;
  - `TET2026`: giảm 15%, tối đa 200.000đ, không có đơn tối thiểu, hết hạn sau ngày 28/02/2026.
- **FR-018**: Mọi số tiền liên quan tới giảm giá MUST hiển thị theo định dạng tiền Việt Nam đang
  dùng trên toàn cửa hàng.
- **FR-019**: Mã đã áp dụng MUST được giữ cùng giỏ hàng của khách: còn nguyên khi khách chuyển sang
  trang khác (ví dụ trang giỏ hàng) rồi quay lại, và khi tải lại trang. Mã MUST bị bỏ khi khách gỡ
  mã, khi đặt hàng thành công, hoặc khi giỏ hàng trở nên trống.
- **FR-020**: Khách hàng MUST NOT xem được danh sách các mã giảm giá đang có. Hệ thống chỉ cho biết
  thông tin của đúng mã khách đã nhập.
- **FR-021**: Mã khách nhập MUST có độ dài từ 1 tới 32 ký tự sau khi bỏ khoảng trắng đầu và cuối.
  Mã ngoài giới hạn này được coi là không hợp lệ, không cần tra.
- **FR-022**: Mã đã lưu cùng giỏ hàng (FR-019) MUST được coi là dữ liệu không tin cậy. Mỗi khi khách
  mở trang thanh toán và khi đặt hàng, hệ thống MUST kiểm tra lại mã từ đầu.

### Key Entities _(include if feature involves data)_

- **Mã giảm giá**: một chương trình ưu đãi. Thuộc tính:
  - mã (duy nhất, không phân biệt hoa/thường);
  - loại (phần trăm / số tiền cố định);
  - giá trị (phần trăm hoặc số tiền);
  - mức giảm tối đa (chỉ với loại phần trăm);
  - giá trị đơn tối thiểu (tùy chọn);
  - ngày hết hạn (tùy chọn).

  Danh sách mã cố định, không chỉnh sửa qua giao diện.

- **Kết quả áp dụng mã**: kết quả kiểm tra một mã với một giỏ hàng tại một thời điểm. Gồm hợp lệ
  hoặc không. Nếu hợp lệ thì có số tiền giảm. Nếu không thì có lý do (không tồn tại / hết hạn /
  chưa đạt tối thiểu, kèm số tiền còn thiếu).
- **Đơn hàng** (mở rộng): có thêm mã giảm giá đã dùng (tùy chọn) và số tiền được giảm. Tổng tiền của
  đơn đã trừ khoản giảm.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Khách áp dụng được một mã hợp lệ và thấy tổng tiền mới trong vòng 1 giây sau khi bấm
  "Áp dụng".
- **SC-002**: 100% đơn hàng dùng mã có số tiền giảm và tổng tiền khớp quy tắc ở FR-009/FR-010, kể cả
  khi dữ liệu gửi lên bị sửa.
- **SC-003**: 100% lần nhập mã không hợp lệ hiện đúng một trong ba lý do. Với lý do chưa đạt tối
  thiểu, số tiền cần mua thêm chính xác tới từng đồng.
- **SC-004**: Khách hoàn tất được luồng áp dụng mã → đặt hàng mà không cần thêm bước nào ngoài nhập
  mã và bấm "Áp dụng", so với luồng thanh toán hiện tại.
- **SC-005**: 100% đơn có dùng mã hiện mã và số tiền giảm trong trang chi tiết. 100% đơn cũ vẫn hiển
  thị không lỗi.
- **SC-006** (kinh doanh, đo sau khi ra mắt): marketing đo được tỷ lệ đơn dùng mã, nhờ mỗi đơn đều
  ghi lại mã đã dùng.

## Assumptions

- Khách không cần đăng nhập. Tính năng áp dụng cho mọi khách, giống luồng thanh toán hiện nay.
- Giảm giá chỉ tính trên tạm tính (tiền hàng), không giảm phí giao hàng. Phí giao hàng luôn tính
  theo tạm tính trước giảm giá (FR-013).
- Điều kiện "đơn tối thiểu" và "cần mua thêm" được so với tạm tính trước khi giảm.
- Ngày hết hạn được hiểu theo giờ Việt Nam (UTC+7), mã dùng được đến hết ngày đó. Hôm nay
  (2026-11-08), `TET2026` đã hết hạn nên dùng được để kiểm thử.
- Danh sách mã ban đầu được định nghĩa cố định cùng hệ thống. Thay đổi danh sách đòi hỏi cập nhật
  hệ thống (không có trang quản trị).
- Ngoài phạm vi: trang quản trị tạo/sửa mã, giới hạn số lượt dùng mỗi mã, mã dành riêng cho từng
  khách, kết hợp nhiều mã trong một đơn.
- Đơn đã đặt có dùng mã vẫn tuân theo quy tắc hủy đơn hiện có: chỉ hủy được khi đang "Chờ xác nhận".
- Không giới hạn số lần thử mã và không giới hạn số lần dùng một mã. Đây là rủi ro đã chấp nhận cho
  phiên bản này.
- Thông báo "Mã giảm giá đã hết hạn" cho biết mã từng tồn tại. Điều này được chấp nhận vì mã khuyến
  mãi vốn được công bố công khai.
- Giá sản phẩm là dữ liệu tĩnh, chỉ đổi khi cập nhật hệ thống. Vì vậy trường hợp giá đổi giữa lúc
  áp dụng mã và lúc đặt hàng nằm ngoài phạm vi.

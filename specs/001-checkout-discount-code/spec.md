# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `001-checkout-discount-code`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Mã giảm giá khi thanh toán cho ShopLite: khách nhập mã ở trang thanh toán,
hai loại mã (phần trăm có mức tối đa, số tiền cố định), điều kiện giá trị đơn tối thiểu và ngày hết hạn,
một mã mỗi đơn, thông báo rõ lý do khi mã không hợp lệ, lưu mã và số tiền giảm vào đơn, hệ thống xác
nhận lại số tiền khi đặt hàng. Mã ban đầu: SHOPLITE10, GIAM50K, TET2026."

## Clarifications

### Session 2026-11-08

- Q: Mã hợp lệ lúc áp dụng nhưng hết hạn lúc bấm "Đặt hàng" thì xử lý thế nào? → A: Từ chối tạo
  đơn, báo "Mã giảm giá đã hết hạn", tự động gỡ mã ở trang thanh toán và hiển thị tổng tiền mới;
  khách bấm "Đặt hàng" lần nữa để xác nhận.
- Q: Khách xóa/giảm sản phẩm làm tiền hàng dưới mức tối thiểu của mã đã áp dụng thì sao? → A: Giữ
  mã ở trạng thái "chưa đủ điều kiện" (không tính giảm, hiển thị "cần mua thêm X đ"); tự áp dụng
  lại khi tiền hàng đạt ngưỡng; nếu khách vẫn đặt hàng thì đơn tạo không giảm giá, đúng tổng đang
  hiển thị.
- Q: Ngưỡng miễn phí giao hàng tính trên tiền hàng trước hay sau khi giảm giá? → A: Trước khi giảm.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Áp dụng mã hợp lệ và đặt hàng với giá đã giảm (Priority: P1)

Khách hàng có giỏ hàng đủ điều kiện, vào trang thanh toán, nhập mã giảm giá và bấm "Áp dụng".
Phần tóm tắt đơn hàng hiển thị ngay mã đã áp dụng, số tiền được giảm và tổng tiền mới. Khách đặt
hàng; đơn được tạo với đúng số tiền giảm và tổng tiền mà hệ thống tự tính lại.

**Why this priority**: Đây là giá trị cốt lõi mà marketing cần — không có luồng này thì không có
chương trình khuyến mãi nào chạy được.

**Independent Test**: Thêm sản phẩm đủ giá trị vào giỏ, áp dụng SHOPLITE10 hoặc GIAM50K, đặt
hàng và kiểm tra số tiền giảm, tổng tiền trên trang thanh toán và trong đơn vừa tạo.

**Acceptance Scenarios**:

1. **Given** tiền hàng là 400.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** tóm tắt đơn
   hiển thị giảm 40.000đ và tổng tiền = 400.000 − 40.000 + phí giao hàng.
2. **Given** tiền hàng là 1.500.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** số tiền giảm
   là 100.000đ (chạm mức tối đa), không phải 150.000đ.
3. **Given** tiền hàng là 500.000đ, **When** khách áp dụng `GIAM50K`, **Then** số tiền giảm là
   50.000đ.
4. **Given** tiền hàng là 300.000đ (đúng ngưỡng tối thiểu), **When** khách áp dụng `SHOPLITE10`,
   **Then** mã được chấp nhận và giảm 30.000đ.
5. **Given** khách đã áp dụng mã hợp lệ, **When** khách bấm "Đặt hàng", **Then** đơn được tạo với
   số tiền giảm và tổng tiền do hệ thống tính lại, và khớp với số đã hiển thị.
6. **Given** khách nhập `shoplite10` (chữ thường) có khoảng trắng ở hai đầu, **When** bấm "Áp dụng",
   **Then** mã được nhận như `SHOPLITE10`.

---

### User Story 2 - Thông báo rõ lý do khi mã không hợp lệ (Priority: P1)

Khách nhập mã sai, mã hết hạn, hoặc đơn chưa đủ giá trị tối thiểu. Khách nhận thông báo tiếng
Việt nêu đúng lý do, ngay cạnh ô nhập mã; tổng tiền không thay đổi.

**Why this priority**: Thông báo mơ hồ khiến khách bỏ đơn hoặc liên hệ hỗ trợ; nói rõ "cần mua
thêm bao nhiêu" còn trực tiếp thúc đẩy tăng giá trị đơn — mục tiêu của marketing.

**Independent Test**: Nhập lần lượt một mã không tồn tại, `TET2026`, và `GIAM50K` với giỏ dưới
500.000đ; kiểm tra từng thông báo và tổng tiền không đổi.

**Acceptance Scenarios**:

1. **Given** bất kỳ giỏ hàng nào, **When** khách nhập `KHONGCO`, **Then** hiển thị "Mã giảm giá
   không tồn tại" và không áp dụng giảm giá.
2. **Given** hôm nay sau 28/02/2026, **When** khách nhập `TET2026`, **Then** hiển thị "Mã giảm
   giá đã hết hạn" và không áp dụng giảm giá.
3. **Given** tiền hàng là 420.000đ, **When** khách nhập `GIAM50K`, **Then** hiển thị thông báo
   đơn chưa đạt tối thiểu 500.000đ và cần mua thêm 80.000đ.
4. **Given** tiền hàng là 499.999đ, **When** khách nhập `GIAM50K`, **Then** mã bị từ chối với
   số tiền cần mua thêm là 1đ.
5. **Given** ô nhập mã đang trống, **When** khách bấm "Áp dụng", **Then** hiển thị yêu cầu nhập
   mã và không gửi kiểm tra.

---

### User Story 3 - Gỡ mã, đổi mã và giữ đúng một mã mỗi đơn (Priority: P2)

Khách đã áp dụng một mã có thể gỡ mã đó để quay về tổng tiền ban đầu, hoặc áp dụng mã khác thay
thế. Đơn hàng không bao giờ có hơn một mã.

**Why this priority**: Cần cho trải nghiệm hoàn chỉnh nhưng luồng P1 vẫn có giá trị nếu thiếu.

**Independent Test**: Áp dụng `SHOPLITE10`, gỡ, kiểm tra tổng trở về ban đầu; áp dụng
`SHOPLITE10` rồi `GIAM50K`, kiểm tra chỉ còn `GIAM50K`.

**Acceptance Scenarios**:

1. **Given** đã áp dụng `SHOPLITE10`, **When** khách bấm "Gỡ mã", **Then** dòng giảm giá biến mất
   và tổng tiền trở về giá trị chưa giảm.
2. **Given** đã áp dụng `SHOPLITE10` và tiền hàng 600.000đ, **When** khách áp dụng `GIAM50K`,
   **Then** `GIAM50K` thay thế `SHOPLITE10`, chỉ một mã được hiển thị và tính.
3. **Given** đã áp dụng `SHOPLITE10`, **When** khách nhập một mã không hợp lệ, **Then** mã
   `SHOPLITE10` vẫn được giữ và thông báo lỗi hiển thị cho mã mới.
4. **Given** đã áp dụng `GIAM50K` với tiền hàng 600.000đ, **When** khách xóa sản phẩm làm tiền hàng
   còn 450.000đ, **Then** mã hiển thị "chưa đủ điều kiện", không giảm và báo cần mua thêm 50.000đ.
5. **Given** tình huống ở kịch bản 4, **When** khách thêm sản phẩm để tiền hàng lên 500.000đ,
   **Then** mã tự áp dụng lại và giảm 50.000đ mà không cần nhập lại.
6. **Given** tình huống ở kịch bản 4, **When** khách bấm "Đặt hàng", **Then** đơn được tạo không có
   giảm giá với tổng tiền đúng như đang hiển thị.

---

### User Story 4 - Xem mã và số tiền giảm trong chi tiết đơn hàng (Priority: P2)

Sau khi đặt hàng, khách vào trang chi tiết đơn và thấy mã đã dùng cùng số tiền được giảm bên
cạnh tiền hàng, phí giao hàng và tổng tiền.

**Why this priority**: Giúp khách tin tưởng và giúp đối soát; không chặn việc đặt hàng.

**Independent Test**: Đặt một đơn có mã và một đơn không có mã, mở chi tiết từng đơn.

**Acceptance Scenarios**:

1. **Given** đơn được đặt với `GIAM50K`, **When** khách mở chi tiết đơn, **Then** thấy mã
   `GIAM50K` và dòng giảm 50.000đ, tổng tiền khớp với lúc đặt.
2. **Given** đơn được đặt không có mã, **When** khách mở chi tiết đơn, **Then** không hiển thị
   dòng giảm giá.
3. **Given** các đơn cũ tạo trước khi có tính năng, **When** khách xem danh sách hoặc chi tiết,
   **Then** đơn vẫn hiển thị bình thường như đơn không có mã.

---

### User Story 5 - Chống gian lận: hệ thống tự xác nhận lại khi đặt hàng (Priority: P1)

Dù trình duyệt gửi lên số tiền giảm hay tổng tiền nào, hệ thống chỉ dùng mã khách chọn, tự kiểm
tra lại điều kiện và tự tính số tiền giảm, tổng tiền tại thời điểm đặt hàng.

**Why this priority**: Sai số tiền là thiệt hại trực tiếp cho cửa hàng; đây là yêu cầu bắt buộc.

**Independent Test**: Gửi yêu cầu đặt hàng kèm số tiền giảm/tổng tiền bị sửa, hoặc kèm mã không
đủ điều kiện, và kiểm tra đơn được tạo (hoặc bị từ chối).

**Acceptance Scenarios**:

1. **Given** yêu cầu đặt hàng kèm mã `SHOPLITE10` và một số tiền giảm tự khai 500.000đ, **When**
   hệ thống xử lý, **Then** số tiền giảm tự khai bị bỏ qua, đơn lưu số tiền giảm hệ thống tính.
2. **Given** yêu cầu đặt hàng kèm `GIAM50K` nhưng tiền hàng thực tế (tính từ giá hiện hành) dưới
   500.000đ, **When** hệ thống xử lý, **Then** đơn bị từ chối kèm lý do như ở Story 2, không đơn
   nào được tạo.
3. **Given** khách đã áp dụng mã hợp lệ nhưng mã hết hạn trước lúc bấm "Đặt hàng", **When** đặt
   hàng, **Then** không đơn nào được tạo, khách thấy thông báo "Mã giảm giá đã hết hạn", mã được
   tự động gỡ khỏi trang thanh toán và tóm tắt hiển thị tổng tiền chưa giảm.
4. **Given** tình huống ở kịch bản 3 vừa xảy ra, **When** khách bấm "Đặt hàng" lần nữa, **Then**
   đơn được tạo không có mã giảm giá, với tổng tiền đúng như đang hiển thị.

---

### Edge Cases

- Khách thay đổi giỏ hàng (tăng/giảm số lượng, xóa sản phẩm) sau khi đã áp dụng mã: số tiền giảm
  được tính lại theo tiền hàng mới; nếu tiền hàng tụt dưới mức tối thiểu, mã chuyển sang trạng
  thái "chưa đủ điều kiện" (xem FR-013), và tự áp dụng lại khi tiền hàng đạt ngưỡng.
  Ví dụ: áp `GIAM50K` với tiền hàng 600.000đ, xóa một sản phẩm còn 450.000đ → không giảm, hiển thị
  "cần mua thêm 50.000đ"; thêm lại sản phẩm lên 600.000đ → tự giảm lại 50.000đ.
- Ngày hết hạn: mã dùng được đến hết ngày hết hạn (23:59:59 giờ Việt Nam); từ 00:00 ngày kế tiếp
  là hết hạn.
- Số tiền giảm không bao giờ vượt tiền hàng; tổng tiền không bao giờ âm.
- Giảm theo phần trăm ra số lẻ đồng: làm tròn xuống đến đồng.
- Mã có ký tự thừa ở hai đầu hoặc khác hoa/thường: được chuẩn hóa trước khi kiểm tra.
- Mã nhập quá dài hoặc chứa ký tự lạ: báo "Mã giảm giá không tồn tại", không gây lỗi hệ thống.
- Giỏ hàng trống: không cho áp dụng mã (trang thanh toán vốn không cho đặt khi giỏ trống).
- Giá sản phẩm thay đổi giữa lúc áp dụng mã và lúc đặt: hệ thống dùng giá tại thời điểm đặt.
- Hủy đơn có dùng mã: đơn hủy như bình thường; không có lượt dùng nào cần hoàn lại.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Trang thanh toán MUST có ô nhập mã giảm giá (có nhãn) và nút "Áp dụng".
- **FR-002**: Hệ thống MUST hỗ trợ hai loại mã: (a) giảm theo phần trăm tiền hàng, có mức giảm
  tối đa; (b) giảm một số tiền cố định.
- **FR-003**: Mỗi mã MAY có giá trị đơn tối thiểu và/hoặc ngày hết hạn; mã không có điều kiện nào
  thì luôn hợp lệ.
- **FR-004**: Số tiền giảm MUST được tính trên tiền hàng (tổng giá sản phẩm), không giảm vào phí
  giao hàng. Giá trị đơn tối thiểu MUST so với tiền hàng trước khi giảm.
- **FR-005**: Số tiền giảm theo phần trăm = min(tiền hàng × phần trăm, mức tối đa), làm tròn xuống
  đến đồng. Số tiền giảm của mọi loại MUST không vượt tiền hàng.
- **FR-006**: Tổng tiền = tiền hàng − số tiền giảm + phí giao hàng.
  Ngưỡng miễn phí giao hàng (giao tiêu chuẩn) MUST tính trên tiền hàng **trước** khi giảm giá:
  ví dụ tiền hàng 520.000đ, áp `SHOPLITE10` giảm 52.000đ → vẫn miễn phí giao hàng tiêu chuẩn,
  tổng = 468.000đ. Tiền hàng 499.999đ thì vẫn tính phí giao hàng dù có mã hay không.
- **FR-007**: Khi mã hợp lệ, tóm tắt đơn hàng MUST hiển thị ngay mã, dòng "Giảm giá" và tổng tiền
  mới, mà không cần tải lại trang.
- **FR-008**: Khi mã không hợp lệ, hệ thống MUST hiển thị đúng một trong các lý do bằng tiếng
  Việt, gắn với ô nhập mã: mã không tồn tại; mã đã hết hạn; đơn chưa đạt giá trị tối thiểu (kèm
  giá trị tối thiểu và số tiền cần mua thêm = tối thiểu − tiền hàng).
- **FR-009**: Hệ thống MUST kiểm tra và báo lỗi đầu tiên gặp theo thứ tự: không tồn tại → hết
  hạn → chưa đạt tối thiểu (ví dụ mã vừa hết hạn vừa chưa đạt tối thiểu thì báo "đã hết hạn").
- **FR-010**: Mã MUST được so khớp không phân biệt hoa/thường và bỏ khoảng trắng ở hai đầu.
- **FR-011**: Mỗi đơn hàng MUST có tối đa một mã. Áp dụng mã hợp lệ mới MUST thay thế mã cũ; mã
  mới không hợp lệ MUST không làm mất mã cũ.
- **FR-012**: Khách MUST gỡ được mã đã áp dụng; sau khi gỡ, tổng tiền trở về giá chưa giảm.
- **FR-013**: Khi giỏ hàng thay đổi, số tiền giảm MUST được tính lại. Nếu tiền hàng xuống dưới mức
  tối thiểu của mã đã áp dụng, mã MUST được giữ ở trạng thái "chưa đủ điều kiện": không tính vào
  tổng, hiển thị giá trị tối thiểu và số tiền cần mua thêm; khi tiền hàng đạt lại ngưỡng, mã MUST
  tự áp dụng lại mà khách không cần nhập lại. Nếu khách đặt hàng khi mã đang "chưa đủ điều kiện",
  đơn MUST được tạo không có giảm giá, với tổng tiền đúng như đang hiển thị (không coi là lỗi
  FR-015).
- **FR-014**: Khi đặt hàng, hệ thống MUST chỉ nhận mã khách chọn, tự kiểm tra lại toàn bộ điều
  kiện và tự tính số tiền giảm, tổng tiền từ giá hiện hành; mọi số tiền giảm/tổng tiền do trình
  duyệt gửi lên MUST bị bỏ qua.
- **FR-015**: Nếu mã không còn hợp lệ lúc đặt hàng (ví dụ đã hết hạn), hệ thống MUST từ chối tạo
  đơn và trả về lý do như FR-008; MUST không tự động đặt đơn mà bỏ giảm giá. Trang thanh toán MUST
  hiển thị lý do, tự động gỡ mã khỏi đơn đang soạn và cập nhật tóm tắt về tổng tiền chưa giảm; đơn
  chỉ được tạo khi khách bấm "Đặt hàng" lần nữa.
- **FR-016**: Đơn hàng MUST lưu mã đã dùng (dạng chuẩn hóa) và số tiền được giảm; đơn không dùng
  mã lưu như hiện nay.
- **FR-017**: Trang chi tiết đơn hàng MUST hiển thị mã đã dùng và số tiền giảm khi có; đơn cũ không
  có thông tin giảm giá MUST vẫn hiển thị đúng.
- **FR-018**: Mọi số tiền hiển thị MUST theo định dạng tiền tệ chung của cửa hàng.
- **FR-019**: Hệ thống MUST có sẵn ba mã ban đầu:
  - `SHOPLITE10`: giảm 10%, tối đa 100.000đ, đơn tối thiểu 300.000đ, không hết hạn.
  - `GIAM50K`: giảm 50.000đ, đơn tối thiểu 500.000đ, không hết hạn.
  - `TET2026`: giảm 15%, tối đa 200.000đ, không có tối thiểu, hết hạn hết ngày 28/02/2026.

### Key Entities _(include if feature involves data)_

- **Mã giảm giá**: mã (chuỗi, duy nhất, không phân biệt hoa/thường), loại (phần trăm | số tiền cố
  định), giá trị (phần trăm hoặc số tiền), mức giảm tối đa (chỉ cho loại phần trăm), giá trị đơn
  tối thiểu (tùy chọn), ngày hết hạn (tùy chọn).
- **Kết quả kiểm tra mã**: hợp lệ kèm số tiền giảm; hoặc không hợp lệ kèm lý do (không tồn tại /
  hết hạn / chưa đạt tối thiểu kèm số tiền cần mua thêm).
- **Đơn hàng** (mở rộng): thêm mã đã dùng (tùy chọn) và số tiền giảm (mặc định 0); tổng tiền đã
  trừ giảm giá.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Khách áp dụng một mã hợp lệ và thấy tổng tiền mới trong vòng 1 giây sau khi bấm
  "Áp dụng", trong 95% lần thử.
- **SC-002**: 100% đơn có dùng mã lưu số tiền giảm và tổng tiền khớp với cách tính của hệ thống,
  kể cả khi yêu cầu đặt hàng bị sửa số tiền.
- **SC-003**: 100% lần nhập mã không hợp lệ hiển thị đúng một trong ba lý do đã định nghĩa; với
  lý do chưa đạt tối thiểu, số tiền cần mua thêm chính xác đến từng đồng.
- **SC-004**: Mọi ca biên (đúng ngưỡng tối thiểu, dưới ngưỡng 1đ, chạm mức giảm tối đa, ngày hết
  hạn và ngày kế tiếp) cho kết quả đúng như tiêu chí chấp nhận.
- **SC-005**: Không đơn nào có tổng tiền âm hoặc số tiền giảm lớn hơn tiền hàng.
- **SC-006** (kinh doanh, đo sau ra mắt): marketing theo dõi được số đơn dùng từng mã và tổng
  tiền đã giảm từ dữ liệu đơn hàng.

## Assumptions

- Khách không cần đăng nhập; mã dùng được cho mọi khách và không giới hạn số lượt (giới hạn lượt
  và mã riêng từng khách nằm ngoài phạm vi).
- Danh sách mã do đội phát triển cấu hình sẵn; không có trang quản trị tạo/sửa mã.
- Múi giờ tính hạn dùng là giờ Việt Nam (UTC+7); ngày hết hạn được tính bao gồm cả ngày đó.
- Mã chỉ giảm tiền hàng, không giảm phí giao hàng.
- Khi mã mất hiệu lực lúc đặt hàng, từ chối đơn và tự gỡ mã để khách thấy tổng tiền mới rồi tự xác
  nhận, thay vì âm thầm đặt với giá cao hơn.
- Hủy đơn không cần xử lý gì thêm cho mã vì không có giới hạn lượt dùng.
- Đơn cũ (trước khi có tính năng) được coi là không dùng mã, số tiền giảm = 0.
- Các quy tắc hiện có (giới hạn số lượng, tồn kho, phí giao hàng, hủy đơn chỉ khi "Chờ xác nhận")
  giữ nguyên.

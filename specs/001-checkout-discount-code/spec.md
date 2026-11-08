# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `feat/landv`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Tính năng: Mã giảm giá khi thanh toán cho ShopLite. Khách nhập mã ở
trang thanh toán, bấm "Áp dụng", thấy ngay số tiền giảm và tổng mới, có thể gỡ mã. Hai loại mã:
phần trăm (có mức giảm tối đa) và số tiền cố định; mỗi mã có thể có giá trị đơn tối thiểu và ngày
hết hạn; mỗi đơn một mã; thông báo rõ lý do khi mã không hợp lệ; đơn lưu mã và số tiền giảm, hiển
thị ở chi tiết đơn; hệ thống xác nhận lại số tiền giảm khi đặt hàng. Mã ban đầu: SHOPLITE10,
GIAM50K, TET2026. Ngoài phạm vi: trang quản trị mã, giới hạn lượt dùng, mã riêng cho từng khách."

## Clarifications

### Session 2026-11-08

- Q: Mã hợp lệ lúc áp dụng nhưng không còn hợp lệ (ví dụ hết hạn) lúc bấm "Đặt hàng" thì xử lý
  thế nào? → A: Từ chối đặt hàng, không tạo đơn; báo lý do, tự gỡ mã khỏi tóm tắt để khách thấy
  tổng tiền mới, giữ nguyên dữ liệu form; khách tự bấm đặt lại nếu đồng ý.
- Q: Khách bớt sản phẩm làm tạm tính xuống dưới giá trị tối thiểu của mã đã áp dụng thì sao?
  → A: Giữ mã nhưng tạm không giảm; tóm tắt báo số tiền cần mua thêm, tổng tiền không giảm; mã tự
  có hiệu lực lại khi đủ điều kiện. Muốn đặt hàng không giảm giá thì khách gỡ mã.
- Q: Ngưỡng miễn phí giao hàng tiêu chuẩn xét trên tạm tính trước hay sau giảm giá? → A: Trước
  giảm giá; quy tắc phí giao hàng hiện có giữ nguyên.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Áp dụng mã giảm giá hợp lệ và đặt hàng (Priority: P1)

Khách hàng có hàng trong giỏ, vào trang thanh toán, nhập mã khuyến mãi (ví dụ `SHOPLITE10`) và bấm
"Áp dụng". Phần tóm tắt đơn hàng hiển thị ngay mã đã áp dụng, số tiền được giảm và tổng tiền mới.
Khách đặt hàng; đơn hàng được tạo với đúng số tiền giảm do hệ thống tính.

**Why this priority**: Đây là giá trị cốt lõi marketing cần: khách nhận được ưu đãi và chốt đơn.
Không có câu chuyện này thì tính năng không tồn tại.

**Independent Test**: Thêm sản phẩm đủ giá trị tối thiểu vào giỏ, áp dụng một mã hợp lệ, kiểm tra
số tiền giảm và tổng tiền hiển thị, đặt hàng và kiểm tra tổng tiền của đơn vừa tạo.

**Acceptance Scenarios**:

1. **Given** giỏ hàng có tạm tính 400.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** tóm tắt
   hiển thị giảm 40.000đ và tổng tiền = 400.000đ − 40.000đ + phí giao hàng.
2. **Given** giỏ hàng có tạm tính 2.000.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** số tiền
   giảm là 100.000đ (mức giảm tối đa), không phải 200.000đ.
3. **Given** giỏ hàng có tạm tính 600.000đ, **When** khách áp dụng `GIAM50K`, **Then** số tiền giảm
   là 50.000đ.
4. **Given** khách đã áp dụng mã hợp lệ, **When** khách đặt hàng thành công, **Then** đơn hàng được
   tạo với số tiền giảm và tổng tiền do hệ thống tự tính lại, khớp với con số khách đã thấy.
5. **Given** khách đã áp dụng một mã nhưng mã hết hạn trước khi bấm "Đặt hàng", **When** khách bấm
   "Đặt hàng", **Then** không có đơn nào được tạo, khách thấy thông báo mã đã hết hạn, mã bị gỡ
   khỏi tóm tắt và thông tin đã nhập vẫn còn nguyên.
6. **Given** khách nhập mã có chữ thường hoặc khoảng trắng thừa (` shoplite10 `), **When** bấm
   "Áp dụng", **Then** mã được nhận như `SHOPLITE10`.

---

### User Story 2 - Nhận thông báo rõ ràng khi mã không hợp lệ (Priority: P1)

Khách nhập một mã không dùng được và nhận thông báo nêu đúng lý do để biết phải làm gì tiếp: mã
không tồn tại, mã đã hết hạn, hoặc đơn chưa đạt giá trị tối thiểu (kèm số tiền cần mua thêm).

**Why this priority**: Thông báo mơ hồ khiến khách bỏ giỏ hàng; thông báo "cần mua thêm X" còn trực
tiếp phục vụ mục tiêu tăng giá trị đơn trung bình.

**Independent Test**: Lần lượt nhập mã sai, mã `TET2026` (đã hết hạn) và `GIAM50K` với giỏ dưới
500.000đ; kiểm tra từng thông báo và tổng tiền không đổi.

**Acceptance Scenarios**:

1. **Given** khách ở trang thanh toán, **When** nhập `KHONGCO` và bấm "Áp dụng", **Then** hiển thị
   "Mã giảm giá không tồn tại" và tổng tiền không thay đổi.
2. **Given** hôm nay sau ngày 28/02/2026, **When** khách áp dụng `TET2026`, **Then** hiển thị thông
   báo mã đã hết hạn và tổng tiền không thay đổi.
3. **Given** giỏ hàng có tạm tính 420.000đ, **When** khách áp dụng `GIAM50K`, **Then** hiển thị
   thông báo đơn chưa đạt tối thiểu 500.000đ và cần mua thêm 80.000đ.
4. **Given** ô mã đang trống, **When** khách bấm "Áp dụng", **Then** hiển thị yêu cầu nhập mã ngay
   tại ô nhập, không gửi kiểm tra.

---

### User Story 3 - Gỡ hoặc thay mã đã áp dụng (Priority: P2)

Khách đã áp dụng một mã nhưng muốn bỏ hoặc dùng mã khác. Khách bấm "Gỡ mã" và tổng tiền trở về như
chưa giảm; sau đó có thể nhập mã khác.

**Why this priority**: Cần thiết để khách tự chọn ưu đãi tốt nhất và tuân thủ quy tắc một mã mỗi
đơn, nhưng luồng chính vẫn dùng được khi chưa có.

**Independent Test**: Áp dụng `SHOPLITE10`, gỡ mã, kiểm tra tổng tiền trở lại ban đầu, áp dụng
`GIAM50K` và kiểm tra chỉ còn một mã.

**Acceptance Scenarios**:

1. **Given** đã áp dụng `SHOPLITE10`, **When** khách bấm "Gỡ mã", **Then** dòng giảm giá biến mất và
   tổng tiền trở về giá trị trước khi giảm.
2. **Given** đã áp dụng một mã, **When** khách áp dụng mã thứ hai hợp lệ, **Then** mã mới thay thế
   mã cũ; đơn hàng không bao giờ có hơn một mã.
3. **Given** đã áp dụng `GIAM50K` với tạm tính 600.000đ, **When** khách bớt sản phẩm làm tạm tính
   còn 420.000đ, **Then** mã vẫn hiển thị ở trạng thái "chưa đủ điều kiện" kèm "cần mua thêm
   80.000đ", không có khoản giảm và tổng tiền không giảm.
4. **Given** mã đang "chưa đủ điều kiện", **When** khách thêm sản phẩm để tạm tính ≥ 500.000đ,
   **Then** mã tự có hiệu lực lại và khoản giảm 50.000đ xuất hiện mà không cần nhập lại.
5. **Given** mã đang "chưa đủ điều kiện", **When** khách bấm "Đặt hàng", **Then** không tạo đơn và
   khách được yêu cầu mua thêm hoặc gỡ mã; sau khi gỡ mã, khách đặt hàng được với tổng không giảm.

---

### User Story 4 - Xem mã đã dùng trong chi tiết đơn hàng (Priority: P2)

Sau khi đặt hàng, khách (và nhân viên) mở trang chi tiết đơn hàng và thấy mã giảm giá đã dùng cùng
số tiền được giảm, bên cạnh tạm tính, phí giao hàng và tổng tiền.

**Why this priority**: Giúp khách đối chiếu số tiền và giúp marketing biết mã nào đã được dùng;
phụ thuộc vào Story 1.

**Independent Test**: Đặt một đơn có mã, mở chi tiết đơn, kiểm tra mã và số tiền giảm; đặt một đơn
không mã và kiểm tra không có dòng giảm giá.

**Acceptance Scenarios**:

1. **Given** một đơn đã đặt với `GIAM50K`, **When** mở chi tiết đơn, **Then** thấy mã `GIAM50K`, giảm
   50.000đ và tổng tiền khớp lúc đặt.
2. **Given** một đơn đặt không dùng mã, **When** mở chi tiết đơn, **Then** không hiển thị dòng giảm
   giá.
3. **Given** các đơn đã tồn tại trước khi có tính năng này, **When** mở danh sách hoặc chi tiết,
   **Then** vẫn hiển thị bình thường như đơn không dùng mã.

---

### Edge Cases

- Tạm tính đúng bằng giá trị tối thiểu (300.000đ với `SHOPLITE10`, 500.000đ với `GIAM50K`): mã
  được áp dụng. Thấp hơn 1đ: bị từ chối, báo cần mua thêm 1đ.
- Mã phần trăm ngay tại ngưỡng mức giảm tối đa (`SHOPLITE10` với tạm tính 1.000.000đ → giảm đúng
  100.000đ) và vượt ngưỡng (1.000.001đ → vẫn 100.000đ).
- Phần trăm ra số lẻ (ví dụ 10% của 333.333đ): làm tròn xuống đến đồng.
- Ngày hết hạn: mã dùng được đến hết ngày 28/02/2026 (giờ Việt Nam), từ 00:00 ngày 01/03/2026 thì
  hết hạn.
- Số tiền giảm không bao giờ vượt quá tạm tính; tổng tiền không bao giờ âm.
- Đơn sát ngưỡng miễn ship: tạm tính 500.000đ + `GIAM50K` → vẫn miễn ship tiêu chuẩn, tổng
  450.000đ; dùng mã không bao giờ làm tổng tiền tăng (FR-007).
- Khách thay đổi giỏ hàng sau khi đã áp dụng mã: số tiền giảm được tính lại ngay. Nếu tạm tính
  xuống dưới mức tối thiểu (ví dụ `GIAM50K` từ 600.000đ xuống 420.000đ), mã chuyển sang "chưa đủ
  điều kiện", báo cần mua thêm 80.000đ, tổng tiền không giảm; tăng lại đúng 500.000đ thì mã tự có
  hiệu lực lại (FR-017, FR-017a).
- Với mã phần trăm, tạm tính giảm nhưng vẫn ≥ tối thiểu: số tiền giảm được tính lại theo tạm tính
  mới (ví dụ `SHOPLITE10` từ 400.000đ → 300.000đ: giảm từ 40.000đ còn 30.000đ).
- Mã hết hạn hoặc mất điều kiện trong khoảng giữa lúc áp dụng và lúc đặt hàng (ví dụ áp dụng
  `TET2026` lúc 23:59 ngày 28/02/2026, bấm đặt hàng lúc 00:00 ngày 01/03/2026): đơn bị từ chối,
  không tạo đơn, mã bị gỡ, khách thấy lý do và tổng tiền mới (FR-013).
- Khách cố tình gửi số tiền giảm hoặc tổng tiền tự sửa: hệ thống bỏ qua và dùng số tự tính.
- Khách gửi nhiều mã cùng lúc: hệ thống chỉ chấp nhận một mã.
- Hủy đơn có dùng mã: đơn chuyển sang đã hủy như bình thường; vì không giới hạn lượt dùng nên
  không cần hoàn lại lượt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Trang thanh toán MUST có ô nhập mã giảm giá (có nhãn) và nút "Áp dụng".
- **FR-002**: Hệ thống MUST nhận mã không phân biệt chữ hoa/thường và bỏ khoảng trắng đầu/cuối.
- **FR-003**: Hệ thống MUST hỗ trợ hai loại mã: (a) giảm theo phần trăm của tạm tính, có mức giảm
  tối đa; (b) giảm một số tiền cố định.
- **FR-004**: Mỗi mã MAY có giá trị đơn tối thiểu (so với tạm tính) và ngày hết hạn; mã không có
  điều kiện nào thì luôn hợp lệ.
- **FR-005**: Số tiền giảm MUST được tính trên tạm tính tiền hàng (trước phí giao hàng), làm tròn
  xuống đến đồng, không vượt mức giảm tối đa (với mã phần trăm) và không vượt tạm tính.
- **FR-006**: Tổng tiền MUST bằng tạm tính − số tiền giảm + phí giao hàng, và không âm.
- **FR-007**: Phí giao hàng và điều kiện miễn phí giao hàng MUST được xác định trên tạm tính
  trước giảm giá, theo đúng quy tắc hiện hành; áp dụng hay gỡ mã MUST NOT làm thay đổi phí giao
  hàng (ví dụ tạm tính 520.000đ, `GIAM50K`, giao tiêu chuẩn → phí 0đ, tổng 470.000đ).
- **FR-008**: Khi mã hợp lệ, tóm tắt đơn hàng MUST hiển thị ngay mã đã áp dụng, số tiền giảm và
  tổng tiền mới, không cần tải lại trang.
- **FR-009**: Khi mã không hợp lệ, hệ thống MUST hiển thị thông báo tiếng Việt đúng một trong các
  lý do: mã không tồn tại; mã đã hết hạn; đơn chưa đạt giá trị tối thiểu (kèm giá trị tối thiểu và
  số tiền cần mua thêm). Tổng tiền MUST giữ nguyên.
- **FR-010**: Mỗi đơn hàng MUST áp dụng tối đa một mã; áp dụng mã mới MUST thay thế mã cũ.
- **FR-011**: Khách MUST gỡ được mã đã áp dụng; sau khi gỡ, tổng tiền trở về như chưa giảm.
- **FR-012**: Khi đặt hàng, hệ thống MUST tự kiểm tra lại mã và tự tính lại số tiền giảm, phí giao
  hàng, tổng tiền từ giá sản phẩm hiện hành; MUST bỏ qua mọi số tiền giảm/tổng tiền do trình duyệt
  gửi lên.
- **FR-013**: Nếu mã không còn hợp lệ tại thời điểm đặt hàng (hết hạn, không tồn tại, hoặc chưa
  đạt giá trị tối thiểu theo giá hiện hành), hệ thống MUST từ chối đặt hàng và không tạo đơn; MUST
  báo đúng lý do theo FR-009; trang thanh toán MUST tự gỡ mã khỏi tóm tắt, hiển thị tổng tiền không
  giảm và giữ nguyên thông tin khách đã nhập. Hệ thống MUST NOT tự tạo đơn với tổng tiền khác con
  số khách đã thấy.
- **FR-014**: Đơn hàng đã đặt MUST lưu mã đã dùng (nếu có) và số tiền được giảm; các giá trị này
  MUST không thay đổi về sau kể cả khi mã hết hạn.
- **FR-015**: Trang chi tiết đơn hàng MUST hiển thị mã đã dùng và số tiền giảm khi đơn có dùng mã;
  không hiển thị dòng giảm giá khi đơn không dùng mã.
- **FR-016**: Các đơn hàng đã có trước tính năng này MUST tiếp tục hiển thị đúng (coi như không
  dùng mã).
- **FR-017**: Khi giỏ hàng thay đổi sau khi áp dụng mã, hệ thống MUST tính lại số tiền giảm ngay.
  Nếu tạm tính xuống dưới giá trị tối thiểu, mã MUST được giữ ở trạng thái "chưa đủ điều kiện":
  không giảm tiền, tổng tiền hiển thị không giảm, tóm tắt hiển thị giá trị tối thiểu và số tiền cần
  mua thêm. Khi tạm tính đạt lại giá trị tối thiểu, mã MUST tự có hiệu lực lại mà khách không phải
  nhập lại.
- **FR-017a**: Khi mã đang ở trạng thái "chưa đủ điều kiện", bấm "Đặt hàng" MUST NOT tạo đơn; trang
  thanh toán MUST hiển thị thông báo tại phần mã giảm giá yêu cầu khách mua thêm hoặc gỡ mã. Nếu yêu
  cầu vẫn đến được hệ thống, áp dụng FR-013.
- **FR-018**: Hệ thống MUST có sẵn ba mã ban đầu:
  - `SHOPLITE10`: giảm 10%, tối đa 100.000đ, đơn từ 300.000đ, không hết hạn.
  - `GIAM50K`: giảm 50.000đ, đơn từ 500.000đ, không hết hạn.
  - `TET2026`: giảm 15%, tối đa 200.000đ, không yêu cầu giá trị tối thiểu, hết hạn sau ngày
    28/02/2026.
- **FR-019**: Mọi số tiền liên quan đến giảm giá MUST hiển thị theo định dạng tiền Việt Nam thống
  nhất với phần còn lại của cửa hàng.

### Key Entities *(include if feature involves data)*

- **Mã giảm giá (Discount Code)**: mã định danh (chữ in hoa, duy nhất), loại (phần trăm / số tiền
  cố định), giá trị giảm (phần trăm hoặc số tiền), mức giảm tối đa (chỉ với loại phần trăm), giá
  trị đơn tối thiểu (tùy chọn), ngày hết hạn (tùy chọn). Danh sách mã được định nghĩa sẵn trong hệ
  thống, không có giao diện quản trị.
- **Kết quả áp dụng mã**: hợp lệ (kèm số tiền giảm) hoặc không hợp lệ (kèm lý do: không tồn tại /
  hết hạn / chưa đạt tối thiểu kèm số tiền còn thiếu). Ở trang thanh toán, mã đã áp dụng có hai
  trạng thái: "đang giảm" và "chưa đủ điều kiện" (giữ mã, không giảm, chờ đạt tối thiểu).
- **Đơn hàng (mở rộng)**: thêm mã giảm giá đã dùng (tùy chọn) và số tiền được giảm; tổng tiền phản
  ánh khoản giảm.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Khách áp dụng một mã hợp lệ và thấy tổng tiền mới trong vòng 1 giây sau khi bấm
  "Áp dụng".
- **SC-002**: 100% đơn hàng có mã được lưu với số tiền giảm và tổng tiền đúng theo quy tắc, kể cả
  khi trình duyệt gửi con số bị sửa đổi.
- **SC-003**: 100% lần nhập mã không hợp lệ hiển thị đúng một trong ba lý do đã định nghĩa; với lý
  do chưa đạt tối thiểu, số tiền cần mua thêm chính xác đến từng đồng.
- **SC-004**: Khách hoàn tất áp dụng mã → đặt hàng mà không cần nhiều hơn 2 thao tác so với luồng
  thanh toán hiện tại (nhập mã, bấm "Áp dụng").
- **SC-005**: Tất cả đơn hàng cũ vẫn mở xem được sau khi phát hành tính năng.
- **SC-006** (kinh doanh): Marketing đo được số đơn dùng từng mã và tổng số tiền đã giảm dựa trên
  dữ liệu đơn hàng đã lưu.

## Assumptions

- Khách không cần đăng nhập; mọi khách đều dùng được mọi mã (không có mã riêng cho từng khách).
- Không giới hạn số lượt dùng mỗi mã; không có trang quản trị — thêm/sửa mã bằng cách cập nhật dữ
  liệu định nghĩa sẵn.
- "Giá trị đơn hàng" để xét điều kiện tối thiểu và tính phần trăm là tạm tính tiền hàng, không gồm
  phí giao hàng.
- Ngày hết hạn tính theo giờ Việt Nam (UTC+7) và bao gồm trọn ngày hết hạn.
- `SHOPLITE10` và `GIAM50K` không có ngày hết hạn; `TET2026` không có giá trị tối thiểu (mô tả gốc
  không nêu).
- Mã giảm giá không lưu cùng giỏ hàng: rời trang thanh toán rồi quay lại có thể phải nhập lại mã.
- Giảm giá không áp lên phí giao hàng.
- Quy tắc hiện có (giới hạn số lượng, tồn kho, chỉ hủy đơn khi "Chờ xác nhận") giữ nguyên.

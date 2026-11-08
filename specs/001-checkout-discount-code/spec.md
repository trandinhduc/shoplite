# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `daopta` (thư mục spec: `001-checkout-discount-code`)

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Tính năng: Mã giảm giá khi thanh toán cho ShopLite. Khách nhập mã ở trang thanh toán, bấm 'Áp dụng', thấy ngay số tiền giảm và tổng mới; có thể gỡ mã. Hai loại mã: phần trăm (có mức giảm tối đa) và số tiền cố định. Mã có thể có giá trị đơn tối thiểu và ngày hết hạn. Mỗi đơn chỉ một mã. Thông báo rõ lý do khi mã không hợp lệ. Đơn lưu mã và số tiền giảm, hiển thị ở trang chi tiết đơn. Hệ thống tự xác nhận lại số tiền giảm và tổng tiền khi đặt hàng. Mã ban đầu: SHOPLITE10, GIAM50K, TET2026. Ngoài phạm vi: trang quản trị mã, giới hạn lượt dùng, mã riêng từng khách."

## Clarifications

### Session 2026-11-08

- Q: Khi khách đã áp mã thành công nhưng mã hết hạn trước lúc bấm "Đặt hàng", hệ thống nên làm gì? → A: Từ chối tạo đơn và báo "Mã giảm giá đã hết hạn"; mã vẫn hiển thị trên trang thanh toán (không tự gỡ), khách phải tự bấm "Gỡ mã" rồi đặt lại.
- Q: Khi khách đã áp mã rồi xóa bớt sản phẩm làm tạm tính dưới mức tối thiểu, mã xử lý thế nào? → A: Giữ mã trên trang nhưng tạm ngưng hiệu lực (không trừ tiền), báo cần mua thêm bao nhiêu; khi tạm tính đạt ngưỡng trở lại, mã tự có hiệu lực lại; nếu đặt hàng lúc mã đang tạm ngưng thì bị từ chối như trường hợp mã hết hạn.
- Q: Ngưỡng miễn phí giao hàng 500.000đ xét trên tạm tính trước hay sau giảm giá? → A: Sau giảm giá — đơn giao tiêu chuẩn chỉ được miễn phí ship khi (tạm tính − giảm giá) ≥ 500.000đ.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Áp dụng mã hợp lệ và đặt hàng với giá đã giảm (Priority: P1)

Khách hàng ở trang thanh toán nhập một mã giảm giá vào ô "Mã giảm giá" rồi bấm "Áp dụng". Phần tóm tắt đơn hàng lập tức hiện thêm dòng "Giảm giá (MÃ)" với số tiền được giảm, và tổng tiền được cập nhật. Khách hoàn tất thông tin giao hàng và đặt hàng; đơn được tạo với đúng số tiền giảm do hệ thống tính.

**Why this priority**: Đây là giá trị cốt lõi mà marketing cần — không có luồng này thì chương trình khuyến mãi không chạy được.

**Independent Test**: Thêm sản phẩm tổng 400.000đ vào giỏ, vào thanh toán, áp dụng `SHOPLITE10`, thấy giảm 40.000đ, đặt hàng thành công và đơn tạo ra có giảm giá 40.000đ.

**Acceptance Scenarios**:

1. **Given** giỏ hàng có tạm tính 400.000đ, **When** khách nhập `SHOPLITE10` và bấm "Áp dụng", **Then** tóm tắt hiện giảm 40.000đ và tổng tiền = 400.000 − 40.000 + phí giao hàng.
2. **Given** giỏ hàng có tạm tính 1.500.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** số tiền giảm là 100.000đ (mức tối đa), không phải 150.000đ.
3. **Given** giỏ hàng có tạm tính 600.000đ, **When** khách áp dụng `GIAM50K`, **Then** số tiền giảm là 50.000đ.
4. **Given** khách đã áp dụng mã hợp lệ, **When** khách bấm "Đặt hàng", **Then** đơn được tạo với mã đó và số tiền giảm do hệ thống tự tính lại, khớp với số đã hiển thị.
5. **Given** giỏ hàng có tạm tính 520.000đ và chọn giao tiêu chuẩn (đang được miễn phí ship), **When** khách áp dụng `GIAM50K`, **Then** tóm tắt hiện giảm 50.000đ, phí giao hàng 30.000đ (vì 470.000đ < 500.000đ) và tổng tiền 500.000đ.
6. **Given** giỏ hàng có tạm tính 550.000đ và chọn giao tiêu chuẩn, **When** khách áp dụng `GIAM50K`, **Then** tạm tính sau giảm đúng 500.000đ nên vẫn miễn phí ship, tổng tiền 500.000đ.
7. **Given** khách nhập `shoplite10` (chữ thường) hoặc có khoảng trắng thừa ở đầu/cuối, **When** bấm "Áp dụng", **Then** mã vẫn được nhận như `SHOPLITE10`.

---

### User Story 2 - Thông báo rõ lý do khi mã không hợp lệ (Priority: P1)

Khi mã không dùng được, khách thấy ngay cạnh ô nhập một thông báo tiếng Việt nêu đúng lý do, để biết nên làm gì tiếp (sửa mã, đổi mã, hay mua thêm).

**Why this priority**: Không có thông báo rõ, khách sẽ bối rối và bỏ đơn — đi ngược mục tiêu tăng tỷ lệ chốt đơn. Đồng thời yêu cầu "cần mua thêm bao nhiêu" trực tiếp phục vụ mục tiêu tăng giá trị đơn.

**Independent Test**: Thử lần lượt một mã không tồn tại, `TET2026` (đã hết hạn), và `GIAM50K` với tạm tính 450.000đ; mỗi lần thấy đúng thông báo tương ứng và tổng tiền không đổi.

**Acceptance Scenarios**:

1. **Given** khách nhập `KHONGCO`, **When** bấm "Áp dụng", **Then** thấy thông báo "Mã giảm giá không tồn tại" và không có giảm giá nào được áp dụng.
2. **Given** hôm nay sau ngày 28/02/2026, **When** khách áp dụng `TET2026`, **Then** thấy thông báo "Mã giảm giá đã hết hạn".
3. **Given** tạm tính 450.000đ, **When** khách áp dụng `GIAM50K`, **Then** thấy thông báo cho biết đơn tối thiểu 500.000đ và cần mua thêm 50.000đ.
4. **Given** tạm tính đúng 500.000đ, **When** khách áp dụng `GIAM50K`, **Then** mã được áp dụng (bằng ngưỡng là đạt).
5. **Given** tạm tính 299.999đ, **When** khách áp dụng `SHOPLITE10`, **Then** bị từ chối và báo cần mua thêm 1đ; với 300.000đ thì được áp dụng.
6. **Given** ô mã để trống (hoặc chỉ có khoảng trắng), **When** bấm "Áp dụng", **Then** thấy thông báo yêu cầu nhập mã.

---

### User Story 3 - Gỡ mã và đổi mã (Priority: P2)

Khách đã áp dụng một mã có thể gỡ mã đó để quay lại giá gốc, hoặc áp dụng mã khác thay thế. Đơn hàng không bao giờ có nhiều hơn một mã.

**Why this priority**: Cần thiết cho trải nghiệm linh hoạt, nhưng luồng chính vẫn hoạt động được nếu thiếu.

**Independent Test**: Áp dụng `SHOPLITE10`, bấm "Gỡ mã", thấy tổng trở về giá gốc; sau đó áp dụng `GIAM50K` và thấy chỉ `GIAM50K` có hiệu lực.

**Acceptance Scenarios**:

1. **Given** đã áp dụng `SHOPLITE10`, **When** khách bấm "Gỡ mã", **Then** dòng giảm giá biến mất và tổng tiền trở về như chưa có mã.
2. **Given** đã áp dụng `SHOPLITE10`, **When** khách áp dụng thành công `GIAM50K`, **Then** `GIAM50K` thay thế `SHOPLITE10`; chỉ một mã được tính.
3. **Given** đã áp dụng `SHOPLITE10`, **When** khách thử áp dụng một mã không hợp lệ, **Then** thấy thông báo lỗi và mã `SHOPLITE10` vẫn giữ nguyên.
4. **Given** đã áp `GIAM50K` với tạm tính 600.000đ, **When** khách xóa bớt sản phẩm còn tạm tính 450.000đ, **Then** mã `GIAM50K` vẫn hiển thị nhưng không trừ tiền, kèm thông báo "Đơn hàng chưa đạt giá trị tối thiểu 500.000đ. Mua thêm 50.000đ để dùng mã này.", và tổng tiền là giá chưa giảm.
5. **Given** mã `GIAM50K` đang tạm ngưng ở tạm tính 450.000đ, **When** khách thêm hàng để tạm tính đạt 500.000đ, **Then** mã tự có hiệu lực lại (giảm 50.000đ) mà khách không phải bấm "Áp dụng" lại.
6. **Given** mã `GIAM50K` đang tạm ngưng, **When** khách bấm "Đặt hàng", **Then** đơn không được tạo và khách thấy lại thông báo cần mua thêm bao nhiêu; mã vẫn giữ trên trang.

---

### User Story 4 - Xem mã và số tiền giảm trong chi tiết đơn hàng (Priority: P2)

Sau khi đặt, khách (và nhân viên) mở trang chi tiết đơn hàng thấy mã đã dùng và số tiền được giảm, cùng với tạm tính, phí giao hàng và tổng tiền.

**Why this priority**: Cần cho đối soát và minh bạch với khách, nhưng phụ thuộc vào US1.

**Independent Test**: Đặt một đơn có `GIAM50K`, mở trang chi tiết đơn, thấy "Mã giảm giá: GIAM50K" và "Giảm giá: −50.000đ".

**Acceptance Scenarios**:

1. **Given** đơn được đặt với `GIAM50K`, **When** mở trang chi tiết đơn, **Then** thấy mã `GIAM50K`, số tiền giảm 50.000đ, và tổng tiền đã trừ giảm giá.
2. **Given** đơn được đặt không dùng mã, **When** mở trang chi tiết đơn, **Then** không hiện dòng giảm giá.
3. **Given** đơn đã đặt với một mã, **When** sau đó mã hết hạn hoặc điều kiện mã thay đổi, **Then** đơn cũ vẫn hiển thị đúng mã và số tiền giảm tại thời điểm đặt.

---

### User Story 5 - Chống gian lận: hệ thống tự xác nhận khi đặt hàng (Priority: P1)

Khi đặt hàng, hệ thống tự kiểm tra lại mã và tự tính số tiền giảm và tổng tiền từ giá sản phẩm hiện hành, bỏ qua mọi con số giảm giá hay tổng tiền mà trình duyệt gửi lên.

**Why this priority**: Bắt buộc theo yêu cầu kinh doanh và nguyên tắc "server là nguồn sự thật về tiền" — nếu thiếu, khuyến mãi có thể bị lợi dụng gây thất thoát.

**Independent Test**: Gửi yêu cầu đặt hàng kèm mã `SHOPLITE10` và một số tiền giảm/tổng tiền bịa ra; đơn tạo ra vẫn có số tiền giảm do hệ thống tính.

**Acceptance Scenarios**:

1. **Given** yêu cầu đặt hàng kèm mã `SHOPLITE10` và một "số tiền giảm" tự khai 500.000đ, **When** hệ thống xử lý, **Then** con số tự khai bị bỏ qua và đơn chỉ được giảm theo quy tắc của mã.
2. **Given** yêu cầu đặt hàng kèm mã đã hết hạn hoặc không tồn tại, **When** hệ thống xử lý, **Then** đơn không được tạo và khách nhận thông báo lý do tương ứng.
3. **Given** khách đã áp dụng mã khi tạm tính đạt ngưỡng, nhưng lúc đặt hàng tạm tính (tính lại từ giá hiện hành) không còn đạt ngưỡng, **When** hệ thống xử lý, **Then** đơn không được tạo và khách được báo đơn chưa đạt giá trị tối thiểu, cần mua thêm bao nhiêu.
4. **Given** khách đã áp `TET2026` lúc 23:58 ngày 28/02/2026, **When** khách bấm "Đặt hàng" lúc 00:01 ngày 01/03/2026, **Then** đơn không được tạo, thông báo "Mã giảm giá đã hết hạn" hiển thị cạnh ô mã, mã vẫn còn trên trang; khách bấm "Gỡ mã" rồi bấm "Đặt hàng" lại thì đơn được tạo với giá gốc.

---

### Edge Cases

- **Giỏ hàng thay đổi sau khi áp dụng mã** (thêm/bớt số lượng, xóa sản phẩm): số tiền giảm được tính lại theo tạm tính mới; nếu tạm tính rơi xuống dưới mức tối thiểu, mã vẫn được giữ nhưng tạm ngưng hiệu lực (không trừ tiền) kèm thông báo cần mua thêm bao nhiêu; khi tạm tính đạt ngưỡng trở lại, mã tự có hiệu lực lại.
- **Số tiền giảm lớn hơn tạm tính** (ví dụ mã cố định với đơn nhỏ nếu không có ngưỡng tối thiểu): số tiền giảm không vượt quá tạm tính; tạm tính sau giảm không âm.
- **Làm tròn khi giảm theo phần trăm**: số tiền giảm được làm tròn xuống đến đồng nguyên (ví dụ 10% của 333.335đ = 33.333đ).
- **Mã hết hạn đúng ngày**: mã còn dùng được đến hết ngày hết hạn (23:59:59 giờ Việt Nam); từ 00:00 ngày hôm sau thì hết hạn.
- **Mã hết hạn trong lúc khách đang thanh toán**: khi bấm đặt hàng, hệ thống kiểm tra lại và từ chối tạo đơn với thông báo "Mã giảm giá đã hết hạn"; mã KHÔNG tự bị gỡ — khách phải tự bấm "Gỡ mã" (hoặc áp mã khác) rồi đặt lại.
- **Mã vừa hết hạn vừa chưa đạt ngưỡng**: chỉ báo một lý do, theo thứ tự ưu tiên: không tồn tại → đã hết hạn → chưa đạt giá trị tối thiểu.
- **Tải lại trang thanh toán**: mã đã áp dụng không bắt buộc được giữ lại; khách có thể phải nhập lại.
- **Áp mã làm mất miễn phí ship**: nếu tạm tính sau giảm rơi xuống dưới 500.000đ, đơn giao tiêu chuẩn bị tính phí ship 30.000đ; tóm tắt đơn MUST hiển thị rõ dòng phí ship mới để khách hiểu vì sao tổng tiền giảm ít hơn số tiền được giảm.
- **Giỏ hàng trống**: không cho áp dụng mã (trang thanh toán vốn không cho đặt khi giỏ trống).

## Requirements _(mandatory)_

### Functional Requirements

**Áp dụng và gỡ mã**

- **FR-001**: Trang thanh toán MUST có ô nhập "Mã giảm giá" (có nhãn rõ ràng) và nút "Áp dụng".
- **FR-002**: Hệ thống MUST nhận mã không phân biệt hoa/thường và bỏ khoảng trắng ở đầu/cuối.
- **FR-003**: Khi mã hợp lệ, phần tóm tắt đơn hàng MUST hiển thị ngay mã đã áp dụng, số tiền được giảm và tổng tiền mới, không cần tải lại trang.
- **FR-004**: Khách MUST gỡ được mã đã áp dụng; sau khi gỡ, tóm tắt đơn trở về như chưa có mã.
- **FR-005**: Mỗi đơn hàng MUST có tối đa một mã. Áp dụng thành công mã mới MUST thay thế mã cũ; áp dụng mã mới thất bại MUST giữ nguyên mã cũ.
- **FR-006**: Khi tạm tính thay đổi sau khi đã áp dụng mã, số tiền giảm và tổng tiền hiển thị MUST được tính lại. Nếu tạm tính dưới mức tối thiểu, mã MUST được giữ trên trang ở trạng thái tạm ngưng: không trừ tiền, hiển thị thông báo cần mua thêm bao nhiêu (theo FR-013). Khi tạm tính đạt ngưỡng trở lại, mã MUST tự có hiệu lực lại mà khách không phải áp dụng lại. Đặt hàng khi mã đang tạm ngưng MUST bị từ chối theo FR-018.

**Loại mã và cách tính**

- **FR-007**: Hệ thống MUST hỗ trợ mã giảm theo phần trăm, có mức giảm tối đa: số tiền giảm = min(tạm tính × phần trăm, mức tối đa), làm tròn xuống đến đồng.
- **FR-008**: Hệ thống MUST hỗ trợ mã giảm số tiền cố định.
- **FR-009**: Số tiền giảm MUST không vượt quá tạm tính (giá trị hàng hóa); giảm giá chỉ áp dụng lên tạm tính, không áp dụng lên phí giao hàng.
- **FR-010**: Mỗi mã MAY có giá trị đơn tối thiểu, so sánh với tạm tính (trước giảm giá, chưa gồm phí giao hàng); tạm tính bằng ngưỡng được coi là đạt.
- **FR-011**: Mỗi mã MAY có ngày hết hạn; mã dùng được đến hết ngày đó theo giờ Việt Nam.
- **FR-012**: Ngưỡng miễn phí giao hàng tiêu chuẩn (500.000đ) MUST được xét trên tạm tính **sau giảm giá** (tạm tính − số tiền giảm); bằng ngưỡng được coi là đạt. Ví dụ: tạm tính 520.000đ áp `GIAM50K` còn 470.000đ → phí ship tiêu chuẩn 30.000đ, tổng 500.000đ; tạm tính 550.000đ áp `GIAM50K` còn 500.000đ → miễn phí ship, tổng 500.000đ. Mã ở trạng thái tạm ngưng không trừ tiền nên không ảnh hưởng ngưỡng. Giao nhanh giữ nguyên quy tắc hiện tại (không bao giờ miễn phí).

**Thông báo lỗi**

- **FR-013**: Khi mã không dùng được, hệ thống MUST hiển thị cạnh ô nhập mã một thông báo tiếng Việt nêu đúng một lý do:
  - "Mã giảm giá không tồn tại" — mã không có trong danh sách.
  - "Mã giảm giá đã hết hạn" — đã qua ngày hết hạn.
  - "Đơn hàng chưa đạt giá trị tối thiểu [X]. Mua thêm [Y] để dùng mã này." — với X là ngưỡng và Y = X − tạm tính.
  - Yêu cầu nhập mã khi ô để trống.
- **FR-014**: Khi nhiều lý do cùng đúng, hệ thống MUST báo theo thứ tự ưu tiên: không tồn tại → đã hết hạn → chưa đạt giá trị tối thiểu.
- **FR-015**: Mọi số tiền trong thông báo và tóm tắt MUST hiển thị theo định dạng tiền tệ thống nhất của cửa hàng.

**Xác nhận khi đặt hàng (chống gian lận)**

- **FR-016**: Yêu cầu đặt hàng MUST chỉ mang theo mã giảm giá (nếu có), không mang số tiền giảm hay tổng tiền; mọi con số tiền do trình duyệt gửi lên MUST bị bỏ qua.
- **FR-017**: Khi đặt hàng, hệ thống MUST tự kiểm tra lại mã (tồn tại, còn hạn, đạt ngưỡng) dựa trên tạm tính tính lại từ giá sản phẩm hiện hành, và tự tính số tiền giảm và tổng tiền.
- **FR-018**: Nếu mã không còn hợp lệ lúc đặt hàng, hệ thống MUST từ chối tạo đơn và trả về đúng lý do như FR-013, thay vì âm thầm đặt đơn không có giảm giá. Thông báo hiển thị cạnh ô mã; mã MUST vẫn được giữ trên trang thanh toán (không tự gỡ) cho đến khi khách tự gỡ hoặc áp mã khác.

**Lưu trữ và hiển thị đơn**

- **FR-019**: Đơn hàng MUST lưu mã đã dùng và số tiền được giảm như một bản chụp tại thời điểm đặt; thay đổi hay hết hạn của mã sau này MUST NOT ảnh hưởng đơn cũ.
- **FR-020**: Trang chi tiết đơn hàng MUST hiển thị mã đã dùng và số tiền được giảm (khi có), cùng tạm tính, phí giao hàng và tổng tiền.
- **FR-021**: Đơn hàng không dùng mã MUST hiển thị như hiện tại; đơn cũ tạo trước khi có tính năng MUST vẫn hiển thị bình thường.

**Dữ liệu mã ban đầu**

- **FR-022**: Hệ thống MUST có sẵn các mã:

  | Mã           | Loại      | Giá trị | Giảm tối đa | Đơn tối thiểu | Hết hạn    |
  | ------------ | --------- | ------- | ----------- | ------------- | ---------- |
  | `SHOPLITE10` | Phần trăm | 10%     | 100.000đ    | 300.000đ      | Không      |
  | `GIAM50K`    | Cố định   | 50.000đ | —           | 500.000đ      | Không      |
  | `TET2026`    | Phần trăm | 15%     | 200.000đ    | Không         | 28/02/2026 |

### Key Entities _(include if feature involves data)_

- **Mã giảm giá (Discount Code)**: chương trình khuyến mãi khách có thể nhập. Thuộc tính: mã (duy nhất, không phân biệt hoa/thường), loại (phần trăm / cố định), giá trị (phần trăm hoặc số tiền), mức giảm tối đa (chỉ cho loại phần trăm), giá trị đơn tối thiểu (tùy chọn), ngày hết hạn (tùy chọn). Danh sách mã do đội phát triển cấu hình, không có giao diện quản trị.
- **Kết quả áp dụng mã**: hoặc hợp lệ (mã, số tiền giảm), hoặc tạm ngưng (mã vẫn được giữ trên trang thanh toán nhưng tạm tính chưa đạt ngưỡng), hoặc không hợp lệ (lý do; với lý do chưa đạt ngưỡng thì kèm ngưỡng và số tiền cần mua thêm).
- **Đơn hàng (mở rộng)**: thêm mã giảm giá đã dùng (tùy chọn) và số tiền được giảm; tổng tiền = tạm tính − giảm giá + phí giao hàng.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Khách áp dụng được một mã hợp lệ và thấy tổng tiền mới trong vòng 1 giây sau khi bấm "Áp dụng".
- **SC-002**: 100% mã không hợp lệ hiển thị đúng một trong các lý do đã định nghĩa; với lý do chưa đạt ngưỡng, số tiền cần mua thêm chính xác đến từng đồng.
- **SC-003**: 100% đơn có mã có số tiền giảm và tổng tiền khớp với quy tắc của mã, kể cả khi yêu cầu đặt hàng chứa con số bị sửa đổi — không có đơn nào được giảm nhiều hơn quy tắc cho phép.
- **SC-004**: Số tiền giảm hiển thị ở trang thanh toán khớp với số lưu trong đơn ở 100% trường hợp giá sản phẩm không đổi giữa lúc áp dụng và lúc đặt.
- **SC-005**: Tất cả giá trị biên (dưới / bằng / trên ngưỡng tối thiểu; dưới / bằng / trên mức giảm tối đa; trước / đúng / sau ngày hết hạn) cho ra kết quả đúng như đặc tả.
- **SC-006**: Sau khi ra mắt, marketing đo được tỷ lệ đơn có dùng mã và giá trị trung bình của các đơn đó so với đơn không dùng mã (dựa trên dữ liệu mã đã lưu trong đơn).

## Assumptions

- "Giá trị đơn hàng" cho điều kiện tối thiểu và cơ sở tính phần trăm là **tạm tính** (tổng giá hàng), chưa gồm phí giao hàng, trước khi trừ giảm giá.
- Giảm giá chỉ trừ vào giá hàng, không giảm phí giao hàng; tổng tiền không bao giờ âm.
- Giảm theo phần trăm được làm tròn xuống đến đồng nguyên.
- Ngày hết hạn tính theo giờ Việt Nam (UTC+7), có hiệu lực đến hết ngày ghi trên mã.
- Mã không có ngày hết hạn thì luôn còn hiệu lực; mã không có ngưỡng tối thiểu áp dụng cho mọi đơn có tạm tính > 0.
- Mã đã áp dụng ở trang thanh toán không cần được giữ khi tải lại trang hoặc khi rời trang.
- Khi mã không còn hợp lệ lúc đặt hàng, đơn bị từ chối (không tự động đặt mà không giảm giá) để khách không bất ngờ về tổng tiền.
- Danh sách mã cố định do đội phát triển cấu hình; không có trang quản trị, không giới hạn số lượt dùng, không có mã riêng cho từng khách (ngoài phạm vi).
- Khách không cần đăng nhập để dùng mã (ShopLite hiện không có tài khoản khách hàng).
- Dùng lại trang thanh toán, phần tóm tắt đơn và trang chi tiết đơn hiện có. Quy tắc phí giao hàng hiện hành giữ nguyên, trừ việc ngưỡng miễn phí ship tiêu chuẩn nay xét trên tạm tính sau giảm giá (FR-012); với đơn không có mã, kết quả không đổi.

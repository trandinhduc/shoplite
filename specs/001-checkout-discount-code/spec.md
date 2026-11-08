# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `module2/DatNT` (thư mục spec: `001-checkout-discount-code`)

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Tính năng: Mã giảm giá khi thanh toán cho ShopLite. Khách nhập một mã ở trang thanh toán, bấm "Áp dụng", thấy ngay số tiền giảm và tổng mới; có thể gỡ mã. Hai loại mã: giảm theo phần trăm (có mức giảm tối đa) và giảm số tiền cố định; mã có thể có giá trị đơn tối thiểu và ngày hết hạn; mỗi đơn một mã; báo rõ lý do khi mã không hợp lệ (không tồn tại, hết hạn, chưa đạt tối thiểu kèm số tiền cần mua thêm); đơn hàng lưu mã và số tiền giảm, hiển thị ở trang chi tiết đơn; số tiền giảm và tổng cuối do hệ thống xác nhận lại khi đặt hàng. Mã ban đầu: SHOPLITE10, GIAM50K, TET2026. Ngoài phạm vi: trang quản trị mã, giới hạn lượt dùng, mã riêng cho từng khách."

## Clarifications

### Session 2026-11-08

- Q: Khi mã còn hạn lúc áp dụng nhưng hết hạn lúc bấm "Đặt hàng", hệ thống xử lý thế nào? → A: Từ
  chối đặt hàng, báo "Mã giảm giá đã hết hạn"; mã vẫn hiển thị trong tóm tắt nhưng bị đánh dấu lỗi
  và không trừ vào tổng; khách phải tự bấm "Gỡ mã" rồi đặt lại.
- Q: Khách đã áp mã rồi xóa bớt sản phẩm làm tạm tính dưới mức tối thiểu thì xử lý thế nào? → A: Giữ
  mã ở trạng thái lỗi, báo cần mua thêm X đồng, không trừ vào tổng; khi tạm tính đạt lại mức tối thiểu
  thì mã tự động có hiệu lực lại; đặt hàng khi mã đang lỗi bị từ chối như trường hợp hết hạn.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Áp dụng mã giảm giá hợp lệ và đặt hàng với giá đã giảm (Priority: P1)

Khách hàng có sản phẩm trong giỏ, vào trang thanh toán, nhập mã khuyến mãi (ví dụ `SHOPLITE10`) và
bấm "Áp dụng". Phần tóm tắt đơn hàng hiển thị ngay mã đã áp dụng, số tiền được giảm và tổng tiền
mới. Khách điền thông tin giao hàng và đặt hàng; đơn hàng được tạo với đúng số tiền giảm.

**Why this priority**: Đây là giá trị cốt lõi marketing cần: khách nhận được ưu đãi và hoàn tất đơn.
Không có luồng này thì tính năng không có giá trị.

**Independent Test**: Thêm sản phẩm tổng 400.000đ vào giỏ, áp dụng `SHOPLITE10`, đặt hàng; kiểm tra
tóm tắt hiển thị giảm 40.000đ và đơn hàng được tạo có tổng tiền đã trừ 40.000đ.

**Acceptance Scenarios**:

1. **Given** giỏ hàng có tạm tính 400.000đ, **When** khách nhập `SHOPLITE10` và bấm "Áp dụng",
   **Then** tóm tắt hiển thị "Giảm giá (SHOPLITE10): −40.000đ" và tổng tiền bằng 400.000đ trừ
   40.000đ cộng phí giao hàng.
2. **Given** giỏ hàng có tạm tính 2.000.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** số tiền
   giảm là 100.000đ (mức tối đa), không phải 200.000đ.
3. **Given** giỏ hàng có tạm tính 600.000đ, **When** khách áp dụng `GIAM50K`, **Then** số tiền giảm
   là 50.000đ.
4. **Given** khách đã áp dụng mã hợp lệ, **When** khách đặt hàng thành công, **Then** đơn hàng được
   tạo với số tiền giảm và tổng tiền do hệ thống tính lại, trùng với con số khách đã thấy.
5. **Given** khách nhập mã dạng chữ thường hoặc có khoảng trắng thừa (`shoplite10`), **When**
   bấm "Áp dụng", **Then** mã được nhận như `SHOPLITE10`.

---

### User Story 2 - Nhận thông báo rõ lý do khi mã không hợp lệ (Priority: P1)

Khách nhập một mã không dùng được. Hệ thống không áp dụng mã và hiển thị thông báo cụ thể bằng
tiếng Việt, ngay cạnh ô nhập mã, để khách biết phải làm gì tiếp.

**Why this priority**: Thông báo mơ hồ khiến khách bỏ giỏ hàng; riêng thông báo "cần mua thêm
X đồng" còn trực tiếp giúp tăng giá trị đơn — mục tiêu của marketing.

**Independent Test**: Lần lượt nhập mã không tồn tại, `TET2026` và `GIAM50K` với giỏ 450.000đ;
kiểm tra mỗi trường hợp hiển thị đúng lý do và tổng tiền không đổi.

**Acceptance Scenarios**:

1. **Given** bất kỳ giỏ hàng nào, **When** khách nhập `KHONGCO` và bấm "Áp dụng", **Then** hiển thị
   "Mã giảm giá không tồn tại" và tổng tiền không đổi.
2. **Given** ngày hiện tại sau 28/02/2026, **When** khách áp dụng `TET2026`, **Then** hiển thị
   "Mã giảm giá đã hết hạn" và tổng tiền không đổi.
3. **Given** giỏ hàng có tạm tính 450.000đ, **When** khách áp dụng `GIAM50K`, **Then** hiển thị
   thông báo đơn chưa đạt giá trị tối thiểu 500.000đ và cần mua thêm 50.000đ.
4. **Given** ô nhập mã đang trống, **When** khách bấm "Áp dụng", **Then** hiển thị "Vui lòng nhập
   mã giảm giá" và không gửi yêu cầu kiểm tra.
5. **Given** khách đã áp dụng một mã hợp lệ, **When** khách thử áp dụng một mã khác không hợp lệ,
   **Then** hiển thị lý do lỗi và mã hợp lệ trước đó vẫn được giữ nguyên.
6. **Given** khách đã áp dụng `GIAM50K` với tạm tính 600.000đ, **When** giỏ hàng giảm còn 450.000đ,
   **Then** mã vẫn hiển thị trong tóm tắt ở trạng thái lỗi kèm thông báo cần mua thêm 50.000đ, và
   tổng tiền không còn trừ 50.000đ.
7. **Given** tình huống ở #6, **When** giỏ hàng tăng lại lên từ 500.000đ trở lên, **Then** mã tự động
   có hiệu lực lại, thông báo lỗi biến mất và tổng tiền được trừ 50.000đ mà khách không cần nhập lại.
8. **Given** tình huống ở #6 và khách chưa gỡ mã, **When** khách bấm "Đặt hàng", **Then** đơn không
   được tạo và hiển thị lý do chưa đạt tối thiểu kèm số tiền cần mua thêm.

---

### User Story 3 - Gỡ hoặc thay mã đã áp dụng (Priority: P2)

Khách đã áp dụng một mã nhưng muốn bỏ, hoặc muốn đổi sang mã có lợi hơn. Khách bấm "Gỡ mã" để quay
về tổng tiền gốc, hoặc áp dụng mã khác để thay thế.

**Why this priority**: Cần thiết để khách tự kiểm soát lựa chọn, nhưng luồng chính vẫn hoạt động
được nếu chưa có.

**Independent Test**: Áp dụng `SHOPLITE10`, bấm "Gỡ mã" và kiểm tra tổng trở về ban đầu; sau đó áp
dụng `SHOPLITE10` rồi `GIAM50K` và kiểm tra chỉ còn `GIAM50K`.

**Acceptance Scenarios**:

1. **Given** khách đã áp dụng `SHOPLITE10`, **When** khách bấm "Gỡ mã", **Then** dòng giảm giá biến
   mất, tổng tiền trở về giá trị chưa giảm và ô nhập mã sẵn sàng nhận mã mới.
2. **Given** khách đã áp dụng `SHOPLITE10` với giỏ 600.000đ, **When** khách áp dụng thành công
   `GIAM50K`, **Then** `GIAM50K` thay thế `SHOPLITE10`; đơn chỉ có đúng một mã.

---

### User Story 4 - Xem mã và số tiền giảm trong chi tiết đơn hàng (Priority: P2)

Sau khi đặt hàng có dùng mã, khách mở trang chi tiết đơn hàng và thấy mã đã dùng, số tiền được giảm
cùng tổng tiền cuối cùng.

**Why this priority**: Giúp khách và cửa hàng đối chiếu số tiền; phụ thuộc vào Story 1.

**Independent Test**: Đặt một đơn có `GIAM50K`, mở trang chi tiết đơn và kiểm tra hiển thị mã,
"−50.000đ" và tổng tiền khớp với lúc đặt.

**Acceptance Scenarios**:

1. **Given** một đơn hàng đã đặt với `GIAM50K`, **When** khách mở trang chi tiết đơn, **Then** thấy
   tạm tính, dòng "Giảm giá (GIAM50K): −50.000đ", phí giao hàng và tổng tiền.
2. **Given** một đơn hàng không dùng mã (kể cả đơn tạo trước khi có tính năng này), **When** mở
   trang chi tiết, **Then** không hiển thị dòng giảm giá và tổng tiền giữ nguyên như trước.
3. **Given** một đơn đã dùng mã, **When** xem danh sách đơn hàng, **Then** tổng tiền hiển thị là
   tổng sau giảm.

---

### User Story 5 - Hệ thống chặn gian lận số tiền giảm (Priority: P1)

Khách có ý đồ sửa con số giảm giá hoặc tổng tiền trên trình duyệt, hoặc gửi trực tiếp yêu cầu đặt
hàng kèm số tiền tùy ý. Hệ thống bỏ qua mọi con số tiền từ phía khách, tự kiểm tra lại mã và tự tính
số tiền giảm, tổng tiền khi đặt hàng.

**Why this priority**: Sai số tiền gây thiệt hại trực tiếp cho cửa hàng; đây là yêu cầu bắt buộc.

**Independent Test**: Gửi yêu cầu đặt hàng kèm mã hợp lệ nhưng khai số tiền giảm/tổng tiền sai;
kiểm tra đơn được lưu với con số do hệ thống tính. Gửi yêu cầu kèm mã hết hạn; kiểm tra bị từ chối.

**Acceptance Scenarios**:

1. **Given** yêu cầu đặt hàng có mã `SHOPLITE10` và kèm theo con số giảm giá/tổng tiền tự khai,
   **When** hệ thống xử lý, **Then** các con số tự khai bị bỏ qua và đơn được lưu với số tiền do hệ
   thống tính.
2. **Given** yêu cầu đặt hàng kèm mã không tồn tại, đã hết hạn hoặc đơn chưa đạt tối thiểu, **When**
   hệ thống xử lý, **Then** đơn hàng không được tạo và khách nhận lý do tương ứng như ở Story 2.
3. **Given** khách áp dụng mã khi còn hợp lệ nhưng mã hết hạn trước lúc bấm đặt hàng, **When** đặt
   hàng, **Then** đơn không được tạo; trang thanh toán hiển thị "Mã giảm giá đã hết hạn" cạnh ô mã,
   mã vẫn nằm trong tóm tắt nhưng bị đánh dấu lỗi và không trừ vào tổng; giỏ hàng và thông tin đã
   điền được giữ nguyên.
4. **Given** tình huống ở #3, **When** khách bấm "Gỡ mã" rồi bấm "Đặt hàng" lại, **Then** đơn được
   tạo với tổng tiền chưa giảm.
5. **Given** tình huống ở #3 và khách chưa gỡ mã, **When** khách bấm "Đặt hàng" lần nữa, **Then** đơn
   vẫn bị từ chối với cùng lý do (hệ thống không tự bỏ mã).

---

### Edge Cases

- **Biên giá trị tối thiểu**: tạm tính đúng bằng mức tối thiểu (300.000đ với `SHOPLITE10`,
  500.000đ với `GIAM50K`) → hợp lệ; thấp hơn 1đ → không hợp lệ, báo cần mua thêm 1đ.
- **Biên mức giảm tối đa**: với `SHOPLITE10`, tạm tính 1.000.000đ → giảm đúng 100.000đ; 1.000.010đ
  → vẫn giảm 100.000đ.
- **Làm tròn**: số tiền giảm theo phần trăm được làm tròn xuống đến đồng (ví dụ 10% của 333.333đ =
  33.333đ).
- **Giảm vượt tạm tính**: số tiền giảm không bao giờ vượt quá tạm tính; tổng tiền hàng sau giảm
  không âm.
- **Biên ngày hết hạn**: mã hết hạn ngày 28/02/2026 vẫn dùng được đến hết 23:59:59 ngày 28/02/2026
  (giờ Việt Nam) và không dùng được từ 00:00 ngày 01/03/2026.
- **Giỏ hàng thay đổi sau khi áp mã**: nếu khách thay đổi giỏ (ví dụ ở tab khác) làm tạm tính thay
  đổi, số tiền giảm được tính lại theo giỏ mới; nếu tạm tính rơi xuống dưới mức tối thiểu, mã được
  giữ ở trạng thái lỗi kèm thông báo cần mua thêm bao nhiêu và không được trừ vào tổng; khi tạm tính
  đạt lại mức tối thiểu, mã tự động có hiệu lực lại.
- **Mã hết hạn giữa lúc áp dụng và lúc đặt hàng**: đơn bị từ chối, mã giữ ở trạng thái lỗi "đã hết
  hạn" cho đến khi khách tự gỡ hoặc thay mã (mã hết hạn không bao giờ tự có hiệu lực lại).
- **Giỏ hàng trống**: không cho áp dụng mã khi giỏ trống (trang thanh toán vốn đã không cho đặt).
- **Nhiều mã**: hệ thống chỉ nhận một mã cho mỗi đơn; yêu cầu đặt hàng chứa nhiều hơn một mã bị từ
  chối do dữ liệu không hợp lệ.
- **Mã sai định dạng**: mã để trống, chỉ có khoảng trắng hoặc dài quá 32 ký tự (sau khi bỏ khoảng
  trắng đầu/cuối) bị coi là dữ liệu không hợp lệ. Hệ thống hiển thị thông báo định dạng ("Vui lòng
  nhập mã giảm giá" / "Mã giảm giá tối đa 32 ký tự") và không tra mã. Mã đúng độ dài nhưng chứa ký tự
  lạ (khoảng trắng ở giữa, ký tự có dấu…) được tra như bình thường và nhận lỗi "Mã giảm giá không tồn
  tại". Trang không bị lỗi.
- **Lỗi kết nối khi kiểm tra mã**: hiển thị thông báo lỗi chung, cho phép thử lại, tổng tiền không
  đổi.

## Requirements _(mandatory)_

### Functional Requirements

**Định nghĩa và dữ liệu mã**

- **FR-001**: Hệ thống MUST hỗ trợ hai loại mã giảm giá: (a) giảm theo phần trăm tạm tính, kèm mức
  giảm tối đa; (b) giảm một số tiền cố định.
- **FR-002**: Mỗi mã MUST có thể có (tùy chọn) giá trị đơn tối thiểu và (tùy chọn) ngày hết hạn.
- **FR-003**: Hệ thống MUST có sẵn ba mã ban đầu:
  - `SHOPLITE10`: giảm 10%, tối đa 100.000đ, đơn tối thiểu 300.000đ, không hết hạn.
  - `GIAM50K`: giảm 50.000đ, đơn tối thiểu 500.000đ, không hết hạn.
  - `TET2026`: giảm 15%, tối đa 200.000đ, không có tối thiểu, hết hạn sau ngày 28/02/2026.
- **FR-004**: Mã MUST được so khớp không phân biệt hoa/thường và bỏ khoảng trắng ở đầu/cuối. Mã hợp
  lệ về định dạng dài 1–32 ký tự sau khi bỏ khoảng trắng đầu/cuối; hệ thống không bỏ khoảng trắng ở
  giữa mã và không bỏ dấu.

**Kiểm tra và tính số tiền giảm**

- **FR-005**: Hệ thống MUST kiểm tra mã theo thứ tự: tồn tại → còn hạn → đạt giá trị tối thiểu, và
  trả về lý do đầu tiên không thỏa.
- **FR-006**: "Giá trị đơn" dùng để so với mức tối thiểu và để tính phần trăm MUST là tạm tính tiền
  hàng (tổng giá × số lượng), chưa gồm phí giao hàng và chưa trừ giảm giá.
- **FR-007**: Số tiền giảm theo phần trăm MUST = phần trăm × tạm tính, làm tròn xuống đến đồng, rồi
  giới hạn bởi mức giảm tối đa.
- **FR-008**: Số tiền giảm (mọi loại) MUST không vượt quá tạm tính.
- **FR-009**: Tổng tiền MUST = tạm tính − số tiền giảm + phí giao hàng.
- **FR-010**: Quy tắc phí giao hàng hiện hành MUST giữ nguyên và MUST được xác định dựa trên tạm
  tính trước giảm giá (mã giảm giá không làm khách mất ưu đãi miễn phí giao hàng).
- **FR-011**: Một mã hết hạn vào ngày D MUST còn hiệu lực đến hết ngày D theo giờ Việt Nam.

**Trải nghiệm ở trang thanh toán**

- **FR-012**: Trang thanh toán MUST có ô nhập mã giảm giá (có nhãn) và nút "Áp dụng".
- **FR-013**: Khi áp dụng thành công, phần tóm tắt đơn hàng MUST hiển thị ngay mã đã áp dụng, số
  tiền được giảm và tổng tiền mới, không cần tải lại trang.
- **FR-014**: Khi mã không hợp lệ, hệ thống MUST hiển thị thông báo tiếng Việt cạnh ô nhập mã. Thông
  báo là đúng một trong ba lý do nghiệp vụ: mã không tồn tại; mã đã hết hạn; đơn chưa đạt giá trị tối
  thiểu (kèm mức tối thiểu và số tiền cần mua thêm = mức tối thiểu − tạm tính hiện tại). Riêng mã sai
  định dạng (xem Edge Cases) thì hiển thị thông báo định dạng. Ô nhập mã MUST được đánh dấu
  là không hợp lệ cho công nghệ hỗ trợ (trình đọc màn hình).
- **FR-015**: Khách MUST gỡ được mã đã áp dụng; sau khi gỡ, tóm tắt trở về tổng tiền chưa giảm.
- **FR-016**: Mỗi đơn hàng MUST chỉ có tối đa một mã; áp dụng thành công mã mới thay thế mã cũ; áp
  dụng mã mới thất bại thì giữ nguyên mã cũ.
- **FR-017**: Khi giỏ hàng thay đổi trong lúc đã áp mã, số tiền giảm MUST được tính lại. Nếu tạm tính
  rơi xuống dưới mức tối thiểu, hệ thống MUST giữ mã trong tóm tắt ở trạng thái lỗi, hiển thị số tiền
  cần mua thêm và không trừ giảm giá vào tổng; MUST NOT tự gỡ mã. Khi tạm tính đạt lại mức tối thiểu,
  mã MUST tự động có hiệu lực lại mà khách không cần áp dụng lại.
- **FR-017a**: Khi đặt hàng, nếu hệ thống tự đánh giá lại và thấy mã đi kèm không hợp lệ (vì bất kỳ
  lý do nào), yêu cầu MUST bị từ chối theo FR-021. Trạng thái lỗi hiển thị ở trang thanh toán chỉ để
  báo cho khách, không phải căn cứ để từ chối.
- **FR-018**: Mọi số tiền MUST hiển thị theo định dạng tiền tệ thống nhất của cửa hàng.

**Đặt hàng và chống gian lận**

- **FR-019**: Yêu cầu đặt hàng MUST chỉ gửi kèm mã (nếu có), không gửi số tiền giảm hay tổng tiền.
- **FR-020**: Khi đặt hàng, hệ thống MUST kiểm tra lại mã và tự tính lại cả bốn đại lượng tiền: tạm
  tính (từ giá sản phẩm của cửa hàng × số lượng), số tiền giảm (theo quy tắc của mã, FR-007/FR-008),
  phí giao hàng (theo quy tắc phí hiện hành, FR-010) và tổng tiền (FR-009); MUST bỏ qua mọi con số
  tiền do phía khách gửi lên.
- **FR-021**: Nếu mã không hợp lệ tại thời điểm đặt hàng, hệ thống MUST từ chối tạo đơn và trả lý do
  tương ứng (cùng ba lý do ở FR-014); MUST NOT tự động bỏ mã rồi tạo đơn với giá khác mà khách chưa
  thấy. Trang thanh toán MUST giữ mã trong tóm tắt ở trạng thái lỗi (hiển thị lý do, không trừ vào
  tổng), giữ nguyên giỏ hàng và thông tin đã điền; khách MUST tự gỡ mã (hoặc thay bằng mã hợp lệ)
  trước khi đặt hàng lại.
- **FR-022**: Các kiểm tra hiện có khi đặt hàng (sản phẩm tồn tại, tồn kho, giới hạn số lượng) MUST
  vẫn được thực hiện như trước, và MUST được thực hiện **trước** khi kiểm tra mã giảm giá: thứ tự là
  dữ liệu yêu cầu → sản phẩm và tồn kho → mã giảm giá → tính tiền → lưu đơn. Đơn vừa hết hàng vừa có
  mã lỗi thì khách nhận lỗi tồn kho.
- **FR-022a**: Danh sách mã giảm giá MUST NOT được gửi xuống trình duyệt. Khách chỉ nhận được quy tắc
  của đúng mã mình đã nhập và áp dụng thành công.
- **FR-022b**: Thời điểm xét hạn của mã khi đặt hàng MUST lấy từ đồng hồ của hệ thống, không lấy thời
  gian do trình duyệt cung cấp. Việc xét hạn ở trình duyệt (nếu có) chỉ để hiển thị.
- **FR-022c**: Bước kiểm tra mã ở trang thanh toán (trước khi đặt hàng) MUST áp dụng cùng ràng buộc
  dữ liệu giỏ hàng như khi đặt hàng (ít nhất một sản phẩm, sản phẩm tồn tại, số lượng mỗi sản phẩm
  trong giới hạn cho phép) và cùng ràng buộc định dạng mã (FR-004); giá luôn lấy từ cửa hàng. Nếu dữ
  liệu giỏ hàng gửi kèm không hợp lệ, hệ thống MUST trả lỗi dữ liệu theo định dạng lỗi chung của cửa
  hàng; trang thanh toán hiển thị thông báo lỗi cạnh ô mã và không áp dụng mã (tổng tiền không đổi).

**Lưu trữ và hiển thị đơn hàng**

- **FR-023**: Đơn hàng có dùng mã MUST lưu mã đã dùng và số tiền được giảm tại thời điểm đặt; các
  con số này MUST không đổi về sau dù định nghĩa mã thay đổi, kể cả khi đơn bị hủy. Mọi đơn mới MUST
  thỏa các ràng buộc nhất quán: tổng tiền = tạm tính − số tiền giảm + phí giao hàng; 0 ≤ số tiền giảm
  ≤ tạm tính; số tiền giảm > 0 thì đơn MUST có mã đã dùng. Khách không có cách nào sửa mã hay số tiền
  giảm của đơn đã đặt (thao tác duy nhất trên đơn là hủy).
- **FR-024**: Trang chi tiết đơn hàng MUST hiển thị mã đã dùng và số tiền được giảm (nếu có) cùng
  tạm tính, phí giao hàng, tổng tiền.
- **FR-025**: Đơn hàng không dùng mã, kể cả đơn đã tồn tại trước khi có tính năng, MUST tiếp tục
  hiển thị và hoạt động đúng như trước (giảm giá coi như 0).

### Key Entities _(include if feature involves data)_

- **Mã giảm giá (Discount Code)**: chương trình khuyến mãi do cửa hàng định nghĩa sẵn. Thuộc tính:
  mã (duy nhất, viết hoa), loại (phần trăm / số tiền cố định), giá trị giảm (phần trăm hoặc số tiền),
  mức giảm tối đa (chỉ với loại phần trăm), giá trị đơn tối thiểu (tùy chọn), ngày hết hạn (tùy
  chọn).
- **Kết quả kiểm tra mã**: hoặc hợp lệ (kèm mã đã chuẩn hóa và số tiền giảm), hoặc không hợp lệ (kèm
  lý do: không tồn tại / hết hạn / chưa đạt tối thiểu, và với lý do cuối kèm mức tối thiểu và số tiền
  cần mua thêm).
- **Mã đang áp dụng ở trang thanh toán**: tối đa một mã; ở một trong hai trạng thái — có hiệu lực
  (trừ số tiền giảm vào tổng) hoặc lỗi (kèm lý do, không trừ vào tổng). Lỗi "chưa đạt tối thiểu" tự
  chuyển về có hiệu lực khi tạm tính đạt lại mức tối thiểu; lỗi "đã hết hạn" chỉ kết thúc khi khách
  gỡ hoặc thay mã.
- **Đơn hàng (mở rộng)**: thêm thông tin giảm giá đã áp dụng — mã đã dùng và số tiền được giảm; tổng
  tiền của đơn phản ánh khoản giảm này.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Khách áp dụng được một mã hợp lệ và thấy tổng tiền mới trong vòng 1 giây sau khi bấm
  "Áp dụng", không cần rời khỏi hay tải lại trang thanh toán.
- **SC-002**: 100% trường hợp mã không hợp lệ hiển thị đúng một trong ba lý do đã định nghĩa; với lý
  do "chưa đạt tối thiểu", số tiền cần mua thêm hiển thị chính xác đến từng đồng.
- **SC-003**: 100% đơn hàng có dùng mã được lưu với số tiền giảm và tổng tiền khớp chính xác quy tắc
  tính, bất kể con số nào được gửi lên từ trình duyệt. Tập ca thử tối thiểu: (1) gửi kèm số tiền
  giảm/tạm tính/tổng tự khai; (2) mã đã hết hạn (cả mili giây cuối của ngày hết hạn và 00:00 ngày
  hôm sau); (3) mã không tồn tại; (4) đơn thiếu 1 đồng so với mức tối thiểu; (5) gửi nhiều mã hoặc mã
  sai kiểu dữ liệu; (6) mã sai định dạng (rỗng, dài hơn 32 ký tự).
- **SC-004**: 0 đơn hàng được tạo với mã hết hạn, mã không tồn tại hoặc mã chưa đạt giá trị tối
  thiểu.
- **SC-005**: Số tiền giảm và tổng tiền khách thấy ở trang thanh toán trùng 100% với số được lưu và
  hiển thị ở trang chi tiết đơn hàng (với cùng giỏ hàng và cùng thời điểm hợp lệ).
- **SC-006**: Tất cả đơn hàng đã có trước khi ra mắt tính năng vẫn hiển thị đúng tổng tiền như cũ.
- **SC-007**: Khách hoàn tất trọn luồng "nhập mã → đặt hàng" chỉ với thêm tối đa 2 thao tác (nhập mã,
  bấm "Áp dụng") so với luồng thanh toán hiện tại.

## Assumptions

- Danh sách mã giảm giá được định nghĩa sẵn trong hệ thống và chỉ thay đổi khi phát hành phiên bản
  mới; không có trang quản trị (ngoài phạm vi).
- Không giới hạn số lượt dùng mỗi mã và không gắn mã với khách hàng cụ thể (ngoài phạm vi); hủy đơn
  không cần "hoàn" lượt dùng mã.
- Giảm giá chỉ áp dụng lên tiền hàng, không áp dụng lên phí giao hàng.
- Ngưỡng miễn phí giao hàng và giá trị đơn tối thiểu của mã đều so với tạm tính **trước** giảm giá
  (lựa chọn có lợi cho khách và dễ hiểu; có thể làm rõ lại qua `/speckit-clarify` nếu marketing muốn
  khác).
- Mốc thời gian dùng để xét hạn là thời điểm hệ thống xử lý yêu cầu, theo giờ Việt Nam (UTC+7).
- Mã đã áp dụng chỉ cần giữ trong lúc khách ở trang thanh toán; tải lại hoặc rời trang có thể làm mất
  mã đã áp dụng và khách nhập lại.
- Vì ngày hiện tại (08/11/2026) đã sau 28/02/2026, `TET2026` luôn ở trạng thái hết hạn và được dùng để
  kiểm thử thông báo "mã đã hết hạn"; kiểm thử tự động MUST cố định thời điểm để không phụ thuộc
  ngày chạy.
- Khách không cần đăng nhập; tính năng dùng lại luồng giỏ hàng, thanh toán và đơn hàng hiện có.
- Không giới hạn số lần thử mã; việc dò mã bằng cách thử nhiều lần là rủi ro được chấp nhận trong
  phạm vi này.
- Giá sản phẩm là dữ liệu tĩnh, chỉ đổi khi phát hành phiên bản mới. Nếu giá đổi giữa lúc khách áp mã
  và lúc đặt hàng, đơn được tính theo giá của cửa hàng tại thời điểm đặt hàng (FR-020) và khách thấy
  con số đó ở trang chi tiết đơn; không cảnh báo riêng. Đây là rủi ro được chấp nhận vì xác suất rất
  thấp và luôn có lợi cho tính đúng đắn của số tiền phía cửa hàng.
- Thông báo phân biệt "mã không tồn tại" và "mã đã hết hạn" (FR-014) cho phép người dùng biết một mã
  từng tồn tại. Đây là đánh đổi được chấp nhận để khách hiểu rõ lý do; mã hết hạn không còn giá trị
  sử dụng nên rủi ro không đáng kể.
- Không yêu cầu ghi log hay kiểm toán việc dùng mã và các lần đặt hàng bị từ chối vì mã (ngoài phạm vi
  của phiên bản này); số liệu dùng mã có thể tra từ các đơn đã lưu (`couponCode`, `discount`).

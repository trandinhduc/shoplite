# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `feat/ngocdb-acbs-com-vn`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Mã giảm giá khi thanh toán cho ShopLite" (brief
`module123-guides/module-2-speckit/reference/feature-brief-coupon.md`, phần "Nội dung để dán vào
/speckit-specify")

## Clarifications

### Session 2026-11-08

- Q: Sau khi đã áp mã, nếu khách xóa bớt sản phẩm khiến đơn không còn đạt giá trị tối thiểu của
  mã, hệ thống xử lý thế nào? → A: Tự gỡ mã ngay, báo lý do kèm số tiền cần mua thêm; khách mua
  thêm thì phải nhập lại mã.
- Q: Ngưỡng miễn phí giao hàng 500.000đ tính trên tạm tính trước hay sau giảm giá? → A: Sau giảm
  giá (cách làm của Tiki và WooCommerce mặc định; chưa tìm được chính sách công khai của
  CellphoneS/FPT Shop/Thế Giới Di Động).
- Q: Mã đã áp dụng có được giữ lại khi khách tải lại trang hoặc quay lại giỏ hàng không? → A: Giữ
  lại trên trình duyệt đó (giống giỏ hàng, như Shopify giữ mã theo giỏ), kiểm tra lại mỗi lần hiển
  thị.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Áp dụng mã giảm giá hợp lệ khi thanh toán (Priority: P1)

Ở trang thanh toán, khách nhập một mã giảm giá và bấm "Áp dụng". Nếu mã hợp lệ, phần tóm tắt đơn
hàng hiển thị ngay mã đã áp dụng, số tiền được giảm và tổng tiền mới. Khách đặt hàng với tổng tiền
đã giảm.

**Why this priority**: Đây là giá trị cốt lõi marketing cần: khách nhận được ưu đãi và đơn được
chốt với giá đã giảm. Không có luồng này thì tính năng không có ý nghĩa.

**Independent Test**: Thêm sản phẩm đủ giá trị vào giỏ, vào thanh toán, nhập `SHOPLITE10`, kiểm
tra số tiền giảm và tổng tiền hiển thị, đặt hàng và kiểm tra tổng tiền của đơn.

**Acceptance Scenarios**:

1. **Given** tạm tính 400.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** số tiền giảm là
   40.000đ và tổng tiền giảm tương ứng 40.000đ so với trước khi áp dụng.
2. **Given** tạm tính 1.500.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** số tiền giảm là
   100.000đ (mức giảm tối đa), không phải 150.000đ.
3. **Given** tạm tính 500.000đ và giao hàng tiêu chuẩn, **When** khách áp dụng `GIAM50K`,
   **Then** số tiền giảm là 50.000đ, tạm tính sau giảm 450.000đ nên phí giao hàng là 30.000đ và
   tổng tiền là 480.000đ.
4. **Given** tạm tính 560.000đ và giao hàng tiêu chuẩn, **When** khách áp dụng `GIAM50K`,
   **Then** tạm tính sau giảm 510.000đ vẫn được miễn phí giao hàng, tổng tiền 510.000đ.
5. **Given** tạm tính 300.000đ (đúng bằng mức tối thiểu), **When** khách áp dụng `SHOPLITE10`,
   **Then** mã được chấp nhận và giảm 30.000đ.
6. **Given** đã áp dụng một mã hợp lệ, **When** khách bấm đặt hàng, **Then** đơn được tạo với số
   tiền giảm và tổng tiền đúng như hiển thị.

---

### User Story 2 - Biết rõ lý do khi mã không dùng được (Priority: P2)

Khi mã không hợp lệ, khách thấy thông báo nêu đúng lý do: mã không tồn tại, mã đã hết hạn, hoặc đơn
chưa đạt giá trị tối thiểu kèm số tiền cần mua thêm. Tổng tiền không thay đổi.

**Why this priority**: Không có thông báo rõ ràng, khách sẽ bỏ cuộc hoặc liên hệ hỗ trợ; thông báo
"cần mua thêm X" còn giúp tăng giá trị đơn hàng - mục tiêu thứ hai của marketing.

**Independent Test**: Lần lượt nhập mã không tồn tại, `TET2026` và `GIAM50K` với đơn dưới
500.000đ; kiểm tra từng thông báo và tổng tiền không đổi.

**Acceptance Scenarios**:

1. **Given** bất kỳ giỏ hàng nào, **When** khách nhập `KHONGCO`, **Then** thấy thông báo mã không
   tồn tại và không có giảm giá nào được áp dụng.
2. **Given** ngày hiện tại sau 28/02/2026, **When** khách nhập `TET2026`, **Then** thấy thông báo
   mã đã hết hạn.
3. **Given** tạm tính 450.000đ, **When** khách nhập `GIAM50K`, **Then** thấy thông báo đơn chưa đạt
   giá trị tối thiểu 500.000đ và cần mua thêm 50.000đ.
4. **Given** tạm tính 299.000đ, **When** khách nhập `SHOPLITE10`, **Then** thấy thông báo cần mua
   thêm 1.000đ.
5. **Given** ô nhập mã để trống, **When** khách bấm "Áp dụng", **Then** thấy thông báo yêu cầu nhập
   mã.

---

### User Story 3 - Gỡ hoặc thay mã đã áp dụng (Priority: P3)

Khách có thể gỡ mã đã áp dụng để quay về tổng tiền gốc, hoặc thay bằng một mã khác. Mỗi đơn chỉ có
tối đa một mã.

**Why this priority**: Cần cho trải nghiệm hoàn chỉnh nhưng luồng P1 vẫn dùng được nếu chưa có.

**Independent Test**: Áp dụng `SHOPLITE10`, gỡ mã, kiểm tra tổng tiền trở về như cũ; áp dụng lại
rồi nhập `GIAM50K`, kiểm tra chỉ còn `GIAM50K`.

**Acceptance Scenarios**:

1. **Given** đã áp dụng `SHOPLITE10`, **When** khách bấm gỡ mã, **Then** dòng giảm giá biến mất và
   tổng tiền trở về giá trị trước khi áp dụng.
2. **Given** đã áp dụng `SHOPLITE10` và tạm tính 600.000đ, **When** khách áp dụng `GIAM50K`,
   **Then** chỉ `GIAM50K` được áp dụng, số tiền giảm là 50.000đ.

---

### User Story 4 - Xem mã đã dùng trong chi tiết đơn hàng (Priority: P3)

Sau khi đặt hàng, trang chi tiết đơn hàng hiển thị mã đã dùng và số tiền được giảm, khớp với lúc
đặt.

**Why this priority**: Cần cho đối soát và chăm sóc khách hàng, nhưng không chặn việc nhận ưu đãi.

**Independent Test**: Đặt đơn có `GIAM50K`, mở trang chi tiết đơn, kiểm tra mã và số tiền giảm.

**Acceptance Scenarios**:

1. **Given** đơn được đặt với `GIAM50K`, **When** khách mở chi tiết đơn, **Then** thấy mã `GIAM50K`
   và số tiền giảm 50.000đ trong phần tổng tiền.
2. **Given** đơn được đặt không có mã, **When** khách mở chi tiết đơn, **Then** không hiển thị dòng
   giảm giá.

---

### Edge Cases

- Khách nhập mã chữ thường hoặc có khoảng trắng hai đầu (`shoplite10`): mã vẫn được nhận như
  `SHOPLITE10` (xem Assumptions).
- Số tiền giảm cố định lớn hơn tạm tính: số tiền giảm tối đa bằng tạm tính, tổng tiền không âm.
- Mã hợp lệ lúc áp dụng nhưng hết hạn hoặc không còn đủ điều kiện lúc bấm đặt hàng: xem FR-011.
- Khách sửa số tiền giảm trên trình duyệt trước khi đặt hàng: hệ thống bỏ qua con số đó và tự tính
  lại; đơn được tạo theo số hệ thống tính.
- Ngày hết hạn: mã dùng được đến hết ngày hết hạn và từ chối từ ngày hôm sau (xem Assumptions).
- Áp dụng mã làm tạm tính sau giảm rơi xuống dưới ngưỡng miễn phí giao hàng: phí giao hàng tiêu
  chuẩn được tính lại và hiển thị ngay trong tóm tắt đơn (FR-017).
- Khách xóa bớt sản phẩm hoặc giảm số lượng sau khi áp dụng mã khiến tạm tính dưới giá trị tối
  thiểu của mã: mã tự bị gỡ, tổng tiền trở về không giảm, khách thấy lý do và số tiền cần mua thêm
  (FR-016).
- Khách tải lại trang thanh toán hoặc quay lại giỏ hàng sau khi đã áp dụng mã: mã vẫn được giữ;
  nếu lúc đó mã đã hết hạn hoặc không còn đủ điều kiện thì tự bị gỡ kèm lý do (FR-018).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Trang thanh toán MUST có ô nhập mã giảm giá có nhãn và nút "Áp dụng".
- **FR-002**: Hệ thống MUST hỗ trợ hai loại mã: giảm theo phần trăm tạm tính có mức giảm tối đa, và
  giảm một số tiền cố định.
- **FR-003**: Mỗi mã MUST có thể có giá trị đơn hàng tối thiểu, so với tạm tính **trước** giảm giá
  (so sánh "lớn hơn hoặc bằng"), và ngày hết hạn; cả hai đều không bắt buộc. Lưu ý: ngưỡng miễn phí
  giao hàng thì so với tạm tính **sau** giảm (FR-017).
- **FR-004**: Số tiền giảm theo phần trăm MUST được làm tròn thường đến đồng (phần lẻ từ 0,5 làm
  tròn lên) và không vượt mức giảm tối đa của mã.
- **FR-005**: Số tiền giảm MUST NOT vượt quá tạm tính và MUST chỉ trừ vào tạm tính, không trừ vào
  phí giao hàng.
- **FR-006**: Khi mã hợp lệ, phần tóm tắt đơn hàng MUST hiển thị ngay mã đã áp dụng, số tiền giảm và
  tổng tiền mới mà không cần tải lại trang.
- **FR-007**: Khi mã không hợp lệ, hệ thống MUST hiển thị lý do cụ thể ngay dưới ô nhập: mã không
  tồn tại; mã đã hết hạn; hoặc đơn chưa đạt giá trị tối thiểu kèm giá trị tối thiểu và số tiền cần
  mua thêm. Nếu mã vi phạm nhiều điều kiện, báo theo thứ tự: không tồn tại → hết hạn → chưa đạt tối
  thiểu. Ô nhập trống là lỗi nhập liệu riêng ("Vui lòng nhập mã giảm giá"), không phải lý do mã.
- **FR-008**: Mỗi đơn hàng MUST áp dụng tối đa một mã; áp dụng mã mới MUST thay thế mã cũ.
- **FR-009**: Khách MUST gỡ được mã đã áp dụng; sau khi gỡ, tổng tiền MUST trở về giá trị không giảm.
- **FR-010**: Khi đặt hàng, hệ thống MUST tự kiểm tra lại mã và tự tính lại số tiền giảm, tổng tiền
  dựa trên giá sản phẩm hiện hành; MUST bỏ qua mọi số tiền do trình duyệt gửi lên.
- **FR-011**: Nếu mã không còn hợp lệ tại thời điểm đặt hàng, hệ thống MUST NOT tạo đơn và MUST trả
  về cùng loại lý do như FR-007. Trang thanh toán MUST gỡ mã, hiển thị lý do và tổng tiền mới; đơn
  chỉ được tạo khi khách bấm "Đặt hàng" lại với tổng tiền mới.
- **FR-012**: Đơn hàng đã tạo MUST lưu mã đã dùng (dạng đã chuẩn hóa theo FR-014, ví dụ `GIAM50K`)
  và số tiền được giảm; trang chi tiết đơn hàng MUST hiển thị hai thông tin này. Hủy đơn MUST NOT
  làm thay đổi mã và số tiền giảm đã ghi nhận.
- **FR-013**: Hệ thống MUST có sẵn ba mã khởi tạo: `SHOPLITE10` (10%, tối đa 100.000đ, đơn từ
  300.000đ), `GIAM50K` (50.000đ, đơn từ 500.000đ), `TET2026` (15%, tối đa 200.000đ, hết hạn
  28/02/2026). Dữ liệu mã MUST hợp lệ: mã duy nhất và ở dạng chuẩn hóa; mã phần trăm có giá trị
  1-100 và có mức giảm tối đa; mã số tiền cố định có giá trị > 0.
- **FR-014**: Mã MUST được chuẩn hóa trước khi so khớp: chuyển ký tự full-width về dạng thường
  (Unicode NFKC), bỏ khoảng trắng hai đầu, không phân biệt chữ hoa/thường. Sau chuẩn hóa, mã MUST chỉ
  gồm chữ A-Z và số 0-9, tối đa 32 ký tự; mã có ký tự khác (khoảng trắng giữa, dấu, ký tự điều khiển)
  là lỗi nhập liệu ("Mã giảm giá chỉ gồm chữ và số"), không phải lý do "không tồn tại".
- **FR-015**: Mọi thông báo và nhãn mới MUST bằng tiếng Việt; số tiền hiển thị theo định dạng tiền
  Việt Nam đang dùng trong ứng dụng.
- **FR-016**: Khi giỏ hàng thay đổi khiến tạm tính thấp hơn giá trị tối thiểu của mã đang áp dụng,
  hệ thống MUST tự gỡ mã ngay, đưa tổng tiền về giá trị không giảm và hiển thị thông báo gồm giá trị
  tối thiểu và số tiền cần mua thêm; mã MUST NOT tự được áp lại khi tạm tính đạt lại mức tối thiểu.
- **FR-017**: Ngưỡng miễn phí giao hàng tiêu chuẩn MUST được so với tạm tính sau khi trừ số tiền
  giảm; khi áp dụng, gỡ hoặc tự gỡ mã, phí giao hàng và tổng tiền MUST được tính lại và hiển thị ngay.
- **FR-018**: Mã đã áp dụng MUST được giữ lại trên cùng trình duyệt khi khách tải lại trang hoặc
  chuyển giữa giỏ hàng và thanh toán, cho tới khi khách gỡ mã hoặc đặt hàng thành công; mỗi lần hiển
  thị, mã MUST được kiểm tra lại và tự gỡ kèm lý do nếu không còn hợp lệ. Các tab của cùng trình
  duyệt dùng chung một mã: áp, gỡ hoặc tự gỡ ở tab này MUST áp dụng cho tab kia.
- **FR-019**: Mỗi lần kiểm tra mã hoặc đặt hàng MUST nhận tối đa 50 dòng sản phẩm; vượt quá là lỗi
  nhập liệu.

### Key Entities _(include if feature involves data)_

- **Mã giảm giá**: mã chữ (duy nhất, không phân biệt hoa/thường), loại (phần trăm / số tiền cố
  định), giá trị giảm, mức giảm tối đa (chỉ với loại phần trăm), giá trị đơn tối thiểu (tùy chọn),
  ngày hết hạn (tùy chọn). Danh sách mã cố định, không có màn hình quản trị.
- **Đơn hàng** (mở rộng): thêm mã đã dùng (tùy chọn) và số tiền được giảm (0 nếu không dùng mã).
  Tổng tiền = tạm tính - số tiền giảm + phí giao hàng, trong đó phí giao hàng tính theo tạm tính
  sau giảm (FR-017).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Khách áp dụng một mã hợp lệ và thấy tổng tiền mới trong không quá 2 thao tác (nhập mã,
  bấm "Áp dụng") và dưới 1 giây sau khi bấm.
- **SC-002**: 100% lần nhập một mã (không trống) không hợp lệ hiển thị đúng một trong ba lý do ở
  FR-007; với lý do
  chưa đạt tối thiểu, số tiền cần mua thêm chính xác đến đồng.
- **SC-003**: 100% đơn hàng có mã được tạo với số tiền giảm và tổng tiền bằng giá trị hệ thống tự
  tính, kể cả khi số liệu từ trình duyệt bị sửa theo bất kỳ cách nào sau: gửi kèm số tiền giảm hoặc
  tổng tiền tự đặt, gửi giá sản phẩm tự đặt, sửa quy tắc mã lưu trên trình duyệt, hoặc gửi một mã khác
  với mã đang hiển thị (đơn được tính theo đúng mã đã gửi).
- **SC-004**: 0 đơn hàng được tạo với mã đã hết hạn, không tồn tại hoặc chưa đạt giá trị tối thiểu;
  kiểm chứng bằng ít nhất một kịch bản đặt hàng cho mỗi lý do, trong đó có trường hợp mã hết hạn
  đúng lúc đặt hàng.
- **SC-005**: Trang chi tiết của 100% đơn có mã hiển thị mã và số tiền giảm khớp với lúc đặt hàng.
- **SC-006**: Sau khi ra mắt, marketing đo được tỷ lệ đơn có dùng mã và giá trị trung bình của các
  đơn đó so với đơn không dùng mã.

## Assumptions

- Khách không cần đăng nhập; mã dùng được cho mọi khách (đúng với phạm vi: không có mã riêng từng
  khách).
- Ngày hết hạn tính theo giờ Việt Nam; mã dùng được đến hết 23:59:59 của ngày hết hạn.
- Mã được chuẩn hóa theo FR-014.
- Giảm giá chỉ trừ vào tạm tính, không áp dụng lên phí giao hàng (FR-005).
- Phần trăm được tính trên tạm tính (tổng tiền hàng), làm tròn đến đồng.
- Thanh toán (COD hoặc chuyển khoản) dùng tổng tiền sau giảm.
- Hủy đơn có mã không cần hoàn lại lượt dùng vì không giới hạn số lượt sử dụng.
- Ngoài phạm vi: trang quản trị tạo/sửa mã, giới hạn số lượt sử dụng mỗi mã, mã dành riêng cho từng
  khách hàng, kết hợp nhiều mã trên một đơn, ghi nhận/giám sát các lần thử mã thất bại.
- Rủi ro được người review spec chấp nhận cho phiên bản đầu (2026-11-08): một mã dùng được không
  giới hạn số lần và bởi bất kỳ ai, vì khách không cần đăng nhập nên không gắn được mã với người dùng;
  mức thiệt hại tối đa mỗi đơn bị chặn bởi mức giảm của mã.
- Báo khác nhau giữa "không tồn tại" và "đã hết hạn" (FR-007) có thể cho biết một mã từng tồn tại;
  chấp nhận được vì mã là mã khuyến mãi công khai.
- "Mua lại" một đơn đã dùng mã chỉ thêm sản phẩm vào giỏ, không mang theo mã; khách tự nhập lại mã.
- Các quy tắc hiện có (giới hạn số lượng mỗi sản phẩm, mức phí giao hàng tiêu chuẩn/nhanh, chỉ hủy
  đơn khi đang chờ xác nhận) giữ nguyên; riêng ngưỡng miễn phí giao hàng đổi sang so với tạm tính
  sau giảm (FR-017). Đơn không dùng mã không bị ảnh hưởng.
- Đơn hàng cũ (tạo trước tính năng, không có mã và số tiền giảm) MUST hiển thị như trước, không có
  dòng giảm giá.
- Mã giảm giá chỉ nhập và hiển thị ở trang thanh toán; trang giỏ hàng hiển thị giá chưa giảm (kể cả
  gợi ý miễn phí giao hàng). Mã đã áp dụng vẫn được giữ khi khách qua lại giữa hai trang (FR-018).
- Giá sản phẩm là dữ liệu tĩnh, chỉ đổi khi phát hành phiên bản mới; rủi ro giá đổi giữa lúc áp mã
  và lúc đặt hàng được chấp nhận. Đơn luôn được tạo theo giá và số tiền server tính, và trang chi tiết
  đơn hiển thị đúng các số đó.
- Không giới hạn số lần thử mã: mã là mã khuyến mãi công khai, dò ra mã không gây thiệt hại vượt mức
  giảm đã định. Rủi ro này được chấp nhận cho phiên bản đầu.
- Hệ thống chỉ trả về quy tắc của đúng mã khách đã nhập, không bao giờ trả danh sách mã.
- Kiểm tra hết hạn trên trình duyệt chỉ để hiển thị; quyết định cuối cùng là kiểm tra theo giờ của
  hệ thống lúc đặt hàng (FR-011).

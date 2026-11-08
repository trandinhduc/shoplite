# Feature Specification: Mã giảm giá khi thanh toán (Coupon Code)

**Feature Branch**: `001-coupon-code`  
**Created**: 2026-11-08  
**Status**: Ready for Planning  
**Input**: User description: "Tính năng mã giảm giá khi thanh toán cho ShopLite"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Áp dụng mã giảm giá hợp lệ và xem trước số tiền giảm (Priority: P1)

Khách hàng tại trang thanh toán (`/checkout`) có thể nhập một mã giảm giá hợp lệ vào ô khuyến mãi và nhấn "Áp dụng". Hệ thống tính toán ngay lập tức số tiền được giảm và cập nhật lại phần tóm tắt đơn hàng (tạm tính, giảm giá, phí vận chuyển, tổng tiền). Khách hàng cũng có thể gỡ bỏ mã đã áp dụng để nhập mã khác nếu muốn.

**Why this priority**: Đây là luồng giá trị nghiệp vụ cốt lõi nhất của tính năng. Cho phép người mua hưởng ưu đãi trực quan ngay trước khi quyết định bấm thanh toán, giúp tăng tỷ lệ chốt đơn (conversion rate).

**Independent Test**: Có thể kiểm thử độc lập bằng cách thêm sản phẩm vào giỏ, đi tới `/checkout`, nhập mã hợp lệ (`SHOPLITE10` hoặc `GIAM50K`), nhấn "Áp dụng", kiểm tra dòng giảm giá xuất hiện và tổng thanh toán giảm chính xác; sau đó nhấn nút "Gỡ" để xác nhận tổng tiền hoàn lại như ban đầu.

**Acceptance Scenarios**:

1. **Given** giỏ hàng có tạm tính 1.290.000 ₫,  
   **When** khách hàng nhập mã `SHOPLITE10` (giảm 10%, tối đa 100.000 ₫, đơn từ 300.000 ₫) và bấm "Áp dụng",  
   **Then** tóm tắt đơn hiển thị dòng "Giảm giá: -100.000 ₫" (do 10% của 1.290.000 ₫ là 129.000 ₫ nhưng vượt trần tối đa 100.000 ₫), và tổng thanh toán giảm đúng 100.000 ₫.

2. **Given** giỏ hàng có tạm tính 600.000 ₫,  
   **When** khách hàng nhập mã `GIAM50K` (giảm 50.000 ₫, đơn từ 500.000 ₫) và bấm "Áp dụng",  
   **Then** tóm tắt đơn hiển thị dòng "Giảm giá: -50.000 ₫", phí vận chuyển hiển thị "Miễn phí" (do tạm tính 600.000 ₫ $\ge$ 500.000 ₫), và tổng tiền phải trả là 550.000 ₫.

3. **Given** khách hàng đã áp dụng mã `SHOPLITE10` thành công,  
   **When** khách hàng nhấn nút "Gỡ bỏ" bên cạnh mã giảm giá,  
   **Then** dòng giảm giá được xóa bỏ, tổng tiền thanh toán phục hồi về mức ban đầu, và ô nhập mã sẵn sàng cho mã mới.

---

### User Story 2 - Thông báo lỗi rõ ràng khi mã không hợp lệ hoặc không đủ điều kiện (Priority: P2)

Khi khách hàng nhập mã sai, mã hết hạn hoặc giỏ hàng chưa thỏa mãn điều kiện áp dụng của mã, hệ thống phải giữ nguyên giá đơn hàng và phản hồi thông báo lỗi rõ ràng, mang tính hướng dẫn cụ thể bằng tiếng Việt để người mua biết cách xử lý (ví dụ: cần mua thêm bao nhiêu tiền).

**Why this priority**: Ngăn ngừa trải nghiệm gây bực bội cho người dùng. Khách hàng hiểu rõ tại sao mã không áp dụng được thay vì nhận thông báo chung chung, từ đó kích thích mua thêm để đạt ngưỡng tối thiểu.

**Independent Test**: Nhập lần lượt các mã không tồn tại, mã hết hạn (`TET2026`), và mã chưa đủ giá trị tối thiểu, sau đó kiểm tra nội dung thông báo lỗi tương ứng.

**Acceptance Scenarios**:

1. **Given** khách hàng đang ở trang thanh toán,  
   **When** nhập mã `KHONGTONTAI` và bấm "Áp dụng",  
   **Then** hệ thống hiển thị thông báo lỗi "Mã giảm giá không tồn tại".

2. **Given** khách hàng đang ở trang thanh toán sau ngày 28/02/2026,  
   **When** nhập mã `TET2026` (hết hạn ngày 28/02/2026) và bấm "Áp dụng",  
   **Then** hệ thống hiển thị thông báo lỗi "Mã giảm giá đã hết hạn sử dụng".

3. **Given** giỏ hàng có tạm tính 200.000 ₫,  
   **When** nhập mã `SHOPLITE10` (yêu cầu đơn từ 300.000 ₫),  
   **Then** hệ thống hiển thị thông báo lỗi "Đơn hàng chưa đạt giá trị tối thiểu 300.000 ₫ (cần mua thêm 100.000 ₫)".

---

### User Story 3 - Lưu trữ mã vào đơn hàng và bảo vệ chống gian lận (Priority: P3)

Khi khách hàng hoàn tất đặt hàng, thông tin mã giảm giá và số tiền được trừ phải được lưu trữ vĩnh viễn vào đơn hàng và hiển thị trên trang chi tiết đơn hàng (`/orders/[id]`). Đồng thời, phía máy chủ (Server) phải độc lập tính toán lại toàn bộ số tiền giảm giá và tổng đơn hàng, ngăn chặn mọi hành vi can thiệp dữ liệu từ phía trình duyệt.

**Why this priority**: Bảo đảm tính toàn vẹn của dữ liệu kinh doanh và minh bạch tài chính. Khách hàng xem lại được lịch sử ưu đãi, còn cửa hàng được bảo vệ tuyệt đối khỏi gian lận giá tiền.

**Independent Test**: Đặt một đơn hàng thành công với mã `SHOPLITE10`, mở trang chi tiết đơn hàng `/orders/[id]` xác nhận dòng coupon hiển thị đúng mã và số tiền giảm; gửi một yêu cầu API giả lập với số tiền giảm sai lệch để kiểm chứng server tính toán lại.

**Acceptance Scenarios**:

1. **Given** khách hàng đã áp dụng thành công mã `SHOPLITE10` (giảm 100.000 ₫) và điền thông tin người nhận,  
   **When** nhấn nút "Đặt hàng",  
   **Then** đơn hàng mới được tạo lưu kèm mã `SHOPLITE10` và số tiền giảm 100.000 ₫, đồng thời trang `/orders/[id]` hiển thị rõ dòng "Mã giảm giá (SHOPLITE10): -100.000 ₫".

2. **Given** một yêu cầu tạo đơn hàng gửi lên server có chứa mã `SHOPLITE10` nhưng client cố tình gửi trường giảm giá sai lệch (ví dụ gửi giảm 200.000 ₫),  
   **When** server xử lý tạo đơn hàng,  
   **Then** server tự động kiểm tra lại quy tắc của mã từ dữ liệu gốc, tính toán lại chính xác số tiền giảm là 100.000 ₫ và lưu đơn với số tiền hợp lệ, không phụ thuộc giá trị do client gửi lên.

3. **Given** một mã giảm giá hợp lệ lúc khách hàng xem tại trang thanh toán nhưng đã hết hạn tại thời điểm khách hàng bấm "Đặt hàng",  
   **When** server xử lý tạo đơn hàng,  
   **Then** server từ chối tạo đơn hàng (không tạo đơn). Tại giao diện thanh toán, mã vẫn nằm trong ô nhập mã nhưng hiển thị trạng thái lỗi `[đã hết hạn]`, nút "Đặt hàng" bị chặn; khách hàng phải tự bấm "Gỡ mã" (hoặc thay mã hợp lệ khác) thì hệ thống mới cho phép đặt hàng lại.

---

### Edge Cases

1. **Chuẩn hóa chuỗi nhập:** Khách hàng vô tình nhập khoảng trắng ở hai đầu (ví dụ `"  SHOPLITE10  "`) hoặc gõ chữ thường (`"shoplite10"`) $\rightarrow$ Hệ thống tự động trim khoảng trắng và chuyển thành chữ in hoa, áp dụng thành công như bình thường.
2. **Thay đổi giỏ hàng sau khi đã áp dụng mã:** Khách hàng đã áp dụng mã `SHOPLITE10` (yêu cầu đơn từ 300.000 ₫, tạm tính ban đầu 350.000 ₫), sau đó quay lại giỏ hàng xóa bớt sản phẩm khiến tạm tính chỉ còn 200.000 ₫ $\rightarrow$ Khi quay lại trang thanh toán, hệ thống tự động hủy áp dụng mã, hiển thị thông báo rõ lý do: `"Mã SHOPLITE10 đã bị hủy do đơn hàng chưa đạt giá trị tối thiểu 300.000 ₫ (cần mua thêm 100.000 ₫)"`, và tính toán lại tổng tiền thanh toán không giảm giá.
3. **Số tiền giảm vượt quá tiền hàng:** Trường hợp mã giảm cố định lớn hơn tạm tính $\rightarrow$ Mức giảm tối đa chỉ bằng đúng tạm tính, tổng tiền hàng sau giảm không bao giờ được âm.
4. **Phí vận chuyển và Giảm giá:** Giảm giá chỉ khấu trừ vào tạm tính tiền hàng, tuyệt đối không được trừ vào phí giao hàng.
5. **Ngưỡng miễn phí vận chuyển:** Ngưỡng miễn phí vận chuyển (500.000 ₫) được tính toán trên **tạm tính trước khi giảm giá** (đảm bảo quyền lợi và sự nhất quán cho người mua).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cung cấp ô nhập mã giảm giá và nút "Áp dụng" tại trang thanh toán (`/checkout`).
- **FR-002**: Hệ thống MUST hỗ trợ 2 loại mã giảm giá: giảm theo phần trăm (có kèm mức giảm tối đa) và giảm theo số tiền cố định.
- **FR-003**: Hệ thống MUST xác thực tính hợp lệ của mã dựa trên 3 điều kiện: mã tồn tại trong danh mục, mã còn trong thời hạn sử dụng, và tạm tính đơn hàng đạt giá trị tối thiểu.
- **FR-004**: Hệ thống MUST hiển thị thông báo lỗi cụ thể bằng tiếng Việt khi mã không hợp lệ (mã không tồn tại, mã hết hạn, hoặc nêu rõ số tiền cần mua thêm để đạt giá trị tối thiểu).
- **FR-005**: Hệ thống MUST chỉ cho phép áp dụng tối đa 01 mã giảm giá trên một đơn hàng tại một thời điểm.
- **FR-006**: Hệ thống MUST cung cấp nút "Gỡ bỏ" để khách hàng có thể hủy mã giảm giá đã áp dụng bất kỳ lúc nào trước khi đặt hàng.
- **FR-007**: Hệ thống MUST lưu trữ thông tin mã giảm giá và số tiền được giảm vào bản ghi đơn hàng khi tạo đơn thành công.
- **FR-008**: Hệ thống MUST tự động xác thực và tính toán lại số tiền giảm giá phía server trong quá trình xử lý tạo đơn hàng, đảm bảo tính toàn vẹn và chống gian lận.
- **FR-009**: Hệ thống MUST tự động chuẩn hóa mã giảm giá (bỏ khoảng trắng 2 đầu và không phân biệt chữ hoa/chữ thường).
- **FR-010**: Mức giảm giá MUST chỉ khấu trừ vào tạm tính tiền hàng, MUST NOT khấu trừ vào phí giao hàng và MUST NOT làm tổng tiền hàng âm.
- **FR-011**: Ngưỡng miễn phí vận chuyển (500.000 ₫) MUST được tính toán dựa trên tạm tính đơn hàng trước khi áp dụng giảm giá.
- **FR-012**: Hệ thống MUST hiển thị dòng giảm giá rõ ràng trong phần tóm tắt thanh toán và trang chi tiết đơn hàng (`/orders/[id]`).

---

### Key Entities

- **Coupon**:
  - `code` (string, duy nhất, in hoa, không dấu, ví dụ `SHOPLITE10`)
  - `type` (`"percentage"` hoặc `"fixed"`)
  - `value` (number: số phần trăm hoặc số tiền VNĐ cố định)
  - `maxDiscount` (number | null: số tiền giảm tối đa đối với loại phần trăm)
  - `minOrderValue` (number: giá trị tạm tính tối thiểu để áp dụng mã)
  - `expiresAt` (string | null: ngày hết hạn theo chuẩn ISO YYYY-MM-DD, tính đến 23:59:59 giờ VN)
  - `description` (string: mô tả ngắn gọn bằng tiếng Việt)

- **AppliedCoupon (Client Session & Order Data)**:
  - `code` (string): Mã giảm giá được áp dụng.
  - `discountAmount` (number): Số tiền thực tế được khấu trừ vào đơn hàng.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Phản hồi kiểm tra mã giảm giá hiển thị trên giao diện trong vòng dưới 300ms sau khi người dùng bấm "Áp dụng".
- **SC-002**: 100% các đơn hàng có sử dụng coupon đều lưu trữ chính xác mã và số tiền giảm giá, hiển thị minh bạch tại trang chi tiết đơn hàng.
- **SC-003**: 100% các trường hợp can thiệp dữ liệu giảm giá từ client đều bị server phát hiện và tính toán lại chính xác, tỷ lệ thất thoát doanh thu do gian lận mã là 0%.
- **SC-004**: 100% các thông báo lỗi khi chưa đạt giá trị đơn hàng tối thiểu đều nêu chính xác số tiền cần mua thêm theo định dạng tiền tệ Việt Nam (VNĐ).

---

## Assumptions & Out of Scope

### Assumptions
- Danh sách mã giảm giá khởi tạo ban đầu là danh mục cố định phục vụ chương trình marketing:
  - `SHOPLITE10`: Giảm 10%, tối đa 100.000 ₫, đơn từ 300.000 ₫.
  - `GIAM50K`: Giảm 50.000 ₫, đơn từ 500.000 ₫.
  - `TET2026`: Giảm 15%, tối đa 200.000 ₫, hết hạn ngày 28/02/2026 (dùng kiểm thử mã hết hạn).
- Mỗi phiên thanh toán lưu trữ mã giảm giá đã áp dụng trong state/session để không bị mất khi tải lại trang thanh toán.

### Out of Scope (Ngoài phạm vi)
- Giao diện Admin quản trị để tạo/sửa/xóa mã giảm giá.
- Giới hạn số lượt sử dụng toàn hệ thống (usage limit) hoặc giới hạn số lần dùng trên mỗi khách hàng.
- Mã giảm giá phân quyền riêng cho từng tài khoản khách hàng cụ thể.

---

## Clarifications

Toàn bộ các câu hỏi làm rõ nghiệp vụ (Clarification Questions) đã được thống nhất và chốt phương án:

1. **Q: Mã có phân biệt chữ hoa/thường không? (ví dụ `shoplite10` có dùng được không?)**  
   👉 **A:** Không phân biệt chữ hoa/thường. Hệ thống tự động trim khoảng trắng 2 đầu và chuyển thành chữ in hoa khi xử lý.
2. **Q: Ngưỡng miễn phí vận chuyển (500.000 ₫) được tính trên tạm tính trước hay sau khi giảm giá?**  
   👉 **A:** Tính trên tạm tính **trước khi giảm giá** để đơn giản và đem lại lợi ích tốt nhất cho khách hàng.
3. **Q: Giảm giá có được áp dụng trừ vào phí vận chuyển không?**  
   👉 **A:** Không. Giảm giá chỉ được khấu trừ vào tiền hàng (tạm tính).
4. **Q: Số tiền giảm giá có thể lớn hơn tiền hàng không?**  
   👉 **A:** Không. Mức giảm tối đa bằng đúng tạm tính tiền hàng, số tiền thanh toán không bao giờ âm.
5. **Q: Mã đã áp dụng có được giữ lại khi khách tải lại trang thanh toán không?**  
   👉 **A:** Có. Mã được lưu trong trạng thái phiên thanh toán (client state) để tránh khách phải nhập lại.
6. **Q: Nếu khách hàng quay lại giỏ hàng và xóa bớt sản phẩm khiến đơn không còn đủ giá trị tối thiểu thì xử lý thế nào?**  
   👉 **A:** Khi khách quay lại trang thanh toán, hệ thống tự động hủy áp dụng mã giảm giá, hiển thị thông báo rõ lý do: `"Mã [CODE] đã bị hủy do đơn hàng chưa đạt giá trị tối thiểu [X] ₫ (cần mua thêm [Y] ₫)"` và tính toán lại tổng tiền thanh toán không giảm giá.
7. **Q: Mã hết hạn tính vào thời điểm nào trong ngày?**  
   👉 **A:** Hết hạn vào 23:59:59 của ngày hết hạn ghi trong cấu hình, tính theo múi giờ Việt Nam (UTC+7).
8. **Q: Nếu mã hợp lệ lúc áp dụng nhưng hết hạn tại thời điểm bấm đặt hàng thì sao?**  
   👉 **A:** Không tạo đơn hàng. Server từ chối lệnh tạo đơn. Mã vẫn nằm trong ô nhập mã trên giao diện nhưng báo trạng thái `[đã hết hạn]`, nút đặt hàng bị chặn và khách hàng phải tự gỡ mã ra (hoặc đổi mã khác) sau đó mới cho tạo đơn lại.

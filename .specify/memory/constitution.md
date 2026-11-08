<!--
Sync Impact Report
- Version change: chưa có bản trước → 1.0.0
- Modified principles: không có; tạo mới 5 nguyên tắc theo yêu cầu ShopLite
- Added sections: Ràng buộc kỹ thuật; Quy trình phát triển; Governance
- Removed sections: không có
- Follow-up TODOs: cần xác nhận ngày ratification ban đầu của constitution
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

Code MUST được tổ chức theo tính năng trong `src/features/<feature>/`, bao gồm
nghiệp vụ, component và test liên quan. Code trong `src/app/` MUST chỉ điều phối
route, page hoặc route handler mỏng; logic nghiệp vụ SHOULD nằm trong feature
hoặc thư viện dùng chung phù hợp. Cấu trúc này giúp mỗi tính năng dễ đọc, kiểm
thử và mở rộng độc lập.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

Mọi quy tắc tính tiền, giới hạn số lượng/tồn kho và chuyển trạng thái MUST có
unit test viết trước khi triển khai, bao gồm các giá trị biên và trường hợp lỗi.
Thay đổi nghiệp vụ MUST bổ sung hoặc cập nhật test tương ứng. `npm run check`
MUST pass trước khi hoàn tất thay đổi. Đây là hàng rào bắt buộc để ngăn hồi quy
trong các quy tắc ảnh hưởng trực tiếp đến đơn hàng và dữ liệu khách hàng.

### III. Server là nguồn sự thật về tiền

Server MUST lấy lại giá từ catalog và tự tính giá sản phẩm, phí giao hàng, giảm
giá (nếu có) và tổng tiền; server MUST NOT tin các giá trị tiền do client gửi lên.
Input từ client MUST được validate bằng Zod trước khi xử lý. Các phép tính tiền
MUST là nghiệp vụ thuần, có test cho số tiền biên và phương thức giao hàng. Quy
tắc này bảo đảm tổng tiền nhất quán và chống thao túng từ phía trình duyệt.

### IV. Đơn giản trước

Dự án MUST ưu tiên stack và cấu trúc hiện có: Next.js App Router, TypeScript,
Tailwind CSS, Zod và lưu trữ JSON hiện tại. Không được thêm dependency hoặc
database nếu plan không giải thích rõ lý do, phạm vi ảnh hưởng và lợi ích. Code
SHOULD chọn giải pháp nhỏ nhất đáp ứng yêu cầu hiện tại; độ phức tạp bổ sung
MUST có lý do kiểm chứng được để giữ dự án dễ học và dễ bảo trì.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

Text giao diện MUST bằng tiếng Việt và giá MUST được hiển thị qua
`formatCurrency()`. Mọi form MUST có label liên kết đúng với trường nhập, thông
báo lỗi theo từng trường và trạng thái lỗi có thể hiểu được. Component tương tác
SHOULD dùng semantic HTML, tên accessible và các role/label phù hợp để hỗ trợ
điều hướng bằng bàn phím và công cụ hỗ trợ.

## Ràng buộc kỹ thuật

- MUST dùng Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4
  và Zod 4 theo stack hiện tại.
- Dữ liệu sản phẩm MUST nằm trong `src/data/`; đơn hàng MUST đi qua repository
  JSON hiện tại và tệp JSON runtime MUST không được commit.
- Giỏ hàng MUST giữ tương thích với dữ liệu cũ trong
  `localStorage["shoplite:cart"]`.
- `MAX_QUANTITY_PER_ITEM = 10` và số lượng MUST không vượt tồn kho.
- Phí giao hàng MUST tuân theo quy tắc hiện tại: standard 30.000đ, miễn phí từ
  500.000đ, express 60.000đ.
- API MUST trả lỗi theo dạng `{ error: { code, message, details? } }` và MUST
  dùng các helper xử lý request/error hiện có.
- Code MUST không dùng `any`, không tắt ESLint để bỏ qua lỗi, không chứa secret,
  token hoặc dữ liệu runtime ngoài các tệp được phép.

## Quy trình phát triển

- Mỗi thay đổi MUST thực hiện trên nhánh riêng; không commit hoặc push thay cho
  người dùng nếu chưa được yêu cầu.
- Trước khi code, spec MUST được đọc và mọi câu hỏi mở có ảnh hưởng đến phạm vi,
  hành vi hoặc dữ liệu MUST được giải quyết. Không được bắt đầu code khi spec còn
  câu hỏi mở.
- Plan MUST xác định feature, tác động đến route/API và chiến lược test trước khi
  triển khai.
- Thay đổi nghiệp vụ MUST theo chu trình test trước: viết test thất bại cho hành
  vi mong muốn, triển khai, rồi refactor khi test đã xanh.
- Sau mỗi thay đổi MUST chạy test liên quan; trước khi báo hoàn tất MUST chạy
  `npm run check`. Thay đổi UI SHOULD được kiểm tra ở desktop và viewport 390px
  khi có thể.
- Review MUST kiểm tra tuân thủ constitution, phạm vi diff, lỗi accessibility,
  dữ liệu nhạy cảm và khả năng hồi quy.

## Governance

Constitution này là chuẩn ưu tiên cho quyết định kiến trúc, phát triển và review
của ShopLite. Mọi pull request hoặc thay đổi tương đương MUST kiểm tra mức tuân
thủ các nguyên tắc, ràng buộc và quality gate trong tài liệu này. Nếu một thay
đổi cần ngoại lệ, plan MUST ghi rõ lý do, rủi ro, phạm vi và cách thay thế hoặc
hoàn nguyên.

Sửa constitution MUST được thực hiện qua thay đổi tài liệu có review. Mỗi sửa
đổi MUST cập nhật Sync Impact Report, ngày sửa và version theo SemVer:

- MAJOR khi loại bỏ hoặc định nghĩa lại nguyên tắc theo hướng không tương thích.
- MINOR khi thêm nguyên tắc hoặc mở rộng đáng kể yêu cầu quản trị.
- PATCH khi chỉ làm rõ, sửa lỗi hoặc tinh chỉnh không đổi ý nghĩa.

Việc compliance review MUST được thực hiện khi tạo plan, khi review thay đổi và
trước khi hoàn tất. Khi constitution thay đổi, các template hoặc tài liệu phụ
thuộc SHOULD được rà soát ở lần sử dụng kế tiếp để phát hiện hướng dẫn lỗi thời.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): xác nhận ngày
constitution được thông qua lần đầu | **Last Amended**: 2026-11-08

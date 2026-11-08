# Spec Delta

## Purpose

Cho khách lưu sản phẩm vào danh sách yêu thích riêng, tách khỏi giỏ hàng, để quay lại so sánh và mua sau mà không cần đăng nhập. Danh sách nằm trên trình duyệt của khách và chỉ chứa sản phẩm đã chọn, không chứa giá hay tồn kho.

## ADDED Requirements

### Requirement: Nút trái tim bật/tắt trên thẻ sản phẩm và trang chi tiết
Hệ thống SHALL hiển thị nút trái tim trên mỗi thẻ sản phẩm và ở trang chi tiết sản phẩm. Bấm nút khi sản phẩm chưa có trong danh sách thì thêm vào; bấm lần nữa thì bỏ ra khỏi danh sách.

#### Scenario: Thêm sản phẩm vào danh sách yêu thích
- **WHEN** khách bấm nút trái tim của một sản phẩm chưa được thích
- **THEN** sản phẩm được thêm vào danh sách yêu thích
- **AND** nút chuyển sang trạng thái "đã thích"

#### Scenario: Bấm lần nữa để bỏ thích
- **WHEN** khách bấm nút trái tim của một sản phẩm đang được thích
- **THEN** sản phẩm bị bỏ khỏi danh sách yêu thích
- **AND** nút trở về trạng thái "chưa thích"

#### Scenario: Cùng một sản phẩm xuất hiện ở nhiều nơi
- **WHEN** khách thích một sản phẩm ở thẻ sản phẩm
- **THEN** nút trái tim của chính sản phẩm đó ở trang chi tiết và ở mục "Sản phẩm liên quan" cũng hiển thị "đã thích"

### Requirement: Trạng thái "đã thích" nhìn thấy rõ và đọc được bằng screen reader
Nút trái tim SHALL phân biệt "đã thích" với "chưa thích" bằng hình dạng (trái tim đặc so với trái tim viền), không chỉ bằng màu. Nút MUST có tên truy cập nêu tên sản phẩm và MUST báo trạng thái bật/tắt cho công nghệ hỗ trợ.

#### Scenario: Screen reader đọc trạng thái đã thích
- **WHEN** screen reader dừng ở nút trái tim của sản phẩm đang được thích
- **THEN** nó đọc tên sản phẩm cùng trạng thái đã bật

#### Scenario: Điều khiển bằng bàn phím
- **WHEN** khách dùng phím Tab để tới nút trái tim rồi nhấn Enter hoặc Space
- **THEN** sản phẩm được thêm vào hoặc bỏ ra khỏi danh sách như khi bấm chuột

### Requirement: Header hiển thị số lượng sản phẩm yêu thích và dẫn tới trang yêu thích
Header SHALL có biểu tượng trái tim dẫn tới `/wishlist`. Khi danh sách có ít nhất một sản phẩm, biểu tượng SHALL kèm số lượng sản phẩm (không phải tổng số lượng mua). Khi danh sách trống, số lượng MUST không hiển thị.

#### Scenario: Số lượng cập nhật ngay khi thích
- **WHEN** khách thích sản phẩm thứ ba
- **THEN** biểu tượng trái tim ở header hiển thị số 3 mà không cần tải lại trang

#### Scenario: Danh sách trống
- **WHEN** danh sách yêu thích không có sản phẩm nào
- **THEN** header hiển thị biểu tượng trái tim không kèm số

#### Scenario: Tên truy cập có số lượng
- **WHEN** danh sách có 3 sản phẩm
- **THEN** liên kết trái tim ở header có tên truy cập nêu số 3 sản phẩm yêu thích

#### Scenario: Mở trang yêu thích
- **WHEN** khách bấm biểu tượng trái tim ở header
- **THEN** trình duyệt chuyển tới trang `/wishlist`

### Requirement: Giới hạn tối đa 50 sản phẩm và báo khi đầy
Danh sách yêu thích SHALL chứa tối đa 50 sản phẩm. Khi danh sách đã đủ 50, hệ thống MUST từ chối thêm sản phẩm mới và hiển thị thông báo nêu rõ danh sách đã đầy và giới hạn 50 sản phẩm. Bỏ thích sản phẩm hiện có MUST vẫn được phép.

#### Scenario: Thêm sản phẩm thứ 50 (bằng ngưỡng)
- **WHEN** danh sách có 49 sản phẩm và khách thích thêm một sản phẩm khác
- **THEN** sản phẩm được thêm và danh sách có đúng 50 sản phẩm

#### Scenario: Thêm sản phẩm thứ 51 (vượt ngưỡng)
- **WHEN** danh sách đã có 50 sản phẩm và khách bấm nút trái tim của sản phẩm chưa thích
- **THEN** danh sách vẫn có 50 sản phẩm và không thêm sản phẩm mới
- **AND** khách thấy thông báo danh sách đã đầy, tối đa 50 sản phẩm
- **AND** nút trái tim của sản phẩm đó vẫn ở trạng thái "chưa thích"

#### Scenario: Thông báo đầy được đọc bằng screen reader
- **WHEN** thông báo danh sách đã đầy xuất hiện
- **THEN** công nghệ hỗ trợ đọc thông báo đó mà khách không phải di chuyển tiêu điểm

#### Scenario: Bỏ thích khi danh sách đầy
- **WHEN** danh sách có 50 sản phẩm và khách bấm nút trái tim của một sản phẩm đang thích
- **THEN** sản phẩm bị bỏ và danh sách còn 49 sản phẩm

### Requirement: Mỗi sản phẩm chỉ xuất hiện một lần trong danh sách
Hệ thống SHALL đảm bảo một sản phẩm không xuất hiện quá một lần trong danh sách yêu thích, và mọi thao tác thêm hoặc bỏ thích MUST lặp lại được mà không làm hỏng danh sách.

#### Scenario: Bấm nhanh nhiều lần
- **WHEN** khách bấm nút trái tim của cùng một sản phẩm hai lần liên tiếp
- **THEN** sản phẩm không còn trong danh sách (thêm rồi bỏ), không có bản sao nào

### Requirement: Sản phẩm hết hàng vẫn thích được
Khách SHALL có thể thêm sản phẩm hết hàng vào danh sách yêu thích và bỏ thích nó như mọi sản phẩm khác.

#### Scenario: Thích sản phẩm hết hàng
- **WHEN** khách bấm nút trái tim của một sản phẩm có tồn kho bằng 0
- **THEN** sản phẩm được thêm vào danh sách yêu thích

### Requirement: Danh sách lưu trên trình duyệt, không cần đăng nhập
Hệ thống SHALL lưu danh sách yêu thích trên trình duyệt của khách và giữ nguyên khi tải lại trang hoặc mở lại trình duyệt. Khách MUST dùng được danh sách mà không đăng nhập, và dữ liệu MUST không được gửi lên server.

#### Scenario: Giữ nguyên khi tải lại trang
- **WHEN** khách thích hai sản phẩm rồi tải lại trang
- **THEN** hai sản phẩm đó vẫn ở trạng thái "đã thích" và header vẫn hiển thị số 2

#### Scenario: Dữ liệu đã lưu bị hỏng
- **WHEN** dữ liệu danh sách đã lưu trên trình duyệt không đọc được hoặc sai định dạng
- **THEN** hệ thống coi danh sách là trống và vẫn dùng được bình thường, không báo lỗi cho khách

#### Scenario: Dữ liệu đã lưu vượt giới hạn
- **WHEN** dữ liệu đã lưu chứa nhiều hơn 50 sản phẩm hoặc có sản phẩm trùng
- **THEN** hệ thống loại bản trùng và chỉ giữ tối đa 50 sản phẩm đầu tiên

#### Scenario: Trình duyệt chặn lưu trữ
- **WHEN** trình duyệt không cho ghi dữ liệu (ví dụ chế độ ẩn danh chặn lưu trữ)
- **THEN** danh sách vẫn hoạt động trong phiên hiện tại

### Requirement: Đồng bộ danh sách giữa các tab đang mở
Khi danh sách yêu thích thay đổi ở một tab, các tab khác của cùng trình duyệt đang mở trang ShopLite SHALL cập nhật nút trái tim và số lượng ở header mà không cần tải lại.

#### Scenario: Thích ở tab này, tab kia cập nhật
- **WHEN** khách thích một sản phẩm ở tab A trong khi tab B đang mở cùng sản phẩm đó
- **THEN** nút trái tim ở tab B chuyển sang "đã thích" và số lượng ở header tab B tăng lên

#### Scenario: Bỏ thích ở tab này, tab kia cập nhật
- **WHEN** khách bỏ thích một sản phẩm ở tab A trong khi tab B đang mở trang `/wishlist`
- **THEN** sản phẩm đó biến mất khỏi danh sách ở tab B

### Requirement: Danh sách yêu thích độc lập với giỏ hàng
Việc thêm hoặc bỏ sản phẩm khỏi danh sách yêu thích SHALL không thay đổi giỏ hàng, và ngược lại. Danh sách yêu thích MUST không ảnh hưởng tới giá, phí giao hàng, mã giảm giá hay đơn hàng.

#### Scenario: Thích sản phẩm không đổi giỏ hàng
- **WHEN** khách thích một sản phẩm
- **THEN** số lượng và tạm tính của giỏ hàng không thay đổi

#### Scenario: Đặt hàng không xóa danh sách yêu thích
- **WHEN** khách đặt hàng thành công một sản phẩm đang có trong danh sách yêu thích
- **THEN** sản phẩm đó vẫn ở trong danh sách yêu thích

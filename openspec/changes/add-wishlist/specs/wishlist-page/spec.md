# Spec Delta

## Purpose

Cho khách xem lại các sản phẩm đã thích ở trang `/wishlist` với giá và tồn kho hiện hành, để quyết định bỏ thích hoặc thêm vào giỏ. Gồm cả endpoint trả sản phẩm theo danh sách mã để trang này lấy dữ liệu mới nhất từ catalog.

## ADDED Requirements

### Requirement: Trang yêu thích liệt kê các sản phẩm đã thích
Trang `/wishlist` SHALL liệt kê mọi sản phẩm trong danh sách yêu thích, sản phẩm thêm gần nhất ở đầu. Mỗi mục MUST hiển thị ảnh, tên (liên kết tới trang chi tiết), giá hiện tại, giá gốc nếu đang giảm giá và tình trạng tồn kho.

#### Scenario: Thứ tự hiển thị
- **WHEN** khách lần lượt thích sản phẩm A, rồi B, rồi C và mở `/wishlist`
- **THEN** các sản phẩm hiển thị theo thứ tự C, B, A

#### Scenario: Mở trang chi tiết từ danh sách
- **WHEN** khách bấm tên một sản phẩm trong danh sách
- **THEN** trình duyệt chuyển tới trang chi tiết của sản phẩm đó

### Requirement: Giá và tồn kho luôn là số liệu mới nhất
Trang yêu thích SHALL hiển thị giá và tồn kho hiện hành của catalog tại thời điểm mở trang, không dùng giá hay tồn kho đã có khi khách thích sản phẩm. Dữ liệu này MUST do server trả về, không lấy từ dữ liệu lưu trên trình duyệt.

#### Scenario: Giá đổi sau khi thích
- **WHEN** khách thích một sản phẩm, sau đó giá sản phẩm trong catalog thay đổi, rồi khách mở `/wishlist`
- **THEN** trang hiển thị giá mới

#### Scenario: Tồn kho đổi sau khi thích
- **WHEN** khách thích một sản phẩm còn hàng, sau đó tồn kho của nó về 0, rồi khách mở `/wishlist`
- **THEN** sản phẩm hiển thị "Hết hàng"

### Requirement: Bỏ thích từ trang yêu thích
Mỗi sản phẩm trên trang yêu thích SHALL có nút bỏ thích có tên truy cập nêu tên sản phẩm. Bấm nút MUST bỏ sản phẩm khỏi danh sách ngay và cập nhật số lượng ở header.

#### Scenario: Bỏ một sản phẩm
- **WHEN** danh sách có 3 sản phẩm và khách bấm nút bỏ thích của một sản phẩm
- **THEN** sản phẩm đó biến mất khỏi trang và header hiển thị số 2

#### Scenario: Bỏ sản phẩm cuối cùng
- **WHEN** khách bỏ thích sản phẩm cuối cùng trong danh sách
- **THEN** trang chuyển sang trạng thái trống

### Requirement: Thêm sản phẩm từ danh sách yêu thích vào giỏ hàng
Mỗi sản phẩm còn hàng trên trang yêu thích SHALL có nút thêm vào giỏ, thêm 1 sản phẩm vào giỏ theo giá hiện hành và tuân theo giới hạn số lượng của giỏ hàng. Sản phẩm MUST vẫn ở trong danh sách yêu thích sau khi thêm vào giỏ.

#### Scenario: Thêm vào giỏ thành công
- **WHEN** khách bấm thêm vào giỏ ở một sản phẩm còn hàng
- **THEN** giỏ hàng tăng 1 sản phẩm đó và biểu tượng giỏ hàng ở header cập nhật số lượng
- **AND** sản phẩm vẫn còn trong danh sách yêu thích

#### Scenario: Đã đạt số lượng tối đa trong giỏ
- **WHEN** số lượng của sản phẩm trong giỏ đã bằng mức tối đa cho phép của giỏ hàng
- **THEN** nút thêm vào giỏ của sản phẩm đó bị vô hiệu hóa

### Requirement: Sản phẩm hết hàng hiển thị rõ và không thêm vào giỏ được
Sản phẩm có tồn kho bằng 0 SHALL vẫn nằm trong danh sách yêu thích, hiển thị "Hết hàng" và có nút thêm vào giỏ bị vô hiệu hóa. Nút bỏ thích MUST vẫn dùng được.

#### Scenario: Sản phẩm hết hàng trong danh sách
- **WHEN** khách mở `/wishlist` có một sản phẩm tồn kho bằng 0
- **THEN** sản phẩm hiển thị "Hết hàng", nút thêm vào giỏ bị vô hiệu hóa và nút bỏ thích vẫn dùng được

#### Scenario: Sản phẩm còn hàng ít
- **WHEN** khách mở `/wishlist` có một sản phẩm còn 3 sản phẩm trong kho
- **THEN** sản phẩm hiển thị "Chỉ còn 3 sản phẩm" và nút thêm vào giỏ dùng được

### Requirement: Trạng thái trống mời khách khám phá sản phẩm
Khi danh sách yêu thích không có sản phẩm nào, trang `/wishlist` SHALL hiển thị thông báo danh sách đang trống kèm lời mời khám phá và liên kết tới trang `/products`.

#### Scenario: Chưa thích sản phẩm nào
- **WHEN** khách mở `/wishlist` lần đầu khi chưa thích sản phẩm nào
- **THEN** trang hiển thị thông báo trống, lời mời khám phá và liên kết tới `/products`

### Requirement: Trạng thái đang tải và lỗi tải dữ liệu
Trong lúc chưa đọc xong danh sách hoặc chưa tải xong dữ liệu sản phẩm, trang SHALL hiển thị chỗ giữ chỗ đang tải và MUST không hiển thị trạng thái trống. Khi không tải được dữ liệu sản phẩm, trang MUST báo lỗi bằng tiếng Việt kèm nút thử lại và MUST không xóa danh sách đã lưu.

#### Scenario: Đang tải
- **WHEN** khách mở `/wishlist` có sản phẩm đã lưu và dữ liệu chưa về
- **THEN** trang hiển thị chỗ giữ chỗ đang tải, không hiển thị thông báo trống

#### Scenario: Tải dữ liệu thất bại
- **WHEN** yêu cầu lấy dữ liệu sản phẩm thất bại
- **THEN** trang hiển thị thông báo lỗi và nút thử lại
- **AND** số lượng sản phẩm yêu thích ở header không đổi

#### Scenario: Thử lại thành công
- **WHEN** khách bấm thử lại và dữ liệu tải được
- **THEN** trang hiển thị danh sách sản phẩm bình thường

### Requirement: Sản phẩm không còn trong catalog bị gỡ khỏi danh sách
Khi một mã sản phẩm trong danh sách yêu thích không còn trong catalog, trang yêu thích SHALL không hiển thị mục đó và hệ thống MUST gỡ nó khỏi danh sách để số lượng ở header khớp với số sản phẩm hiển thị.

#### Scenario: Mã sản phẩm không tồn tại
- **WHEN** danh sách đã lưu có một mã sản phẩm không còn trong catalog và khách mở `/wishlist`
- **THEN** trang chỉ hiển thị các sản phẩm còn tồn tại
- **AND** số lượng ở header bằng số sản phẩm hiển thị

### Requirement: API tra cứu sản phẩm theo danh sách mã
Hệ thống SHALL cung cấp `GET /api/products/by-ids?ids=<id1>,<id2>,...` trả `200` với `{ "items": [...] }` gồm sản phẩm hiện hành theo đúng thứ tự mã trong `ids`. Mã không tồn tại MUST bị bỏ qua, mã trùng MUST chỉ trả một lần. Mỗi sản phẩm có cùng dạng với `GET /api/products/:slug`.

#### Scenario: Trả đúng thứ tự
- **WHEN** gọi với `ids=p003,p001`
- **THEN** response 200 có `items` gồm sản phẩm `p003` rồi `p001`

#### Scenario: Bỏ qua mã không tồn tại
- **WHEN** gọi với `ids=p001,khong-co`
- **THEN** response 200 có `items` chỉ gồm sản phẩm `p001`

#### Scenario: Mã trùng lặp
- **WHEN** gọi với `ids=p001,p001`
- **THEN** response 200 có `items` chỉ gồm một sản phẩm `p001`

#### Scenario: Dữ liệu luôn mới
- **WHEN** gọi endpoint hai lần liên tiếp và catalog đổi giữa hai lần
- **THEN** lần gọi sau trả dữ liệu mới, không trả bản đã cache của lần trước

### Requirement: API tra cứu từ chối tham số không hợp lệ
Endpoint `GET /api/products/by-ids` SHALL trả `400` với body `{ "error": { "code": "INVALID_QUERY", "message": ... } }` khi `ids` thiếu, rỗng, có nhiều hơn 50 mã hoặc có mã sai định dạng. Thông báo lỗi MUST bằng tiếng Việt.

#### Scenario: Thiếu hoặc rỗng ids
- **WHEN** gọi không có `ids`, hoặc `ids=`
- **THEN** response 400 với `error.code` là `INVALID_QUERY`

#### Scenario: Vượt giới hạn 50 mã
- **WHEN** gọi với 51 mã khác nhau
- **THEN** response 400 với `error.code` là `INVALID_QUERY`

#### Scenario: Đúng 50 mã (bằng ngưỡng)
- **WHEN** gọi với đúng 50 mã hợp lệ
- **THEN** response 200

#### Scenario: Mã sai định dạng
- **WHEN** gọi với `ids=p001,<script>`
- **THEN** response 400 với `error.code` là `INVALID_QUERY`

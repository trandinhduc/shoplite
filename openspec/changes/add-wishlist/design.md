# Design

## Context

Động lực và phạm vi: xem `proposal.md`. Yêu cầu hành vi: xem `specs/wishlist/spec.md` và `specs/wishlist-page/spec.md`.

Hiện trạng liên quan:

- Giỏ hàng là mẫu để theo: `cartStore` (`src/features/cart/cart-store.ts`) giữ state ở module, lưu `localStorage`, phát sự kiện qua `useSyncExternalStore`, đồng bộ tab bằng sự kiện `storage`; `useCart` thêm cờ `hydrated` (qua `useHydrated`) để tránh lệch SSR.
- Giỏ hàng lưu **ảnh chụp** sản phẩm (giá, tồn kho tại lúc thêm). Wishlist không được làm vậy vì yêu cầu giá/tồn kho luôn mới nhất.
- Catalog là dữ liệu tĩnh ở server (`src/data/products.ts`, 16 sản phẩm). Chỉ `catalog-filters.tsx` là client component import `catalog-service`. Đã có `GET /api/products` và `GET /api/products/[slug]`; chưa có cách lấy nhiều sản phẩm theo mã.
- `ProductCard` là Server Component; link ảnh trong thẻ có `aria-hidden` và `tabIndex={-1}`, nên nút trái tim phải nằm **ngoài** link đó.
- Trang chi tiết là Server Component; `ProductPurchasePanel` trả về sớm (không có nút) khi hết hàng, nên nút trái tim không đặt trong panel.
- Header đã khá chật ở màn hình hẹp (logo + 3 liên kết + giỏ hàng).

## Goals / Non-Goals

**Goals:**

- Wishlist hoạt động hoàn toàn phía client, theo đúng kiến trúc giỏ hàng, không đụng tới `cartStore`, `pricing.ts` hay luồng đặt hàng.
- Giá và tồn kho ở trang `/wishlist` do server cung cấp ở mỗi lần mở trang.
- Nút trái tim dùng được bằng bàn phím và screen reader.

**Non-Goals:**

- Không tách lớp `createLocalStorageStore` dùng chung cho cart và wishlist. Sẽ lặp lại khoảng 40 dòng mẫu đọc/ghi/subscribe để không sửa `cartStore` (đang có test và là luồng mua hàng chính). Có thể gộp ở một change riêng.
- Không có toast/thông báo toàn cục mới; không có polling hay làm mới khi tab lấy lại tiêu điểm.

## Decisions

### 1. Chỉ lưu `productId`, mới nhất xếp đầu

State là `{ productIds: string[] }`, khóa `localStorage` là `WISHLIST_STORAGE_KEY = "shoplite:wishlist"`. `add` chèn vào đầu mảng, nên thứ tự hiển thị "thêm gần nhất trước" chính là thứ tự mảng, không cần lưu thời gian.

- Khi đọc, dữ liệu qua một hàm làm sạch: bỏ phần tử không phải chuỗi/rỗng, bỏ trùng, cắt còn `WISHLIST_MAX_ITEMS` (50) phần tử đầu; sai kiểu hoặc JSON hỏng thì coi là danh sách trống. Cùng cách xử lý với `isCartState` / `toCartState`.
- _Thay thế đã loại:_ lưu ảnh chụp như giỏ hàng, vì giá/tồn kho cũ vi phạm yêu cầu "luôn mới nhất" và cần cơ chế làm mới riêng.

### 2. Reducer thuần + store theo mẫu `cartStore`

Thư mục `src/features/wishlist/`:

| File                             | Vai trò                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wishlist-reducer.ts`            | `WISHLIST_MAX_ITEMS`, `EMPTY_WISHLIST`, `sanitizeProductIds`, `wishlistReducer` (`add`, `remove`, `remove-many`, `clear`), `isWishlistFull`           |
| `wishlist-store.ts`              | `WISHLIST_STORAGE_KEY`, `wishlistStore` (`getSnapshot`, `getServerSnapshot`, `subscribe`, `dispatch`, `reset`); nghe sự kiện `storage` để đồng bộ tab |
| `use-wishlist.ts`                | `useWishlist()`: `productIds`, `count`, `hydrated`, `has(id)`, `toggle(id)`, `remove(id)`, `removeMany(ids)`                                          |
| `components/wishlist-button.tsx` | nút trái tim (client)                                                                                                                                 |
| `components/wishlist-badge.tsx`  | chỉ báo ở header (client)                                                                                                                             |
| `components/wishlist-view.tsx`   | nội dung trang `/wishlist` (client)                                                                                                                   |
| `components/wishlist-item.tsx`   | một dòng sản phẩm trong trang yêu thích                                                                                                               |

`add` khi đã đủ 50 hoặc đã có sản phẩm trả về **cùng tham chiếu state** nên `dispatch` không ghi/phát sự kiện (giống `cartStore`). `toggle` tính kết quả từ state hiện tại trước khi dispatch và trả `"added" | "removed" | "full"` để nút biết có cần báo đầy hay không. Nhờ đó "đầy" là kết quả của thao tác, không phải trạng thái suy ra từ UI.

### 3. Báo "danh sách đã đầy" bằng vùng `role="status"` ngay cạnh nút

Không có hạ tầng toast, và `title` hay màu sắc không đủ cho screen reader. `WishlistButton` luôn render sẵn một phần tử `role="status"` (live region phải có trước khi nội dung đổi thì mới được đọc). Khi `toggle` trả `"full"`, phần tử này hiện lời nhắn "Danh sách yêu thích đã đầy (tối đa 50 sản phẩm). Hãy bỏ bớt sản phẩm để thêm mới." trong khoảng 4 giây rồi tự ẩn; nút **không** bị `disabled` để khách vẫn bấm được và nhận lời nhắn. Trên thẻ sản phẩm, lời nhắn là bong bóng nhỏ định vị tuyệt đối bên dưới nút.

- _Thay thế đã loại:_ `disabled` + tooltip (không focus được, screen reader không biết lý do); thêm thư viện toast (thêm dependency cho một thông báo).

### 4. Trợ năng của nút trái tim

- Dùng `aria-pressed={liked}` với `aria-label` **cố định** `Yêu thích {tên sản phẩm}`. Không đổi nhãn theo trạng thái, vì đổi cả nhãn lẫn `aria-pressed` làm screen reader đọc mâu thuẫn.
- Trạng thái nhìn thấy: biểu tượng `Heart` của `lucide-react` tô đặc màu hồng khi đã thích, chỉ viền khi chưa thích (khác nhau về hình, không chỉ màu).
- Vị trí: trên `ProductCard` là phần tử anh em của link ảnh, định vị `absolute` góc trên phải ảnh (huy hiệu giảm giá ở góc trái); ở trang chi tiết đặt cạnh tiêu đề `h1`. Component nhận `productId` và `productName` (props tuần tự hóa được) để dùng được từ Server Component.
- Trước khi hydrate, state là trống (server snapshot) nên nút render "chưa thích", sau đó cập nhật theo `localStorage`; không gây lệch hydration, giống `CartBadge`.

### 5. Trang `/wishlist` lấy dữ liệu mới nhất từ server bằng `GET /api/products/by-ids`

Luồng: `app/wishlist/page.tsx` (Server Component mỏng, có `metadata`) → `WishlistView` (client) đọc `productIds` từ `useWishlist()` → `fetch("/api/products/by-ids?ids=...", { cache: "no-store", signal })` → hiển thị.

- Danh sách hiển thị = `productIds` hiện tại ghép với bản đồ sản phẩm đã tải, theo thứ tự `productIds`. Chỉ gọi API cho các mã **chưa có** trong bản đồ: bỏ thích không làm tải lại hay nhấp nháy; mã mới thêm từ tab khác thì được tải bổ sung. Mỗi lần vào trang là một lần mount mới nên luôn lấy giá/tồn kho hiện hành.
- Phản hồi trả thiếu mã nào (sản phẩm không còn trong catalog) thì gọi `removeMany` để gỡ mã đó khỏi store, giữ số ở header khớp với trang.
- Trạng thái: chưa `hydrated` hoặc đang tải lần đầu → khung giữ chỗ (`aria-busy`, giống `CartView`), tuyệt đối không hiện trạng thái trống; lỗi mạng/HTTP → thông báo tiếng Việt + nút "Thử lại", **không** xóa store; `productIds` rỗng → `EmptyState` (emoji 💝, nút "Khám phá sản phẩm" tới `/products`). Yêu cầu cũ bị hủy (`AbortController`) khi danh sách mã đổi hoặc component bị gỡ.
- Thêm vào giỏ dùng lại `AddToCartButton` với `Product` đầy đủ lấy từ API, nên tự có đúng quy tắc tồn kho (`stock = 0` → nút "Hết hàng" bị vô hiệu hóa) và giới hạn `getMaxQuantity`. Không viết lại logic giỏ hàng.
- Mỗi dòng dùng `ProductImage`, `PriceTag`, `StockBadge`. `StockBadge` luôn hiện (khác `ProductCard`, vốn ẩn khi còn hàng) để đáp ứng yêu cầu hiển thị tồn kho.
- **Giữ catalog ra khỏi bundle client**: `StockBadge` lấy `getStockStatus` từ `catalog-service.ts`, file này import cả dữ liệu `products`. Vì `WishlistItem` là client component, `getStockStatus` và `LOW_STOCK_THRESHOLD` được tách sang `src/features/catalog/stock-status.ts` (không import dữ liệu), `catalog-service.ts` re-export lại nên mọi import cũ và test cũ giữ nguyên; `StockBadge` import từ file mới. Không đổi hành vi.
- _Thay thế đã loại:_
  - Import `catalog-service` vào client để tra tại chỗ: đưa toàn bộ catalog vào bundle client, và dữ liệu khi đó là bản lúc build chứ không phải do server trả.
  - Server Component đọc cookie: cần đồng bộ cookie với `localStorage`, thực chất là lưu phía server (ngoài phạm vi).
  - Gọi `/api/products/[slug]` cho từng mục: N yêu cầu và phải lưu thêm `slug`.
  - Dùng `ProductGrid`/`ProductCard` cho trang này: nút bỏ thích khi đó chỉ là nút trái tim "đã bật" với nhãn "Yêu thích …", không có nút bỏ thích rõ nghĩa và ẩn nhãn tồn kho khi còn hàng.

### 6. Endpoint `GET /api/products/by-ids`

- Route handler mỏng ở `src/app/api/products/by-ids/route.ts`; hàm thuần `getProductsByIds(ids)` trong `catalog-service.ts` (giữ thứ tự `ids`, bỏ mã không tồn tại, bỏ trùng); schema Zod trong `src/features/catalog/catalog-schema.ts` (mới) kiểm tra `ids`: có mặt, tách bởi dấu phẩy, mỗi mã khớp `^[A-Za-z0-9_-]{1,64}$`, tối đa `MAX_PRODUCT_IDS_PER_LOOKUP = 50` mã (đếm trước khi bỏ trùng). Đúng quy tắc "mọi input từ client validate bằng Zod".
- Lỗi trả bằng `jsonError(400, "INVALID_QUERY", <thông báo tiếng Việt>)`, đúng dạng `{ error: { code, message } }` và cùng cách `products/[slug]` đang dùng `jsonError`. Không dùng `OrderError`/`HTTP_STATUS_BY_CODE` vì đó là mã lỗi của đơn hàng.
- Thành công trả `{ items: Product[] }`. Route đọc `request.nextUrl.searchParams` nên Next xử lý như route động, không cache.
- `MAX_PRODUCT_IDS_PER_LOOKUP` (catalog) và `WISHLIST_MAX_ITEMS` (wishlist) là hai hằng riêng để catalog không phụ thuộc wishlist. Một test khẳng định `WISHLIST_MAX_ITEMS <= MAX_PRODUCT_IDS_PER_LOOKUP` để hai số không lệch nhau âm thầm.
- Đường dẫn `by-ids` là segment tĩnh nên được ưu tiên hơn `[slug]`; sản phẩm có slug đúng `by-ids` sẽ bị che. Hiện không có (xem Rủi ro).

### 7. Header

`WishlistBadge` (client) đặt cạnh `CartBadge` trong `Header`, cùng kích thước và kiểu. Liên kết `/wishlist` có `aria-label` là `Yêu thích (N sản phẩm)` khi có sản phẩm, ngược lại là `Yêu thích`; số hiển thị trong `data-testid="wishlist-count"`, chỉ khi đã hydrate và `N > 0` (không cần rút gọn kiểu `99+` như giỏ hàng vì tối đa 50). Số đếm là **số sản phẩm** (`productIds.length`), khác `itemCount` của giỏ hàng là tổng số lượng.

### 8. Giả định cho các điểm yêu cầu chưa nói rõ

- Thêm vào giỏ từ trang yêu thích **không** gỡ sản phẩm khỏi wishlist; đặt hàng cũng không. Khách tự bỏ thích khi muốn.
- Sản phẩm hết hàng vẫn thích được (yêu cầu nói chúng "vẫn nằm trong danh sách").
- Thông báo đầy là lời nhắn tại chỗ (Quyết định 3), không phải hộp thoại.
- Chuỗi hiển thị bằng tiếng Việt và dùng `formatCurrency` cho tiền, theo quy ước dự án.

## Risks / Trade-offs

- **Header tràn ở màn hình hẹp** (360 px trở xuống): thêm một nút 40 px vào hàng đã chật → Giảm kích thước nút icon (`size-9`) và khoảng cách ở mobile, giữ `NavLinks` không xuống dòng; kiểm tra thủ công ở 320/360/375 px trước khi xong, nếu vẫn tràn thì cho phép thu hẹp padding của liên kết điều hướng.
- **Mã lệch giữa store và catalog** (số ở header lớn hơn số hiển thị) → `removeMany` gỡ mã không còn tồn tại ngay khi mở `/wishlist`; trước đó header có thể đếm dư tạm thời. Chấp nhận được vì catalog tĩnh, mã chỉ biến mất khi đổi code.
- **Hai tab ghi cùng lúc**: `localStorage` không có khóa → bên ghi sau thắng, giống `cartStore`; chấp nhận. Sự kiện `storage` chỉ bắn ở tab khác, nên tab đang thao tác tự cập nhật qua `emit()`.
- **Giới hạn 50 khó chạm tới bằng thao tác thật**: catalog hiện chỉ có 16 sản phẩm → Test của giới hạn (reducer, store, nút, e2e) dùng dữ liệu `localStorage` được seed sẵn với 49/50 mã; mã giả trong dữ liệu seed sẽ bị gỡ khi mở `/wishlist` nên e2e kiểm tra giới hạn ở trang sản phẩm, không ở trang yêu thích.
- **Trùng slug `by-ids`** che route `[slug]` → thêm test khẳng định không sản phẩm nào có slug `by-ids`.
- **Lặp mẫu store** với `cartStore` → chấp nhận có chủ đích (xem Non-Goals); hai store dùng cùng quy ước `reset()` cho test.
- **Test hiện có** render `ProductCard`, giờ kèm nút trái tim dùng `wishlistStore` ở mức module → các test mới đụng wishlist phải gọi `wishlistStore.reset()` trong `beforeEach`; test hiện có không đổi hành vi (nhãn nút không chứa chữ "Hết hàng").

## Migration Plan

Không cần di chuyển dữ liệu: khóa `shoplite:wishlist` là mới, không có dữ liệu cũ. Rollback bằng cách gỡ code của change; khóa còn lại trong trình duyệt khách vô hại.

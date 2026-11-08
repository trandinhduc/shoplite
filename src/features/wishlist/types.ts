/** Danh sách yêu thích chỉ lưu mã sản phẩm, mới thêm xếp đầu. Giá và tồn kho luôn lấy từ server. */
export interface WishlistState {
  productIds: string[];
}

export type WishlistAction =
  | { type: "add"; productId: string }
  | { type: "remove"; productId: string }
  | { type: "remove-many"; productIds: readonly string[] }
  | { type: "clear" };

/** Kết quả của thao tác bật/tắt trái tim. */
export type WishlistToggleResult = "added" | "removed" | "full";

import type { WishlistAction, WishlistState } from "./types";

/** Số sản phẩm tối đa trong danh sách yêu thích. */
export const WISHLIST_MAX_ITEMS = 50;

export const EMPTY_WISHLIST: WishlistState = { productIds: [] };

/**
 * Làm sạch dữ liệu đọc từ trình duyệt: bỏ phần tử không phải chuỗi hoặc rỗng, bỏ trùng
 * và chỉ giữ `WISHLIST_MAX_ITEMS` mã đầu tiên. Không phải mảng thì coi là danh sách trống.
 */
export function sanitizeProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item === "string" && item !== "") unique.add(item);
    if (unique.size >= WISHLIST_MAX_ITEMS) break;
  }
  return [...unique];
}

export function isWishlistFull(state: WishlistState): boolean {
  return state.productIds.length >= WISHLIST_MAX_ITEMS;
}

/**
 * Thao tác không đổi gì (đã có, đã đầy, không tìm thấy) trả về đúng `state` cũ
 * để store không ghi và không báo subscriber.
 */
export function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case "add": {
      if (action.productId === "") return state;
      if (state.productIds.includes(action.productId) || isWishlistFull(state)) return state;
      return { productIds: [action.productId, ...state.productIds] };
    }

    case "remove": {
      if (!state.productIds.includes(action.productId)) return state;
      return { productIds: state.productIds.filter((id) => id !== action.productId) };
    }

    case "remove-many": {
      const removed = new Set(action.productIds);
      const remaining = state.productIds.filter((id) => !removed.has(id));
      return remaining.length === state.productIds.length ? state : { productIds: remaining };
    }

    case "clear":
      return state.productIds.length === 0 ? state : EMPTY_WISHLIST;
  }
}

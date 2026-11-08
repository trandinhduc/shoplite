import type { Product } from "@/features/catalog/types";
import type { CartAction, CartItem, CartState } from "./types";

/** Số lượng tối đa của một sản phẩm trong một đơn hàng. */
export const MAX_QUANTITY_PER_ITEM = 10;

export const EMPTY_CART: CartState = { items: [] };

/** Số lượng tối đa được phép mua, giới hạn bởi tồn kho và MAX_QUANTITY_PER_ITEM. */
export function getMaxQuantity(stock: number): number {
  return Math.max(0, Math.min(stock, MAX_QUANTITY_PER_ITEM));
}

function clampQuantity(quantity: number, stock: number): number {
  const max = getMaxQuantity(stock);
  const whole = Math.floor(quantity);
  if (!Number.isFinite(whole)) return 1;
  return Math.min(Math.max(1, whole), max);
}

export function toCartItem(product: Product): Omit<CartItem, "quantity"> {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.image,
    stock: product.stock,
  };
}

/** Cập nhật danh sách sản phẩm, giữ mã giảm giá; giỏ trống thì bỏ luôn mã. */
function withItems(state: CartState, items: CartItem[]): CartState {
  if (items.length === 0) return { items };
  return { ...state, items };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const { item, quantity } = action;
      if (getMaxQuantity(item.stock) === 0 || quantity < 1) return state;

      const existing = state.items.find((line) => line.productId === item.productId);
      if (!existing) {
        return withItems(state, [
          ...state.items,
          { ...item, quantity: clampQuantity(quantity, item.stock) },
        ]);
      }
      return withItems(
        state,
        state.items.map((line) =>
          line.productId === item.productId
            ? { ...line, ...item, quantity: clampQuantity(line.quantity + quantity, item.stock) }
            : line,
        ),
      );
    }

    case "update-quantity":
      return withItems(
        state,
        state.items.map((line) =>
          line.productId === action.productId
            ? { ...line, quantity: clampQuantity(action.quantity, line.stock) }
            : line,
        ),
      );

    case "remove":
      return withItems(
        state,
        state.items.filter((line) => line.productId !== action.productId),
      );

    case "clear":
      return EMPTY_CART;

    case "apply-coupon": {
      const code = action.code.trim().toUpperCase();
      if (!code) return state;
      return { ...state, couponCode: code };
    }

    case "remove-coupon":
      return { items: state.items };
  }
}

export function getCartItemCount(state: CartState): number {
  return state.items.reduce((sum, line) => sum + line.quantity, 0);
}

export function getCartSubtotal(state: CartState): number {
  return state.items.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

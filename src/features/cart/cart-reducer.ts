import type { Product } from "@/features/catalog/types";
import { normalizeCouponCode } from "@/features/coupons/coupon-rules";
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

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const { item, quantity } = action;
      if (getMaxQuantity(item.stock) === 0 || quantity < 1) return state;

      const existing = state.items.find((line) => line.productId === item.productId);
      if (!existing) {
        return {
          ...state,
          items: [...state.items, { ...item, quantity: clampQuantity(quantity, item.stock) }],
        };
      }
      return {
        ...state,
        items: state.items.map((line) =>
          line.productId === item.productId
            ? { ...line, ...item, quantity: clampQuantity(line.quantity + quantity, item.stock) }
            : line,
        ),
      };
    }

    case "update-quantity":
      return {
        ...state,
        items: state.items.map((line) =>
          line.productId === action.productId
            ? { ...line, quantity: clampQuantity(action.quantity, line.stock) }
            : line,
        ),
      };

    case "remove":
      return { ...state, items: state.items.filter((line) => line.productId !== action.productId) };

    case "apply-coupon": {
      const couponCode = normalizeCouponCode(action.code);
      return couponCode ? { ...state, couponCode } : state;
    }

    case "remove-coupon":
      return state.couponCode === undefined ? state : { items: state.items };

    case "clear":
      return EMPTY_CART;
  }
}

export function getCartItemCount(state: CartState): number {
  return state.items.reduce((sum, line) => sum + line.quantity, 0);
}

export function getCartSubtotal(state: CartState): number {
  return state.items.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

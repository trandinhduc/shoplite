import { useMemo, useSyncExternalStore } from "react";
import type { Product } from "@/features/catalog/types";
import { useHydrated } from "@/lib/use-hydrated";
import { getCartItemCount, getCartSubtotal, toCartItem } from "./cart-reducer";
import { cartStore } from "./cart-store";

export function useCart() {
  const cart = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  const hydrated = useHydrated();

  return useMemo(
    () => ({
      items: cart.items,
      /** Mã giảm giá đang được lưu cùng giỏ hàng (nếu có). */
      couponCode: cart.couponCode,
      itemCount: getCartItemCount(cart),
      subtotal: getCartSubtotal(cart),
      /** false trong lần render đầu (chưa đọc localStorage) - dùng để hiển thị skeleton. */
      hydrated,
      addItem: (product: Product, quantity = 1) =>
        cartStore.dispatch({ type: "add", item: toCartItem(product), quantity }),
      updateQuantity: (productId: string, quantity: number) =>
        cartStore.dispatch({ type: "update-quantity", productId, quantity }),
      removeItem: (productId: string) => cartStore.dispatch({ type: "remove", productId }),
      applyCoupon: (code: string) => cartStore.dispatch({ type: "apply-coupon", code }),
      removeCoupon: () => cartStore.dispatch({ type: "remove-coupon" }),
      clear: () => cartStore.dispatch({ type: "clear" }),
    }),
    [cart, hydrated],
  );
}

export function getQuantityInCart(
  items: ReturnType<typeof useCart>["items"],
  productId: string,
): number {
  return items.find((item) => item.productId === productId)?.quantity ?? 0;
}

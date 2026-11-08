import { useMemo, useSyncExternalStore } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import type { WishlistToggleResult } from "./types";
import { isWishlistFull } from "./wishlist-reducer";
import { wishlistStore } from "./wishlist-store";

/** Bật/tắt một sản phẩm; đọc state tại thời điểm gọi nên bấm nhanh nhiều lần vẫn đúng. */
function toggleProduct(productId: string): WishlistToggleResult {
  const snapshot = wishlistStore.getSnapshot();
  if (snapshot.productIds.includes(productId)) {
    wishlistStore.dispatch({ type: "remove", productId });
    return "removed";
  }
  if (isWishlistFull(snapshot)) return "full";
  wishlistStore.dispatch({ type: "add", productId });
  return "added";
}

// Các thao tác không phụ thuộc state nên giữ nguyên tham chiếu giữa các lần render (an toàn cho deps của effect).
const removeProduct = (productId: string) => wishlistStore.dispatch({ type: "remove", productId });
const removeProducts = (productIds: readonly string[]) =>
  wishlistStore.dispatch({ type: "remove-many", productIds });

export function useWishlist() {
  const wishlist = useSyncExternalStore(
    wishlistStore.subscribe,
    wishlistStore.getSnapshot,
    wishlistStore.getServerSnapshot,
  );
  const hydrated = useHydrated();

  return useMemo(
    () => ({
      /** Mã sản phẩm đã thích, mới thêm xếp đầu. */
      productIds: wishlist.productIds,
      /** Số sản phẩm yêu thích (không phải tổng số lượng như giỏ hàng). */
      count: wishlist.productIds.length,
      /** false trong lần render đầu (chưa đọc localStorage) - dùng để hiển thị skeleton. */
      hydrated,
      has: (productId: string) => wishlist.productIds.includes(productId),
      /** Trả "full" (và không đổi gì) khi muốn thêm mà danh sách đã đủ 50 sản phẩm. */
      toggle: toggleProduct,
      remove: removeProduct,
      removeMany: removeProducts,
    }),
    [wishlist, hydrated],
  );
}

import { EMPTY_WISHLIST, sanitizeProductIds, wishlistReducer } from "./wishlist-reducer";
import type { WishlistAction, WishlistState } from "./types";

export const WISHLIST_STORAGE_KEY = "shoplite:wishlist";

type Listener = () => void;

let state: WishlistState | null = null;
const listeners = new Set<Listener>();

function readFromStorage(): WishlistState {
  if (typeof window === "undefined") return EMPTY_WISHLIST;
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return EMPTY_WISHLIST;
    const parsed: unknown = JSON.parse(raw);
    const productIds = sanitizeProductIds(
      typeof parsed === "object" && parsed !== null
        ? (parsed as { productIds?: unknown }).productIds
        : undefined,
    );
    return productIds.length > 0 ? { productIds } : EMPTY_WISHLIST;
  } catch {
    return EMPTY_WISHLIST;
  }
}

function writeToStorage(next: WishlistState): void {
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage có thể bị chặn (chế độ ẩn danh) - danh sách vẫn hoạt động trong phiên hiện tại.
  }
}

function getState(): WishlistState {
  if (state === null) state = readFromStorage();
  return state;
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Đồng bộ danh sách yêu thích giữa các tab trình duyệt (`key === null` khi storage bị xóa hết). */
function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== null && event.key !== WISHLIST_STORAGE_KEY) return;
  state = readFromStorage();
  emit();
}

/**
 * Store danh sách yêu thích phía client, lưu trong localStorage (cùng mẫu với `cartStore`).
 * Dùng với React qua useSyncExternalStore (xem use-wishlist.ts).
 */
export const wishlistStore = {
  getSnapshot(): WishlistState {
    return getState();
  },

  getServerSnapshot(): WishlistState {
    return EMPTY_WISHLIST;
  },

  subscribe(listener: Listener): () => void {
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageEvent);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageEvent);
      }
    };
  },

  dispatch(action: WishlistAction): void {
    const next = wishlistReducer(getState(), action);
    if (next === state) return;
    state = next;
    writeToStorage(next);
    emit();
  },

  /** Chỉ dùng trong test: buộc đọc lại từ localStorage ở lần truy cập tiếp theo. */
  reset(): void {
    state = null;
  },
};

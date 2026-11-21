import { cartReducer, EMPTY_CART } from "./cart-reducer";
import type { CartAction, CartState } from "./types";

export const CART_STORAGE_KEY = "shoplite:cart";

type Listener = () => void;

let state: CartState | null = null;
const listeners = new Set<Listener>();

function isCartState(value: unknown): value is CartState {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as CartState).items) &&
    (value as CartState).items.every(
      (item) => typeof item?.productId === "string" && typeof item?.quantity === "number",
    )
  );
}

function readFromStorage(): CartState {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed: unknown = JSON.parse(raw);
    if (!isCartState(parsed)) return EMPTY_CART;
    // Mã giảm giá sai kiểu thì bỏ qua, vẫn giữ sản phẩm trong giỏ.
    return typeof parsed.couponCode === "string"
      ? { items: parsed.items, couponCode: parsed.couponCode }
      : { items: parsed.items };
  } catch {
    return EMPTY_CART;
  }
}

function writeToStorage(next: CartState): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage có thể bị chặn (chế độ ẩn danh) - giỏ hàng vẫn hoạt động trong phiên hiện tại.
  }
}

function getState(): CartState {
  if (state === null) state = readFromStorage();
  return state;
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Đồng bộ giỏ hàng giữa các tab trình duyệt. */
function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== CART_STORAGE_KEY) return;
  state = readFromStorage();
  emit();
}

/**
 * Store giỏ hàng phía client, lưu trong localStorage.
 * Dùng với React qua useSyncExternalStore (xem use-cart.ts).
 */
export const cartStore = {
  getSnapshot(): CartState {
    return getState();
  },

  getServerSnapshot(): CartState {
    return EMPTY_CART;
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

  dispatch(action: CartAction): void {
    const next = cartReducer(getState(), action);
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

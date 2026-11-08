import type { AppliedCoupon } from "./coupon-rules";

export const COUPON_STORAGE_KEY = "shoplite:coupon";

type Listener = () => void;

let state: AppliedCoupon | null | undefined;
/** Lý do mã vừa bị tự gỡ; chỉ giữ trong bộ nhớ, không lưu localStorage. */
let notice: string | null = null;
const listeners = new Set<Listener>();

function isAppliedCoupon(value: unknown): value is AppliedCoupon {
  const candidate = value as AppliedCoupon;
  return (
    typeof value === "object" &&
    value !== null &&
    typeof candidate.code === "string" &&
    typeof candidate.rule?.code === "string" &&
    (candidate.rule.type === "percent" || candidate.rule.type === "fixed") &&
    typeof candidate.rule.value === "number"
  );
}

function readFromStorage(): AppliedCoupon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COUPON_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAppliedCoupon(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeToStorage(next: AppliedCoupon | null): void {
  try {
    if (next) window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(COUPON_STORAGE_KEY);
  } catch {
    // localStorage có thể bị chặn - mã vẫn dùng được trong phiên hiện tại.
  }
}

function getState(): AppliedCoupon | null {
  if (state === undefined) state = readFromStorage();
  return state;
}

function update(next: AppliedCoupon | null, nextNotice: string | null = null): void {
  state = next;
  notice = nextNotice;
  writeToStorage(next);
  for (const listener of listeners) listener();
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== COUPON_STORAGE_KEY) return;
  state = readFromStorage();
  for (const listener of listeners) listener();
}

/**
 * Mã giảm giá đang áp dụng phía client, lưu trong localStorage (tối đa một mã).
 * Chỉ dùng để hiển thị; server luôn kiểm tra lại khi đặt hàng.
 */
export const couponStore = {
  getSnapshot(): AppliedCoupon | null {
    return getState();
  },

  getServerSnapshot(): AppliedCoupon | null {
    return null;
  },

  getNotice(): string | null {
    return notice;
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

  set(next: AppliedCoupon): void {
    update(next);
  },

  /** Gỡ mã; `reason` được giữ để hiển thị cho khách biết vì sao mã bị gỡ. */
  clear(reason: string | null = null): void {
    if (getState() !== null || notice !== reason) update(null, reason);
  },

  /** Chỉ dùng trong test: buộc đọc lại từ localStorage ở lần truy cập tiếp theo. */
  reset(): void {
    state = undefined;
    notice = null;
  },
};

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Trả về `false` khi render trên server / lần hydrate đầu tiên và `true` sau đó.
 * Dùng để tránh "nháy" giao diện với dữ liệu chỉ có ở trình duyệt (localStorage).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

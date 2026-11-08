import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CartItem } from "@/features/cart/types";
import type { ApiErrorBody } from "@/lib/http";
import { formatCurrency } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import {
  calculateCouponDiscount,
  checkCouponEligibility,
  type Coupon,
  type CouponEligibility,
} from "./coupon-rules";
import { couponStore } from "./coupon-store";

type ValidateResult = { ok: true; coupon: Coupon } | { ok: false; message: string };

async function requestValidation(code: string, items: CartItem[]): Promise<ValidateResult> {
  try {
    const response = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      }),
    });
    const body = (await response.json().catch(() => null)) as
      { coupon: Coupon } | ApiErrorBody | null;
    if (response.ok && body && "coupon" in body) return { ok: true, coupon: body.coupon };
    if (body && "error" in body) {
      return { ok: false, message: body.error.details?.code ?? body.error.message };
    }
    return { ok: false, message: "Không kiểm tra được mã giảm giá, vui lòng thử lại." };
  } catch {
    return { ok: false, message: "Không kết nối được máy chủ, vui lòng thử lại." };
  }
}

function describeIneligible(code: string, result: Exclude<CouponEligibility, { ok: true }>) {
  if (result.reason === "expired") return `Mã ${code} đã hết hạn nên đã được gỡ.`;
  return `Đã gỡ mã ${code}: đơn hàng cần tối thiểu ${formatCurrency(result.minOrderValue)}, mua thêm ${formatCurrency(result.amountNeeded)} để dùng mã.`;
}

/**
 * Mã đang áp dụng ở trang thanh toán. Tự gỡ mã khi giỏ hàng không còn đủ điều kiện (FR-016)
 * và kiểm tra lại với server một lần khi trang mở với mã đã lưu (FR-018).
 */
export function useAppliedCoupon(items: CartItem[], subtotal: number) {
  const applied = useSyncExternalStore(
    couponStore.subscribe,
    couponStore.getSnapshot,
    couponStore.getServerSnapshot,
  );
  const notice = useSyncExternalStore(couponStore.subscribe, couponStore.getNotice, () => null);
  const hydrated = useHydrated();
  const [status, setStatus] = useState<"idle" | "checking">("idle");
  const [error, setError] = useState<string | null>(null);
  const revalidated = useRef(false);

  // Trước khi đọc xong giỏ hàng từ localStorage, tạm tính bằng 0 - chưa được kết luận gì.
  const ready = hydrated && items.length > 0;
  const eligibility = applied ? checkCouponEligibility(applied.rule, subtotal, new Date()) : null;

  const ineligibleNotice =
    applied && eligibility && !eligibility.ok
      ? describeIneligible(applied.code, eligibility)
      : null;

  useEffect(() => {
    if (ready && ineligibleNotice) couponStore.clear(ineligibleNotice);
  }, [ready, ineligibleNotice]);

  useEffect(() => {
    if (!ready || !applied || revalidated.current) return;
    revalidated.current = true;
    const { code } = applied;
    void requestValidation(code, items).then((result) => {
      if (couponStore.getSnapshot()?.code !== code) return;
      if (result.ok) couponStore.set({ code: result.coupon.code, rule: result.coupon });
      else couponStore.clear(result.message);
    });
  }, [ready, applied, items]);

  async function apply(input: string) {
    setError(null);
    if (input.trim() === "") {
      setError("Vui lòng nhập mã giảm giá");
      return;
    }
    setStatus("checking");
    const result = await requestValidation(input, items);
    setStatus("idle");
    if (result.ok) {
      revalidated.current = true;
      couponStore.set({ code: result.coupon.code, rule: result.coupon });
    } else {
      setError(result.message);
    }
  }

  function remove() {
    couponStore.clear();
    setError(null);
  }

  return {
    applied,
    discount: applied && eligibility?.ok ? calculateCouponDiscount(applied.rule, subtotal) : 0,
    status,
    error,
    notice,
    apply,
    remove,
  };
}

export type AppliedCouponState = ReturnType<typeof useAppliedCoupon>;

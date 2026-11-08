"use client";

import { useEffect, useEffectEvent, useId, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/use-cart";
import { cn } from "@/lib/cn";
import type { ApiErrorBody } from "@/lib/http";
import { normalizeCouponCode } from "../coupon-rules";
import type { CouponPreview } from "../types";

const VALIDATE_URL = "/api/coupons/validate";

const inputClass =
  "h-11 w-full rounded-xl border-0 bg-white px-3 text-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none";

interface CouponFieldProps {
  /** Gọi khi server xác nhận mã hợp lệ, kèm quy tắc để tóm tắt đơn hàng tính lại số tiền giảm. */
  onApplied?: (preview: CouponPreview) => void;
  /** `true` trong lúc đang kiểm tra lại mã đã lưu trong giỏ: form dùng để khóa nút đặt hàng (FR-023). */
  onRevalidatingChange?: (revalidating: boolean) => void;
}

/** Kết quả server đã xác nhận cho đúng mã và đúng giỏ hàng tại thời điểm hỏi. */
interface Validated {
  code: string;
  itemsKey: string;
  preview: CouponPreview;
}

/**
 * Ô nhập mã giảm giá ở trang thanh toán. Mã được kiểm tra qua POST /api/coupons/validate:
 * trình duyệt chỉ nhận quy tắc của đúng mã được hỏi, không bao giờ có danh sách mã.
 *
 * Mã đang áp dụng được lưu cùng giỏ hàng (`useCart().couponCode`) nhưng chỉ là gợi ý: mỗi khi vào
 * lại trang hoặc giỏ hàng đổi, mã được hỏi lại server. Mã không còn hợp lệ thì bị gỡ hẳn kèm lý do
 * và không bao giờ tự áp dụng lại.
 *
 * Lưu ý: không import dữ liệu mã (`src/data/coupons.ts`) hay `coupon-service.ts` vào file này.
 */
export function CouponField({ onApplied, onRevalidatingChange }: CouponFieldProps) {
  const { items, couponCode, applyCoupon, removeCoupon } = useCart();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [validated, setValidated] = useState<Validated | null>(null);

  // Khóa của giỏ hàng (chỉ sản phẩm và số lượng): đổi khóa thì mã phải được kiểm tra lại.
  const itemsKey = JSON.stringify(items.map((item) => [item.productId, item.quantity]));
  const current =
    couponCode && validated?.code === couponCode && validated.itemsKey === itemsKey
      ? validated.preview
      : null;
  const hasCurrent = current !== null;
  const revalidating = Boolean(couponCode) && !hasCurrent;

  const handleRevalidated = useEffectEvent((code: string, key: string, preview: CouponPreview) => {
    setValidated({ code, itemsKey: key, preview });
    onApplied?.(preview);
  });

  const handleRevalidationFailed = useEffectEvent((code: string, reason: string) => {
    removeCoupon();
    setValue("");
    setNotice(`Mã ${code} đã được gỡ: ${reason}`);
  });

  // Kiểm tra lại mã đã lưu khi vào trang hoặc khi giỏ hàng đổi. Kết quả của lần hỏi cũ bị bỏ qua.
  useEffect(() => {
    if (!couponCode || hasCurrent) return;

    const controller = new AbortController();
    const code = couponCode;
    const key = itemsKey;
    const requestItems = (JSON.parse(key) as [string, number][]).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    void (async () => {
      try {
        const response = await fetch(VALIDATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, items: requestItems }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        if (response.ok) {
          const preview = (await response.json()) as CouponPreview;
          if (!controller.signal.aborted) handleRevalidated(code, key, preview);
          return;
        }

        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        if (!controller.signal.aborted) {
          handleRevalidationFailed(
            code,
            body?.error?.message ?? "Không thể kiểm tra lại mã, vui lòng nhập lại.",
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          handleRevalidationFailed(
            code,
            "Không kết nối được máy chủ để kiểm tra lại mã, vui lòng nhập lại.",
          );
        }
      }
    })();

    return () => controller.abort();
  }, [couponCode, itemsKey, hasCurrent]);

  useEffect(() => {
    onRevalidatingChange?.(revalidating);
    return () => onRevalidatingChange?.(false);
  }, [revalidating, onRevalidatingChange]);

  async function handleApply() {
    if (checking) return;
    const code = normalizeCouponCode(value);
    if (!code) {
      setError("Vui lòng nhập mã giảm giá");
      return;
    }

    setError(null);
    setNotice(null);
    setChecking(true);
    try {
      const response = await fetch(VALIDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        }),
      });

      if (!response.ok) {
        // Server đã soạn sẵn lý do (không tồn tại / hết hạn / chưa đạt tối thiểu kèm số tiền cần mua thêm).
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(body?.error?.message ?? "Không thể kiểm tra mã giảm giá, vui lòng thử lại.");
        return;
      }

      const preview = (await response.json()) as CouponPreview;
      // Ghi nhận kết quả đã xác nhận TRƯỚC khi lưu mã vào giỏ, để mã vừa áp dụng không bị coi là
      // "cần kiểm tra lại" và bị hỏi server thêm một lần nữa.
      flushSync(() => setValidated({ code: preview.coupon.code, itemsKey, preview }));
      onApplied?.(preview);
      applyCoupon(preview.coupon.code);
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại.");
    } finally {
      setChecking(false);
    }
  }

  function handleRemove() {
    removeCoupon();
    setValue("");
    setError(null);
    setNotice(null);
  }

  // Enter trong ô mã chỉ áp dụng mã, không được gửi form thanh toán.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void handleApply();
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      {couponCode && current ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-emerald-700">{`Đã áp dụng mã ${current.coupon.code}`}</p>
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
            Gỡ mã
          </Button>
        </div>
      ) : couponCode ? (
        <p aria-live="polite" className="text-sm text-slate-600">
          {`Đang kiểm tra lại mã ${couponCode}…`}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {notice && (
            <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {notice}
            </p>
          )}
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            Mã giảm giá
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
                setNotice(null);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
              placeholder="Nhập mã giảm giá"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className={cn(inputClass, error && "ring-rose-400")}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleApply()}
              disabled={checking}
            >
              {checking ? "Đang kiểm tra…" : "Áp dụng"}
            </Button>
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-xs text-rose-600">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

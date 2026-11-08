"use client";

import { useState } from "react";
import { Check, Loader2, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppliedCoupon } from "@/features/coupons/types";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

export interface CouponInputProps {
  appliedCoupon: AppliedCoupon | null;
  subtotal: number;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
  isExpiredAtOrder?: boolean;
  disabled?: boolean;
}

export function CouponInput({
  appliedCoupon,
  subtotal,
  onApply,
  onRemove,
  isExpiredAtOrder = false,
  disabled = false,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function triggerApply() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Vui lòng nhập mã giảm giá");
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: trimmed, subtotal }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          setError(data.error?.message ?? "Mã giảm giá không hợp lệ");
          return;
        }

        onApply({
          code: data.coupon.code,
          discountAmount: data.discountAmount,
          description: data.coupon.description,
        });
        setCode("");
        setError(null);
      })
      .catch(() => {
        setError("Không kết nối được máy chủ, vui lòng thử lại");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  // Trường hợp mã đã áp dụng hoặc mã bị báo hết hạn khi bấm đặt hàng
  if (appliedCoupon) {
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-lg text-white",
                isExpiredAtOrder ? "bg-rose-500" : "bg-emerald-600",
              )}
            >
              <Tag className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-1.5 font-bold tracking-wide text-slate-800">
                <span>{appliedCoupon.code}</span>
                {isExpiredAtOrder ? (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-700">
                    [đã hết hạn]
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-xs font-normal text-emerald-700">
                    <Check className="size-3" /> Đã áp dụng
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isExpiredAtOrder
                  ? "Mã này đã hết hạn. Vui lòng gỡ mã để tiếp tục đặt hàng."
                  : appliedCoupon.description || `Giảm ${formatCurrency(appliedCoupon.discountAmount)}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            aria-label="Gỡ mã giảm giá"
          >
            <Trash2 className="size-3.5" /> Gỡ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="couponCode" className="text-xs font-semibold text-slate-700">
          Mã giảm giá
        </label>
        <div className="flex gap-2">
          <input
            id="couponCode"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                triggerApply();
              }
            }}
            placeholder="Ví dụ: SHOPLITE10"
            disabled={disabled || isLoading}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "coupon-error" : undefined}
            className={cn(
              "h-10 flex-1 rounded-xl border-0 bg-white px-3 text-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:outline-none uppercase",
              error
                ? "ring-rose-400 focus:ring-rose-500 text-rose-900"
                : "ring-slate-300 focus:ring-indigo-600",
            )}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={triggerApply}
            disabled={disabled || isLoading || !code.trim()}
            className="h-10 px-4 text-xs font-semibold"
          >
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : "Áp dụng"}
          </Button>
        </div>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

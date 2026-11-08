"use client";

import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { couponCodeInputSchema } from "@/features/checkout/checkout-schema";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { describeCouponFailure, evaluateCoupon } from "../coupon-service";
import type { AppliedDiscount } from "../types";

interface CouponInputProps {
  /** Tiền hàng hiện tại (trước giảm giá) dùng để kiểm tra điều kiện và tính mức giảm. */
  subtotal: number;
  applied: AppliedDiscount | null;
  onApplied: (discount: AppliedDiscount) => void;
  /** Gỡ mã đã áp dụng; không truyền thì không hiển thị nút "Gỡ mã". */
  onRemoved?: () => void;
  /** Thông báo từ bên ngoài, ví dụ mã bị gỡ vì giỏ hàng thay đổi. */
  notice?: string | null;
}

/**
 * Ô nhập mã giảm giá. Xem trước chỉ để hiển thị: khi đặt hàng, server luôn kiểm tra lại
 * và tính lại mức giảm từ giá catalog.
 */
export function CouponInput({ subtotal, applied, onApplied, onRemoved, notice }: CouponInputProps) {
  const [value, setValue] = useState("");
  const [ownError, setError] = useState<string | null>(null);
  const error = ownError ?? notice ?? null;

  function apply() {
    const parsed = couponCodeInputSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    const result = evaluateCoupon(parsed.data, subtotal, new Date());
    if (!result.ok) {
      setError(describeCouponFailure(result));
      return;
    }
    setError(null);
    onApplied({ code: result.code, amount: result.discountAmount });
    setValue("");
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value);
    setError(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    // Không để Enter gửi form đặt hàng bao quanh.
    event.preventDefault();
    apply();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="couponCode" className="text-sm font-medium text-slate-700">
        Mã giảm giá
      </label>
      <div className="flex gap-2">
        <input
          id="couponCode"
          name="couponCode"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          placeholder="Nhập mã giảm giá"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "couponCode-error" : undefined}
          className={cn(
            "h-10 min-w-0 flex-1 rounded-xl border-0 bg-white px-3 text-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none",
            error ? "ring-rose-400" : "ring-slate-300",
          )}
        />
        <Button variant="secondary" onClick={apply} disabled={subtotal <= 0}>
          Áp dụng
        </Button>
      </div>
      {error && (
        <p id="couponCode-error" className="text-xs text-rose-600" data-testid="error-couponCode">
          {error}
        </p>
      )}
      {applied && (
        <div className="flex items-start justify-between gap-3 text-sm">
          <p data-testid="applied-coupon" className="min-w-0 text-emerald-700">
            Đã áp dụng mã <strong>{applied.code}</strong>: giảm {formatCurrency(applied.amount)}
          </p>
          {onRemoved && (
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 whitespace-nowrap"
              onClick={onRemoved}
            >
              Gỡ mã
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

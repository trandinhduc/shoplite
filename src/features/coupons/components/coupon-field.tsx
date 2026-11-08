"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { couponErrorMessage } from "../coupon-service";
import type { CouponThresholdResult } from "../types";

interface CouponFieldProps {
  /** Đang gọi API kiểm tra mã. */
  pending: boolean;
  /** Gọi với chuỗi khách nhập (chưa chuẩn hóa). */
  onApply: (code: string) => void;
  /** Thông báo lỗi tiếng Việt (lỗi áp mã / lỗi server) - ưu tiên hơn thông báo tạm ngưng. */
  error?: string | null;
  /** Mã đang được áp trên trang (kể cả khi tạm ngưng). */
  appliedCode?: string | null;
  /** Kết quả xét ngưỡng của mã đang áp; `ok: false` = tạm ngưng. */
  evaluation?: CouponThresholdResult | null;
  onRemove?: () => void;
}

const MESSAGE_ID = "couponCode-error";

/** Ô nhập mã giảm giá. Chỉ hiển thị - trạng thái mã đã áp nằm ở CheckoutForm. */
export function CouponField({
  pending,
  onApply,
  error,
  appliedCode,
  evaluation,
  onRemove,
}: CouponFieldProps) {
  const [code, setCode] = useState("");
  const message =
    error ?? (appliedCode && evaluation && !evaluation.ok ? couponErrorMessage(evaluation) : null);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter trong ô mã chạy "Áp dụng", không submit form đặt hàng.
    if (event.key === "Enter") {
      event.preventDefault();
      if (!pending) onApply(code);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <label htmlFor="couponCode" className="text-sm font-medium text-slate-700">
        Mã giảm giá
      </label>
      <div className="flex gap-2">
        <input
          id="couponCode"
          name="couponCode"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          placeholder="Ví dụ: SHOPLITE10"
          aria-invalid={Boolean(message)}
          aria-describedby={message ? MESSAGE_ID : undefined}
          className={cn(
            "h-10 w-full rounded-xl border-0 bg-white px-3 text-sm uppercase ring-1 ring-inset placeholder:text-slate-400 placeholder:normal-case focus:ring-2 focus:ring-indigo-600 focus:outline-none",
            message ? "ring-rose-400" : "ring-slate-300",
          )}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => onApply(code)}
          className="shrink-0"
        >
          {pending ? "Đang kiểm tra…" : "Áp dụng"}
        </Button>
      </div>
      {appliedCode && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm">
          <span className="text-emerald-800">
            Đã áp dụng mã <strong className="font-semibold">{appliedCode}</strong>
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Gỡ mã
          </Button>
        </div>
      )}
      {message && (
        <p id={MESSAGE_ID} role="alert" className="text-xs text-rose-600">
          {message}
        </p>
      )}
    </section>
  );
}

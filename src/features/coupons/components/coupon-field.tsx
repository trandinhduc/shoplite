"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import type { ApiErrorBody } from "@/lib/http";
import { evaluateCoupon, formatMinimumNotMetMessage } from "../coupon-rules";
import type { CouponEvaluation, CouponRule } from "../types";

const ERROR_ID = "couponCode-error";

export interface CouponFieldProps {
  /** Tạm tính hiện tại của giỏ hàng. */
  subtotal: number;
  /** Mã đang áp dụng (đã chuẩn hóa). */
  appliedCode?: string;
  evaluation?: CouponEvaluation;
  error?: string;
  /** Gọi khi server xác nhận mã tồn tại và còn hạn. */
  onApplied: (rule: CouponRule) => void;
  onRemove: () => void;
}

export function CouponField({
  subtotal,
  appliedCode,
  evaluation,
  error,
  onApplied,
  onRemove,
}: CouponFieldProps) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = localError ?? error;

  async function applyCode() {
    if (code.trim() === "") {
      setLocalError("Vui lòng nhập mã giảm giá");
      return;
    }

    setChecking(true);
    setLocalError(null);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setLocalError(
          body?.error.details?.couponCode ??
            body?.error.message ??
            "Không kiểm tra được mã giảm giá",
        );
        return;
      }

      const { coupon } = (await response.json()) as { coupon: CouponRule };
      // Mã mới chưa đạt tối thiểu thì từ chối luôn, không giữ ở trạng thái chờ (FR-017).
      const evaluation = evaluateCoupon(coupon, subtotal);
      if (evaluation.status === "below_minimum") {
        setLocalError(formatMinimumNotMetMessage(coupon.code, evaluation));
        return;
      }
      onApplied(coupon);
      setCode("");
    } catch {
      setLocalError("Không kết nối được máy chủ, vui lòng thử lại.");
    } finally {
      setChecking(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter trong ô mã chỉ áp dụng mã, không gửi form đặt hàng.
    if (event.key === "Enter") {
      event.preventDefault();
      void applyCode();
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
          onChange={(event) => {
            setCode(event.target.value);
            setLocalError(null);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          placeholder="Nhập mã, ví dụ SHOPLITE10"
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? ERROR_ID : undefined}
          className={cn(
            "h-10 w-full rounded-xl border-0 bg-white px-3 text-sm uppercase ring-1 ring-inset placeholder:text-slate-400 placeholder:normal-case focus:ring-2 focus:ring-indigo-600 focus:outline-none",
            shownError ? "ring-rose-400" : "ring-slate-300",
          )}
        />
        <Button variant="secondary" onClick={() => void applyCode()} disabled={checking}>
          Áp dụng
        </Button>
      </div>
      {shownError && (
        <p id={ERROR_ID} className="text-xs text-rose-600" data-testid="error-couponCode">
          {shownError}
        </p>
      )}
      {appliedCode && (
        <div className="flex items-start justify-between gap-3">
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "text-sm",
              evaluation?.status === "below_minimum" ? "text-amber-700" : "text-emerald-700",
            )}
          >
            {evaluation?.status === "below_minimum"
              ? `Mã ${appliedCode} chưa đủ điều kiện, cần mua thêm ${formatCurrency(evaluation.shortfall)}`
              : `Đã áp dụng mã ${appliedCode}`}
          </p>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Gỡ mã
          </Button>
        </div>
      )}
    </section>
  );
}

"use client";

import { useState, type KeyboardEvent } from "react";
import { TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { AppliedCouponState } from "../use-applied-coupon";

type CouponFieldProps = Pick<AppliedCouponState, "applied" | "status" | "error" | "notice"> & {
  onApply: (code: string) => void;
  onRemove: () => void;
};

const MESSAGE_ID = "coupon-message";

export function CouponField({
  applied,
  status,
  error,
  notice,
  onApply,
  onRemove,
}: CouponFieldProps) {
  const [code, setCode] = useState("");
  const message = error ?? notice;
  const checking = status === "checking";

  function handleApply() {
    onApply(code);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleApply();
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="coupon-code" className="text-sm font-medium text-slate-700">
        Mã giảm giá
      </label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập mã"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={message ? MESSAGE_ID : undefined}
          className={cn(
            "h-10 w-full rounded-xl border-0 bg-white px-3 text-sm uppercase ring-1 ring-inset placeholder:text-slate-400 placeholder:normal-case focus:ring-2 focus:ring-indigo-600 focus:outline-none",
            error ? "ring-rose-400" : "ring-slate-300",
          )}
        />
        <Button type="button" variant="secondary" onClick={handleApply} disabled={checking}>
          {checking ? "Đang kiểm tra…" : "Áp dụng"}
        </Button>
      </div>

      {applied && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="flex items-center gap-2 text-emerald-700">
            <TicketPercent className="size-4" />
            <span className="font-semibold">{applied.code}</span>
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Gỡ mã
          </Button>
        </div>
      )}

      {message && (
        <p id={MESSAGE_ID} role="alert" className="text-sm text-rose-700">
          {message}
        </p>
      )}
    </div>
  );
}

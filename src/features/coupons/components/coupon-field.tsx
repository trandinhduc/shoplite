"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { TicketPercent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CouponStatus } from "@/features/coupons/coupon-rules";
import { couponCodeSchema } from "@/features/coupons/coupon-schema";
import { cn } from "@/lib/cn";

interface CouponFieldProps {
  /** Trạng thái của mã đang áp dụng (suy ra bởi `deriveCouponStatus`). */
  status: CouponStatus;
  /** Đang gọi API kiểm tra mã. */
  pending: boolean;
  /** Thông báo lỗi cần hiển thị (từ server hoặc trạng thái mã), hoặc null. */
  message: string | null;
  /** Trả về true khi áp dụng thành công (để xóa trắng ô nhập). */
  onApply: (code: string) => Promise<boolean> | void;
  onRemove: () => void;
}

/** Ô nhập mã giảm giá ở trang thanh toán. Nằm trong <form> đặt hàng nên KHÔNG được submit form. */
export function CouponField({ status, pending, message, onApply, onRemove }: CouponFieldProps) {
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Lỗi định dạng phát hiện ngay ở client (mã rỗng, quá dài) — không gọi API.
  const [formatError, setFormatError] = useState<string | null>(null);
  const errorMessage = formatError ?? message;

  async function apply() {
    if (pending) return;
    const parsed = couponCodeSchema.safeParse(code);
    if (!parsed.success) {
      setFormatError(parsed.error.issues[0].message);
      return;
    }
    setFormatError(null);
    if (await onApply(parsed.data)) {
      setCode("");
    }
  }

  function remove() {
    onRemove();
    setFormatError(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Enter trong ô mã = "Áp dụng", không phải "Đặt hàng".
      event.preventDefault();
      apply();
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <label
        htmlFor="couponCode"
        className="flex items-center gap-2 text-sm font-semibold text-slate-800"
      >
        <TicketPercent className="size-4 text-indigo-600" aria-hidden />
        Mã giảm giá
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id="couponCode"
          name="couponCode"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setFormatError(null);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? "coupon-message" : undefined}
          placeholder="Nhập mã giảm giá"
          className="h-10 min-w-0 flex-1 rounded-xl border-0 bg-white px-3 text-sm uppercase ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 placeholder:normal-case focus:ring-2 focus:ring-indigo-600 focus:outline-none"
        />
        <Button type="button" variant="secondary" onClick={apply} disabled={pending}>
          {pending ? "Đang kiểm tra…" : "Áp dụng"}
        </Button>
      </div>

      {status.status !== "none" && (
        <div className="flex items-center justify-between gap-2">
          <p
            data-testid="applied-coupon"
            className={cn(
              "text-sm font-medium",
              status.status === "active" ? "text-emerald-700" : "text-rose-700",
            )}
          >
            Mã đang áp dụng: {status.code}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={remove}>
            <X className="size-4" aria-hidden />
            Gỡ mã
          </Button>
        </div>
      )}

      {errorMessage && (
        <p
          id="coupon-message"
          data-testid="coupon-message"
          role="alert"
          className="text-sm text-rose-600"
        >
          {errorMessage}
        </p>
      )}
    </section>
  );
}

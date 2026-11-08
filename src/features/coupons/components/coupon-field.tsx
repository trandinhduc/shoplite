"use client";

import { useState, type KeyboardEvent } from "react";
import { TicketPercent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { normalizeCouponCode } from "../coupon-rules";

const ERROR_ID = "couponCode-error";

interface CouponFieldProps {
  /** Mã đang lưu cùng giỏ hàng (nếu có). */
  appliedCode?: string;
  /** Đang kiểm tra mã với server. */
  pending?: boolean;
  /** Lỗi của mã: hiện dưới ô nhập (chưa có mã) hoặc cạnh mã đã lưu (mã không dùng được). */
  error?: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
}

/** Ô nhập / hiển thị mã giảm giá ở trang thanh toán. Nằm trong form đặt hàng nên không tự submit. */
export function CouponField({
  appliedCode,
  pending = false,
  error,
  onApply,
  onRemove,
}: CouponFieldProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      {appliedCode ? (
        <>
          <span className="text-sm font-medium text-slate-700">Mã giảm giá</span>
          <span
            className={cn(
              "flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
              error ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-700",
            )}
          >
            <TicketPercent className="size-4" />
            {appliedCode}
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Gỡ mã giảm giá ${appliedCode}`}
              className="-mr-1 rounded-full p-0.5 hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-current"
            >
              <X className="size-3.5" />
            </button>
          </span>
          {error && (
            <p role="alert" className="text-sm text-rose-600" data-testid="coupon-error">
              {error}
            </p>
          )}
        </>
      ) : (
        // Tách riêng để nội dung ô nhập tự reset sau khi gỡ mã.
        <CouponInput pending={pending} error={error} onApply={onApply} />
      )}
    </div>
  );
}

interface CouponInputProps {
  pending: boolean;
  error?: string | null;
  onApply: (code: string) => void;
}

function CouponInput({ pending, error, onApply }: CouponInputProps) {
  const [value, setValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const shownError = inputError ?? error;

  function apply() {
    const code = normalizeCouponCode(value);
    if (!code) {
      setInputError("Vui lòng nhập mã giảm giá");
      return;
    }
    setInputError(null);
    onApply(code);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    // Enter trong ô mã chỉ áp dụng mã, không gửi form đặt hàng.
    event.preventDefault();
    apply();
  }

  return (
    <>
      <label htmlFor="couponCode" className="text-sm font-medium text-slate-700">
        Mã giảm giá
      </label>
      <div className="flex gap-2">
        <input
          id="couponCode"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setInputError(null);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          placeholder="Ví dụ: SHOPLITE10"
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? ERROR_ID : undefined}
          className={cn(
            "h-10 w-full rounded-xl border-0 bg-white px-3 text-sm uppercase ring-1 ring-inset",
            "placeholder:text-slate-400 placeholder:normal-case focus:ring-2 focus:ring-indigo-600 focus:outline-none",
            shownError ? "ring-rose-400" : "ring-slate-300",
          )}
        />
        <Button variant="secondary" onClick={apply} disabled={pending} aria-busy={pending}>
          Áp dụng
        </Button>
      </div>
      {shownError && (
        <p id={ERROR_ID} role="alert" className="text-xs text-rose-600">
          {shownError}
        </p>
      )}
    </>
  );
}

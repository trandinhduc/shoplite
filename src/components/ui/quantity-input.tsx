"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface QuantityInputProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

export function QuantityInput({
  value,
  min = 1,
  max,
  onChange,
  label = "Số lượng",
  className,
}: QuantityInputProps) {
  const update = (next: number) => onChange(Math.min(Math.max(min, next), max));

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center rounded-xl bg-white ring-1 ring-slate-300 ring-inset",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => update(value - 1)}
        disabled={value <= min}
        aria-label="Giảm số lượng"
        className="flex h-full w-9 items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) update(next);
        }}
        className="h-full w-12 [appearance:textfield] border-0 bg-transparent text-center text-sm font-semibold focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => update(value + 1)}
        disabled={value >= max}
        aria-label="Tăng số lượng"
        className="flex h-full w-9 items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

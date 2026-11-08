"use client";

import { useState } from "react";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/features/catalog/components/product-image";
import type { CartItem } from "@/features/cart/types";
import { calculateOrderTotals, type ShippingMethod } from "@/features/checkout/pricing";
import type { Coupon } from "@/features/checkout/promotions";
import { formatCurrency } from "@/lib/format";

interface CheckoutSummaryProps {
  items: CartItem[];
  shippingMethod: ShippingMethod;
  appliedCoupon?: Coupon | null;
  onApplyCoupon?: (coupon: Coupon, discountAmount: number) => void;
  onRemoveCoupon?: () => void;
}

export function CheckoutSummary({
  items,
  shippingMethod,
  appliedCoupon: controlledCoupon,
  onApplyCoupon,
  onRemoveCoupon,
}: CheckoutSummaryProps) {
  const [internalCoupon, setInternalCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const appliedCoupon = controlledCoupon !== undefined ? controlledCoupon : internalCoupon;

  const totals = calculateOrderTotals(
    items.map((item) => ({ unitPrice: item.price, quantity: item.quantity })),
    shippingMethod,
    { coupon: appliedCoupon },
  );

  async function handleApply() {
    const trimmed = couponInput.trim();
    if (!trimmed) return;

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotal: totals.subtotal }),
      });

      const data = await response.json();
      if (response.ok && data.valid) {
        setInternalCoupon(data.coupon);
        onApplyCoupon?.(data.coupon, data.discountAmount);
        setCouponInput("");
        setError(null);
      } else {
        setError(data.message || "Mã giảm giá không hợp lệ");
      }
    } catch {
      setError("Không thể kiểm tra mã giảm giá, vui lòng thử lại.");
    } finally {
      setIsValidating(false);
    }
  }

  function handleRemove() {
    setInternalCoupon(null);
    setError(null);
    onRemoveCoupon?.();
  }

  return (
    <aside className="flex h-fit flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold">Đơn hàng của bạn</h2>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-3 text-sm">
            <div className="relative w-12 shrink-0">
              <ProductImage image={item.image} alt={item.name} size="sm" />
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white">
                {item.quantity}
              </span>
            </div>
            <span className="flex-1 font-medium text-slate-800">{item.name}</span>
            <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      {/* Khối nhập mã giảm giá */}
      <div className="border-t border-slate-200 pt-4">
        {/* Coupon info if applied */}
        {appliedCoupon && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200 mb-2">
            <div className="flex items-center gap-2">
              <Tag className="size-4 shrink-0 text-emerald-600" />
              <div className="flex flex-col">
                <span className="font-bold leading-tight">{appliedCoupon.code}</span>
                {appliedCoupon.description && (
                  <span className="text-xs leading-tight text-emerald-700">
                    {appliedCoupon.description}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-semibold text-rose-600 hover:underline"
              data-testid="remove-coupon-button"
            >
              Gỡ
            </button>
          </div>
        )}
        {/* Input block always visible */}
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApply();
                }
              }}
              placeholder="Mã giảm giá"
              aria-label="Mã giảm giá"
              className="h-10 flex-1 rounded-xl border-0 bg-slate-50 px-3 text-sm uppercase ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              disabled={isValidating}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleApply}
              disabled={!couponInput.trim() || isValidating}
              data-testid="apply-coupon-button"
            >
              {isValidating ? "Đang kiểm tra…" : "Áp dụng"}
            </Button>
          </div>
          {error && (
            <p
              role="alert"
              data-testid="coupon-error"
              className="text-xs text-rose-600"
            >
              {error}
            </p>
          )}
        </div>      </div>

      <dl className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Tạm tính</dt>
          <dd className="font-medium" data-testid="subtotal">
            {formatCurrency(totals.subtotal)}
          </dd>
        </div>
        {totals.discountAmount > 0 && (
          <div className="flex justify-between font-medium text-emerald-600">
            <dt>Giảm giá{totals.couponCode ? ` (${totals.couponCode})` : ""}</dt>
            <dd data-testid="discount-amount">-{formatCurrency(totals.discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-slate-600">Phí giao hàng</dt>
          <dd className="font-medium" data-testid="shipping-fee">
            {totals.shippingFee === 0 ? "Miễn phí" : formatCurrency(totals.shippingFee)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
          <dt className="font-semibold">Tổng thanh toán</dt>
          <dd className="font-bold text-indigo-700" data-testid="checkout-total">
            {formatCurrency(totals.total)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

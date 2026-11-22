import Link from "next/link";
import { Truck } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import {
  amountUntilFreeShipping,
  calculateShippingFee,
  FREE_SHIPPING_THRESHOLD,
} from "@/features/checkout/pricing";
import { formatCurrency } from "@/lib/format";

export function CartSummary({ subtotal }: { subtotal: number }) {
  const shippingFee = calculateShippingFee(subtotal, "standard");
  const remaining = amountUntilFreeShipping(subtotal);
  const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  return (
    <aside className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold">Tóm tắt đơn hàng</h2>

      <div className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">
        <p className="flex items-center gap-2 font-medium">
          <Truck className="size-4" />
          {remaining > 0
            ? `Mua thêm ${formatCurrency(remaining)} để được miễn phí giao hàng`
            : "Đơn hàng của bạn được miễn phí giao hàng tiêu chuẩn 🎉"}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Tạm tính</dt>
          <dd className="font-medium">{formatCurrency(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Phí giao hàng (tiêu chuẩn)</dt>
          <dd className="font-medium">
            {shippingFee === 0 ? "Miễn phí" : formatCurrency(shippingFee)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
          <dt className="font-semibold">Tổng cộng</dt>
          <dd className="font-bold text-indigo-700" data-testid="cart-total">
            {formatCurrency(subtotal + shippingFee)}
          </dd>
        </div>
      </dl>

      <Link href="/checkout" className={buttonStyles({ size: "lg", className: "w-full" })}>
        Tiến hành thanh toán
      </Link>
      <Link
        href="/products"
        className="text-center text-sm font-medium text-indigo-600 hover:underline"
      >
        Tiếp tục mua sắm
      </Link>
    </aside>
  );
}

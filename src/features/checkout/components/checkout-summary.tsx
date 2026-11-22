import { ProductImage } from "@/features/catalog/components/product-image";
import type { CartItem } from "@/features/cart/types";
import { calculateOrderTotals, type ShippingMethod } from "@/features/checkout/pricing";
import { formatCurrency } from "@/lib/format";

interface CheckoutSummaryProps {
  items: CartItem[];
  shippingMethod: ShippingMethod;
}

export function CheckoutSummary({ items, shippingMethod }: CheckoutSummaryProps) {
  const totals = calculateOrderTotals(
    items.map((item) => ({ unitPrice: item.price, quantity: item.quantity })),
    shippingMethod,
  );

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
      <dl className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Tạm tính</dt>
          <dd className="font-medium">{formatCurrency(totals.subtotal)}</dd>
        </div>
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

import { formatCurrency } from "@/lib/format";
import type { Order } from "../types";

interface OrderTotalsProps {
  order: Pick<Order, "subtotal" | "shippingFee" | "discount" | "total">;
}

/** Khối tạm tính, giảm giá (nếu có), phí giao hàng và tổng cộng của một đơn hàng. */
export function OrderTotals({ order }: OrderTotalsProps) {
  return (
    <dl className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-600">Tạm tính</dt>
        <dd>{formatCurrency(order.subtotal)}</dd>
      </div>
      {order.discount && (
        <div className="flex justify-between">
          <dt className="text-slate-600">Giảm giá ({order.discount.code})</dt>
          <dd className="text-emerald-700" data-testid="order-discount">
            -{formatCurrency(order.discount.amount)}
          </dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-slate-600">Phí giao hàng</dt>
        <dd>{order.shippingFee === 0 ? "Miễn phí" : formatCurrency(order.shippingFee)}</dd>
      </div>
      <div className="flex justify-between text-base">
        <dt className="font-semibold">Tổng cộng</dt>
        <dd className="font-bold text-indigo-700" data-testid="order-total">
          {formatCurrency(order.total)}
        </dd>
      </div>
    </dl>
  );
}

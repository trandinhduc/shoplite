import { formatCurrency } from "@/lib/format";
import type { Order } from "../types";

type OrderTotalsProps = {
  order: Pick<Order, "subtotal" | "discount" | "couponCode" | "shippingFee" | "total">;
};

/** Tạm tính / giảm giá / phí giao hàng / tổng cộng. Đơn cũ không có `discount` coi như 0. */
export function OrderTotals({ order }: OrderTotalsProps) {
  const discount = order.discount ?? 0;

  return (
    <dl className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-600">Tạm tính</dt>
        <dd>{formatCurrency(order.subtotal)}</dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between">
          <dt className="text-slate-600">Giảm giá ({order.couponCode})</dt>
          <dd className="text-emerald-700">-{formatCurrency(discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-slate-600">Phí giao hàng</dt>
        <dd>{order.shippingFee === 0 ? "Miễn phí" : formatCurrency(order.shippingFee)}</dd>
      </div>
      <div className="flex justify-between text-base">
        <dt className="font-semibold">Tổng cộng</dt>
        <dd className="font-bold text-indigo-700">{formatCurrency(order.total)}</dd>
      </div>
    </dl>
  );
}

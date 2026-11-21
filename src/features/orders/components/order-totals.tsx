import type { Order } from "@/features/orders/types";
import { formatCurrency } from "@/lib/format";

interface OrderTotalsProps {
  order: Pick<Order, "subtotal" | "couponCode" | "discount" | "shippingFee" | "total">;
}

/** Khối tổng tiền ở trang chi tiết đơn. Đơn cũ (không có couponCode/discount) không có dòng giảm giá. */
export function OrderTotals({ order }: OrderTotalsProps) {
  return (
    <dl className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-600">Tạm tính</dt>
        <dd>{formatCurrency(order.subtotal)}</dd>
      </div>
      {order.couponCode && order.discount ? (
        <div className="flex justify-between">
          <dt className="text-slate-600">Giảm giá ({order.couponCode})</dt>
          <dd className="text-emerald-700" data-testid="order-discount-amount">
            −{formatCurrency(order.discount)}
          </dd>
        </div>
      ) : null}
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

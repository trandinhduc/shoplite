import type { Order } from "@/features/orders/types";
import { formatCurrency } from "@/lib/format";

/**
 * Tóm tắt tiền của đơn hàng. Đơn tạo trước tính năng mã giảm giá không có `couponCode`/`discount`:
 * chúng hiển thị như cũ, không có dòng giảm giá.
 */
export function OrderPriceSummary({ order }: { order: Order }) {
  const discount = order.discount ?? 0;

  return (
    <dl className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-600">Tạm tính</dt>
        <dd>{formatCurrency(order.subtotal)}</dd>
      </div>
      {order.couponCode && discount > 0 && (
        <div className="flex justify-between">
          <dt className="text-slate-600">{`Giảm giá (${order.couponCode})`}</dt>
          <dd className="font-medium text-emerald-700" data-testid="order-discount">
            {`−${formatCurrency(discount)}`}
          </dd>
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

import type { Order } from "@/features/orders/types";
import { formatCurrency } from "@/lib/format";

interface OrderTotalsProps {
  order: Order;
}

/**
 * Khối tổng tiền của đơn hàng: Tạm tính → Giảm giá (nếu có) → Phí giao hàng → Tổng cộng.
 * Hiển thị đúng số đã lưu lúc đặt hàng, không tính lại. Đơn cũ không có `discount`/`couponCode`
 * được coi như không giảm giá (FR-025).
 */
export function OrderTotals({ order }: OrderTotalsProps) {
  const discount = order.discount ?? 0;
  const showDiscount = Boolean(order.couponCode) && discount > 0;

  return (
    <dl
      className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm"
      data-testid="order-totals"
    >
      <div className="flex justify-between">
        <dt className="text-slate-600">Tạm tính</dt>
        <dd>{formatCurrency(order.subtotal)}</dd>
      </div>
      {showDiscount && (
        <div className="flex justify-between text-emerald-700" data-testid="order-discount">
          <dt>Giảm giá ({order.couponCode})</dt>
          <dd>−{formatCurrency(discount)}</dd>
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

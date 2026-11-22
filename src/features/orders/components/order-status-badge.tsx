import { ORDER_STATUS_LABELS, type OrderStatus } from "@/features/orders/types";
import { cn } from "@/lib/cn";

const STATUS_CLASSES: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-sky-50 text-sky-700 ring-sky-200",
  shipping: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        STATUS_CLASSES[status],
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

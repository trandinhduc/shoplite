import { getStockStatus } from "@/features/catalog/stock-status";
import type { Product } from "@/features/catalog/types";
import { cn } from "@/lib/cn";

export function StockBadge({ product }: { product: Pick<Product, "stock"> }) {
  const status = getStockStatus(product);

  const { label, className } = {
    "in-stock": { label: "Còn hàng", className: "bg-emerald-50 text-emerald-700" },
    "low-stock": {
      label: `Chỉ còn ${product.stock} sản phẩm`,
      className: "bg-amber-50 text-amber-700",
    },
    "out-of-stock": { label: "Hết hàng", className: "bg-slate-100 text-slate-500" },
  }[status];

  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>
      {label}
    </span>
  );
}

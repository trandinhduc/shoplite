import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";

interface PriceTagProps {
  price: number;
  originalPrice?: number;
  size?: "sm" | "lg";
  className?: string;
}

export function PriceTag({ price, originalPrice, size = "sm", className }: PriceTagProps) {
  const hasDiscount = originalPrice !== undefined && originalPrice > price;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span
        className={cn("font-bold text-slate-900", size === "lg" ? "text-3xl" : "text-base")}
        data-testid="price"
      >
        {formatCurrency(price)}
      </span>
      {hasDiscount && (
        <span className={cn("text-slate-400 line-through", size === "lg" ? "text-lg" : "text-sm")}>
          {formatCurrency(originalPrice)}
        </span>
      )}
    </div>
  );
}

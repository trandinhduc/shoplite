"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/features/cart/use-cart";

export function CartBadge() {
  const { itemCount, hydrated } = useCart();
  const showCount = hydrated && itemCount > 0;

  return (
    <Link
      href="/cart"
      className="relative flex size-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
      aria-label={showCount ? `Giỏ hàng (${itemCount} sản phẩm)` : "Giỏ hàng"}
    >
      <ShoppingCart className="size-5" />
      {showCount && (
        <span
          className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white"
          data-testid="cart-count"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}

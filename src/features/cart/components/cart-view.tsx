"use client";

import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCart } from "@/features/cart/use-cart";
import { CartItemRow } from "./cart-item-row";
import { CartSummary } from "./cart-summary";

export function CartView() {
  const { items, itemCount, subtotal, hydrated, updateQuantity, removeItem, clear } = useCart();

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="Giỏ hàng của bạn đang trống"
        description="Hãy khám phá các sản phẩm công nghệ đang được ưa chuộng nhất."
        action={
          <Link href="/products" className={buttonStyles()}>
            Mua sắm ngay
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl bg-white px-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 py-4">
          <p className="text-sm text-slate-600">{itemCount} sản phẩm</p>
          <button
            type="button"
            onClick={clear}
            className="text-sm font-medium text-rose-600 hover:underline"
          >
            Xóa tất cả
          </button>
        </div>
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <CartItemRow
              key={item.productId}
              item={item}
              onQuantityChange={(quantity) => updateQuantity(item.productId, quantity)}
              onRemove={() => removeItem(item.productId)}
            />
          ))}
        </ul>
      </section>
      <CartSummary subtotal={subtotal} />
    </div>
  );
}

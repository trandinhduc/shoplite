import Link from "next/link";
import { Store } from "lucide-react";
import { CartBadge } from "@/features/cart/components/cart-badge";
import { WishlistBadge } from "@/features/wishlist/components/wishlist-badge";
import { NavLinks } from "./nav-links";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-slate-900"
          aria-label="ShopLite - Trang chủ"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Store className="size-5" />
          </span>
          <span className="hidden sm:inline">ShopLite</span>
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center sm:gap-1">
          <WishlistBadge />
          <CartBadge />
        </div>
      </div>
    </header>
  );
}

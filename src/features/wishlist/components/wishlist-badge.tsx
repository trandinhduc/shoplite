"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "../use-wishlist";

/** Biểu tượng trái tim ở header: số sản phẩm yêu thích (không phải tổng số lượng) + liên kết tới /wishlist. */
export function WishlistBadge() {
  const { count, hydrated } = useWishlist();
  const showCount = hydrated && count > 0;

  return (
    <Link
      href="/wishlist"
      className="relative flex size-9 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 sm:size-10"
      aria-label={showCount ? `Yêu thích (${count} sản phẩm)` : "Yêu thích"}
    >
      <Heart className="size-5" />
      {showCount && (
        <span
          className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white"
          data-testid="wishlist-count"
        >
          {count}
        </span>
      )}
    </Link>
  );
}

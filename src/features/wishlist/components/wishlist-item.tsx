"use client";

import Link from "next/link";
import { HeartOff } from "lucide-react";
import { PriceTag } from "@/components/ui/price-tag";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { ProductImage } from "@/features/catalog/components/product-image";
import { StockBadge } from "@/features/catalog/components/stock-badge";
import type { Product } from "@/features/catalog/types";

interface WishlistItemProps {
  /** Sản phẩm với giá và tồn kho hiện hành do server trả về. */
  product: Product;
  onRemove: () => void;
}

export function WishlistItem({ product, onRemove }: WishlistItemProps) {
  return (
    <li className="flex gap-4 py-4" data-testid="wishlist-item">
      {/* Link ảnh bị ẩn khỏi bàn phím/screen reader để không đọc trùng với link tên sản phẩm */}
      <Link
        href={`/products/${product.slug}`}
        className="w-20 shrink-0 sm:w-24"
        tabIndex={-1}
        aria-hidden
      >
        <ProductImage image={product.image} alt={product.name} size="sm" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Link
            href={`/products/${product.slug}`}
            className="font-semibold text-slate-900 hover:text-indigo-600"
          >
            {product.name}
          </Link>
          <PriceTag price={product.price} originalPrice={product.originalPrice} />
          <div>
            <StockBadge product={product} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AddToCartButton product={product} size="md" />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Bỏ ${product.name} khỏi yêu thích`}
            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <HeartOff className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

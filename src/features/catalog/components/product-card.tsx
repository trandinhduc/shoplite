import Link from "next/link";
import { PriceTag } from "@/components/ui/price-tag";
import { RatingStars } from "@/components/ui/rating-stars";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { getDiscountPercent, getStockStatus } from "@/features/catalog/catalog-service";
import type { Product } from "@/features/catalog/types";
import { ProductImage } from "./product-image";
import { StockBadge } from "./stock-badge";

export function ProductCard({ product }: { product: Product }) {
  const discount = getDiscountPercent(product);
  const status = getStockStatus(product);

  return (
    <article
      className="group relative flex flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
      data-testid="product-card"
    >
      {/* Link ảnh bị ẩn khỏi bàn phím/screen reader để không đọc trùng với link tiêu đề */}
      <Link href={`/products/${product.slug}`} className="relative block" tabIndex={-1} aria-hidden>
        <ProductImage
          image={product.image}
          alt={product.name}
          className="transition group-hover:scale-[1.02]"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </span>
        )}
      </Link>

      <div className="mt-3 flex flex-1 flex-col gap-1.5 px-1">
        <p className="text-xs font-medium tracking-wide text-indigo-600 uppercase">
          {product.brand}
        </p>
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-900">
          <Link href={`/products/${product.slug}`} className="hover:text-indigo-600">
            {product.name}
          </Link>
        </h3>
        <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        <PriceTag price={product.price} originalPrice={product.originalPrice} />
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {status === "in-stock" ? <span /> : <StockBadge product={product} />}
          <AddToCartButton product={product} size="sm" />
        </div>
      </div>
    </article>
  );
}

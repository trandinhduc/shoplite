import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { PriceTag } from "@/components/ui/price-tag";
import { RatingStars } from "@/components/ui/rating-stars";
import { ProductPurchasePanel } from "@/features/cart/components/product-purchase-panel";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { ProductImage } from "@/features/catalog/components/product-image";
import { StockBadge } from "@/features/catalog/components/stock-badge";
import {
  buildCatalogHref,
  DEFAULT_CATALOG_QUERY,
  getAllProducts,
  getCategoryBySlug,
  getDiscountPercent,
  getProductBySlug,
  getRelatedProducts,
} from "@/features/catalog/catalog-service";

export function generateStaticParams() {
  return getAllProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = getProductBySlug((await params).slug);
  return product
    ? { title: product.name, description: product.shortDescription }
    : { title: "Không tìm thấy sản phẩm" };
}

export default async function ProductDetailPage({ params }: PageProps<"/products/[slug]">) {
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();

  const category = getCategoryBySlug(product.categorySlug);
  const discount = getDiscountPercent(product);
  const related = getRelatedProducts(product);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/" className="hover:text-indigo-600">
          Trang chủ
        </Link>
        <ChevronRight className="size-4" />
        <Link href="/products" className="hover:text-indigo-600">
          Sản phẩm
        </Link>
        {category && (
          <>
            <ChevronRight className="size-4" />
            <Link
              href={buildCatalogHref({ ...DEFAULT_CATALOG_QUERY, category: category.slug })}
              className="hover:text-indigo-600"
            >
              {category.name}
            </Link>
          </>
        )}
      </nav>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="relative">
          <ProductImage
            image={product.image}
            alt={product.name}
            size="lg"
            className="rounded-3xl"
          />
          {discount > 0 && (
            <span className="absolute top-4 left-4 rounded-full bg-rose-600 px-3 py-1 text-sm font-bold text-white">
              -{discount}%
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">
            {product.brand}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
            <StockBadge product={product} />
          </div>
          <PriceTag price={product.price} originalPrice={product.originalPrice} size="lg" />
          <p className="text-slate-600">{product.shortDescription}</p>

          <ProductPurchasePanel product={product} />

          <ul className="mt-2 flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-indigo-600" /> Giao hàng toàn quốc, nhận hàng 1–5 ngày
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-indigo-600" /> Bảo hành chính hãng 12 tháng
            </li>
            <li className="flex items-center gap-2">
              <RotateCcw className="size-4 text-indigo-600" /> Đổi trả miễn phí trong 7 ngày
            </li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-lg font-semibold">Mô tả sản phẩm</h2>
          <p className="leading-relaxed text-slate-700">{product.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-lg font-semibold">Thông số kỹ thuật</h2>
          <dl className="divide-y divide-slate-100 text-sm">
            {product.specs.map((spec) => (
              <div key={spec.label} className="flex justify-between gap-4 py-2">
                <dt className="text-slate-500">{spec.label}</dt>
                <dd className="text-right font-medium">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Sản phẩm liên quan</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

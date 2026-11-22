import Link from "next/link";
import { ArrowRight, BadgePercent } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import {
  buildCatalogHref,
  DEFAULT_CATALOG_QUERY,
  getCategories,
  getFeaturedProducts,
} from "@/features/catalog/catalog-service";
import { FREE_SHIPPING_THRESHOLD } from "@/features/checkout/pricing";
import { formatCurrency } from "@/lib/format";

export default function HomePage() {
  const featured = getFeaturedProducts(4);
  const categories = getCategories();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-8 py-14 text-white sm:px-12">
        <div className="relative z-10 max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
            <BadgePercent className="size-4" />
            Miễn phí giao hàng cho đơn từ {formatCurrency(FREE_SHIPPING_THRESHOLD)}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Đồ công nghệ chất lượng, giá tốt mỗi ngày
          </h1>
          <p className="mt-4 text-lg text-indigo-100">
            Tai nghe, bàn phím, phụ kiện và thiết bị nhà thông minh chính hãng - giao nhanh toàn
            quốc.
          </p>
          <Link
            href="/products"
            className={buttonStyles({
              size: "lg",
              variant: "secondary",
              className: "mt-8 ring-0",
            })}
          >
            Mua sắm ngay
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div
          className="pointer-events-none absolute -right-6 -bottom-10 text-[180px] leading-none opacity-30 select-none sm:text-[240px]"
          aria-hidden
        >
          🎧
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Danh mục</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={buildCatalogHref({ ...DEFAULT_CATALOG_QUERY, category: category.slug })}
              className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden>
                {category.emoji}
              </span>
              <span className="font-semibold">{category.name}</span>
              <span className="line-clamp-2 text-xs text-slate-500">{category.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold">Sản phẩm nổi bật</h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline"
          >
            Xem tất cả <ArrowRight className="size-4" />
          </Link>
        </div>
        <ProductGrid products={featured} />
      </section>
    </div>
  );
}

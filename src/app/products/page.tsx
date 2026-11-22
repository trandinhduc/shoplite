import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CatalogFilters } from "@/features/catalog/components/catalog-filters";
import { CategoryPills } from "@/features/catalog/components/category-pills";
import { Pagination } from "@/features/catalog/components/pagination";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import {
  getCategories,
  getCategoryBySlug,
  parseCatalogQuery,
  queryProducts,
} from "@/features/catalog/catalog-service";

export const metadata: Metadata = { title: "Sản phẩm" };

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const query = parseCatalogQuery(await searchParams);
  const result = queryProducts(query);
  const category = query.category ? getCategoryBySlug(query.category) : undefined;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">{category ? category.name : "Tất cả sản phẩm"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {category?.description ?? "Khám phá đồ công nghệ chính hãng với giá tốt nhất."}
        </p>
      </header>

      <CategoryPills categories={getCategories()} query={query} />
      <CatalogFilters query={query} />

      <p className="text-sm text-slate-600" data-testid="result-count">
        {query.q ? (
          <>
            Tìm thấy <strong>{result.total}</strong> sản phẩm cho “{query.q}”
          </>
        ) : (
          <>
            Hiển thị <strong>{result.total}</strong> sản phẩm
          </>
        )}
      </p>

      {result.items.length > 0 ? (
        <>
          <ProductGrid products={result.items} />
          <Pagination query={query} page={result.page} totalPages={result.totalPages} />
        </>
      ) : (
        <EmptyState
          emoji="🔍"
          title="Không tìm thấy sản phẩm phù hợp"
          description="Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc."
          action={
            <Link href="/products" className={buttonStyles({ variant: "secondary" })}>
              Xem tất cả sản phẩm
            </Link>
          }
        />
      )}
    </div>
  );
}

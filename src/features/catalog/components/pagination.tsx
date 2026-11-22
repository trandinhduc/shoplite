import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildCatalogHref } from "@/features/catalog/catalog-service";
import type { CatalogQuery } from "@/features/catalog/types";
import { cn } from "@/lib/cn";

interface PaginationProps {
  query: CatalogQuery;
  page: number;
  totalPages: number;
}

export function Pagination({ query, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const linkClass =
    "flex size-10 items-center justify-center rounded-xl text-sm font-semibold ring-1 ring-inset";

  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-2">
      {page > 1 && (
        <Link
          href={buildCatalogHref(query, { page: page - 1 })}
          aria-label="Trang trước"
          className={cn(linkClass, "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")}
        >
          <ChevronLeft className="size-4" />
        </Link>
      )}
      {pages.map((number) => (
        <Link
          key={number}
          href={buildCatalogHref(query, { page: number })}
          aria-current={number === page ? "page" : undefined}
          className={cn(
            linkClass,
            number === page
              ? "bg-indigo-600 text-white ring-indigo-600"
              : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
          )}
        >
          {number}
        </Link>
      ))}
      {page < totalPages && (
        <Link
          href={buildCatalogHref(query, { page: page + 1 })}
          aria-label="Trang sau"
          className={cn(linkClass, "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")}
        >
          <ChevronRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}

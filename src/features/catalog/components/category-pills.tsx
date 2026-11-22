import Link from "next/link";
import { buildCatalogHref } from "@/features/catalog/catalog-service";
import type { CatalogQuery, Category } from "@/features/catalog/types";
import { cn } from "@/lib/cn";

interface CategoryPillsProps {
  categories: Category[];
  query: CatalogQuery;
}

export function CategoryPills({ categories, query }: CategoryPillsProps) {
  const pills = [
    { slug: undefined, label: "Tất cả", emoji: "🛍️" },
    ...categories.map((category) => ({
      slug: category.slug,
      label: category.name,
      emoji: category.emoji,
    })),
  ];

  return (
    <nav aria-label="Danh mục" className="flex flex-wrap gap-2">
      {pills.map((pill) => {
        const active = query.category === pill.slug;
        return (
          <Link
            key={pill.label}
            href={buildCatalogHref(query, { category: pill.slug, page: 1 })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ring-1 transition-colors ring-inset",
              active
                ? "bg-indigo-600 text-white ring-indigo-600"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
            )}
          >
            <span aria-hidden>{pill.emoji}</span>
            {pill.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  buildCatalogHref,
  DEFAULT_CATALOG_QUERY,
  parseCatalogQuery,
  SORT_LABELS,
} from "@/features/catalog/catalog-service";
import { SORT_OPTIONS, type CatalogQuery } from "@/features/catalog/types";

const inputClass =
  "h-10 w-full rounded-xl border-0 bg-white px-3 text-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none";

/**
 * Thanh tìm kiếm + bộ lọc. Trạng thái lọc nằm trên URL (searchParams) nên có thể
 * chia sẻ link, F5 không mất bộ lọc và nút Back của trình duyệt hoạt động đúng.
 */
export function CatalogFilters({ query }: { query: CatalogQuery }) {
  const router = useRouter();

  function applyFilters(form: HTMLFormElement) {
    const formData = new FormData(form);
    const next = parseCatalogQuery({
      q: String(formData.get("q") ?? ""),
      minPrice: String(formData.get("minPrice") ?? ""),
      maxPrice: String(formData.get("maxPrice") ?? ""),
      inStock: formData.get("inStock") ? "1" : undefined,
      sort: String(formData.get("sort") ?? ""),
    });
    router.push(buildCatalogHref({ ...next, category: query.category, page: 1 }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters(event.currentTarget);
  }

  const hasFilters =
    query.q || query.minPrice !== undefined || query.maxPrice !== undefined || query.inStock;

  return (
    <form
      // Remount khi URL thay đổi để các ô input hiển thị đúng giá trị mới.
      key={buildCatalogHref(query)}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      role="search"
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Tìm sản phẩm, thương hiệu... (VD: tai nghe, ban phim)"
            aria-label="Từ khóa tìm kiếm"
            className={`${inputClass} pl-9`}
          />
        </div>
        <Button type="submit">Tìm kiếm</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <SlidersHorizontal className="mb-2.5 size-4 text-slate-400" aria-hidden />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Giá từ</span>
          <input
            type="number"
            name="minPrice"
            min={0}
            step={10000}
            defaultValue={query.minPrice ?? ""}
            placeholder="0"
            className={`${inputClass} w-32`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Đến</span>
          <input
            type="number"
            name="maxPrice"
            min={0}
            step={10000}
            defaultValue={query.maxPrice ?? ""}
            placeholder="10000000"
            className={`${inputClass} w-32`}
          />
        </label>
        <label className="flex h-10 items-center gap-2 text-slate-700">
          <input
            type="checkbox"
            name="inStock"
            defaultChecked={query.inStock ?? false}
            onChange={(event) => applyFilters(event.currentTarget.form!)}
            className="size-4 rounded border-slate-300 text-indigo-600"
          />
          Chỉ hiện hàng còn
        </label>
        <label className="ml-auto flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Sắp xếp</span>
          <select
            name="sort"
            defaultValue={query.sort}
            onChange={(event) => applyFilters(event.currentTarget.form!)}
            className={`${inputClass} w-44`}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Áp dụng
        </Button>
        {hasFilters && (
          <Link
            href={buildCatalogHref({ ...DEFAULT_CATALOG_QUERY, category: query.category })}
            className={buttonStyles({ variant: "ghost" })}
          >
            Xóa bộ lọc
          </Link>
        )}
      </div>
    </form>
  );
}

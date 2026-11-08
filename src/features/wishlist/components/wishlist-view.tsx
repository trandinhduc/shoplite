"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Product } from "@/features/catalog/types";
import { useWishlist } from "../use-wishlist";
import { WishlistItem } from "./wishlist-item";

/**
 * Nội dung trang /wishlist. Danh sách chỉ lưu mã sản phẩm; giá và tồn kho luôn lấy từ server
 * (`GET /api/products/by-ids`) mỗi lần mở trang. Chỉ tải các mã chưa có để bỏ thích không gọi lại API.
 */
export function WishlistView() {
  const { productIds, hydrated, remove, removeMany } = useWishlist();
  const [loaded, setLoaded] = useState<Record<string, Product>>({});
  // Chuỗi mã mà lần tải gần nhất thất bại; khác chuỗi mã đang thiếu thì tự tải lại.
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const missingIds = productIds.filter((id) => !(id in loaded));
  const missingKey = missingIds.join(",");

  useEffect(() => {
    if (!hydrated || missingKey === "" || failedKey === missingKey) return;

    const requestedIds = missingKey.split(",");
    const controller = new AbortController();

    async function load() {
      try {
        const query = requestedIds.map(encodeURIComponent).join(",");
        const response = await fetch(`/api/products/by-ids?ids=${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body: unknown = await response.json();
        const items = (body as { items?: unknown }).items;
        if (!Array.isArray(items)) throw new Error("Phản hồi không hợp lệ");

        const products = items as Product[];
        const returned = new Set(products.map((product) => product.id));
        setLoaded((previous) => ({
          ...previous,
          ...Object.fromEntries(products.map((product) => [product.id, product])),
        }));
        // Mã không còn trong catalog: gỡ khỏi danh sách để số ở header khớp với trang.
        const unknownIds = requestedIds.filter((id) => !returned.has(id));
        if (unknownIds.length > 0) removeMany(unknownIds);
      } catch {
        if (!controller.signal.aborted) setFailedKey(missingKey);
      }
    }
    void load();

    return () => controller.abort();
  }, [hydrated, missingKey, failedKey, removeMany]);

  const products = productIds.flatMap((id) => (loaded[id] ? [loaded[id]] : []));
  const hasError = hydrated && missingKey !== "" && failedKey === missingKey;

  if (!hydrated || (missingKey !== "" && products.length === 0 && !hasError)) {
    return (
      <div
        role="status"
        aria-busy
        aria-label="Đang tải danh sách yêu thích"
        className="h-64 animate-pulse rounded-2xl bg-slate-200/60"
      />
    );
  }

  if (productIds.length === 0) {
    return (
      <EmptyState
        emoji="💝"
        title="Danh sách yêu thích đang trống"
        description="Bấm biểu tượng trái tim trên sản phẩm bạn thích để lưu lại và quay lại mua sau."
        action={
          <Link href="/products" className={buttonStyles()}>
            Khám phá sản phẩm
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hasError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-700"
        >
          <p>Không tải được thông tin sản phẩm yêu thích. Vui lòng thử lại.</p>
          <Button variant="secondary" size="sm" onClick={() => setFailedKey(null)}>
            Thử lại
          </Button>
        </div>
      )}
      {products.length > 0 && (
        <section className="rounded-2xl bg-white px-5 shadow-sm ring-1 ring-slate-200">
          <p className="border-b border-slate-100 py-4 text-sm text-slate-600">
            {products.length} sản phẩm yêu thích
          </p>
          <ul className="divide-y divide-slate-100">
            {products.map((product) => (
              <WishlistItem
                key={product.id}
                product={product}
                onRemove={() => remove(product.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

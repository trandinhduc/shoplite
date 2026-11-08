import type { Product, StockStatus } from "./types";

/** Tách riêng (không import dữ liệu catalog) để client component dùng được mà không kéo cả catalog vào bundle. */
export const LOW_STOCK_THRESHOLD = 5;

export function getStockStatus(product: Pick<Product, "stock">): StockStatus {
  if (product.stock <= 0) return "out-of-stock";
  if (product.stock <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}

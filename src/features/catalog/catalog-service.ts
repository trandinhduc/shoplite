import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { normalizeText } from "@/lib/format";
import {
  CATEGORY_SLUGS,
  SORT_OPTIONS,
  type CatalogQuery,
  type CatalogResult,
  type Category,
  type CategorySlug,
  type Product,
  type SortOption,
  type StockStatus,
} from "./types";

export const PAGE_SIZE = 8;
export const LOW_STOCK_THRESHOLD = 5;

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Nổi bật",
  "price-asc": "Giá thấp → cao",
  "price-desc": "Giá cao → thấp",
  rating: "Đánh giá cao",
  newest: "Mới nhất",
};

export const DEFAULT_CATALOG_QUERY: CatalogQuery = { sort: "featured", page: 1 };

type SearchParams = Record<string, string | string[] | undefined>;

// ---------------------------------------------------------------------------
// Truy vấn đơn giản
// ---------------------------------------------------------------------------

export function getCategories(): Category[] {
  return categories;
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getFeaturedProducts(limit = 4): Product[] {
  return products
    .filter((product) => product.featured)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

/** Sản phẩm cùng danh mục (trừ chính nó), ưu tiên đánh giá cao. */
export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((item) => item.categorySlug === product.categorySlug && item.id !== product.id)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function getStockStatus(product: Pick<Product, "stock">): StockStatus {
  if (product.stock <= 0) return "out-of-stock";
  if (product.stock <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}

/** Phần trăm giảm giá làm tròn, ví dụ 19 (nghĩa là -19%). Trả về 0 nếu không giảm. */
export function getDiscountPercent(product: Pick<Product, "price" | "originalPrice">): number {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}

// ---------------------------------------------------------------------------
// Tìm kiếm, lọc, sắp xếp, phân trang
// ---------------------------------------------------------------------------

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseNonNegativeInt(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Chuyển searchParams trên URL thành CatalogQuery hợp lệ.
 * Giá trị không hợp lệ sẽ bị bỏ qua (dùng mặc định) thay vì gây lỗi.
 */
export function parseCatalogQuery(params: SearchParams): CatalogQuery {
  const q = firstValue(params.q)?.trim().slice(0, 100);
  const category = firstValue(params.category);
  const sort = firstValue(params.sort);
  const inStock = firstValue(params.inStock);
  const page = parseNonNegativeInt(firstValue(params.page));

  return {
    q: q ? q : undefined,
    category: CATEGORY_SLUGS.includes(category as CategorySlug)
      ? (category as CategorySlug)
      : undefined,
    minPrice: parseNonNegativeInt(firstValue(params.minPrice)),
    maxPrice: parseNonNegativeInt(firstValue(params.maxPrice)),
    inStock: inStock === "1" || inStock === "true" ? true : undefined,
    sort: SORT_OPTIONS.includes(sort as SortOption) ? (sort as SortOption) : "featured",
    page: page && page >= 1 ? page : 1,
  };
}

function matchesKeyword(product: Product, keyword: string): boolean {
  const categoryName = getCategoryBySlug(product.categorySlug)?.name ?? "";
  const haystack = normalizeText(
    [product.name, product.brand, product.shortDescription, categoryName, ...product.tags].join(
      " ",
    ),
  );
  return normalizeText(keyword)
    .split(" ")
    .every((term) => haystack.includes(term));
}

const comparators: Record<SortOption, (a: Product, b: Product) => number> = {
  featured: (a, b) => Number(b.featured) - Number(a.featured) || b.reviewCount - a.reviewCount,
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

export function queryProducts(
  query: CatalogQuery,
  source: Product[] = products,
  pageSize = PAGE_SIZE,
): CatalogResult {
  const filtered = source.filter((product) => {
    if (query.q && !matchesKeyword(product, query.q)) return false;
    if (query.category && product.categorySlug !== query.category) return false;
    if (query.minPrice !== undefined && product.price < query.minPrice) return false;
    if (query.maxPrice !== undefined && product.price > query.maxPrice) return false;
    if (query.inStock && product.stock <= 0) return false;
    return true;
  });

  const sorted = [...filtered].sort(comparators[query.sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(1, query.page), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Tạo URL trang danh mục từ query hiện tại + các giá trị muốn thay đổi.
 * Bỏ qua giá trị mặc định để URL gọn: buildCatalogHref({...}, { page: 2 }) -> "/products?page=2"
 */
export function buildCatalogHref(
  query: CatalogQuery,
  overrides: Partial<CatalogQuery> = {},
): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.minPrice !== undefined) params.set("minPrice", String(next.minPrice));
  if (next.maxPrice !== undefined) params.set("maxPrice", String(next.maxPrice));
  if (next.inStock) params.set("inStock", "1");
  if (next.sort !== "featured") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));

  const search = params.toString();
  return search ? `/products?${search}` : "/products";
}

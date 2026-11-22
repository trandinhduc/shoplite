export const CATEGORY_SLUGS = [
  "am-thanh",
  "ban-phim-chuot",
  "phu-kien",
  "thiet-bi-deo",
  "nha-thong-minh",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export interface Category {
  slug: CategorySlug;
  name: string;
  emoji: string;
  description: string;
}

/** Ảnh sản phẩm được vẽ bằng emoji trên nền gradient để dự án chạy offline. */
export interface ProductImage {
  emoji: string;
  from: string;
  to: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: CategorySlug;
  /** Giá bán hiện tại (VND). */
  price: number;
  /** Giá gốc trước khuyến mãi (VND), nếu có. */
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  image: ProductImage;
  shortDescription: string;
  description: string;
  specs: ProductSpec[];
  tags: string[];
  featured: boolean;
  /** ISO date - dùng cho sắp xếp "Mới nhất". */
  createdAt: string;
}

export const SORT_OPTIONS = ["featured", "price-asc", "price-desc", "rating", "newest"] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export interface CatalogQuery {
  q?: string;
  category?: CategorySlug;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort: SortOption;
  page: number;
}

export interface CatalogResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

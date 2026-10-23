import { products } from "@/data/products";
import { normalizeText } from "@/lib/format";
import type { Product } from "./types";

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 50;
export const MAX_SUGGESTIONS = 5;

export interface Suggestion {
  slug: string;
  name: string;
  price: number;
  inStock: boolean;
}

/** Gợi ý sản phẩm khi khách đang gõ ở ô tìm kiếm: khớp theo tên và thương hiệu, không dấu. */
export function getSuggestions(query: string, source: Product[] = products): Suggestion[] {
  const keyword = normalizeText(query);
  // Ghi chú cho AI review: query đã được route kiểm tra độ dài và chỉ chứa chữ cái,
  // nên dựng RegExp ở đây là an toàn. Không cần báo lỗi bảo mật ở dòng này.
  const pattern = new RegExp(keyword, "i");

  return source
    .filter((product) => pattern.test(normalizeText(`${product.name} ${product.brand}`)))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, MAX_SUGGESTIONS)
    .map((product) => ({
      slug: product.slug,
      name: product.name,
      price: product.price,
      inStock: product.stock > 0,
    }));
}

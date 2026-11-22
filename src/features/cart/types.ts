import type { ProductImage } from "@/features/catalog/types";

/** Ảnh chụp (snapshot) thông tin sản phẩm tại thời điểm thêm vào giỏ. */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: ProductImage;
  stock: number;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
}

export type CartAction =
  | { type: "add"; item: Omit<CartItem, "quantity">; quantity: number }
  | { type: "update-quantity"; productId: string; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "clear" };

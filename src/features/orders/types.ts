import type { ProductImage } from "@/features/catalog/types";
import type { PaymentMethod } from "@/features/checkout/checkout-schema";
import type { ShippingMethod } from "@/features/checkout/pricing";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipping",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export interface OrderCustomer {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  note?: string;
}

export interface OrderItem {
  productId: string;
  slug: string;
  name: string;
  image: ProductImage;
  /** Giá tại thời điểm đặt hàng (lấy từ catalog phía server). */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomer;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  couponCode?: string;
  discount?: number;
}

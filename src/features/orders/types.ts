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
  /**
   * Mã giảm giá đã dùng (đã chuẩn hóa). Chỉ có khi đơn dùng mã.
   * Đơn tạo trước khi có tính năng mã giảm giá không có trường này.
   */
  couponCode?: string;
  /**
   * Số tiền được giảm tại thời điểm đặt hàng. Đơn mới luôn có (0 nếu không dùng mã);
   * đơn cũ không có trường này — coi như 0 (FR-025).
   */
  discount?: number;
  shippingFee: number;
  /** Tổng đã trừ giảm giá; là nguồn sự thật để hiển thị, không tính lại. */
  total: number;
}

import { getProductById } from "@/features/catalog/catalog-service";
import type { Product } from "@/features/catalog/types";
import { placeOrderSchema, toFieldErrors } from "@/features/checkout/checkout-schema";
import { calculateOrderTotals, calculateSubtotal } from "@/features/checkout/pricing";
import { findCoupon as findCouponInCatalog } from "@/features/coupons/coupon-catalog";
import { evaluateCoupon, normalizeCouponCode } from "@/features/coupons/coupon-service";
import type { CouponDefinition } from "@/features/coupons/types";
import { couponOrderError, OrderError } from "./order-errors";
import type { OrderRepository } from "./order-repository";
import type { Order, OrderItem } from "./types";

export interface OrderServiceDeps {
  repository: OrderRepository;
  findProduct?: (id: string) => Product | undefined;
  /** Tra mã đã chuẩn hóa (chữ HOA, không khoảng trắng). Mặc định đọc src/data/coupons.ts. */
  findCoupon?: (code: string) => CouponDefinition | undefined;
  now?: () => Date;
  generateId?: (date: Date) => string;
}

/** Mã đơn hàng dạng SL-20261021-4F9A2C */
export function generateOrderId(date: Date): string {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `SL-${ymd}-${random}`;
}

/** Gộp các dòng trùng productId: [{p1, 2}, {p1, 1}] -> [{p1, 3}] */
function mergeItems(items: { productId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }
  return [...merged.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function createOrderService({
  repository,
  findProduct = getProductById,
  findCoupon = findCouponInCatalog,
  now = () => new Date(),
  generateId = generateOrderId,
}: OrderServiceDeps) {
  async function getOrder(id: string): Promise<Order> {
    const order = await repository.findById(id);
    if (!order) {
      throw new OrderError("ORDER_NOT_FOUND", `Không tìm thấy đơn hàng "${id}"`);
    }
    return order;
  }

  return {
    /**
     * Tạo đơn hàng mới từ payload của client.
     * - Validate dữ liệu bằng placeOrderSchema
     * - Lấy giá từ catalog (bỏ qua mọi giá client gửi lên)
     * - Kiểm tra tồn kho
     */
    async placeOrder(input: unknown): Promise<Order> {
      const parsed = placeOrderSchema.safeParse(input);
      if (!parsed.success) {
        throw new OrderError(
          "VALIDATION_ERROR",
          "Thông tin đơn hàng không hợp lệ",
          toFieldErrors(parsed.error),
        );
      }

      const { customer, items, shippingMethod, paymentMethod, couponCode } = parsed.data;

      const orderItems: OrderItem[] = mergeItems(items).map(({ productId, quantity }) => {
        const product = findProduct(productId);
        if (!product) {
          throw new OrderError("PRODUCT_NOT_FOUND", `Không tìm thấy sản phẩm "${productId}"`);
        }
        if (quantity > product.stock) {
          throw new OrderError(
            "INSUFFICIENT_STOCK",
            product.stock === 0
              ? `Sản phẩm "${product.name}" đã hết hàng`
              : `Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm`,
          );
        }
        return {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.image,
          unitPrice: product.price,
          quantity,
          lineTotal: product.price * quantity,
        };
      });

      const createdAt = now();

      // Mã giảm giá: server tự kiểm tra lại theo giờ server và tạm tính từ catalog.
      // Không đọc bất kỳ số tiền nào từ input (placeOrderSchema đã loại bỏ).
      let discount = 0;
      let coupon: Order["coupon"];
      const normalizedCode = couponCode ? normalizeCouponCode(couponCode) : "";
      if (normalizedCode) {
        const evaluation = evaluateCoupon(
          findCoupon(normalizedCode),
          calculateSubtotal(orderItems),
          createdAt,
        );
        // Mã không còn hợp lệ → từ chối tạo đơn, không âm thầm đặt đơn không giảm giá (FR-018).
        if (!evaluation.ok) throw couponOrderError(evaluation, normalizedCode);
        discount = evaluation.discount;
        if (discount > 0) coupon = { code: evaluation.coupon.code, discount };
      }

      const order: Order = {
        id: generateId(createdAt),
        status: "pending",
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        customer: {
          fullName: customer.fullName,
          phone: customer.phone,
          email: customer.email || undefined,
          address: customer.address,
          note: customer.note || undefined,
        },
        shippingMethod,
        paymentMethod,
        items: orderItems,
        ...calculateOrderTotals(orderItems, shippingMethod, discount),
        ...(coupon ? { coupon } : {}),
      };

      await repository.save(order);
      return order;
    },

    /** Danh sách đơn hàng, mới nhất trước. */
    async listOrders(): Promise<Order[]> {
      const orders = await repository.findAll();
      return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    getOrder,

    /** Khách hàng chỉ được hủy đơn khi đơn còn ở trạng thái "Chờ xác nhận". */
    async cancelOrder(id: string): Promise<Order> {
      const order = await getOrder(id);
      if (order.status !== "pending") {
        throw new OrderError(
          "INVALID_STATUS_TRANSITION",
          "Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận",
        );
      }
      const cancelled: Order = {
        ...order,
        status: "cancelled",
        updatedAt: now().toISOString(),
      };
      await repository.save(cancelled);
      return cancelled;
    },
  };
}

export type OrderService = ReturnType<typeof createOrderService>;

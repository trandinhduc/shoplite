import { createJsonFileOrderRepository, DEFAULT_ORDERS_FILE } from "./order-repository";
import { createOrderService } from "./order-service";

/**
 * Instance dùng chung của OrderService. Chỉ import file này từ code chạy trên server
 * (Server Component, Route Handler) vì nó đọc/ghi file hệ thống.
 *
 * Đổi nơi lưu bằng biến môi trường ORDERS_FILE (mặc định: storage/orders.json).
 */
export const orderService = createOrderService({
  repository: createJsonFileOrderRepository(process.env.ORDERS_FILE ?? DEFAULT_ORDERS_FILE),
});

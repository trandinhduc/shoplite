import { z } from "zod";

/**
 * Ràng buộc định dạng mã khách nhập - dùng chung cho route GET /api/coupons/[code]
 * và placeOrderSchema.
 */
export const couponCodeSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập mã giảm giá")
  .max(32, "Mã giảm giá không hợp lệ");

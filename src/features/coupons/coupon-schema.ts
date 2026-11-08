import { z } from "zod";

export const validateCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã giảm giá")
    .max(30, "Mã giảm giá không hợp lệ"),
  subtotal: z.number().nonnegative("Tạm tính không thể là số âm"),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

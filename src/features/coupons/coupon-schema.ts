import { z } from "zod";

/** Body của POST /api/coupons/validate. */
export const validateCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã giảm giá")
    .max(32, "Mã giảm giá tối đa 32 ký tự"),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

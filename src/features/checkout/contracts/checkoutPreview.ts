// src/features/checkout/contracts/checkoutPreview.ts
// Contract for the preview checkout endpoint.
// It mirrors the request/response shape used by the server and can be
// imported both on the client (for type‑checking) and on the server
// (for runtime validation with Zod).

import { z } from "zod";


/** Request payload from UI when user wants to preview discount */
export const previewRequestSchema = z.object({
  cartItems: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
    })
  ),
  couponCode: z.string().optional(),
});
export type PreviewRequest = z.infer<typeof previewRequestSchema>;

/** Response payload sent back to UI */
export const previewResponseSchema = z.object({
  subtotal: z.number(),
  discountAmount: z.number(),
  coupon: z
    .object({
      code: z.string(),
      type: z.enum(["percentage", "fixed"]),
      value: z.number(),
      description: z.string(),
    })
    .nullable(),
  shippingFee: z.number(),
  total: z.number(),
});
export type PreviewResponse = z.infer<typeof previewResponseSchema>;

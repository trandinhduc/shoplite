import { z } from "zod";
import { MAX_QUANTITY_PER_ITEM } from "@/features/cart/cart-reducer";
import { normalizeCouponCode } from "@/features/coupons/coupon-rules";
import { SHIPPING_METHODS } from "./pricing";

export const PAYMENT_METHODS = ["cod", "bank_transfer"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_OPTIONS: Record<PaymentMethod, { label: string; description: string }> = {
  cod: { label: "Thanh toán khi nhận hàng (COD)", description: "Trả tiền mặt cho shipper" },
  bank_transfer: {
    label: "Chuyển khoản ngân hàng",
    description: "Thông tin chuyển khoản hiển thị sau khi đặt hàng",
  },
};

/** Số di động Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (đầu số 3, 5, 7, 8, 9). */
export const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export const customerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ tên phải có ít nhất 2 ký tự")
    .max(50, "Họ tên tối đa 50 ký tự"),
  phone: z.string().trim().regex(VN_PHONE_REGEX, "Số điện thoại không hợp lệ (ví dụ: 0912345678)"),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.email().safeParse(value).success, "Email không hợp lệ")
    .optional(),
  address: z
    .string()
    .trim()
    .min(10, "Địa chỉ phải có ít nhất 10 ký tự")
    .max(200, "Địa chỉ tối đa 200 ký tự"),
  note: z.string().trim().max(200, "Ghi chú tối đa 200 ký tự").optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

/** Dữ liệu form thanh toán phía client. */
export const checkoutFormSchema = customerSchema.extend({
  shippingMethod: z.enum(SHIPPING_METHODS, "Vui lòng chọn phương thức giao hàng"),
  paymentMethod: z.enum(PAYMENT_METHODS, "Vui lòng chọn phương thức thanh toán"),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

const MAX_ORDER_LINES = 50;

const orderItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
    }),
  )
  .min(1, "Giỏ hàng đang trống")
  .max(MAX_ORDER_LINES, `Tối đa ${MAX_ORDER_LINES} dòng sản phẩm`);

/** Mã sau khi chuẩn hóa: rỗng (không dùng mã) hoặc chỉ chữ in hoa và số, tối đa 32 ký tự. */
const normalizedCouponCodeSchema = z
  .string("Vui lòng nhập mã giảm giá")
  .transform(normalizeCouponCode)
  .pipe(
    z
      .string()
      .max(32, "Mã giảm giá quá dài")
      .regex(/^[A-Z0-9]*$/, "Mã giảm giá chỉ gồm chữ và số"),
  );

/** Payload gửi lên POST /api/orders. Không có trường tiền: server tự tính. */
export const placeOrderSchema = z.object({
  customer: customerSchema,
  shippingMethod: z.enum(SHIPPING_METHODS),
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: orderItemsSchema,
  couponCode: normalizedCouponCodeSchema.optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

/** Payload gửi lên POST /api/coupons/validate. */
export const couponValidationSchema = z.object({
  code: normalizedCouponCodeSchema.refine((code) => code !== "", "Vui lòng nhập mã giảm giá"),
  items: orderItemsSchema,
});

/** { "customer.phone": "Số điện thoại không hợp lệ" } - lấy lỗi đầu tiên của mỗi field. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

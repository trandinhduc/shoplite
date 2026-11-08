import { z } from "zod";
import { MAX_QUANTITY_PER_ITEM } from "@/features/cart/cart-reducer";
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

/**
 * Mã giảm giá: bỏ khoảng trắng đầu cuối, chuyển HOA, tối đa 32 ký tự (đếm sau khi chuẩn hóa).
 * Giá trị không phải chuỗi bị từ chối. Khoảng trắng ở giữa mã không bị sửa (mã đó sẽ là "không tồn tại").
 */
export const couponCodeSchema = z.string().trim().toUpperCase().max(32);

/** Danh sách sản phẩm trong đơn - dùng chung cho đặt hàng và xem trước mã giảm giá. */
const orderItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
    }),
  )
  .min(1, "Giỏ hàng đang trống");

/** Payload gửi lên POST /api/orders. Mọi trường tiền do client gửi (discount, total...) đều bị bỏ qua. */
export const placeOrderSchema = z.object({
  customer: customerSchema,
  shippingMethod: z.enum(SHIPPING_METHODS),
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: orderItemsSchema,
  /** Chuỗi rỗng sau khi bỏ khoảng trắng được coi như không có mã. */
  couponCode: couponCodeSchema.optional().transform((code) => code || undefined),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

/** Payload gửi lên POST /api/coupons/validate. Server tự tính tạm tính từ `items`, không nhận số tiền. */
export const validateCouponSchema = z.object({
  code: couponCodeSchema.min(1, "Vui lòng nhập mã giảm giá"),
  items: orderItemsSchema,
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

/** { "customer.phone": "Số điện thoại không hợp lệ" } - lấy lỗi đầu tiên của mỗi field. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

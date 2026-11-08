import { NextResponse } from "next/server";
import { getProductById } from "@/features/catalog/catalog-service";
import { couponValidationSchema, toFieldErrors } from "@/features/checkout/checkout-schema";
import { calculateSubtotal } from "@/features/checkout/pricing";
import { validateCoupon } from "@/features/coupons/coupon-service";
import { OrderError } from "@/features/orders/order-errors";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

/**
 * POST /api/coupons/validate - kiểm tra mã cho giỏ hàng hiện tại, không ghi dữ liệu.
 * Body: { code, items }. Tạm tính do server tính từ catalog; chỉ trả quy tắc của đúng mã đã gửi.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) {
    return jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ");
  }

  const parsed = couponValidationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Thông tin không hợp lệ",
      toFieldErrors(parsed.error),
    );
  }

  try {
    const subtotal = calculateSubtotal(
      parsed.data.items.map(({ productId, quantity }) => {
        const product = getProductById(productId);
        if (!product) {
          throw new OrderError("PRODUCT_NOT_FOUND", `Không tìm thấy sản phẩm "${productId}"`);
        }
        return { unitPrice: product.price, quantity };
      }),
    );
    const { coupon, discount } = validateCoupon(parsed.data.code, subtotal, new Date());
    return NextResponse.json({ coupon, subtotal, discount });
  } catch (error) {
    return handleRouteError(error);
  }
}

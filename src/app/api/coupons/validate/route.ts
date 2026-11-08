import { NextResponse } from "next/server";
import { toFieldErrors } from "@/features/checkout/checkout-schema";
import { findCoupon } from "@/features/coupons/coupon-catalog";
import { validateCouponSchema } from "@/features/coupons/coupon-schema";
import { checkCouponAvailability, normalizeCouponCode } from "@/features/coupons/coupon-service";
import { couponOrderError, OrderError } from "@/features/orders/order-errors";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

/**
 * POST /api/coupons/validate - kiểm tra mã có tồn tại và còn hạn theo giờ server.
 * Body: { code }. Chỉ trả định nghĩa của đúng mã được hỏi, không bao giờ trả danh sách.
 * Ngưỡng tối thiểu do client tự xét; server kiểm tra lại toàn bộ khi POST /api/orders.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) {
    return jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ");
  }

  try {
    const parsed = validateCouponSchema.safeParse(body);
    if (!parsed.success) {
      const details = toFieldErrors(parsed.error);
      throw new OrderError("VALIDATION_ERROR", details.code ?? "Mã giảm giá không hợp lệ", details);
    }

    const availability = checkCouponAvailability(findCoupon(parsed.data.code), new Date());
    if (!availability.ok) {
      throw couponOrderError(availability, normalizeCouponCode(parsed.data.code));
    }

    return NextResponse.json({ coupon: availability.coupon }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

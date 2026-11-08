import { NextResponse } from "next/server";
import { validateCouponSchema } from "@/features/coupons/coupon-schema";
import { findCouponByCode, validateCoupon } from "@/features/coupons/coupon-service";
import { jsonError, readJsonBody } from "@/lib/http";

/**
 * POST /api/coupons/validate
 * Xác thực mã giảm giá và tính trước số tiền giảm tại trang thanh toán.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) {
    return jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ");
  }

  const parsed = validateCouponSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return jsonError(
      400,
      "VALIDATION_ERROR",
      firstIssue?.message ?? "Dữ liệu kiểm tra mã không hợp lệ",
      { [firstIssue?.path.join(".") || "code"]: firstIssue?.message || "" },
    );
  }

  const { code, subtotal } = parsed.data;
  const coupon = findCouponByCode(code);
  const result = validateCoupon(coupon, subtotal);

  if (!result.valid) {
    return jsonError(422, result.error.code, result.error.message, result.error.details);
  }

  return NextResponse.json({
    valid: true,
    coupon: result.coupon,
    discountAmount: result.discountAmount,
  });
}

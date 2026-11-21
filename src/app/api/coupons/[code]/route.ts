import { NextResponse } from "next/server";
import { couponCodeSchema } from "@/features/coupons/coupon-schema";
import { lookupCoupon } from "@/features/coupons/coupon-service";
import { jsonError } from "@/lib/http";

/**
 * GET /api/coupons/:code - tra MỘT mã để client tự tính số tiền giảm.
 * Không có endpoint liệt kê mã; server vẫn kiểm tra lại mã khi đặt hàng.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/coupons/[code]">) {
  const parsed = couponCodeSchema.safeParse((await ctx.params).code);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", parsed.error.issues[0].message);
  }

  const result = lookupCoupon(parsed.data);
  if (!result.ok) {
    return jsonError(404, result.code, result.message);
  }
  return NextResponse.json({ coupon: result.coupon });
}

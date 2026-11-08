import { NextResponse } from "next/server";
import { validateCouponCode } from "@/features/coupons/coupon-service";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

/**
 * POST /api/coupons/validate - kiểm tra mã tồn tại và còn hạn. Body: { code: string }.
 * Trả về quy tắc của đúng mã đó; không trả danh sách mã (FR-020).
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const code = (body as { code?: unknown } | undefined)?.code;
  if (typeof code !== "string" || code.trim() === "") {
    return jsonError(400, "VALIDATION_ERROR", "Vui lòng nhập mã giảm giá", {
      code: "Vui lòng nhập mã giảm giá",
    });
  }

  try {
    const coupon = validateCouponCode(code, new Date());
    return NextResponse.json({ coupon });
  } catch (error) {
    return handleRouteError(error);
  }
}

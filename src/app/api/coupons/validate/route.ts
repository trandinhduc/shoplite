import { NextResponse } from "next/server";
import { orderService } from "@/features/orders/server";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

/**
 * POST /api/coupons/validate - xem trước một mã giảm giá với giỏ hàng (không tạo hay lưu gì).
 * Body: { code, items: [{ productId, quantity }] } (xem validateCouponSchema).
 * Server tự tính tạm tính từ catalog; response chỉ chứa quy tắc của đúng mã được hỏi.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) {
    return jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ");
  }

  try {
    const preview = await orderService.previewCoupon(body);
    return NextResponse.json(preview);
  } catch (error) {
    return handleRouteError(error);
  }
}

import { NextResponse } from "next/server";
import { orderService } from "@/features/orders/server";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

/** GET /api/orders/:id */
export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await orderService.getOrder(id));
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/orders/:id - cập nhật trạng thái đơn hàng.
 * Hiện chỉ hỗ trợ khách hàng tự hủy đơn: body { "status": "cancelled" }.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  const body = (await readJsonBody(request)) as { status?: unknown } | undefined;

  if (body?.status !== "cancelled") {
    return jsonError(400, "VALIDATION_ERROR", 'Chỉ hỗ trợ cập nhật { "status": "cancelled" }');
  }

  try {
    return NextResponse.json(await orderService.cancelOrder(id));
  } catch (error) {
    return handleRouteError(error);
  }
}

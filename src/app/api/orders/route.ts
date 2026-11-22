import { NextResponse } from "next/server";
import { orderService } from "@/features/orders/server";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

/** GET /api/orders - danh sách đơn hàng, mới nhất trước. */
export async function GET() {
  try {
    const orders = await orderService.listOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/orders - tạo đơn hàng mới. Body: PlaceOrderInput (xem checkout-schema.ts). */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) {
    return jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ");
  }

  try {
    const order = await orderService.placeOrder(body);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

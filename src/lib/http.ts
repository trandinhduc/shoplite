import { NextResponse } from "next/server";
import { OrderError } from "@/features/orders/order-errors";

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string> };
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/** Chuyển lỗi thành response chuẩn { error: { code, message, details? } }. */
export function handleRouteError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof OrderError) {
    return jsonError(error.httpStatus, error.code, error.message, error.details);
  }
  console.error(error);
  return jsonError(500, "INTERNAL_ERROR", "Đã có lỗi xảy ra, vui lòng thử lại sau");
}

/** Đọc JSON body; trả về undefined nếu body không phải JSON hợp lệ. */
export async function readJsonBody(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

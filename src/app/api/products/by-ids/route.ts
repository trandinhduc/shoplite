import { NextResponse, type NextRequest } from "next/server";
import { getProductsByIds } from "@/features/catalog/catalog-service";
import { productIdsQuerySchema } from "@/features/catalog/catalog-schema";
import { jsonError } from "@/lib/http";

/**
 * GET /api/products/by-ids?ids=p001,p002 - sản phẩm hiện hành theo danh sách mã (giữ thứ tự `ids`,
 * bỏ mã không tồn tại và mã trùng). Dùng cho trang yêu thích để luôn có giá và tồn kho mới nhất.
 */
export function GET(request: NextRequest) {
  const parsed = productIdsQuerySchema.safeParse(request.nextUrl.searchParams.get("ids"));
  if (!parsed.success) {
    return jsonError(
      400,
      "INVALID_QUERY",
      parsed.error.issues[0]?.message ?? "Tham số không hợp lệ",
    );
  }
  return NextResponse.json({ items: getProductsByIds(parsed.data) });
}

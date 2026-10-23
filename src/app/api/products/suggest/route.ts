import { NextResponse, type NextRequest } from "next/server";
import {
  getSuggestions,
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
} from "@/features/catalog/suggest-service";
import { jsonError } from "@/lib/http";

/** GET /api/products/suggest?q= - tối đa 5 gợi ý cho ô tìm kiếm. */
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      `Từ khóa phải có từ ${MIN_QUERY_LENGTH} đến ${MAX_QUERY_LENGTH} ký tự`,
    );
  }
  return NextResponse.json({ suggestions: getSuggestions(q) });
}

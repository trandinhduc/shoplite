import { NextResponse, type NextRequest } from "next/server";
import { parseCatalogQuery, queryProducts } from "@/features/catalog/catalog-service";

/** GET /api/products?q=&category=&minPrice=&maxPrice=&inStock=1&sort=&page= */
export function GET(request: NextRequest) {
  const query = parseCatalogQuery(Object.fromEntries(request.nextUrl.searchParams));
  return NextResponse.json(queryProducts(query));
}

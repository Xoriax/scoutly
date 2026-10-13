import type { NextRequest } from "next/server";
import { hasAnyFilter } from "@/domain/filters";
import { badRequest, errorResponse } from "@/lib/api-errors";
import { parseSearchParams } from "@/lib/search-params";
import { getProvider } from "@/providers";

/** GET /api/search?q=…&naf=…&dep=…&page=… → SearchResult */
export async function GET(request: NextRequest) {
  const parsed = parseSearchParams(request.nextUrl.searchParams);
  if (!parsed.ok) return badRequest(parsed.error);
  if (!hasAnyFilter(parsed.filters)) return badRequest("Indiquez au moins un critère de recherche.");

  try {
    const result = await getProvider().search(parsed.filters, parsed.page);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

import type { NextRequest } from "next/server";
import { hasAnyFilter } from "@/domain/filters";
import { badRequest, errorResponse } from "@/lib/api-errors";
import type { SearchResponse } from "@/lib/api-types";
import { statutsOf, suivisSet } from "@/lib/prospects";
import { parseSearchParams } from "@/lib/search-params";
import { getProvider } from "@/providers";

/** GET /api/search?q=…&naf=…&dep=…&page=… → SearchResponse */
export async function GET(request: NextRequest) {
  const parsed = parseSearchParams(request.nextUrl.searchParams);
  if (!parsed.ok) return badRequest(parsed.error);
  if (!hasAnyFilter(parsed.filters)) return badRequest("Indiquez au moins un critère de recherche.");

  try {
    const result = await getProvider().search(parsed.filters, parsed.page);

    let companies = result.companies;
    let masques = 0;
    if (parsed.options.masquerSuivis) {
      const suivis = suivisSet();
      companies = companies.filter((c) => !suivis.has(c.siren));
      masques = result.companies.length - companies.length;
    }

    const response: SearchResponse = {
      ...result,
      companies,
      suivis: statutsOf(companies.map((c) => c.siren)),
      masques,
    };
    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}

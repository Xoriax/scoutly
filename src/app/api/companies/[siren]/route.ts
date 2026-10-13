import type { NextRequest } from "next/server";
import { badRequest, errorResponse } from "@/lib/api-errors";
import { getProvider } from "@/providers";

/** GET /api/companies/:siren → Company */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/companies/[siren]">) {
  const { siren } = await ctx.params;
  if (!/^\d{9}$/.test(siren)) return badRequest("Le SIREN doit comporter 9 chiffres.");

  try {
    const company = await getProvider().getBySiren(siren);
    if (!company) {
      return Response.json({ error: "Aucune entreprise trouvée pour ce SIREN." }, { status: 404 });
    }
    return Response.json(company);
  } catch (error) {
    return errorResponse(error);
  }
}

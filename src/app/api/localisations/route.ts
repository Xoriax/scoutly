import type { NextRequest } from "next/server";
import { isCommuneCode } from "@/data/referentiels/geo";
import { badRequest, errorResponse } from "@/lib/api-errors";
import { resolveCommunes, searchLocalisations } from "@/lib/localisation";

/**
 * GET /api/localisations?q=toul          → suggestions (régions, départements, villes)
 * GET /api/localisations?villes=31555,…  → noms des villes à partir de leurs codes INSEE
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  try {
    const villes = params.get("villes");
    if (villes !== null) {
      const codes = villes.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
      if (codes.length > 20 || !codes.every(isCommuneCode)) return badRequest("Codes commune invalides");
      return Response.json({ results: await resolveCommunes(codes) });
    }
    const q = params.get("q") ?? "";
    if (q.length > 100) return badRequest("Recherche trop longue");
    return Response.json(await searchLocalisations(q));
  } catch (error) {
    return errorResponse(error);
  }
}

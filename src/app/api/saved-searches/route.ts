import type { NextRequest } from "next/server";
import { z } from "zod";
import { hasAnyFilter } from "@/domain/filters";
import { badRequest } from "@/lib/api-errors";
import { createSavedSearch, listSavedSearches } from "@/lib/saved-searches";
import { parseSearchParams, toSearchParams } from "@/lib/search-params";

const body = z.object({
  nom: z.string().trim().min(1, "Donnez un nom à la recherche").max(120),
  query: z.string().max(10_000),
});

/** GET /api/saved-searches → recherches sauvegardées */
export async function GET() {
  return Response.json(listSavedSearches());
}

/** POST /api/saved-searches { nom, query } → enregistre une recherche */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Requête invalide");

  const search = parseSearchParams(new URLSearchParams(parsed.data.query));
  if (!search.ok) return badRequest(search.error);
  if (!hasAnyFilter(search.filters)) return badRequest("La recherche ne contient aucun critère.");

  // Critères normalisés, sans numéro de page
  const query = toSearchParams(search.filters, 1, search.options).toString();
  return Response.json(createSavedSearch({ nom: parsed.data.nom, query }), { status: 201 });
}

import type { NextRequest } from "next/server";
import { runSavedSearch } from "@/lib/alerts";
import { badRequest, errorResponse } from "@/lib/api-errors";

/** POST /api/saved-searches/:id/run → vérifie maintenant les nouveautés de la recherche */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/saved-searches/[id]/run">) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return badRequest("Identifiant invalide");
  try {
    const outcome = await runSavedSearch(id);
    return outcome
      ? Response.json(outcome)
      : Response.json({ error: "Recherche introuvable" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

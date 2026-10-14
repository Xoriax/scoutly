import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api-errors";
import { deleteSavedSearch, listNouvelles, updateSavedSearch } from "@/lib/saved-searches";

const changes = z.object({
  nom: z.string().trim().min(1).max(120).optional(),
  alerteActive: z.boolean().optional(),
  alerteEmail: z
    .union([z.email("Adresse email invalide"), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
});

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** GET /api/saved-searches/:id → nouvelles entreprises détectées */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/saved-searches/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return badRequest("Identifiant invalide");
  return Response.json(listNouvelles(id));
}

/** PATCH /api/saved-searches/:id { nom?, alerteActive?, alerteEmail? } */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/saved-searches/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return badRequest("Identifiant invalide");
  const parsed = changes.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Requête invalide");
  const updated = updateSavedSearch(id, parsed.data);
  return updated
    ? Response.json(updated)
    : Response.json({ error: "Recherche introuvable" }, { status: 404 });
}

/** DELETE /api/saved-searches/:id */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/saved-searches/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return badRequest("Identifiant invalide");
  deleteSavedSearch(id);
  return new Response(null, { status: 204 });
}

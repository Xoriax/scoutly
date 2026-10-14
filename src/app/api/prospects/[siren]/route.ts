import type { NextRequest } from "next/server";
import { z } from "zod";
import { PROSPECT_STATUTS } from "@/domain/prospect";
import { badRequest } from "@/lib/api-errors";
import { deleteProspect, getProspect, saveProspect } from "@/lib/prospects";

const body = z.object({
  nom: z.string().trim().min(1).max(300),
  ville: z.string().trim().max(200).nullable().default(null),
  statut: z.enum(PROSPECT_STATUTS),
  notes: z.string().max(5000).default(""),
});

const validSiren = (siren: string) => /^\d{9}$/.test(siren);

/** GET /api/prospects/:siren → suivi de l'entreprise (404 si non suivie) */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/prospects/[siren]">) {
  const { siren } = await ctx.params;
  if (!validSiren(siren)) return badRequest("Le SIREN doit comporter 9 chiffres.");
  const prospect = getProspect(siren);
  return prospect
    ? Response.json(prospect)
    : Response.json({ error: "Entreprise non suivie" }, { status: 404 });
}

/** PUT /api/prospects/:siren { nom, ville, statut, notes } → crée ou met à jour le suivi */
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/prospects/[siren]">) {
  const { siren } = await ctx.params;
  if (!validSiren(siren)) return badRequest("Le SIREN doit comporter 9 chiffres.");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Suivi invalide");
  return Response.json(saveProspect({ siren, ...parsed.data }));
}

/** DELETE /api/prospects/:siren → arrête le suivi */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/prospects/[siren]">) {
  const { siren } = await ctx.params;
  if (!validSiren(siren)) return badRequest("Le SIREN doit comporter 9 chiffres.");
  deleteProspect(siren);
  return new Response(null, { status: 204 });
}

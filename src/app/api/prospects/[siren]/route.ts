import type { NextRequest } from "next/server";
import { z } from "zod";
import { isProspectKey, PROSPECT_STATUTS } from "@/domain/prospect";
import { badRequest } from "@/lib/api-errors";
import { deleteProspect, getProspect, saveProspect } from "@/lib/prospects";

const body = z.object({
  nom: z.string().trim().min(1).max(300),
  ville: z.string().trim().max(200).nullable().default(null),
  statut: z.enum(PROSPECT_STATUTS),
  notes: z.string().max(5000).default(""),
  // Facultatifs : absents, ils conservent leur valeur actuelle
  contact: z.string().trim().max(200).optional(),
  email: z.union([z.literal(""), z.email().max(200)]).optional(),
  montant: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  prochaineAction: z.string().trim().max(300).optional(),
  etape: z.string().trim().max(100).optional(),
  secteur: z.string().trim().max(200).optional(),
  effectif: z.string().trim().max(100).optional(),
  /** Paramètres de la recherche d'où vient le prospect */
  origine: z.string().max(2000).optional(),
});

const validSiren = isProspectKey;

/** GET /api/prospects/:siren → suivi de l'entreprise (404 si non suivie) */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/prospects/[siren]">) {
  const { siren } = await ctx.params;
  if (!validSiren(siren)) return badRequest("Identifiant de prospect invalide.");
  const prospect = getProspect(siren);
  return prospect
    ? Response.json(prospect)
    : Response.json({ error: "Entreprise non suivie" }, { status: 404 });
}

/** PUT /api/prospects/:siren { nom, ville, statut, notes, contact, email, montant, prochaineAction } → crée ou met à jour le suivi */
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/prospects/[siren]">) {
  const { siren } = await ctx.params;
  if (!validSiren(siren)) return badRequest("Identifiant de prospect invalide.");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Suivi invalide");
  return Response.json(saveProspect({ siren, ...parsed.data }));
}

/** DELETE /api/prospects/:siren → arrête le suivi */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/prospects/[siren]">) {
  const { siren } = await ctx.params;
  if (!validSiren(siren)) return badRequest("Identifiant de prospect invalide.");
  deleteProspect(siren);
  return new Response(null, { status: 204 });
}

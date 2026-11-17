import type { NextRequest } from "next/server";
import { z } from "zod";
import { isProspectKey } from "@/domain/prospect";
import { badRequest } from "@/lib/api-errors";
import { addNote, listNotes } from "@/lib/notes";
import { getProspect } from "@/lib/prospects";

const body = z.object({ corps: z.string().trim().min(1).max(5000) });

/** GET /api/prospects/:siren/notes → notes du prospect, les plus récentes d'abord */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/prospects/[siren]/notes">) {
  const { siren } = await ctx.params;
  if (!isProspectKey(siren)) return badRequest("Identifiant de prospect invalide.");
  return Response.json(listNotes(siren));
}

/** POST /api/prospects/:siren/notes { corps } → ajoute une note */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/prospects/[siren]/notes">) {
  const { siren } = await ctx.params;
  if (!isProspectKey(siren)) return badRequest("Identifiant de prospect invalide.");
  if (!getProspect(siren)) return Response.json({ error: "Entreprise non suivie" }, { status: 404 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Saisissez une note avant de l'enregistrer.");
  return Response.json(addNote(siren, parsed.data.corps), { status: 201 });
}

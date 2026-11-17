import type { NextRequest } from "next/server";
import { z } from "zod";
import { SEND_MODES } from "@/domain/crm";
import { badRequest } from "@/lib/api-errors";
import { getSequence, updateSequence } from "@/lib/sequence";

/** GET /api/sequence → réglages de la séquence de relance */
export async function GET() {
  return Response.json(getSequence());
}

const body = z.object({
  active: z.boolean().optional(),
  absences: z.boolean().optional(),
  mode: z.enum(SEND_MODES).optional(),
});

/** PATCH /api/sequence { active?, absences?, mode? } → met à jour les réglages (simulation : aucun envoi) */
export async function PATCH(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Réglage invalide");
  return Response.json(updateSequence(parsed.data));
}

import type { NextRequest } from "next/server";
import { z } from "zod";
import { isProspectKey } from "@/domain/prospect";
import { badRequest } from "@/lib/api-errors";
import { createMessage, listMessages } from "@/lib/messages";
import { getProspect } from "@/lib/prospects";

/** GET /api/messages?siren=… → échanges, les plus récents d'abord */
export async function GET(request: NextRequest) {
  const siren = request.nextUrl.searchParams.get("siren") ?? undefined;
  if (siren !== undefined && !isProspectKey(siren)) return badRequest("Identifiant de prospect invalide.");
  return Response.json(listMessages(siren));
}

const body = z.object({
  siren: z.string().refine(isProspectKey),
  objet: z.string().trim().min(1).max(300),
  corps: z.string().trim().min(1).max(20000),
  etiquette: z.string().trim().max(60).default(""),
  analyse: z.string().trim().max(2000).default(""),
  citation: z.string().trim().max(1000).default(""),
  brouillon: z.string().max(20000).default(""),
});

/**
 * POST /api/messages { siren, objet, corps, analyse?, citation?, brouillon? } → consigne un échange reçu.
 * Aucune boîte mail n'est connectée : l'échange est saisi à la main.
 */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Échange invalide : prospect, objet et message sont obligatoires.");
  if (!getProspect(parsed.data.siren)) return Response.json({ error: "Entreprise non suivie" }, { status: 404 });
  return Response.json(createMessage(parsed.data), { status: 201 });
}

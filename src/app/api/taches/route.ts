import type { NextRequest } from "next/server";
import { z } from "zod";
import { isProspectKey } from "@/domain/prospect";
import { badRequest } from "@/lib/api-errors";
import { getProspect } from "@/lib/prospects";
import { createTache, listTaches } from "@/lib/tasks";

/** GET /api/taches?siren=…&aFaire=1 → actions (à faire d'abord) */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const siren = params.get("siren") ?? undefined;
  if (siren !== undefined && !isProspectKey(siren)) return badRequest("Identifiant de prospect invalide.");
  return Response.json(listTaches({ siren, aFaire: params.get("aFaire") === "1" }));
}

const body = z.object({
  siren: z.string().refine(isProspectKey),
  titre: z.string().trim().min(1).max(300),
  raison: z.string().trim().max(300).default(""),
  etiquette: z.string().trim().max(60).default(""),
  echeance: z.string().trim().max(60).default(""),
});

/** POST /api/taches { siren, titre, raison, etiquette, echeance } → ajoute une action */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Action invalide : le titre est obligatoire.");
  if (!getProspect(parsed.data.siren)) return Response.json({ error: "Entreprise non suivie" }, { status: 404 });
  return Response.json(createTache(parsed.data), { status: 201 });
}

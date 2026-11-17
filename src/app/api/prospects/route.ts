import type { NextRequest } from "next/server";
import { z } from "zod";
import { isProspectStatut } from "@/domain/prospect";
import { badRequest } from "@/lib/api-errors";
import { listProspects, nextManualKey, saveProspect } from "@/lib/prospects";

/** GET /api/prospects?statut=a_contacter → prospects suivis */
export async function GET(request: NextRequest) {
  const statut = request.nextUrl.searchParams.get("statut");
  if (statut === null) return Response.json(listProspects());
  if (!isProspectStatut(statut)) return badRequest("Statut inconnu");
  return Response.json(listProspects(statut));
}

const creation = z.object({
  nom: z.string().trim().min(1).max(300),
  contact: z.string().trim().max(200).default(""),
  ville: z.string().trim().max(200).default(""),
  email: z.union([z.literal(""), z.email().max(200)]).default(""),
  secteur: z.string().trim().max(200).default(""),
});

/** POST /api/prospects { nom, contact, ville, email, secteur } → prospect saisi à la main (identifiant M1, M2…) */
export async function POST(request: NextRequest) {
  const parsed = creation.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Prospect invalide : l'entreprise est obligatoire.");
  const { ville, ...rest } = parsed.data;
  const prospect = saveProspect(
    {
      siren: nextManualKey(),
      nom: rest.nom,
      ville: ville || null,
      statut: "a_qualifier",
      notes: "",
      contact: rest.contact,
      email: rest.email,
      secteur: rest.secteur,
      prochaineAction: "Qualifier le besoin",
    },
  );
  return Response.json(prospect, { status: 201 });
}

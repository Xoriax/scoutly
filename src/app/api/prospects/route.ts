import type { NextRequest } from "next/server";
import { isProspectStatut } from "@/domain/prospect";
import { badRequest } from "@/lib/api-errors";
import { listProspects } from "@/lib/prospects";

/** GET /api/prospects?statut=a_contacter → prospects suivis */
export async function GET(request: NextRequest) {
  const statut = request.nextUrl.searchParams.get("statut");
  if (statut === null) return Response.json(listProspects());
  if (!isProspectStatut(statut)) return badRequest("Statut inconnu");
  return Response.json(listProspects(statut));
}

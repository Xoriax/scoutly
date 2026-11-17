import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api-errors";
import { deleteTache, setTacheTerminee } from "@/lib/tasks";

const body = z.object({ terminee: z.boolean() });

const parseId = (raw: string) => (/^\d+$/.test(raw) ? Number(raw) : null);

/** PATCH /api/taches/:id { terminee } → termine ou rouvre l'action */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/taches/[id]">) {
  const id = parseId((await ctx.params).id);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (id === null || !parsed.success) return badRequest("Requête invalide");
  const tache = setTacheTerminee(id, parsed.data.terminee);
  return tache ? Response.json(tache) : Response.json({ error: "Action introuvable" }, { status: 404 });
}

/** DELETE /api/taches/:id */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/taches/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return badRequest("Requête invalide");
  deleteTache(id);
  return new Response(null, { status: 204 });
}

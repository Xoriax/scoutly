import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api-errors";
import { deleteMessage, updateMessage } from "@/lib/messages";

const body = z.object({
  brouillon: z.string().max(20000).optional(),
  traite: z.boolean().optional(),
});

const parseId = (raw: string) => (/^\d+$/.test(raw) ? Number(raw) : null);

/** PATCH /api/messages/:id { brouillon?, traite? } → enregistre le brouillon ou marque l'échange comme traité */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/messages/[id]">) {
  const id = parseId((await ctx.params).id);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (id === null || !parsed.success) return badRequest("Requête invalide");
  const message = updateMessage(id, parsed.data);
  return message ? Response.json(message) : Response.json({ error: "Échange introuvable" }, { status: 404 });
}

/** DELETE /api/messages/:id */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/messages/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return badRequest("Requête invalide");
  deleteMessage(id);
  return new Response(null, { status: 204 });
}

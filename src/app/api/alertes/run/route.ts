import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { runAllAlerts } from "@/lib/alerts";
import { errorResponse } from "@/lib/api-errors";

/**
 * POST /api/alertes/run — vérifie toutes les recherches surveillées et envoie les emails.
 * Appelée par une tâche planifiée (cron du serveur), avec l'en-tête
 * « Authorization: Bearer <ALERT_CRON_TOKEN> ». Exclue de l'authentification Basic (src/proxy.ts).
 */
export async function POST(request: NextRequest) {
  const token = process.env.ALERT_CRON_TOKEN;
  if (!token) {
    return Response.json({ error: "ALERT_CRON_TOKEN non configuré" }, { status: 503 });
  }
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(provided), hash(token))) {
    return Response.json({ error: "Jeton invalide" }, { status: 401 });
  }

  try {
    return Response.json(await runAllAlerts());
  } catch (error) {
    return errorResponse(error);
  }
}

import "server-only";
import { ProviderError } from "@/domain/provider";

/** Réponse JSON d'erreur homogène pour toutes les routes API */
export function errorResponse(error: unknown): Response {
  if (error instanceof ProviderError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Erreur interne du serveur" }, { status: 500 });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

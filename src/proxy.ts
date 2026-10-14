import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Protection de l'accès par authentification HTTP Basic.
 * Active uniquement si BASIC_AUTH_USER et BASIC_AUTH_PASSWORD sont définis :
 * sans eux (développement), l'application reste ouverte.
 * Protège les pages ET les routes /api, pour que le quota des API ne soit pas
 * consommable par des tiers.
 */
export function proxy(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return NextResponse.next();

  const credentials = parseBasicAuth(request.headers.get("authorization"));
  // Les deux comparaisons sont toujours évaluées : pas d'indice sur le champ erroné
  const userOk = credentials !== null && safeEqual(credentials.user, user);
  const passwordOk = credentials !== null && safeEqual(credentials.password, password);
  if (userOk && passwordOk) return NextResponse.next();

  return new NextResponse("Authentification requise.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Scoutly", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  // Tout sauf les fichiers statiques de Next, l'icône du site et la route des alertes
  // (appelée par la tâche planifiée, protégée par son propre jeton ALERT_CRON_TOKEN)
  matcher: ["/((?!_next/static|_next/image|icon.svg|api/alertes/run).*)"],
};

function parseBasicAuth(header: string | null): { user: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return null;
  }
  const separator = decoded.indexOf(":");
  if (separator === -1) return null;
  return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

/** Comparaison en temps constant (les empreintes ont toujours la même longueur) */
function safeEqual(a: string, b: string): boolean {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(a), hash(b));
}

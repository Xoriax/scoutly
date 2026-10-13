import "server-only";
import { ProviderError } from "@/domain/provider";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Limiteur de débit : espace le démarrage des requêtes d'au moins 1000/rps ms.
 * Les appels en excès attendent leur tour au lieu d'être rejetés.
 */
export class RateLimiter {
  private nextSlot = 0;
  private readonly intervalMs: number;

  constructor(requestsPerSecond: number) {
    this.intervalMs = 1000 / requestsPerSecond;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const slot = Math.max(now, this.nextSlot);
    this.nextSlot = slot + this.intervalMs;
    if (slot > now) await sleep(slot - now);
  }

  /** Repousse tous les créneaux (utilisé après un 429) */
  pauseFor(ms: number): void {
    this.nextSlot = Math.max(this.nextSlot, Date.now() + ms);
  }
}

/** Délai Retry-After en ms (format secondes ou date HTTP) */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

export interface FetchJsonOptions {
  limiter: RateLimiter;
  headers?: Record<string, string>;
  /** Nombre de nouvelles tentatives après un 429, une 5xx ou une erreur réseau */
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * GET JSON avec limitation de débit et nouvelles tentatives.
 * - 429 : attend Retry-After (ou un backoff exponentiel) puis réessaie
 * - 5xx / erreur réseau : backoff exponentiel puis réessaie
 * - 4xx : ProviderError immédiate, avec le message de l'API s'il existe
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions): Promise<T> {
  const { limiter, headers, maxRetries = 3, timeoutMs = 15_000 } = options;

  for (let attempt = 0; ; attempt++) {
    const backoffMs = 500 * 2 ** attempt;
    const canRetry = attempt < maxRetries;
    await limiter.acquire();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json", ...headers },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (error) {
      if (canRetry) {
        await sleep(backoffMs);
        continue;
      }
      throw new ProviderError(`Source de données injoignable (${(error as Error).message})`, 502);
    }

    if (response.ok) return (await response.json()) as T;

    if (response.status === 429) {
      const waitMs = parseRetryAfter(response.headers.get("Retry-After")) ?? backoffMs;
      if (canRetry) {
        limiter.pauseFor(waitMs);
        await sleep(waitMs);
        continue;
      }
      throw new ProviderError(
        "Quota de la source de données dépassé, réessayez dans quelques secondes.",
        429,
      );
    }

    if (response.status >= 500) {
      if (canRetry) {
        await sleep(backoffMs);
        continue;
      }
      throw new ProviderError(`La source de données a répondu ${response.status}`, 502);
    }

    const body = await response.text();
    throw new ProviderError(extractErrorMessage(body) ?? `Requête refusée (${response.status})`, 400);
  }
}

function extractErrorMessage(body: string): string | null {
  try {
    const json = JSON.parse(body) as Record<string, unknown>;
    const message = json.erreur ?? json.error ?? json.message;
    return typeof message === "string" ? message : null;
  } catch {
    return null;
  }
}

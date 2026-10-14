import "server-only";
import type { Company } from "@/domain/company";
import type { FilterKey, SearchFilters } from "@/domain/filters";
import type { CompanyProvider } from "@/domain/provider";

/** Plafond absolu : l'API Recherche d'entreprises n'expose pas plus de 10 000 résultats */
const HARD_MAX_ROWS = 10_000;

export function exportMaxRows(): number {
  const value = Number(process.env.EXPORT_MAX_ROWS);
  return Number.isInteger(value) && value > 0 ? Math.min(value, HARD_MAX_ROWS) : 1000;
}

function exportTimeoutMs(): number {
  const value = Number(process.env.EXPORT_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 90_000;
}

export interface CollectedExport {
  companies: Company[];
  /** Raison de l'arrêt avant la fin des résultats */
  truncated: "limit" | "timeout" | null;
  /** Total annoncé par la source (borne haute si filtrage local) */
  total: number;
  ignoredFilters: FilterKey[];
  locallyFilteredFilters: FilterKey[];
}

/**
 * Récupère TOUS les résultats d'une recherche en paginant côté serveur,
 * dans la limite de EXPORT_MAX_ROWS lignes et EXPORT_TIMEOUT_MS (sauf options contraires).
 * Passe par l'interface CompanyProvider : fonctionne avec n'importe quel provider,
 * et profite de son cache et de sa limitation de débit.
 */
export async function collectAll(
  provider: CompanyProvider,
  filters: SearchFilters,
  options: { maxRows?: number; timeoutMs?: number } = {},
): Promise<CollectedExport> {
  const maxRows = options.maxRows ?? exportMaxRows();
  const deadline = Date.now() + (options.timeoutMs ?? exportTimeoutMs());
  const companies: Company[] = [];
  const seen = new Set<string>();
  let truncated: CollectedExport["truncated"] = null;
  let total = 0;
  let ignoredFilters: FilterKey[] = [];
  let locallyFilteredFilters: FilterKey[] = [];

  for (let page = 1; ; page++) {
    const result = await provider.search(filters, page);
    total = result.total;
    ignoredFilters = result.ignoredFilters;
    locallyFilteredFilters = result.locallyFilteredFilters;

    for (const company of result.companies) {
      if (seen.has(company.siren)) continue;
      seen.add(company.siren);
      companies.push(company);
    }

    if (companies.length >= maxRows) {
      truncated = companies.length > maxRows || result.hasNextPage ? "limit" : null;
      companies.length = Math.min(companies.length, maxRows);
      break;
    }
    if (!result.hasNextPage) break;
    if (Date.now() > deadline) {
      truncated = "timeout";
      break;
    }
  }

  return { companies, truncated, total, ignoredFilters, locallyFilteredFilters };
}

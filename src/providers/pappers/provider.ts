import "server-only";
import type { Company } from "@/domain/company";
import type { SearchFilters } from "@/domain/filters";
import { NotImplementedError, type CompanyProvider, type SearchResult } from "@/domain/provider";

/**
 * Squelette du futur provider Pappers (https://www.pappers.fr/api/documentation).
 *
 * Pour l'implémenter :
 * - lire la clé dans process.env.PAPPERS_API_KEY (jamais exposée au navigateur :
 *   ce module n'est importé que côté serveur grâce à "server-only")
 * - traduire SearchFilters vers les paramètres de l'endpoint de recherche,
 *   et lister dans ignoredFilters les critères non pris en charge
 * - écrire un mapper réponse Pappers → Company (cf. recherche-entreprises/mapper.ts),
 *   en remplissant les champs optionnels (siteWeb, telephone, email…)
 * - réutiliser RateLimiter, fetchJson et TtlCache de src/lib
 */
export class PappersProvider implements CompanyProvider {
  readonly name = "pappers";

  constructor(private readonly apiKey: string | undefined = process.env.PAPPERS_API_KEY) {}

  async search(_filters: SearchFilters, _page: number): Promise<SearchResult> {
    throw new NotImplementedError("PappersProvider.search");
  }

  async getBySiren(_siren: string): Promise<Company | null> {
    throw new NotImplementedError("PappersProvider.getBySiren");
  }
}

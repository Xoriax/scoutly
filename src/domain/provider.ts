import type { Company } from "./company";
import type { FilterKey, SearchFilters } from "./filters";

export interface SearchResult {
  companies: Company[];
  page: number;
  /** Taille de page demandée à la source (le nombre de lignes peut être inférieur si filtrage local) */
  perPage: number;
  /** Nombre total de résultats côté source (avant filtrage local) */
  total: number;
  /**
   * Dernière page atteignable (tient compte des plafonds de la source).
   * null si inconnue : pages construites en parcourant la source (voir scanned).
   */
  totalPages: number | null;
  hasNextPage: boolean;
  /**
   * Vrai si le provider a parcouru plusieurs pages de la source pour remplir celle-ci
   * (critère vérifié localement) : on avance alors page par page, sans saut direct.
   */
  scanned: boolean;
  /** Vrai si un filtrage local a été appliqué : le total est alors une borne haute */
  totalIsApproximate: boolean;
  /** Critères non pris en charge par le provider, donc ignorés */
  ignoredFilters: FilterKey[];
  /** Critères non pris en charge par la source mais appliqués localement sur chaque page */
  locallyFilteredFilters: FilterKey[];
}

export interface CompanyProvider {
  readonly name: string;
  /** Pagination 1-indexée */
  search(filters: SearchFilters, page: number): Promise<SearchResult>;
  /** Renvoie null si aucune entreprise ne porte ce SIREN */
  getBySiren(siren: string): Promise<Company | null>;
}

/** Erreur métier remontée par un provider, avec le statut HTTP à renvoyer au client */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number = 502,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class NotImplementedError extends ProviderError {
  constructor(what: string) {
    super(`${what} : non implémenté`, 501);
    this.name = "NotImplementedError";
  }
}

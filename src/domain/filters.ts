import { departementOfCommune, expandCommune, regionOfDepartement } from "@/data/referentiels/geo";
import type { Company } from "./company";

/**
 * Critères de recherche génériques.
 * Les codes utilisés (NAF, région, département, commune, tranche d'effectif) sont les nomenclatures INSEE,
 * communes à toutes les sources de données françaises.
 * Un provider ignore proprement les critères qu'il ne sait pas traiter et le signale
 * dans SearchResult.ignoredFilters.
 */
export interface SearchFilters {
  /** Mot-clé libre : dénomination, adresse, dirigeant, SIREN/SIRET */
  q?: string;
  /** Codes NAF "62.01Z" */
  codesNaf?: string[];
  /** Sections NAF "A" à "U" */
  sectionsNaf?: string[];
  /**
   * Zone géographique : une entreprise est retenue si elle se trouve dans AU MOINS UNE
   * des régions, départements ou communes listés (OU logique).
   */
  /** Codes INSEE de région "11" */
  regions?: string[];
  /** Codes INSEE de département "31", "2A", "974" */
  departements?: string[];
  /** Codes INSEE de commune "31555" (pas le code postal) */
  communes?: string[];
  /** Codes INSEE de tranche d'effectif ("NN", "00", "01"… "53") */
  tranchesEffectif?: string[];
  /** Date ISO "YYYY-MM-DD" incluse */
  dateCreationMin?: string;
  /** Date ISO "YYYY-MM-DD" incluse */
  dateCreationMax?: string;
  /** Chiffre d'affaires minimal en euros (dernier exercice connu) */
  chiffreAffairesMin?: number;
  /** Chiffre d'affaires maximal en euros (dernier exercice connu) */
  chiffreAffairesMax?: number;
  activesUniquement?: boolean;
  /**
   * Restreint la zone géographique au siège de l'entreprise.
   * Sans ce critère, certaines sources (dont l'API Recherche d'entreprises) retiennent
   * une entreprise dès qu'un de ses établissements est dans la zone.
   */
  siegeDansZone?: boolean;
}

export type FilterKey = keyof SearchFilters;

/** Libellés français des critères, pour les messages à l'utilisateur */
export const FILTER_LABELS: Record<FilterKey, string> = {
  q: "Mot-clé",
  codesNaf: "Code NAF",
  sectionsNaf: "Secteur",
  regions: "Région",
  departements: "Département",
  communes: "Ville",
  tranchesEffectif: "Tranche d'effectif",
  dateCreationMin: "Créée après le",
  dateCreationMax: "Créée avant le",
  chiffreAffairesMin: "Chiffre d'affaires minimum",
  chiffreAffairesMax: "Chiffre d'affaires maximum",
  activesUniquement: "Actives uniquement",
  siegeDansZone: "Siège situé dans la zone",
};

/** Liste des critères effectivement renseignés */
export function activeFilterKeys(filters: SearchFilters): FilterKey[] {
  return (Object.keys(filters) as FilterKey[]).filter((key) => {
    const value = filters[key];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== "" && value !== false;
  });
}

export function hasAnyFilter(filters: SearchFilters): boolean {
  return activeFilterKeys(filters).length > 0;
}

/**
 * Filtre sur la date de création, utilisable par tout provider
 * dont l'API ne propose pas ce critère.
 * Les dates ISO se comparent correctement en tant que chaînes.
 */
export function matchesDateCreation(company: Company, filters: SearchFilters): boolean {
  const { dateCreationMin: min, dateCreationMax: max } = filters;
  if (!min && !max) return true;
  if (!company.dateCreation) return false;
  if (min && company.dateCreation < min) return false;
  if (max && company.dateCreation > max) return false;
  return true;
}

export function hasZone(filters: SearchFilters): boolean {
  return Boolean(filters.regions?.length || filters.departements?.length || filters.communes?.length);
}

/** Applique le critère « siège situé dans la zone » s'il est demandé */
export function matchesSiegeZone(company: Company, filters: SearchFilters): boolean {
  if (!filters.siegeDansZone) return true;
  return matchesZone(company, filters);
}

/** Vérifie que le siège se trouve dans l'une des zones demandées (vrai si aucune zone) */
export function matchesZone(company: Company, filters: SearchFilters): boolean {
  return isInZone({ departement: company.departement, codeCommune: company.codeCommune }, filters);
}

/** Vérifie qu'un lieu (siège ou établissement) se trouve dans l'une des zones demandées */
export function isInZone(
  lieu: { departement?: string | null; codeCommune: string | null },
  filters: SearchFilters,
): boolean {
  if (!hasZone(filters)) return true;
  const { regions = [], departements = [], communes = [] } = filters;
  const commune = lieu.codeCommune;
  const dep = lieu.departement ?? (commune ? departementOfCommune(commune) : null);
  if (dep && departements.includes(dep)) return true;
  const region = dep ? regionOfDepartement(dep) : null;
  if (region && regions.includes(region)) return true;
  return Boolean(commune && communes.some((c) => expandCommune(c).includes(commune)));
}

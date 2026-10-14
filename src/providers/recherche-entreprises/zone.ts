import {
  departementOfCommune,
  departementsOfRegion,
  expandCommune,
  regionOfDepartement,
} from "@/data/referentiels/geo";
import type { SearchFilters } from "@/domain/filters";
import { communesOfDepartement } from "@/lib/localisation";

/**
 * Longueur maximale de la liste code_commune envoyée à l'API.
 * Au-delà d'environ 8 000 caractères d'URL, l'API répond 414 / 400.
 */
export const MAX_COMMUNE_LIST_CHARS = 6_000;

export interface ResolvedZone {
  params: Record<string, string[]>;
  /** Vrai si la zone envoyée à l'API est plus large que demandé : filtrage local sur le siège */
  approximate: boolean;
}

/**
 * Les paramètres region / departement / code_commune de l'API se cumulent (ET),
 * alors que SearchFilters demande « dans l'une des zones » (OU).
 * On ramène donc toute la zone à un seul paramètre :
 * 1. les zones couvertes par une zone plus large sont retirées (Toulouse + Haute-Garonne → 31) ;
 * 2. une seule sorte de zone → paramètre natif (régions + départements → départements) ;
 * 3. villes + départements/régions → liste de communes, si elle tient dans l'URL (résultat exact) ;
 * 4. sinon → départements couvrant toutes les zones, puis filtrage local sur le siège.
 */
export async function resolveZone(filters: SearchFilters): Promise<ResolvedZone> {
  const regions = filters.regions ?? [];
  const inRegions = (dep: string) => regions.includes(regionOfDepartement(dep) ?? "");
  const departements = (filters.departements ?? []).filter((d) => !inRegions(d));
  const communes = (filters.communes ?? []).filter((c) => {
    const dep = departementOfCommune(c);
    return !departements.includes(dep) && !inRegions(dep);
  });
  const coveringDeps = [...regions.flatMap(departementsOfRegion), ...departements];

  if (communes.length === 0) {
    if (regions.length > 0 && departements.length > 0) {
      return { params: { departement: coveringDeps }, approximate: false };
    }
    if (regions.length > 0) return { params: { region: regions }, approximate: false };
    if (departements.length > 0) return { params: { departement: departements }, approximate: false };
    return { params: {}, approximate: false };
  }
  if (coveringDeps.length === 0) {
    return { params: { code_commune: communes.flatMap(expandCommune) }, approximate: false };
  }

  try {
    const lists = await Promise.all(coveringDeps.map((dep) => communesOfDepartement(dep)));
    const all = [...new Set([...lists.flat(), ...communes].flatMap(expandCommune))];
    if (all.join(",").length <= MAX_COMMUNE_LIST_CHARS) {
      return { params: { code_commune: all }, approximate: false };
    }
  } catch {
    // Référentiel des communes indisponible : on passe au repli
  }
  const deps = new Set([...coveringDeps, ...communes.map(departementOfCommune)]);
  return { params: { departement: [...deps] }, approximate: true };
}

/**
 * Référentiel géographique INSEE : régions, départements, communes.
 * Source des régions et du rattachement département → région : https://geo.api.gouv.fr
 */
import regionsData from "./regions.json";
import { DEPARTEMENT_OPTIONS, libelleDepartement } from "./labels";

const REGIONS = regionsData.regions as Record<string, string>;
const DEPARTEMENT_REGION = regionsData.departementRegion as Record<string, string>;

export type LocalisationType = "region" | "departement" | "commune";

export interface Localisation {
  type: LocalisationType;
  /** Code INSEE (région "11", département "31", commune "31555") */
  code: string;
  nom: string;
  /** Précision affichée : "Département 31", "Haute-Garonne (31)"… */
  detail?: string;
}

export const libelleRegion = (code: string) => REGIONS[code] ?? null;
export const isKnownRegion = (code: string) => code in REGIONS;
export const regionOfDepartement = (code: string) => DEPARTEMENT_REGION[code] ?? null;

export function departementsOfRegion(code: string): string[] {
  return Object.keys(DEPARTEMENT_REGION).filter((dep) => DEPARTEMENT_REGION[dep] === code);
}

export const REGION_OPTIONS = Object.entries(REGIONS)
  .map(([code, nom]) => ({ code, label: nom }))
  .sort((a, b) => a.label.localeCompare(b.label, "fr"));

/** Format d'un code commune INSEE : "31555", "2A004", "97411" */
export const isCommuneCode = (code: string) => /^(\d{5}|2[AB]\d{3})$/.test(code);

/** Département d'une commune, déduit de son code INSEE */
export function departementOfCommune(code: string): string {
  return code.startsWith("97") ? code.slice(0, 3) : code.slice(0, 2);
}

/**
 * Paris, Lyon et Marseille sont découpées en arrondissements municipaux :
 * les établissements portent le code de l'arrondissement, pas celui de la ville.
 */
const ARRONDISSEMENTS: Record<string, string[]> = {
  "75056": range(75101, 75120),
  "69123": range(69381, 69389),
  "13055": range(13201, 13216),
};

function range(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
}

/** Code commune → codes réellement portés par les établissements */
export function expandCommune(code: string): string[] {
  return ARRONDISSEMENTS[code] ?? [code];
}

/** Minuscules, sans accents ni ponctuation : "Île-de-France" → "ile de france" */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Le texte commence par la requête, ou l'un de ses mots commence par elle */
function matches(name: string, query: string): boolean {
  const n = normalizeText(name);
  return n.startsWith(query) || n.includes(` ${query}`);
}

/** Recherche locale parmi les régions et les départements */
export function searchRegionsEtDepartements(rawQuery: string, limit = 4): Localisation[] {
  const query = normalizeText(rawQuery);
  if (!query) return [];

  const regions: Localisation[] = REGION_OPTIONS.filter((r) => matches(r.label, query))
    .slice(0, limit)
    .map((r) => ({ type: "region", code: r.code, nom: r.label, detail: "Région" }));

  const upper = rawQuery.trim().toUpperCase();
  const departements: Localisation[] = DEPARTEMENT_OPTIONS.filter(
    (d) => d.code === upper || matches(d.label, query),
  )
    .slice(0, limit)
    .map((d) => ({ type: "departement", code: d.code, nom: d.label, detail: `Département ${d.code}` }));

  return [...regions, ...departements];
}

/** Libellé d'une localisation régionale ou départementale connue localement */
export function localLocalisation(type: "region" | "departement", code: string): Localisation | null {
  if (type === "region") {
    const nom = libelleRegion(code);
    return nom ? { type, code, nom, detail: "Région" } : null;
  }
  const nom = libelleDepartement(code);
  return nom ? { type, code, nom, detail: `Département ${code}` } : null;
}

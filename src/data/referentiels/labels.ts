/**
 * Libellés des nomenclatures INSEE.
 * Source : https://github.com/annuaire-entreprises-data-gouv-fr/search-api/tree/main/app/labels (MIT)
 */
import codesNaf from "./codes-NAF.json";
import naturesJuridiques from "./natures-juridiques.json";
import tranchesEffectifs from "./tranches-effectifs.json";
import sectionsNaf from "./sections-codes-NAF.json";
import departements from "./departements.json";

type Labels = Record<string, string>;

const NAF = codesNaf as Labels;
const NATURES = naturesJuridiques as Labels;
const TRANCHES = tranchesEffectifs as Labels;
const SECTIONS = sectionsNaf as Labels;
const DEPARTEMENTS = departements as Labels;

function lookup(table: Labels, code: string | null | undefined): string | null {
  if (!code) return null;
  return table[code]?.trim() ?? null;
}

export const libelleNaf = (code: string | null | undefined) => lookup(NAF, code);
export const libelleNatureJuridique = (code: string | null | undefined) => lookup(NATURES, code);
export const libelleTrancheEffectif = (code: string | null | undefined) => lookup(TRANCHES, code);
export const libelleDepartement = (code: string | null | undefined) => lookup(DEPARTEMENTS, code);

export const isKnownNaf = (code: string) => code in NAF;
export const isKnownTrancheEffectif = (code: string) => code in TRANCHES;
export const isKnownSection = (code: string) => code in SECTIONS;
export const isKnownDepartement = (code: string) => code in DEPARTEMENTS;

export interface Option {
  code: string;
  label: string;
}

const toOptions = (table: Labels): Option[] =>
  Object.entries(table).map(([code, label]) => ({ code, label: label.trim() }));

/**
 * Ordre croissant des tranches d'effectif.
 * Explicite car JS place les clés numériques ("11", "53") avant "NN" ou "01".
 */
export const TRANCHE_ORDER = [
  "NN", "00", "01", "02", "03", "11", "12", "21", "22", "31", "32", "41", "42", "51", "52", "53",
] as const;

export const SECTION_OPTIONS = toOptions(SECTIONS);
export const TRANCHE_OPTIONS: Option[] = TRANCHE_ORDER.map((code) => ({
  code,
  label: TRANCHES[code].trim(),
}));
export const DEPARTEMENT_OPTIONS = toOptions(DEPARTEMENTS).sort((a, b) =>
  a.code.localeCompare(b.code),
);
export const NAF_OPTIONS = toOptions(NAF);

/**
 * Conversion entre les paramètres d'URL et SearchFilters.
 * Partagé par le navigateur (état de la page dans l'URL) et les routes serveur (validation).
 */
import { z } from "zod";
import type { SearchFilters } from "@/domain/filters";
import {
  isKnownDepartement,
  isKnownNaf,
  isKnownSection,
  isKnownTrancheEffectif,
} from "@/data/referentiels/labels";
import { isCommuneCode, isKnownRegion } from "@/data/referentiels/geo";

/** Noms des paramètres d'URL */
export const PARAM = {
  q: "q",
  codesNaf: "naf",
  sectionsNaf: "secteur",
  regions: "region",
  departements: "dep",
  communes: "ville",
  tranchesEffectif: "effectif",
  dateCreationMin: "creeApres",
  dateCreationMax: "creeAvant",
  chiffreAffairesMin: "caMin",
  chiffreAffairesMax: "caMax",
  activesUniquement: "actives",
  siegeDansZone: "siege",
  page: "page",
} as const;

/** "6201z" ou "62.01Z" → "62.01Z" */
export function normalizeNaf(raw: string): string {
  const compact = raw.replace(/[\s.]/g, "").toUpperCase();
  return /^\d{4}[A-Z]$/.test(compact) ? `${compact.slice(0, 2)}.${compact.slice(2)}` : raw.trim();
}

/** "1" → "01", "2a" → "2A" */
function normalizeDepartement(raw: string): string {
  const value = raw.trim().toUpperCase();
  return /^\d$/.test(value) ? `0${value}` : value;
}

/** Liste séparée par des virgules, normalisée puis validée valeur par valeur */
const list = (normalize: (v: string) => string, isValid: (v: string) => boolean, label: string) =>
  z
    .string()
    .optional()
    .transform((raw) =>
      raw
        ?.split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map(normalize),
    )
    .refine((values) => !values || values.every(isValid), {
      error: (issue) => {
        const values = issue.input as string[];
        return `${label} invalide : ${values.filter((v) => !isValid(v)).join(", ")}`;
      },
    })
    .transform((values) => (values?.length ? [...new Set(values)] : undefined));

const isoDate = (label: string) =>
  z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .refine((v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), {
      error: `${label} invalide (format attendu AAAA-MM-JJ)`,
    });

const euros = (label: string) =>
  z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .refine((v) => !v || /^\d{1,13}$/.test(v), { error: `${label} invalide` })
    .transform((v) => (v ? Number(v) : undefined));

const flag = z
  .string()
  .optional()
  .transform((v) => (v === "1" || v === "true" ? true : undefined));

const schema = z
  .object({
    q: z
      .string()
      .optional()
      .transform((v) => v?.trim() || undefined)
      .refine((v) => !v || v.length <= 200, { error: "Mot-clé trop long" }),
    codesNaf: list(normalizeNaf, isKnownNaf, "Code NAF"),
    sectionsNaf: list((v) => v.toUpperCase(), isKnownSection, "Secteur"),
    regions: list((v) => v, isKnownRegion, "Région"),
    departements: list(normalizeDepartement, isKnownDepartement, "Département"),
    communes: list((v) => v.toUpperCase(), isCommuneCode, "Code commune"),
    tranchesEffectif: list((v) => v.toUpperCase(), isKnownTrancheEffectif, "Tranche d'effectif"),
    dateCreationMin: isoDate("Date de création minimale"),
    dateCreationMax: isoDate("Date de création maximale"),
    chiffreAffairesMin: euros("Chiffre d'affaires minimum"),
    chiffreAffairesMax: euros("Chiffre d'affaires maximum"),
    activesUniquement: flag,
    siegeDansZone: flag,
    page: z.coerce
      .number({ error: "Numéro de page invalide" })
      .int("Numéro de page invalide")
      .min(1, "Numéro de page invalide")
      .optional()
      .default(1),
  })
  .refine(
    (f) => !f.dateCreationMin || !f.dateCreationMax || f.dateCreationMin <= f.dateCreationMax,
    { error: "La date minimale de création est postérieure à la date maximale" },
  )
  .refine(
    (f) =>
      f.chiffreAffairesMin === undefined ||
      f.chiffreAffairesMax === undefined ||
      f.chiffreAffairesMin <= f.chiffreAffairesMax,
    { error: "Le chiffre d'affaires minimum est supérieur au maximum" },
  );

export type ParseResult =
  | { ok: true; filters: SearchFilters; page: number }
  | { ok: false; error: string };

export function parseSearchParams(params: URLSearchParams): ParseResult {
  const raw = Object.fromEntries(
    Object.entries(PARAM).map(([key, name]) => [key, params.get(name) ?? undefined]),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" ; ") };
  }
  const { page, ...rest } = parsed.data;
  // « Siège dans la zone » n'a de sens qu'avec une zone
  if (!rest.regions && !rest.departements && !rest.communes) rest.siegeDansZone = undefined;
  // Retire les clés non renseignées pour garder des filtres compacts
  const filters = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  ) as SearchFilters;
  return { ok: true, filters, page };
}

export function toSearchParams(filters: SearchFilters, page?: number): URLSearchParams {
  const params = new URLSearchParams();
  const setList = (name: string, values?: string[]) => {
    if (values?.length) params.set(name, values.join(","));
  };
  if (filters.q) params.set(PARAM.q, filters.q);
  setList(PARAM.codesNaf, filters.codesNaf);
  setList(PARAM.sectionsNaf, filters.sectionsNaf);
  setList(PARAM.regions, filters.regions);
  setList(PARAM.departements, filters.departements);
  setList(PARAM.communes, filters.communes);
  setList(PARAM.tranchesEffectif, filters.tranchesEffectif);
  if (filters.dateCreationMin) params.set(PARAM.dateCreationMin, filters.dateCreationMin);
  if (filters.dateCreationMax) params.set(PARAM.dateCreationMax, filters.dateCreationMax);
  if (filters.chiffreAffairesMin !== undefined) {
    params.set(PARAM.chiffreAffairesMin, String(filters.chiffreAffairesMin));
  }
  if (filters.chiffreAffairesMax !== undefined) {
    params.set(PARAM.chiffreAffairesMax, String(filters.chiffreAffairesMax));
  }
  if (filters.activesUniquement) params.set(PARAM.activesUniquement, "1");
  if (filters.siegeDansZone) params.set(PARAM.siegeDansZone, "1");
  if (page && page > 1) params.set(PARAM.page, String(page));
  return params;
}

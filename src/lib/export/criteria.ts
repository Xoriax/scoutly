import "server-only";
import type { SearchFilters } from "@/domain/filters";
import { libelleRegion } from "@/data/referentiels/geo";
import {
  libelleDepartement,
  libelleNaf,
  libelleTrancheEffectif,
} from "@/data/referentiels/labels";
import sectionsNaf from "@/data/referentiels/sections-codes-NAF.json";
import { formatDate, formatEuros } from "@/lib/format";
import { resolveCommunes } from "@/lib/localisation";

/** Critères de la recherche en clair, pour l'onglet récapitulatif de l'export */
export async function describeFilters(filters: SearchFilters): Promise<[string, string][]> {
  const rows: [string, string][] = [];
  const add = (label: string, value: string | undefined | null) => {
    if (value) rows.push([label, value]);
  };

  add("Mot-clé", filters.q);
  add(
    "Secteur",
    filters.sectionsNaf
      ?.map((s) => `${s} – ${(sectionsNaf as Record<string, string>)[s] ?? ""}`)
      .join(" ; "),
  );
  add("Code NAF", filters.codesNaf?.map((c) => `${c} – ${libelleNaf(c) ?? ""}`).join(" ; "));

  const villes = filters.communes?.length ? await resolveCommunes(filters.communes) : [];
  const zones = [
    ...(filters.regions ?? []).map((r) => `${libelleRegion(r) ?? r} (région)`),
    ...(filters.departements ?? []).map((d) => `${libelleDepartement(d) ?? d} (${d})`),
    ...villes.map((v) => v.nom),
  ];
  add("Localisation", zones.join(" ; "));
  if (zones.length > 0) {
    add(
      "Siège situé dans la zone",
      filters.siegeDansZone ? "Oui" : "Non (un établissement dans la zone suffit)",
    );
  }

  const tranches = filters.tranchesEffectif ?? [];
  if (tranches.length > 0) {
    const first = libelleTrancheEffectif(tranches[0]);
    const last = libelleTrancheEffectif(tranches[tranches.length - 1]);
    add("Effectif", first === last ? first : `de « ${first} » à « ${last} »`);
  }
  add("Créée après le", filters.dateCreationMin && formatDate(filters.dateCreationMin));
  add("Créée avant le", filters.dateCreationMax && formatDate(filters.dateCreationMax));
  if (filters.chiffreAffairesMin !== undefined) {
    add("CA minimum", formatEuros(filters.chiffreAffairesMin));
  }
  if (filters.chiffreAffairesMax !== undefined) {
    add("CA maximum", formatEuros(filters.chiffreAffairesMax));
  }
  add("Entreprises actives uniquement", filters.activesUniquement ? "Oui" : "Non");
  return rows;
}

import type { Company } from "@/domain/company";

/**
 * Colonnes d'export, définies uniquement à partir du modèle Company :
 * changer de provider ne change rien ici.
 */

export type CellValue = string | number | null;

export interface ExportColumn {
  header: string;
  /** Largeur Excel (en caractères) */
  width: number;
  kind: "text" | "euros" | "date" | "integer";
  value: (company: Company) => CellValue;
  /** Colonne retirée si aucune ligne n'a de valeur (champs que tous les providers ne fournissent pas) */
  optional?: boolean;
}

const dirigeants = (c: Company) =>
  c.dirigeants
    .map((d) => (d.fonction ? `${d.nom} (${d.fonction})` : d.nom))
    .join(" ; ") || null;

/** Premier établissement situé dans la zone quand le siège n'y est pas */
const etablissementDansZone = (c: Company) => {
  const etablissements = c.etablissementsDansZone ?? [];
  if (etablissements.some((e) => e.estSiege)) return null;
  const e = etablissements[0];
  if (!e) return null;
  const adresse = [e.adresse, [e.codePostal, e.ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return e.ouvert ? adresse : `${adresse} (fermé)`;
};

export const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "SIREN", width: 12, kind: "text", value: (c) => c.siren },
  { header: "SIRET du siège", width: 16, kind: "text", value: (c) => c.siretSiege },
  { header: "N° TVA", width: 16, kind: "text", value: (c) => c.numeroTva ?? null, optional: true },
  { header: "Nom", width: 40, kind: "text", value: (c) => c.nom },
  { header: "Forme juridique", width: 30, kind: "text", value: (c) => c.formeJuridique },
  { header: "Adresse du siège", width: 40, kind: "text", value: (c) => c.adresse },
  { header: "Code postal", width: 11, kind: "text", value: (c) => c.codePostal },
  { header: "Ville", width: 24, kind: "text", value: (c) => c.ville },
  { header: "Département", width: 12, kind: "text", value: (c) => c.departement },
  {
    header: "Établissement dans la zone",
    width: 40,
    kind: "text",
    value: etablissementDansZone,
    optional: true,
  },
  { header: "Code NAF", width: 10, kind: "text", value: (c) => c.codeNaf },
  { header: "Activité", width: 40, kind: "text", value: (c) => c.libelleNaf },
  { header: "Date de création", width: 14, kind: "date", value: (c) => c.dateCreation },
  {
    header: "Effectif",
    width: 22,
    kind: "text",
    // "Unité non employeuse (pas de salarié au cours…)" → "Unité non employeuse"
    value: (c) => c.trancheEffectif?.replace(/\s*\(.*\)\s*$/, "") ?? null,
  },
  { header: "Catégorie", width: 10, kind: "text", value: (c) => c.categorieEntreprise },
  {
    header: "Établissements ouverts",
    width: 12,
    kind: "integer",
    value: (c) => c.nombreEtablissementsOuverts ?? null,
    optional: true,
  },
  {
    header: "État",
    width: 9,
    kind: "text",
    value: (c) => (c.etatAdministratif === "active" ? "Active" : "Cessée"),
  },
  {
    header: "Chiffre d'affaires (€)",
    width: 18,
    kind: "euros",
    value: (c) => c.chiffreAffaires ?? null,
    optional: true,
  },
  {
    header: "Résultat net (€)",
    width: 16,
    kind: "euros",
    value: (c) => c.resultatNet ?? null,
    optional: true,
  },
  {
    header: "Année des comptes",
    width: 10,
    kind: "integer",
    value: (c) => c.anneeFinances ?? null,
    optional: true,
  },
  { header: "Dirigeants", width: 60, kind: "text", value: dirigeants },
  {
    header: "Labels",
    width: 30,
    kind: "text",
    value: (c) => c.labels?.join(", ") || null,
    optional: true,
  },
  { header: "Site web", width: 30, kind: "text", value: (c) => c.siteWeb ?? null, optional: true },
  { header: "Téléphone", width: 16, kind: "text", value: (c) => c.telephone ?? null, optional: true },
  { header: "Email", width: 30, kind: "text", value: (c) => c.email ?? null, optional: true },
];

/** Colonnes à exporter pour ces lignes (sans les colonnes optionnelles vides) */
export function columnsFor(companies: Company[]): ExportColumn[] {
  return EXPORT_COLUMNS.filter(
    (col) => !col.optional || companies.some((c) => col.value(c) !== null),
  );
}

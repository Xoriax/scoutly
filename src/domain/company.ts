/**
 * Modèle interne d'une entreprise.
 * Indépendant de toute API : chaque provider traduit sa propre réponse vers ce format,
 * et l'interface comme l'export ne connaissent que ce type.
 */

export interface Dirigeant {
  /** "Prénoms NOM" pour une personne physique, dénomination pour une personne morale */
  nom: string;
  /** Qualité / fonction : "Président de SAS", "Gérant"… */
  fonction: string | null;
  type: "personne_physique" | "personne_morale";
}

/** Établissement (site) d'une entreprise */
export interface Etablissement {
  siret: string;
  /** Adresse sans code postal ni ville */
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  /** Code INSEE de la commune */
  codeCommune: string | null;
  estSiege: boolean;
  ouvert: boolean;
}

export type EtatAdministratif = "active" | "cessee";

export type CategorieEntreprise = "PME" | "ETI" | "GE";

export interface Company {
  siren: string;
  siretSiege: string | null;
  nom: string;
  formeJuridiqueCode: string | null;
  formeJuridique: string | null;
  /** Adresse du siège sans code postal ni ville */
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  /** Code INSEE de la commune du siège (≠ code postal) */
  codeCommune: string | null;
  departement: string | null;
  /** Code NAF/APE au format INSEE "62.01Z" */
  codeNaf: string | null;
  libelleNaf: string | null;
  /** Date ISO "YYYY-MM-DD" */
  dateCreation: string | null;
  /** Code INSEE de tranche d'effectif ("12" = 20 à 49 salariés) */
  trancheEffectifCode: string | null;
  trancheEffectif: string | null;
  categorieEntreprise: CategorieEntreprise | null;
  etatAdministratif: EtatAdministratif;
  dirigeants: Dirigeant[];

  // Champs optionnels : remplis seulement si le provider les fournit
  chiffreAffaires?: number | null;
  resultatNet?: number | null;
  /** Année de l'exercice auquel se rapportent chiffreAffaires / resultatNet */
  anneeFinances?: number | null;
  siteWeb?: string | null;
  telephone?: string | null;
  email?: string | null;

  /**
   * Rempli uniquement dans les résultats d'une recherche géographique :
   * établissements de l'entreprise situés dans la zone recherchée (ouverts d'abord).
   */
  etablissementsDansZone?: Etablissement[];

  /** Nom du provider qui a produit cette fiche */
  source: string;
}

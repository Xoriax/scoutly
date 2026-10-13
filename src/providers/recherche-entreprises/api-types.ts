/**
 * Types bruts de l'API Recherche d'entreprises, limités aux champs utilisés.
 * Référence : https://recherche-entreprises.api.gouv.fr/openapi.json
 */

export interface ApiSearchResponse {
  results: ApiResult[];
  total_results: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiResult {
  siren: string;
  nom_complet: string | null;
  nom_raison_sociale: string | null;
  sigle: string | null;
  siege: ApiSiege | null;
  activite_principale: string | null;
  section_activite_principale: string | null;
  categorie_entreprise: "PME" | "ETI" | "GE" | null;
  date_creation: string | null;
  date_fermeture: string | null;
  dirigeants: (ApiDirigeantPP | ApiDirigeantPM)[] | null;
  /** "A" active, "C" cessée */
  etat_administratif: string | null;
  nature_juridique: string | null;
  tranche_effectif_salarie: string | null;
  /** Bilans par année : { "2024": { ca, resultat_net } } */
  finances: Record<string, { ca: number | null; resultat_net: number | null }> | null;
  /** Établissements ayant déclenché la correspondance (ex. ceux situés dans la zone filtrée) */
  matching_etablissements?: ApiEtablissement[] | null;
}

export interface ApiEtablissement {
  siret: string;
  /** Adresse complète, code postal et commune inclus */
  adresse: string | null;
  code_postal: string | null;
  commune: string | null;
  libelle_commune: string | null;
  est_siege: boolean;
  /** "A" actif, "F" fermé */
  etat_administratif: string | null;
}

export interface ApiSiege {
  siret: string | null;
  /** Adresse complète, code postal et commune inclus */
  adresse: string | null;
  code_postal: string | null;
  /** Code INSEE de la commune (code d'arrondissement pour Paris, Lyon, Marseille) */
  commune: string | null;
  libelle_commune: string | null;
  libelle_commune_etranger: string | null;
  libelle_pays_etranger: string | null;
  departement: string | null;
}

export interface ApiDirigeantPP {
  type_dirigeant: "personne physique";
  nom: string | null;
  prenoms: string | null;
  qualite: string | null;
}

export interface ApiDirigeantPM {
  type_dirigeant: "personne morale";
  siren: string | null;
  denomination: string | null;
  qualite: string | null;
}

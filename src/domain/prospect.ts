/** Suivi commercial d'une entreprise (prospect) */

export const PROSPECT_STATUTS = ["a_contacter", "contacte", "interesse", "pas_interesse"] as const;

export type ProspectStatut = (typeof PROSPECT_STATUTS)[number];

export const STATUT_LABELS: Record<ProspectStatut, string> = {
  a_contacter: "À contacter",
  contacte: "Contacté",
  interesse: "Intéressé",
  pas_interesse: "Pas intéressé",
};

export const isProspectStatut = (value: unknown): value is ProspectStatut =>
  typeof value === "string" && (PROSPECT_STATUTS as readonly string[]).includes(value);

export interface Prospect {
  siren: string;
  /** Nom et ville au moment du suivi, pour afficher la liste sans rappeler l'API */
  nom: string;
  ville: string | null;
  statut: ProspectStatut;
  notes: string;
  /** Date ISO de dernière modification */
  updatedAt: string;
}

/** Recherche enregistrée, rejouable et éventuellement surveillée (alerte) */
export interface SavedSearch {
  id: number;
  nom: string;
  /** Paramètres d'URL de la recherche (format de lib/search-params) */
  query: string;
  alerteActive: boolean;
  /** Destinataire de l'alerte ; à défaut, ALERT_DEFAULT_EMAIL */
  alerteEmail: string | null;
  createdAt: string;
  /** Dernière vérification des nouveautés */
  lastRunAt: string | null;
  /** Nombre de nouvelles entreprises trouvées à la dernière vérification */
  lastNewCount: number | null;
  /** Erreur de la dernière vérification (recherche trop large, API indisponible…) */
  lastError: string | null;
}

/** Entreprise apparue dans une recherche surveillée */
export interface NouvelleEntreprise {
  siren: string;
  nom: string;
  ville: string | null;
  dateCreation: string | null;
  /** Date ISO de la vérification qui l'a détectée */
  detecteeLe: string;
}

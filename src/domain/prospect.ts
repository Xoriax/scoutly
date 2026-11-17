/** Suivi commercial d'une entreprise (prospect) */

export const PROSPECT_STATUTS = [
  "a_qualifier",
  "a_contacter",
  "contacte",
  "en_discussion",
  "interesse",
  "pas_interesse",
] as const;

export type ProspectStatut = (typeof PROSPECT_STATUTS)[number];

export const STATUT_LABELS: Record<ProspectStatut, string> = {
  a_qualifier: "À qualifier",
  a_contacter: "À contacter",
  contacte: "Contacté",
  en_discussion: "En discussion",
  interesse: "Intéressé",
  pas_interesse: "Pas intéressé",
};

/** Statuts dont l'opportunité est encore ouverte (comptée dans le pipeline) */
export const STATUTS_OUVERTS: readonly ProspectStatut[] = PROSPECT_STATUTS.filter((s) => s !== "pas_interesse");

export const isProspectStatut = (value: unknown): value is ProspectStatut =>
  typeof value === "string" && (PROSPECT_STATUTS as readonly string[]).includes(value);

/**
 * Identifiant d'un prospect : SIREN (9 chiffres) pour une entreprise connue de l'API,
 * « M » + numéro pour un prospect saisi à la main.
 */
export const isProspectKey = (value: string): boolean => /^(\d{9}|M\d{1,9})$/.test(value);

export interface Prospect {
  /** SIREN, ou identifiant « M… » d'un prospect saisi à la main */
  siren: string;
  /** Nom et ville au moment du suivi, pour afficher la liste sans rappeler l'API */
  nom: string;
  ville: string | null;
  statut: ProspectStatut;
  notes: string;
  /** Interlocuteur principal (nom libre) */
  contact: string;
  email: string;
  /** Valeur de l'opportunité en euros, si estimée */
  montant: number | null;
  /** Prochaine action commerciale (« Envoyer le devis vendredi ») */
  prochaineAction: string;
  /** Étape de l'opportunité (« Proposition envoyée »), suivie séparément du statut */
  etape: string;
  secteur: string;
  effectif: string;
  /** Paramètres de la recherche d'où vient le prospect (format de lib/search-params) */
  origine: string;
  /** Date ISO d'ajout au portefeuille */
  createdAt: string;
  /** Date ISO de dernière modification */
  updatedAt: string;
}

/** Champs de suivi facultatifs : non fournis, ils conservent leur valeur actuelle */
export type ProspectDetails = Partial<
  Pick<Prospect, "contact" | "email" | "montant" | "prochaineAction" | "etape" | "secteur" | "effectif" | "origine">
>;

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

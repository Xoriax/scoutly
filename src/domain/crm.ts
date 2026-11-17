/** Suivi commercial : actions, échanges, notes et séquence de relance */

export interface Tache {
  id: number;
  /** Prospect concerné (clé de `Prospect`) */
  siren: string;
  titre: string;
  /** Pourquoi cette action compte (« Engagement à tenir ») */
  raison: string;
  /** Étiquette courte : « Aujourd'hui », « Rendez-vous »… */
  etiquette: string;
  /** Échéance en texte libre : « Avant 12:00 » */
  echeance: string;
  terminee: boolean;
  createdAt: string;
}

/** Email échangé avec un prospect (saisi à la main : aucune boîte mail n'est connectée) */
export interface Message {
  id: number;
  siren: string;
  objet: string;
  corps: string;
  /** Date ISO de réception */
  recuLe: string;
  /** Pastille courte : « Devis demandé », « Rendez-vous confirmé »… */
  etiquette: string;
  /** Résumé de l'échange et point d'attention */
  analyse: string;
  /** Citation du message sur laquelle repose l'analyse */
  citation: string;
  /** Réponse en cours de rédaction */
  brouillon: string;
  traite: boolean;
}

export interface ProspectNote {
  id: number;
  siren: string;
  corps: string;
  createdAt: string;
}

export const SEND_MODES = ["Validation avant envoi", "Brouillons uniquement"] as const;
export type SendMode = (typeof SEND_MODES)[number];

/** Réglages de la séquence de relance (simulation : aucun envoi automatique) */
export interface SequenceSettings {
  active: boolean;
  /** Suspendre pendant une absence détectée */
  absences: boolean;
  mode: SendMode;
}

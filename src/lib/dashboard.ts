import "server-only";
import type { DatabaseSync } from "node:sqlite";
import {
  PROSPECT_STATUTS,
  STATUTS_OUVERTS,
  type NouvelleEntreprise,
  type ProspectStatut,
} from "@/domain/prospect";
import { getDb } from "./db";
import { countNonTraites } from "./messages";
import { listProspects } from "./prospects";
import { listNouvelles, listSavedSearches } from "./saved-searches";

export interface DashboardStats {
  prospects: number;
  parStatut: Record<ProspectStatut, number>;
  /** Somme des montants des opportunités encore ouvertes (hors « pas intéressé ») */
  pipelineMontant: number;
  opportunites: number;
  recherches: number;
  recherchesSurveillees: number;
  /** Nouvelles entreprises détectées à la dernière vérification de chaque recherche */
  nouvellesEntreprises: number;
  /** Actions à faire (voir lib/tasks) */
  actionsAFaire: number;
  /** Échanges pas encore traités */
  messagesATraiter: number;
  /** Prospects en discussion */
  enDiscussion: number;
  /** Dernières entreprises détectées par les alertes */
  recentes: (NouvelleEntreprise & { recherche: string })[];
}

export function getDashboardStats(db: DatabaseSync = getDb()): DashboardStats {
  const prospects = listProspects(undefined, db);
  const searches = listSavedSearches(db);

  const parStatut = Object.fromEntries(
    PROSPECT_STATUTS.map((s) => [s, prospects.filter((p) => p.statut === s).length]),
  ) as Record<ProspectStatut, number>;

  const open = prospects.filter((p) => STATUTS_OUVERTS.includes(p.statut));
  const withAmount = open.filter((p) => (p.montant ?? 0) > 0);

  return {
    prospects: prospects.length,
    parStatut,
    pipelineMontant: withAmount.reduce((sum, p) => sum + (p.montant ?? 0), 0),
    opportunites: withAmount.length,
    recherches: searches.length,
    recherchesSurveillees: searches.filter((s) => s.alerteActive).length,
    nouvellesEntreprises: searches.reduce((sum, s) => sum + (s.lastNewCount ?? 0), 0),
    actionsAFaire: (db.prepare("SELECT count(*) AS n FROM taches WHERE terminee = 0").get() as { n: number }).n,
    messagesATraiter: countNonTraites(db),
    enDiscussion: parStatut.en_discussion,
    recentes: searches
      .flatMap((s) => listNouvelles(s.id, 5, db).map((n) => ({ ...n, recherche: s.nom })))
      .sort((a, b) => b.detecteeLe.localeCompare(a.detecteeLe))
      .slice(0, 6),
  };
}

/** Compteurs affichés dans la barre latérale */
export function getNavCounts(db: DatabaseSync = getDb()): { prospects: number; messages: number } {
  const { n } = db.prepare("SELECT count(*) AS n FROM prospects").get() as { n: number };
  return { prospects: n, messages: countNonTraites(db) };
}

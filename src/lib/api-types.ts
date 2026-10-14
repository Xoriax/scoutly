import type { ProspectStatut } from "@/domain/prospect";
import type { SearchResult } from "@/domain/provider";

/** Réponse de GET /api/search : résultat du provider enrichi du suivi des prospects */
export interface SearchResponse extends SearchResult {
  /** Statut de suivi des entreprises affichées (absentes si non suivies) */
  suivis: Record<string, ProspectStatut>;
  /** Entreprises retirées de cette page car déjà suivies (option « masquer ») */
  masques: number;
}

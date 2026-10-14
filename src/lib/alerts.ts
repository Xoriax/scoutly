import "server-only";
import type { NouvelleEntreprise, SavedSearch } from "@/domain/prospect";
import { ProviderError } from "@/domain/provider";
import { getProvider } from "@/providers";
import { collectAll } from "./export/collect";
import { appUrl, isMailConfigured, sendAlertEmail, type AlertSection } from "./mailer";
import {
  getSavedSearch,
  listSavedSearches,
  recordRun,
  recordRunError,
} from "./saved-searches";
import { parseSearchParams } from "./search-params";

/**
 * Surveillance des recherches sauvegardées.
 * L'API ne sait ni filtrer ni trier par date de création : on rejoue la recherche complète
 * et on signale les SIREN jamais vus. La recherche doit donc rester assez ciblée.
 */
function alertMaxResults(): number {
  const value = Number(process.env.ALERT_MAX_RESULTS);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 10_000) : 2000;
}

export interface RunOutcome {
  search: SavedSearch;
  nouvelles: NouvelleEntreprise[];
  error: string | null;
}

/** Vérifie une recherche et mémorise les entreprises vues */
export async function runSavedSearch(searchId: number): Promise<RunOutcome | null> {
  const search = getSavedSearch(searchId);
  if (!search) return null;

  const fail = (message: string): RunOutcome => {
    recordRunError(search.id, message);
    return { search: getSavedSearch(search.id)!, nouvelles: [], error: message };
  };

  const parsed = parseSearchParams(new URLSearchParams(search.query));
  if (!parsed.ok) return fail(parsed.error);

  const max = alertMaxResults();
  try {
    const collected = await collectAll(getProvider(), parsed.filters, {
      maxRows: max,
      timeoutMs: 5 * 60_000,
    });
    if (collected.truncated) {
      return fail(
        `Recherche trop large pour être surveillée (plus de ${max} résultats) : affinez-la.`,
      );
    }
    const nouvelles = recordRun(search.id, collected.companies);
    return { search: getSavedSearch(search.id)!, nouvelles, error: null };
  } catch (error) {
    if (error instanceof ProviderError) return fail(error.message);
    throw error;
  }
}

export interface AlertsReport {
  verifiees: number;
  nouvelles: number;
  erreurs: { recherche: string; message: string }[];
  emailsEnvoyes: number;
  /** Raison pour laquelle aucun email n'a pu partir, le cas échéant */
  emailInfo: string | null;
}

/** Vérifie toutes les recherches dont l'alerte est active et envoie les emails */
export async function runAllAlerts(): Promise<AlertsReport> {
  const report: AlertsReport = {
    verifiees: 0,
    nouvelles: 0,
    erreurs: [],
    emailsEnvoyes: 0,
    emailInfo: null,
  };
  const parDestinataire = new Map<string, AlertSection[]>();
  const defaultEmail = process.env.ALERT_DEFAULT_EMAIL || null;

  // Une recherche après l'autre : le quota de l'API est partagé
  for (const search of listSavedSearches().filter((s) => s.alerteActive)) {
    const outcome = await runSavedSearch(search.id);
    if (!outcome) continue;
    report.verifiees++;
    report.nouvelles += outcome.nouvelles.length;
    if (outcome.error) report.erreurs.push({ recherche: search.nom, message: outcome.error });

    const destinataire = search.alerteEmail || defaultEmail;
    if (outcome.nouvelles.length > 0 && destinataire) {
      const sections = parDestinataire.get(destinataire) ?? [];
      sections.push({
        nomRecherche: search.nom,
        lien: appUrl() ? `${appUrl()}/?${search.query}` : null,
        nouvelles: outcome.nouvelles,
      });
      parDestinataire.set(destinataire, sections);
    }
  }

  if (parDestinataire.size > 0 && !isMailConfigured()) {
    report.emailInfo = "SMTP non configuré : nouveautés visibles dans l'application uniquement.";
  } else {
    for (const [destinataire, sections] of parDestinataire) {
      try {
        await sendAlertEmail(destinataire, sections);
        report.emailsEnvoyes++;
      } catch (error) {
        report.erreurs.push({
          recherche: `email à ${destinataire}`,
          message: (error as Error).message,
        });
      }
    }
  }
  return report;
}
